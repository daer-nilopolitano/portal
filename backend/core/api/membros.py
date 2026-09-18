"""
Endpoints de gestão de Membros (diretoria, conselheiros, embaixadores do rei).

Regras de acesso (cadastro descentralizado, conforme decidido no planejamento):
- Diretoria: lê e escreve membros de qualquer embaixada.
- Conselheiro: lê e escreve só membros da própria embaixada (a que ele é
  responsável).
- Embaixador do Rei: não tem acesso a estes endpoints de gestão — usa
  /api/auth/me/ e /api/carteirinhas/me/ para ver os próprios dados.
"""
from datetime import date
from typing import Optional

from django.contrib.auth.hashers import make_password
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import Embaixada, Membro, Papel

router = Router(tags=["membros"], auth=AuthBearer())


class MembroOut(Schema):
    id: int
    nome: str
    data_nascimento: date
    telefone_contato: str
    email: Optional[str] = None
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
    def resolve_tem_acesso(obj: Membro) -> bool:
        return obj.user_id is not None


class MembroIn(Schema):
    nome: str
    data_nascimento: date
    telefone_contato: str = ""
    email: Optional[str] = None
    nome_responsavel: str = ""
    telefone_responsavel: str = ""
    embaixada_id: int
    ativo: bool = True


class MembroUpdate(Schema):
    nome: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone_contato: Optional[str] = None
    email: Optional[str] = None
    nome_responsavel: Optional[str] = None
    telefone_responsavel: Optional[str] = None
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None


class MembroFiltros(Schema):
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None
    # Filtros calculados em Python (não são campos de banco) — ver nota na view.
    faixa_etaria: Optional[str] = None
    papel: Optional[str] = None


class CriarAcessoIn(Schema):
    senha: str


def _pode_gerenciar_embaixada(membro_logado: Membro, embaixada_id: int) -> bool:
    papel = membro_logado.papel_atual
    if papel and papel.tipo == Papel.Tipo.DIRETORIA:
        return True
    if papel and papel.tipo == Papel.Tipo.CONSELHEIRO:
        return Embaixada.objects.filter(
            pk=embaixada_id, conselheiro_responsavel=membro_logado
        ).exists()
    return False


def _queryset_visivel(request):
    """Restringe o queryset de Membro ao escopo de quem está logado."""
    membro_logado = membro_do_usuario(request.auth)
    papel = membro_logado.papel_atual
    qs = Membro.objects.select_related("embaixada")

    if papel and papel.tipo == Papel.Tipo.DIRETORIA:
        return qs
    if papel and papel.tipo == Papel.Tipo.CONSELHEIRO:
        return qs.filter(embaixada__conselheiro_responsavel=membro_logado)
    # Embaixador do Rei (ou sem papel definido): sem acesso à listagem de gestão.
    raise HttpError(403, "Sem permissão para listar membros. Use /api/auth/me/.")


@router.get("/", response=list[MembroOut])
def listar_membros(request, filtros: MembroFiltros = Query(...)):
    qs = _queryset_visivel(request)

    if filtros.embaixada_id is not None:
        qs = qs.filter(embaixada_id=filtros.embaixada_id)
    if filtros.ativo is not None:
        qs = qs.filter(ativo=filtros.ativo)

    # faixa_etaria e papel são calculados em Python (não são campos de banco, faixa_etaria é property e papel_atual depende
    # de datas) — por isso filtram em Python. Se a lista de membros crescer muito, vale migrar para annotations SQL no futuro.
    if filtros.faixa_etaria:
        qs = [m for m in qs if m.faixa_etaria == filtros.faixa_etaria]
    if filtros.papel:
        qs = [m for m in qs if m.papel_atual and m.papel_atual.tipo == filtros.papel]

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
    usado pela Diretoria ou pelo conselheiro responsável para dar acesso a
    um embaixador/conselheiro recém-cadastrado. Requer que o Membro já
    tenha um e-mail cadastrado (vira o username).
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
