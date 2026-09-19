"""
Endpoints de gestão de Membros (conselheiro, auxiliar, embaixador do rei).

Regras de acesso (cadastro descentralizado):
- Diretoria: lê e escreve membros de qualquer embaixada.
- Conselheiro: lê e escreve membros da própria embaixada — qualquer tipo
  (inclusive outro conselheiro), sem precisar de aprovação da Diretoria.
  Quem aprova/escolhe conselheiros é a igreja dona da embaixada, não o DAER.
- Auxiliar: só lê os membros da própria embaixada (qualquer tipo) — não
  cria, edita nem exclui.
- Embaixador do Rei: sem acesso a estes endpoints de gestão — usa
  /api/auth/me/ e /api/carteirinhas/me/ para ver os próprios dados.
"""
from datetime import date
from typing import Optional

from django.contrib.auth.hashers import make_password
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import DiretoriaEmbaixada, Embaixada, Membro, TipoMembro

router = Router(tags=["membros"], auth=AuthBearer())


class MembroOut(Schema):
    id: int
    nome: str
    data_nascimento: date
    telefone_contato: str
    email: Optional[str] = None
    tipo: str
    posto_embaixador: Optional[str] = None
    cargo_embaixada: Optional[str] = None
    nome_responsavel: str
    telefone_responsavel: str
    embaixada_id: int
    embaixada_nome: str
    ativo: bool
    idade: int
    faixa_etaria: Optional[str] = None
    tem_acesso: bool

    @staticmethod
    def resolve_embaixada_nome(obj: Membro) -> str:
        return obj.embaixada.nome

    @staticmethod
    def resolve_cargo_embaixada(obj: Membro) -> Optional[str]:
        cargo = obj.cargos_embaixada.first()
        return cargo.cargo if cargo else None

    @staticmethod
    def resolve_tem_acesso(obj: Membro) -> bool:
        return obj.user_id is not None


class MembroIn(Schema):
    nome: str
    data_nascimento: date
    telefone_contato: str = ""
    email: Optional[str] = None
    tipo: str
    posto_embaixador: Optional[str] = None
    nome_responsavel: str = ""
    telefone_responsavel: str = ""
    embaixada_id: int
    ativo: bool = True


class MembroUpdate(Schema):
    nome: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone_contato: Optional[str] = None
    email: Optional[str] = None
    tipo: Optional[str] = None
    posto_embaixador: Optional[str] = None
    nome_responsavel: Optional[str] = None
    telefone_responsavel: Optional[str] = None
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None


class MembroFiltros(Schema):
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None
    faixa_etaria: Optional[str] = None
    tipo: Optional[str] = None


class CriarAcessoIn(Schema):
    senha: str


def _validar_posto(tipo: str, posto_embaixador: Optional[str]):
    if tipo == TipoMembro.EMBAIXADOR_DO_REI and not posto_embaixador:
        raise HttpError(400, "posto_embaixador é obrigatório quando tipo = embaixador_do_rei.")
    if tipo != TipoMembro.EMBAIXADOR_DO_REI and posto_embaixador:
        raise HttpError(400, "posto_embaixador só deve ser preenchido quando tipo = embaixador_do_rei.")


def _pode_gerenciar_embaixada(membro_logado: Membro, embaixada_id: int) -> bool:
    """Escrita (criar/editar/excluir) — Diretoria ou conselheiro da própria embaixada."""
    if membro_logado.eh_diretoria:
        return True
    return membro_logado.tipo == TipoMembro.CONSELHEIRO and membro_logado.embaixada_id == embaixada_id


def _queryset_visivel(request):
    """Leitura — Diretoria vê tudo; conselheiro e auxiliar veem a própria embaixada."""
    membro_logado = membro_do_usuario(request.auth)
    qs = Membro.objects.select_related("embaixada")

    if membro_logado.eh_diretoria:
        return qs
    if membro_logado.tipo in (TipoMembro.CONSELHEIRO, TipoMembro.AUXILIAR):
        return qs.filter(embaixada_id=membro_logado.embaixada_id)
    # Embaixador do Rei: sem acesso à listagem de gestão.
    raise HttpError(403, "Sem permissão para listar membros. Use /api/auth/me/.")


@router.get("/", response=list[MembroOut])
def listar_membros(request, filtros: MembroFiltros = Query(...)):
    qs = _queryset_visivel(request)

    if filtros.embaixada_id is not None:
        qs = qs.filter(embaixada_id=filtros.embaixada_id)
    if filtros.ativo is not None:
        qs = qs.filter(ativo=filtros.ativo)
    if filtros.tipo:
        qs = qs.filter(tipo=filtros.tipo)

    # faixa_etaria é calculada em Python (property, não é campo de banco) —
    # por isso filtra depois da query. Se a lista crescer muito, vale migrar
    # pra uma annotation SQL no futuro.
    if filtros.faixa_etaria:
        qs = [m for m in qs if m.faixa_etaria == filtros.faixa_etaria]

    return qs


@router.get("/{membro_id}/", response=MembroOut)
def detalhar_membro(request, membro_id: int):
    qs = _queryset_visivel(request)
    return get_object_or_404(qs, pk=membro_id)


@router.post("/", response={201: MembroOut})
def criar_membro(request, payload: MembroIn):
    membro_logado = membro_do_usuario(request.auth)
    if not _pode_gerenciar_embaixada(membro_logado, payload.embaixada_id):
        raise HttpError(403, "Você só pode cadastrar membros na sua própria embaixada.")
    _validar_posto(payload.tipo, payload.posto_embaixador)

    embaixada = get_object_or_404(Embaixada, pk=payload.embaixada_id)
    dados = payload.dict(exclude={"embaixada_id"})
    membro = Membro.objects.create(embaixada=embaixada, **dados)
    return 201, membro


@router.put("/{membro_id}/", response=MembroOut)
def atualizar_membro(request, membro_id: int, payload: MembroUpdate):
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode editar membros da sua própria embaixada.")

    dados = payload.dict(exclude_unset=True)
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


@router.delete("/{membro_id}/", response={204: None})
def excluir_membro(request, membro_id: int):
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode excluir membros da sua própria embaixada.")
    membro.delete()
    return 204, None


@router.post("/{membro_id}/criar-acesso/", response={201: dict})
def criar_acesso(request, membro_id: int, payload: CriarAcessoIn):
    """
    Cria o login (Django User) de um Membro que ainda não tem conta —
    usado pela Diretoria ou por um conselheiro da própria embaixada para
    dar acesso a um membro recém-cadastrado. Requer que o Membro já tenha
    um e-mail cadastrado (vira o username).
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

    user = User.objects.create(
        username=membro.email,
        email=membro.email,
        password=make_password(payload.senha),
    )
    membro.user = user
    membro.save(update_fields=["user"])
    return 201, {"detail": "Acesso criado com sucesso."}


class CargoEmbaixadaIn(Schema):
    cargo: Optional[str] = None  # None = remover do quadro de oficiais


@router.put("/{membro_id}/cargo-embaixada/", response=MembroOut)
def definir_cargo_embaixada(request, membro_id: int, payload: CargoEmbaixadaIn):
    """
    Define (ou remove, se cargo=None) o cargo do membro no quadro de
    oficiais da própria embaixada. Só para tipo=embaixador_do_rei. Atribuir
    um cargo já ocupado por outro membro troca o titular automaticamente
    (sem manter histórico — a rotação é informal, ~1 ano).
    """
    membro_logado = membro_do_usuario(request.auth)
    membro = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_embaixada(membro_logado, membro.embaixada_id):
        raise HttpError(403, "Você só pode editar o quadro de oficiais da sua própria embaixada.")
    if membro.tipo != TipoMembro.EMBAIXADOR_DO_REI:
        raise HttpError(400, "Só um Embaixador do Rei pode ocupar cargo no quadro de oficiais.")

    # Remove qualquer cargo que esse membro já ocupasse (só pode ter 1 por vez).
    DiretoriaEmbaixada.objects.filter(membro=membro).delete()

    if payload.cargo:
        # Troca automática: quem ocupava esse cargo nessa embaixada perde o posto.
        DiretoriaEmbaixada.objects.filter(embaixada=membro.embaixada, cargo=payload.cargo).delete()
        DiretoriaEmbaixada.objects.create(
            embaixada=membro.embaixada,
            membro=membro,
            cargo=payload.cargo,
            data_inicio=date.today(),
        )

    return membro
