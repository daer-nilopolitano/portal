"""Endpoints de autenticação: login (e-mail + senha) e dados do membro logado."""
from typing import Optional

from django.contrib.auth import authenticate
from ninja import Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, gerar_token, membro_do_usuario
from ..models import Membro

router = Router(tags=["auth"])


def _cargo_diretoria_ativo(membro: Membro) -> Optional[str]:
    mandato = membro.mandatos_diretoria.filter(data_fim__isnull=True).first()
    return mandato.cargo if mandato else None


class LoginIn(Schema):
    email: str
    senha: str


class LoginOut(Schema):
    access_token: str
    membro_id: int
    nome: str
    tipo: str
    posto_embaixador: Optional[str] = None
    cargo_diretoria: Optional[str] = None


class MeOut(Schema):
    membro_id: int
    nome: str
    embaixada_id: int
    embaixada_nome: str
    tipo: str
    posto_embaixador: Optional[str] = None
    cargo_diretoria: Optional[str] = None


@router.post("/login/", response=LoginOut, auth=None)
def login(request, payload: LoginIn):
    # O username do Django User é o e-mail do Membro (ver criação de acesso em membros.py).
    user = authenticate(request, username=payload.email, password=payload.senha)
    if user is None:
        raise HttpError(401, "E-mail ou senha inválidos.")

    membro = getattr(user, "membro", None)
    if membro is None:
        raise HttpError(403, "Este usuário não está vinculado a nenhum Membro cadastrado.")

    return LoginOut(
        access_token=gerar_token(user),
        membro_id=membro.id,
        nome=membro.nome,
        tipo=membro.tipo,
        posto_embaixador=membro.posto_embaixador,
        cargo_diretoria=_cargo_diretoria_ativo(membro),
    )


@router.get("/me/", response=MeOut, auth=AuthBearer())
def me(request):
    membro = membro_do_usuario(request.auth)
    return MeOut(
        membro_id=membro.id,
        nome=membro.nome,
        embaixada_id=membro.embaixada_id,
        embaixada_nome=membro.embaixada.nome,
        tipo=membro.tipo,
        posto_embaixador=membro.posto_embaixador,
        cargo_diretoria=_cargo_diretoria_ativo(membro),
    )
