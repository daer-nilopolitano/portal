"""
Endpoints de gestão de Membros (conselheiro, auxiliar, embaixador do rei).

Regras de acesso (cadastro descentralizado):
- Diretoria: lê e escreve membros de qualquer embaixada.
- Conselheiro: lê e escreve membros da própria embaixada — qualquer tipo (inclusive outro conselheiro), sem precisar de
  aprovação da Diretoria. Quem aprova/escolhe conselheiros é a igreja da embaixada, não o DAER.
- Auxiliar: só lê os membros da própria embaixada (qualquer tipo) — não cria, edita nem exclui.
- Embaixador do Rei: sem acesso a estes endpoints de gestão — usa /api/auth/me/ e /api/carteirinhas/me/ para ver os seus dados.
"""
from datetime import date
from typing import Optional

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from ninja import Field, Query, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import DiretoriaEmbaixada, Embaixada, Membro, TipoMembro
from .erros import R400, R401, R403, R404

router = Router(tags=["Membros"], auth=AuthBearer())

_DESC_TIPO = "Tipo do membro: `conselheiro`, `auxiliar` ou `embaixador_do_rei`."
_DESC_POSTO = (
    "Posto do Embaixador do Rei. Obrigatório quando `tipo` é `embaixador_do_rei`, e deve ficar vazio para os demais tipos. "
    "Valores: `escudeiro`, `arauto`, `senior`, `emerito`."
)
_DESC_CARGO_EMBAIXADA = (
    "Cargo do membro no quadro de oficiais da própria embaixada, se ele ocupar algum (só aplicável a `embaixador_do_rei`); "
    "caso contrário, `null`. Valores: `embaixador_chefe`, `embaixador_assistente`, `secretario`, `intendente`, `porta_voz`, "
    "`consul`, `tesoureiro`, `diretor_musica`, `diretor_esportes`. Definido via `PUT /membros/{id}/cargo-embaixada/`, "
    "não neste endpoint."
)
_DESC_NOME_RESPONSAVEL = "Nome do responsável — só relevante para tipo `embaixador_do_rei` (é menor de idade)."
_DESC_TELEFONE_RESPONSAVEL = "Telefone do responsável — só relevante para tipo `embaixador_do_rei`."
_DESC_FAIXA_ETARIA = (
    "Faixa etária calculada a partir de `data_nascimento`, só quando `tipo` é `embaixador_do_rei`: `junior` (9-11 anos), "
    "`adolescente` (12-14) ou `juvenil` (15-17). `null` fora dessa faixa ou para os demais tipos. "
    "Não é um campo salvo no banco, não dá pra alterar."
)


class MembroOut(Schema):
    id: int
    nome: str
    data_nascimento: date
    telefone_contato: str
    email: Optional[str] = None
    tipo: str = Field(..., description=_DESC_TIPO)
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    cargo_embaixada: Optional[str] = Field(None, description=_DESC_CARGO_EMBAIXADA)
    nome_responsavel: str = Field("", description=_DESC_NOME_RESPONSAVEL)
    telefone_responsavel: str = Field("", description=_DESC_TELEFONE_RESPONSAVEL)
    embaixada_id: int
    embaixada_nome: str
    ativo: bool
    idade: int
    faixa_etaria: Optional[str] = Field(None, description=_DESC_FAIXA_ETARIA)
    tem_acesso: bool = Field(..., description="Se o membro já tem login (Django User) criado — ver POST .../criar-acesso/.")

    @staticmethod
    def resolve_embaixada_nome(obj: Membro) -> str:
        return obj.embaixada.nome

    @staticmethod
    def resolve_cargo_embaixada(obj: Membro) -> Optional[str]:
        # .all() aproveita o prefetch de _queryset_visivel; .first() sempre faria uma consulta nova por membro.
        # Um membro tem no máximo 1 cargo.
        cargos = list(obj.cargos_embaixada.all())
        return cargos[0].cargo if cargos else None

    @staticmethod
    def resolve_tem_acesso(obj: Membro) -> bool:
        return obj.user_id is not None


class MembroIn(Schema):
    nome: str = Field(..., examples=["Alex Luis Alves"])
    data_nascimento: date
    telefone_contato: str = ""
    email: Optional[str] = None
    tipo: str = Field(..., description=_DESC_TIPO)
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    nome_responsavel: str = Field("", description=_DESC_NOME_RESPONSAVEL)
    telefone_responsavel: str = Field("", description=_DESC_TELEFONE_RESPONSAVEL)
    embaixada_id: int
    ativo: bool = True


class MembroUpdate(Schema):
    nome: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone_contato: Optional[str] = None
    email: Optional[str] = None
    tipo: Optional[str] = Field(None, description=_DESC_TIPO)
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    nome_responsavel: Optional[str] = Field(None, description=_DESC_NOME_RESPONSAVEL)
    telefone_responsavel: Optional[str] = Field(None, description=_DESC_TELEFONE_RESPONSAVEL)
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None


class MembroFiltros(Schema):
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None
    faixa_etaria: Optional[str] = Field(None, description=_DESC_FAIXA_ETARIA)
    tipo: Optional[str] = Field(None, description=_DESC_TIPO)


class CriarAcessoIn(Schema):
    senha: str = Field(..., description="Precisa passar pelos mesmos critérios de AUTH_PASSWORD_VALIDATORS do Django (tamanho mínimo, não ser uma senha comum, etc.).")


class AcessoCriadoOut(Schema):
    detail: str


def _validar_posto(tipo: str, posto_embaixador: Optional[str]):
    if tipo == TipoMembro.EMBAIXADOR_DO_REI and not posto_embaixador:
        raise HttpError(400, "posto_embaixador é obrigatório quando tipo = embaixador_do_rei.")
    if tipo != TipoMembro.EMBAIXADOR_DO_REI and posto_embaixador:
        raise HttpError(400, "posto_embaixador só deve ser preenchido quando tipo = embaixador_do_rei.")


def _validar_email_unico(email: Optional[str], ignorar_membro_id: Optional[int] = None) -> None:
    """E-mail é único (e vira o username no login) — evita IntegrityError (500) no banco. Vazio/nulo não conflita."""
    if not email:
        return
    qs = Membro.objects.filter(email__iexact=email)
    if ignorar_membro_id is not None:
        qs = qs.exclude(pk=ignorar_membro_id)
    if qs.exists():
        raise HttpError(400, "Já existe um membro cadastrado com esse e-mail.")


def _pode_gerenciar_embaixada(membro_logado: Membro, embaixada_id: int) -> bool:
    """Escrita (criar/editar/excluir) — Diretoria ou conselheiro da própria embaixada."""
    if membro_logado.eh_diretoria:
        return True
    return membro_logado.tipo == TipoMembro.CONSELHEIRO and membro_logado.embaixada_id == embaixada_id


def _queryset_visivel(request):
    """Leitura — Diretoria vê tudo; conselheiro e auxiliar veem a própria embaixada."""
    membro_logado = membro_do_usuario(request.auth)
    qs = Membro.objects.select_related("embaixada").prefetch_related("cargos_embaixada")

    if membro_logado.eh_diretoria:
        return qs
    if membro_logado.tipo in (TipoMembro.CONSELHEIRO, TipoMembro.AUXILIAR):
        return qs.filter(embaixada_id=membro_logado.embaixada_id)
    # Embaixador do Rei: sem acesso à listagem de gestão.
    raise HttpError(403, "Sem permissão para listar membros. Use /api/auth/me/.")


@router.get(
    "/",
    response={200: list[MembroOut], **R401, **R403},
    summary="Lista membros",
    operation_id="listar_membros",
)
def listar_membros(request, filtros: MembroFiltros = Query(...)):
    """Diretoria vê todos os membros; conselheiro e auxiliar só os da própria embaixada; embaixador do rei recebe 403 (use /api/auth/me/)."""
    qs = _queryset_visivel(request)

    if filtros.embaixada_id is not None:
        qs = qs.filter(embaixada_id=filtros.embaixada_id)
    if filtros.ativo is not None:
        qs = qs.filter(ativo=filtros.ativo)
    if filtros.tipo:
        qs = qs.filter(tipo=filtros.tipo)

    # faixa_etaria é calculada em Python (property, não é campo de banco).
    if filtros.faixa_etaria:
        qs = [m for m in qs if m.faixa_etaria == filtros.faixa_etaria]

    return qs


@router.get(
    "/{membro_id}/",
    response={200: MembroOut, **R401, **R403, **R404},
    summary="Detalha um membro",
    operation_id="detalhar_membro",
)
def detalhar_membro(request, membro_id: int):
    qs = _queryset_visivel(request)
    return get_object_or_404(qs, pk=membro_id)


@router.post(
    "/",
    response={201: MembroOut, **R400, **R401, **R403, **R404},
    summary="Cadastra um membro",
    operation_id="criar_membro",
)
def criar_membro(request, payload: MembroIn):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da embaixada informada em `embaixada_id`.

    400 se o `email` já estiver em uso por outro membro ou se `posto_embaixador` não combinar com o `tipo`;
    404 se a embaixada não existir. E-mail vazio é gravado como `null`.
    """
    membro_logado = membro_do_usuario(request.auth)
    if not _pode_gerenciar_embaixada(membro_logado, payload.embaixada_id):
        raise HttpError(403, "Você só pode cadastrar membros na sua própria embaixada.")
    _validar_posto(payload.tipo, payload.posto_embaixador)
    _validar_email_unico(payload.email)

    embaixada = get_object_or_404(Embaixada, pk=payload.embaixada_id)
    dados = payload.dict(exclude={"embaixada_id"})
    dados["email"] = dados["email"] or None  # "" viraria um segundo valor "" e violaria a unicidade
    membro = Membro.objects.create(embaixada=embaixada, **dados)
    return 201, membro


@router.put(
    "/{membro_id}/",
    response={200: MembroOut, **R400, **R401, **R403, **R404},
    summary="Atualiza um membro",
    operation_id="atualizar_membro",
)
def atualizar_membro(request, membro_id: int, payload: MembroUpdate):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da embaixada atual (ou de destino, se `embaixada_id` mudar) do membro.

    400 se o `email` já estiver em uso por outro membro ou se `posto_embaixador` não combinar com o `tipo`;
    404 se o membro ou a nova embaixada não existirem. E-mail vazio é gravado como `null`.
    """
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode editar membros da sua própria embaixada.")

    dados = payload.dict(exclude_unset=True)
    if "email" in dados:
        dados["email"] = dados["email"] or None
        _validar_email_unico(dados["email"], ignorar_membro_id=membro.pk)
    if "embaixada_id" in dados:
        nova_embaixada_id = dados.pop("embaixada_id")
        if not _pode_gerenciar_embaixada(membro_logado, nova_embaixada_id):
            raise HttpError(403, "Você não pode transferir este membro para essa embaixada.")
        membro.embaixada = get_object_or_404(Embaixada, pk=nova_embaixada_id)

    tipo_final = dados.get("tipo", membro.tipo)
    posto_final = dados.get("posto_embaixador", membro.posto_embaixador)
    _validar_posto(tipo_final, posto_final)

    for campo, valor in dados.items():
        setattr(membro, campo, valor)
    membro.save()
    return membro


@router.delete(
    "/{membro_id}/",
    response={204: None, **R401, **R403, **R404},
    summary="Exclui um membro",
    operation_id="excluir_membro",
)
def excluir_membro(request, membro_id: int):
    """Restrito à Diretoria ou ao conselheiro da própria embaixada do membro."""
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode excluir membros da sua própria embaixada.")
    membro.delete()
    return 204, None


@router.post(
    "/{membro_id}/criar-acesso/",
    response={201: AcessoCriadoOut, **R400, **R401, **R403, **R404},
    summary="Cria acesso (login) para um membro",
    operation_id="criar_acesso",
)
def criar_acesso(request, membro_id: int, payload: CriarAcessoIn):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da própria embaixada do membro.

    Cria o login (Django User) de um Membro que ainda não tem conta — usado para dar acesso a um membro recém-cadastrado.
    Requer que o Membro já tenha um e-mail (vira o username).

    400 se o membro já tiver acesso, se não tiver e-mail cadastrado, se já existir outro usuário do sistema com esse
    e-mail ou se a senha não passar nos validadores do Django.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()

    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode criar acesso para membros da sua própria embaixada.")

    if membro.user_id is not None:
        raise HttpError(400, "Esse membro já tem acesso criado.")
    if not membro.email:
        raise HttpError(400, "Cadastre um e-mail para esse membro antes de criar o acesso.")
    # O e-mail vira o username, que é único: um User já existente (ex.: conta de administrador) daria erro 500.
    if User.objects.filter(username__iexact=membro.email).exists():
        raise HttpError(400, "Já existe um usuário do sistema com esse e-mail. Use outro e-mail ou fale com a administração.")

    # Roda os mesmos AUTH_PASSWORD_VALIDATORS do settings.py (tamanho mínimo, senha comum, etc.) — sem isso,
    # make_password() aceita qualquer string. O User ainda não existe neste ponto, então passa um objeto não salvo só
    # para o UserAttributeSimilarityValidator comparar contra username/e-mail.
    try:
        validate_password(
            payload.senha, user=User(username=membro.email, email=membro.email)
        )
    except ValidationError as erro:
        raise HttpError(400, " ".join(erro.messages))

    user = User.objects.create(
        username=membro.email,
        email=membro.email,
        password=make_password(payload.senha),
    )
    membro.user = user
    membro.save(update_fields=["user"])
    return 201, {"detail": "Acesso criado com sucesso."}


class CargoEmbaixadaIn(Schema):
    cargo: Optional[str] = Field(
        None,
        description=(
            "Cargo na diretoria da embaixada, ou `null` para remover o membro do quadro. "
            "Valores: `embaixador_chefe`, `embaixador_assistente`, `secretario`, `intendente`, `porta_voz`, `consul`, "
            "`tesoureiro`, `diretor_musica`, `diretor_esportes`."
        ),
    )


@router.put(
    "/{membro_id}/cargo-embaixada/",
    response={200: MembroOut, **R400, **R401, **R403, **R404},
    summary="Define o cargo do membro na diretoria da própria embaixada (só para embaixador do rei)",
    operation_id="definir_cargo_embaixada",
)
def definir_cargo_embaixada(request, membro_id: int, payload: CargoEmbaixadaIn):
    """
    Define (ou remove, se cargo=None) o cargo do membro na diretoria da própria embaixada. Só para tipo=embaixador_do_rei.
    Atribuir um cargo já ocupado por outro membro troca o titular automaticamente (sem manter histórico — a rotação é informal, ~1 ano).
    """
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode editar a diretoria da sua própria embaixada.")
    if membro.tipo != TipoMembro.EMBAIXADOR_DO_REI:
        raise HttpError(400, "Só um Embaixador do Rei pode ocupar cargo na diretoria da embaixada.")

    # Remove qualquer cargo que esse membro já ocupasse (só pode ter 1 por vez).
    DiretoriaEmbaixada.objects.filter(membro=membro).delete()

    if payload.cargo:
        # Troca automática: quem ocupava esse cargo nessa embaixada perde o cargo.
        DiretoriaEmbaixada.objects.filter(embaixada=membro.embaixada, cargo=payload.cargo).delete()
        DiretoriaEmbaixada.objects.create(
            embaixada=membro.embaixada,
            membro=membro,
            cargo=payload.cargo,
            data_inicio=date.today(),
        )

    return membro
