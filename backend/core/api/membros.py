"""
Endpoints de gestão de Membros (conselheiro, auxiliar, embaixador do rei).

Regras de acesso (cadastro descentralizado):
- Diretoria: lê e escreve membros de qualquer embaixada.
- Conselheiro: lê e escreve membros da própria embaixada — qualquer tipo (inclusive outro conselheiro), sem precisar de
  aprovação da Diretoria. Quem aprova/escolhe conselheiros é a igreja da embaixada, não o DAER.
- Auxiliar: só lê os membros da própria embaixada (qualquer tipo) — não cria, edita nem exclui.
- Embaixador do Rei: sem acesso a estes endpoints de gestão — usa /api/auth/me/ e /api/carteirinhas/me/ para ver os seus dados.
"""
import logging
from datetime import date
from typing import Optional

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from ninja import Field, Query, Router, Schema
from ninja.errors import HttpError

from .erros import R400, R401, R403, R404
from ..auth import AuthBearer, contar_falha, exigir_senha, membro_do_usuario
from ..models import Consulado, DiretoriaEmbaixada, Embaixada, Membro, TipoMembro
from ..senhas import enviar_link_definir_senha, gerar_senha_temporaria

logger = logging.getLogger(__name__)
User = get_user_model()  # e apague o "User = get_user_model()" de dentro de criar_acesso
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
    "O cargo `consul` vem de liderar um consulado (ver `/consulados/`); os demais são definidos via "
    "`PUT /membros/{id}/cargo-embaixada/`, não neste endpoint."
)
_DESC_NOME_RESPONSAVEL = "Nome do responsável — só relevante para tipo `embaixador_do_rei` (é menor de idade)."
_DESC_TELEFONE_RESPONSAVEL = "Telefone do responsável — só relevante para tipo `embaixador_do_rei`."
_DESC_FAIXA_ETARIA = (
    "Faixa etária calculada a partir de `data_nascimento`, só quando `tipo` é `embaixador_do_rei`: `junior` (9-11 anos), "
    "`adolescente` (12-14) ou `juvenil` (15-17). `null` fora dessa faixa ou para os demais tipos. "
    "Não é um campo salvo no banco, não dá pra alterar."
)
_DESC_ADAPTACOES = (
    "Adaptações de que o embaixador precisa nas atividades (ex.: tempo adicional em provas escritas, letras ampliadas). "
    "Só relevante para tipo `embaixador_do_rei`. Dado sensível: registre a necessidade, não o diagnóstico. "
    "Visível apenas para a Diretoria, o conselheiro e o auxiliar da própria embaixada e o próprio embaixador "
    "(`/api/auth/me/`). Edição restrita à Diretoria e ao conselheiro da embaixada."
)


def _validar_posto(tipo: str, posto_embaixador: Optional[str]):
    if tipo == TipoMembro.EMBAIXADOR_DO_REI and not posto_embaixador:
        raise HttpError(400, "posto_embaixador é obrigatório quando tipo = embaixador_do_rei.")
    if tipo != TipoMembro.EMBAIXADOR_DO_REI and posto_embaixador:
        raise HttpError(400, "posto_embaixador só deve ser preenchido quando tipo = embaixador_do_rei.")


def _validar_adaptacoes(tipo: str, adaptacoes: str):
    if adaptacoes and tipo != TipoMembro.EMBAIXADOR_DO_REI:
        raise HttpError(400, "adaptacoes só deve ser preenchido quando tipo = embaixador_do_rei.")


def _pode_gerenciar_embaixada(membro_logado: Membro, embaixada_id: int) -> bool:
    """Escrita (criar/editar/excluir) — Diretoria ou conselheiro da própria embaixada."""
    if membro_logado.eh_diretoria:
        return True
    return membro_logado.tipo == TipoMembro.CONSELHEIRO and membro_logado.embaixada_id == embaixada_id


def _queryset_visivel(request):
    """Leitura — Diretoria vê tudo; conselheiro e auxiliar veem a própria embaixada."""
    membro_logado = membro_do_usuario(request.auth)
    qs = Membro.objects.select_related("embaixada", "user").prefetch_related("cargos_embaixada")

    if membro_logado.eh_diretoria:
        return qs
    if membro_logado.tipo in (TipoMembro.CONSELHEIRO, TipoMembro.AUXILIAR):
        return qs.filter(embaixada_id=membro_logado.embaixada_id)
    # Embaixador do Rei: sem acesso à listagem de gestão.
    raise HttpError(403, "Sem permissão para listar membros. Use /api/auth/me/.")


def _exigir_poder_sobre_acesso(membro_logado: Membro, alvo: Membro) -> None:
    """Quem não é da Diretoria não mexe nas credenciais (senha/e-mail) nem no tipo de quem é."""
    if alvo.eh_diretoria and not membro_logado.eh_diretoria:
        raise HttpError(403, "Só a Diretoria pode alterar o acesso de um membro da Diretoria.")


def _membro_com_acesso(request, membro_id: int) -> tuple[Membro, Membro]:
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro.objects.select_related("user"), pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode gerenciar membros da sua própria embaixada.")
    if membro.user is None:
        raise HttpError(400, "Esse membro ainda não tem acesso.")
    return membro_logado, membro


def _gerar_username(nome: str) -> str:
    partes = slugify(nome).split("-")  # slugify tira acentos: "João da Silva" -> joao-da-silva
    base = f"{partes[0]}_{partes[-1]}" if len(partes) > 1 else (partes[0] or "membro")
    candidato, n = base, 1
    while User.objects.filter(username__iexact=candidato).exists():
        n += 1
        candidato = f"{base}{n}"
    return candidato


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
    adaptacoes: str = Field("", description=_DESC_ADAPTACOES)
    embaixada_id: int
    embaixada_nome: str
    ativo: bool
    idade: int
    faixa_etaria: Optional[str] = Field(None, description=_DESC_FAIXA_ETARIA)
    tem_acesso: bool = Field(...,
                             description="Se o membro já tem login (Django User) criado — ver POST .../criar-acesso/.")
    convite_pendente: bool = Field(False, description="Tem login criado mas ainda não definiu a senha.")
    usuario: Optional[str] = None
    consulado_id: Optional[int] = None
    consulado_nome: Optional[str] = None
    eh_consul: bool = Field(False, description="Se o membro é o cônsul (líder) do consulado a que pertence.")

    @staticmethod
    def resolve_consulado_nome(obj: Membro) -> Optional[str]:
        return obj.consulado.nome if obj.consulado_id else None

    @staticmethod
    def resolve_eh_consul(obj: Membro) -> bool:
        return obj.consulado_id is not None and obj.consulado.consul_id == obj.pk

    @staticmethod
    def resolve_convite_pendente(obj: Membro) -> bool:
        return obj.user is not None and not obj.user.has_usable_password()

    @staticmethod
    def resolve_usuario(obj: Membro) -> Optional[str]:
        return obj.user.username if obj.user else None


    @staticmethod
    def resolve_cargo_embaixada(obj: Membro) -> Optional[str]:
        if obj.consulado_id is not None and obj.consulado.consul_id == obj.pk:
            return "consul"
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
    adaptacoes: str = Field("", max_length=500, description=_DESC_ADAPTACOES)
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
    adaptacoes: Optional[str] = Field(None, max_length=500, description=_DESC_ADAPTACOES)
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None
    senha_confirmacao: Optional[str] = Field(
        None,
        description="Sua senha. Obrigatória ao mudar o `tipo` de um membro ou o e-mail de um membro que já tem acesso.",
    )


class MembroFiltros(Schema):
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None
    faixa_etaria: Optional[str] = Field(None, description=_DESC_FAIXA_ETARIA)
    tipo: Optional[str] = Field(None, description=_DESC_TIPO)


class CriarAcessoIn(Schema):
    senha_confirmacao: str = Field(..., description="Sua própria senha (reautenticação).")
    senha_temporaria: Optional[str] = Field(
        None,
        description=(
            "Opcional. Com e-mail: se omitida, o membro recebe um link para definir a senha. "
            "Sem e-mail: se omitida, o sistema gera uma senha temporária e a devolve uma única vez. "
            "Em qualquer caso com senha temporária, o membro precisa trocá-la no primeiro acesso."
        ),
    )


class AcessoCriadoOut(Schema):
    detail: str
    usuario: Optional[str] = Field(None, description="Nome de usuário para o login (e-mail ou usuário gerado).")
    senha_temporaria: Optional[str] = Field(None,
                                            description="Só vem quando gerada pelo sistema. Mostrada uma única vez.")


class CargoEmbaixadaIn(Schema):
    cargo: Optional[str] = Field(
        None,
        description=(
            "Cargo na diretoria da embaixada, ou `null` para remover o membro do quadro. "
            "Valores: `embaixador_chefe`, `embaixador_assistente`, `secretario`, `intendente`, `porta_voz`, "
            "`tesoureiro`, `diretor_musica`, `diretor_esportes`."
        ),
    )


class ConsuladoDoMembroIn(Schema):
    consulado_id: Optional[int] = Field(
        None,
        description="Consulado de destino (da mesma embaixada do membro) ou `null` para tirar o membro do consulado.",
    )


class SenhaTemporariaIn(Schema):
    senha_confirmacao: str = Field(..., description="Sua própria senha (reautenticação).")
    senha_temporaria: Optional[str] = Field(None,
                                            description="Senha temporária a ser atribuída ao membro (ele precisará trocá-la no primeiro acesso).")


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

    400 se `posto_embaixador` não combinar com o `tipo` e se `adaptacoes` for preenchido para um tipo que não é embaixador_do_rei;
    404 se a embaixada não existir. E-mail vazio é gravado como `null`.
    """
    membro_logado = membro_do_usuario(request.auth)
    if not _pode_gerenciar_embaixada(membro_logado, payload.embaixada_id):
        raise HttpError(403, "Você só pode cadastrar membros na sua própria embaixada.")

    _validar_posto(payload.tipo, payload.posto_embaixador)
    adaptacoes = payload.adaptacoes.strip()
    _validar_adaptacoes(payload.tipo, adaptacoes)
    embaixada = get_object_or_404(Embaixada, pk=payload.embaixada_id)
    dados = payload.dict(exclude={"embaixada_id"})
    dados["email"] = dados["email"] or None
    dados["adaptacoes"] = adaptacoes
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

    400 se `posto_embaixador` não combinar com o `tipo`;
    404 se o membro ou a nova embaixada não existirem. E-mail vazio é gravado como `null`.
    """
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro.objects.select_related("user"), pk=membro_id)
    embaixada_original_id = membro.embaixada_id
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode editar membros da sua própria embaixada.")

    dados = payload.dict(exclude_unset=True)
    senha_confirmacao = dados.pop("senha_confirmacao", None)  # não é campo do modelo
    if "email" in dados:
        dados["email"] = dados["email"] or None
    if "adaptacoes" in dados:
        dados["adaptacoes"] = (dados["adaptacoes"] or "").strip()  # null viraria erro 500 (campo não aceita null)
    if "embaixada_id" in dados:
        nova_embaixada_id = dados.pop("embaixada_id")
        if not _pode_gerenciar_embaixada(membro_logado, nova_embaixada_id):
            raise HttpError(403, "Você não pode transferir este membro para essa embaixada.")
        membro.embaixada = get_object_or_404(Embaixada, pk=nova_embaixada_id)

    tipo_final = dados.get("tipo", membro.tipo)
    posto_final = dados.get("posto_embaixador", membro.posto_embaixador)
    _validar_posto(tipo_final, posto_final)
    _validar_adaptacoes(tipo_final, dados.get("adaptacoes", membro.adaptacoes))

    # Ações que mexem em poder/acesso: exigem a senha de quem está fazendo.
    tipo_muda = "tipo" in dados and dados["tipo"] != membro.tipo
    email_muda = "email" in dados and membro.user_id is not None and dados["email"] != membro.email
    if tipo_muda or email_muda:
        _exigir_poder_sobre_acesso(membro_logado, membro)
        if not senha_confirmacao:
            raise HttpError(400, "Informe sua senha para confirmar esta alteração.")
        exigir_senha(request, senha_confirmacao)

    # Mudou de embaixada ou deixou de ser Embaixador do Rei: sai do consulado. Cônsul precisa ser trocado antes.
    embaixada_muda = membro.embaixada_id != embaixada_original_id
    deixa_de_ser_er = tipo_muda and dados["tipo"] != TipoMembro.EMBAIXADOR_DO_REI
    if membro.consulado_id and (embaixada_muda or deixa_de_ser_er):
        if Consulado.objects.filter(consul=membro).exists():
            raise HttpError(400, "Este membro é cônsul de um consulado. Troque o cônsul antes de mudar a embaixada ou o tipo dele.")
        membro.consulado = None

    ativo_muda = "ativo" in dados and dados["ativo"] != membro.ativo
    if ativo_muda:
        _exigir_poder_sobre_acesso(membro_logado, membro)
        if membro.pk == membro_logado.pk and not dados["ativo"]:
            raise HttpError(400, "Você não pode inativar a si mesmo.")

    # Um membro com mandato ativo precisa continuar conselheiro (a Diretoria só aceita conselheiros).
    if (tipo_muda and dados["tipo"] != TipoMembro.CONSELHEIRO
            and membro.mandatos_diretoria.filter(data_fim__isnull=True).exists()):
        raise HttpError(400, "Encerre o mandato na Diretoria antes de mudar o tipo deste membro.")

    # O usuário só acompanha o e-mail se a conta foi criada com e-mail; contas sem e-mail mantêm o usuário gerado.
    username_segue_email = bool(
        membro.user_id and membro.email and membro.user.username.lower() == membro.email.lower()
    )
    if email_muda and username_segue_email:
        if not dados["email"]:
            raise HttpError(400, "Este membro entra com o e-mail; não é possível removê-lo.")
        if User.objects.filter(username__iexact=dados["email"]).exclude(pk=membro.user_id).exists():
            raise HttpError(400, "Já existe um usuário do sistema com esse e-mail.")

    with transaction.atomic():
        for campo, valor in dados.items():
            setattr(membro, campo, valor)
        if email_muda:
            campos = {"email": dados["email"] or ""}
            if username_segue_email:
                campos["username"] = dados["email"]
            User.objects.filter(pk=membro.user_id).update(**campos)
            membro.versao_token += 1  # o e-mail é o canal de recuperação: derruba as sessões abertas
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
    membro = get_object_or_404(Membro.objects.select_related("user"), pk=membro_id)
    _exigir_poder_sobre_acesso(membro_logado, membro)
    if membro.pk == membro_logado.pk:
        raise HttpError(400, "Você não pode excluir a si mesmo.")
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você não pode excluir este membro.")
    user = membro.user
    with transaction.atomic():
        membro.delete()
        # Não deixa um login órfão (ativo e com o e-mail preso). Contas de staff/superusuário ficam.
        if user is not None and not (user.is_staff or user.is_superuser):
            user.delete()
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

    400 se o membro já tiver acesso, se não tiver e-mail cadastrado, se já existir outro usuário do sistema com esse
    e-mail ou se a senha não passar nos validadores do Django.
    """
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode criar acesso para membros da sua própria embaixada.")
    _exigir_poder_sobre_acesso(membro_logado, membro)
    exigir_senha(request, payload.senha_confirmacao)

    if membro.user_id is not None:
        raise HttpError(400, "Esse membro já tem acesso criado.")

    email_dividido = bool(membro.email) and Membro.objects.filter(
        email__iexact=membro.email
    ).exclude(pk=membro.pk).exists()
    if membro.email and not email_dividido and not User.objects.filter(username__iexact=membro.email).exists():
        username = membro.email
    else:
        username = _gerar_username(membro.nome)  # sem e-mail, ou e-mail de outro membro/usuário

    gerada = False
    senha = payload.senha_temporaria
    if not senha and not membro.email:
        senha, gerada = gerar_senha_temporaria(), True
    if senha:
        try:
            validate_password(senha, user=User(username=username, email=membro.email or ""))
        except ValidationError as erro:
            raise HttpError(400, " ".join(erro.messages))

    with transaction.atomic():
        # Sem senha, create_user grava uma senha inutilizável: só entra depois de definir uma pelo link.
        user = User.objects.create_user(username=username, email=membro.email or "", password=senha)
        membro.user = user
        membro.deve_trocar_senha = bool(senha)
        membro.save(update_fields=["user", "deve_trocar_senha"])

    if senha:
        return 201, {
            "detail": "Acesso criado. O membro deverá trocar a senha no primeiro acesso.",
            "usuario": username,
            "senha_temporaria": senha if gerada else None,
        }
    try:
        enviar_link_definir_senha(membro, convite=True)
    except Exception:
        logger.exception("Falha ao enviar convite")
        return 201, {"detail": "Acesso criado, mas o e-mail não pôde ser enviado. Use 'Reenviar link'.",
                     "usuario": username}
    return 201, {
        "detail": f"Acesso criado. Enviamos um link para {membro.email} (remetente: daernil.oficial@gmail.com). Peça para conferir o spam.",
        "usuario": username}


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

    if payload.cargo:
        if payload.cargo not in DiretoriaEmbaixada.Cargo.values:
            raise HttpError(400, "Cargo inválido. Para cônsul, defina o líder no consulado (/consulados/).")
        if Consulado.objects.filter(consul=membro).exists():
            raise HttpError(400, "Este membro é cônsul. Um membro só pode ter um cargo — remova a liderança do consulado antes.")

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


@router.put(
    "/{membro_id}/consulado/",
    response={200: MembroOut, **R400, **R401, **R403, **R404},
    summary="Define o consulado do membro (só para embaixador do rei)",
    operation_id="definir_consulado_do_membro",
)
def definir_consulado_do_membro(request, membro_id: int, payload: ConsuladoDoMembroIn):
    """
    **Permissão:** Diretoria ou conselheiro da embaixada do membro.

    400 se o membro não for embaixador do rei, se o consulado for de outra embaixada ou se o membro for o cônsul de um
    consulado (troque o cônsul antes de movê-lo ou tirá-lo). 404 se o membro ou o consulado não existirem.
    """
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode editar consulados da sua própria embaixada.")
    if membro.tipo != TipoMembro.EMBAIXADOR_DO_REI:
        raise HttpError(400, "Só um Embaixador do Rei pode participar de um consulado.")

    lidera = Consulado.objects.filter(consul=membro).first()
    if lidera and payload.consulado_id != lidera.pk:
        raise HttpError(400, f"Este membro é o cônsul de {lidera.nome}. Troque o cônsul antes de movê-lo ou tirá-lo.")

    if payload.consulado_id is None:
        membro.consulado = None
    else:
        consulado = get_object_or_404(Consulado, pk=payload.consulado_id)
        if consulado.embaixada_id != membro.embaixada_id:
            raise HttpError(400, "O consulado precisa ser da mesma embaixada do membro.")
        membro.consulado = consulado
    membro.save(update_fields=["consulado"])
    return membro


@router.post(
    "/{membro_id}/enviar-link-senha/",
    response={200: AcessoCriadoOut, **R400, **R401, **R403, **R404},
    summary="Envia (ou reenvia) o link para o membro definir a senha",
    operation_id="enviar_link_senha",
)
def enviar_link_senha(request, membro_id: int):
    """Serve para reenviar convite e para o reset de senha pelo admin. O link vai para o e-mail do próprio membro."""
    _, membro = _membro_com_acesso(request, membro_id)
    if not membro.email:
        raise HttpError(400, "Esse membro não tem e-mail. Use 'Definir senha temporária'.")
    if not membro.ativo:
        raise HttpError(400, "Esse membro está inativo.")
    chave = f"link_senha_membro_{membro.pk}"
    if cache.get(chave, 0) >= 3:
        raise HttpError(429, "Link já enviado várias vezes. Aguarde antes de tentar de novo.")
    contar_falha(chave, 60 * 60)
    try:
        enviar_link_definir_senha(membro, convite=not membro.user.has_usable_password())
    except Exception:
        logger.exception("Falha ao enviar link de senha")
        raise HttpError(503, "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.")
    return {"detail": f"Link enviado para {membro.email}."}


@router.post(
    "/{membro_id}/definir-senha-temporaria/",
    response={200: AcessoCriadoOut, **R400, **R401, **R403, **R404},
    summary="Define uma senha temporária (o membro troca no primeiro acesso)",
    operation_id="definir_senha_temporaria",
)
def definir_senha_temporaria(request, membro_id: int, payload: SenhaTemporariaIn):
    membro_logado, membro = _membro_com_acesso(request, membro_id)
    _exigir_poder_sobre_acesso(membro_logado, membro)
    exigir_senha(request, payload.senha_confirmacao)
    gerada = not payload.senha_temporaria
    senha = payload.senha_temporaria or gerar_senha_temporaria()
    try:
        validate_password(senha, user=membro.user)
    except ValidationError as erro:
        raise HttpError(400, " ".join(erro.messages))
    membro.user.set_password(senha)
    membro.user.save(update_fields=["password"])
    membro.deve_trocar_senha = True
    membro.save(update_fields=["deve_trocar_senha"])
    return {"detail": "Senha temporária definida. O membro deverá trocá-la no primeiro acesso.",
            "usuario": membro.user.username,
            "senha_temporaria": senha if gerada else None}


@router.post(
    "/{membro_id}/revogar-sessoes/",
    response={200: AcessoCriadoOut, **R400, **R401, **R403, **R404},
    summary="Encerra todas as sessões abertas do membro",
    operation_id="revogar_sessoes",
)
def revogar_sessoes(request, membro_id: int):
    membro_logado, membro = _membro_com_acesso(request, membro_id)
    _exigir_poder_sobre_acesso(membro_logado, membro)
    Membro.objects.filter(pk=membro.pk).update(versao_token=F("versao_token") + 1)
    return {"detail": "Sessões encerradas."}
