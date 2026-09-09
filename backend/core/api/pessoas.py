"""
Endpoints de gestão de Pessoas (diretoria, conselheiros, embaixadores do rei).

Regras de acesso (cadastro descentralizado, conforme decidido no planejamento):
- Diretoria: lê e escreve pessoas de qualquer embaixada.
- Conselheiro: lê e escreve só pessoas da própria embaixada (a que ele é
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

from ..auth import AuthBearer, pessoa_do_usuario
from ..models import Embaixada, Papel, Pessoa

router = Router(tags=["pessoas"], auth=AuthBearer())


class PessoaOut(Schema):
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
    def resolve_embaixada_nome(obj: Pessoa) -> str:
        return obj.embaixada.nome

    @staticmethod
    def resolve_tem_acesso(obj: Pessoa) -> bool:
        return obj.user_id is not None


class PessoaIn(Schema):
    nome: str
    data_nascimento: date
    telefone_contato: str = ""
    email: Optional[str] = None
    nome_responsavel: str = ""
    telefone_responsavel: str = ""
    embaixada_id: int
    ativo: bool = True


class PessoaUpdate(Schema):
    nome: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone_contato: Optional[str] = None
    email: Optional[str] = None
    nome_responsavel: Optional[str] = None
    telefone_responsavel: Optional[str] = None
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None


class PessoaFiltros(Schema):
    embaixada_id: Optional[int] = None
    ativo: Optional[bool] = None
    # Filtros calculados em Python (não são campos de banco) — ver nota na view.
    faixa_etaria: Optional[str] = None
    papel: Optional[str] = None


class CriarAcessoIn(Schema):
    senha: str


def _pode_gerenciar_embaixada(pessoa_logada: Pessoa, embaixada_id: int) -> bool:
    papel = pessoa_logada.papel_atual
    if papel and papel.tipo == Papel.Tipo.DIRETORIA:
        return True
    if papel and papel.tipo == Papel.Tipo.CONSELHEIRO:
        return Embaixada.objects.filter(
            pk=embaixada_id, conselheiro_responsavel=pessoa_logada
        ).exists()
    return False


def _queryset_visivel(request):
    """Restringe o queryset de Pessoa ao escopo de quem está logado."""
    pessoa_logada = pessoa_do_usuario(request.auth)
    papel = pessoa_logada.papel_atual
    qs = Pessoa.objects.select_related("embaixada")

    if papel and papel.tipo == Papel.Tipo.DIRETORIA:
        return qs
    if papel and papel.tipo == Papel.Tipo.CONSELHEIRO:
        return qs.filter(embaixada__conselheiro_responsavel=pessoa_logada)
    # Embaixador do Rei (ou sem papel definido): sem acesso à listagem de gestão.
    raise HttpError(403, "Sem permissão para listar pessoas. Use /api/auth/me/.")


@router.get("/", response=list[PessoaOut])
def listar_pessoas(request, filtros: PessoaFiltros = Query(...)):
    qs = _queryset_visivel(request)

    if filtros.embaixada_id is not None:
        qs = qs.filter(embaixada_id=filtros.embaixada_id)
    if filtros.ativo is not None:
        qs = qs.filter(ativo=filtros.ativo)

    # faixa_etaria e papel são calculados em Python (não são campos de banco, faixa_etaria é property e papel_atual depende
    # de datas) — por isso filtram em Python. Se a lista de pessoas crescer muito, vale migrar para annotations SQL no futuro.
    if filtros.faixa_etaria:
        qs = [p for p in qs if p.faixa_etaria == filtros.faixa_etaria]
    if filtros.papel:
        qs = [p for p in qs if p.papel_atual and p.papel_atual.tipo == filtros.papel]

    return qs


@router.get("/{pessoa_id}/", response=PessoaOut)
def detalhar_pessoa(request, pessoa_id: int):
    qs = _queryset_visivel(request)
    return get_object_or_404(qs, pk=pessoa_id)


@router.post("/", response={201: PessoaOut})
def criar_pessoa(request, payload: PessoaIn):
    pessoa_logada = pessoa_do_usuario(request.auth)
    if not _pode_gerenciar_embaixada(pessoa_logada, payload.embaixada_id):
        raise HttpError(403, "Você só pode cadastrar pessoas na sua própria embaixada.")

    embaixada = get_object_or_404(Embaixada, pk=payload.embaixada_id)
    dados = payload.dict(exclude={"embaixada_id"})
    pessoa = Pessoa.objects.create(embaixada=embaixada, **dados)
    return 201, pessoa


@router.put("/{pessoa_id}/", response=PessoaOut)
def atualizar_pessoa(request, pessoa_id: int, payload: PessoaUpdate):
    pessoa_logada = pessoa_do_usuario(request.auth)
    pessoa = get_object_or_404(Pessoa, pk=pessoa_id)
    if not _pode_gerenciar_embaixada(pessoa_logada, pessoa.embaixada_id):
        raise HttpError(403, "Você só pode editar pessoas da sua própria embaixada.")

    dados = payload.dict(exclude_unset=True)
    if "embaixada_id" in dados:
        nova_embaixada_id = dados.pop("embaixada_id")
        if not _pode_gerenciar_embaixada(pessoa_logada, nova_embaixada_id):
            raise HttpError(403, "Você não pode transferir esta pessoa para essa embaixada.")
        pessoa.embaixada = get_object_or_404(Embaixada, pk=nova_embaixada_id)
    for campo, valor in dados.items():
        setattr(pessoa, campo, valor)
    pessoa.save()
    return pessoa


@router.delete("/{pessoa_id}/", response={204: None})
def excluir_pessoa(request, pessoa_id: int):
    pessoa_logada = pessoa_do_usuario(request.auth)
    pessoa = get_object_or_404(Pessoa, pk=pessoa_id)
    if not _pode_gerenciar_embaixada(pessoa_logada, pessoa.embaixada_id):
        raise HttpError(403, "Você só pode excluir pessoas da sua própria embaixada.")
    pessoa.delete()
    return 204, None


@router.post("/{pessoa_id}/criar-acesso/", response={201: dict})
def criar_acesso(request, pessoa_id: int, payload: CriarAcessoIn):
    """
    Cria o login (Django User) de uma Pessoa que ainda não tem conta —
    usado pela Diretoria ou pelo conselheiro responsável para dar acesso a
    um embaixador/conselheiro recém-cadastrado. Requer que a Pessoa já
    tenha um e-mail cadastrado (vira o username).
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()

    pessoa_logada = pessoa_do_usuario(request.auth)
    pessoa = get_object_or_404(Pessoa, pk=pessoa_id)
    if not _pode_gerenciar_embaixada(pessoa_logada, pessoa.embaixada_id):
        raise HttpError(403, "Você só pode criar acesso para pessoas da sua própria embaixada.")

    if pessoa.user_id is not None:
        raise HttpError(400, "Essa pessoa já tem acesso criado.")
    if not pessoa.email:
        raise HttpError(400, "Cadastre um e-mail para essa pessoa antes de criar o acesso.")

    user = User.objects.create(
        username=pessoa.email,
        email=pessoa.email,
        password=make_password(payload.senha),
    )
    pessoa.user = user
    pessoa.save(update_fields=["user"])
    return 201, {"detail": "Acesso criado com sucesso."}
