"""Endpoints de autenticação: login (e-mail + senha) e dados da pessoa logada."""
from typing import Optional

from django.contrib.auth import authenticate
from ninja import Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, gerar_token, pessoa_do_usuario
from ..models import Pessoa

router = Router(tags=["auth"])


class LoginIn(Schema):
    email: str
    senha: str


class LoginOut(Schema):
    access_token: str
    pessoa_id: int
    nome: str
    papel: Optional[str] = None


class MeOut(Schema):
    pessoa_id: int
    nome: str
    embaixada_id: int
    embaixada_nome: str
    papel: Optional[str] = None
    cargo_diretoria: Optional[str] = None


@router.post("/login/", response=LoginOut, auth=None)
def login(request, payload: LoginIn):
    # O username do Django User é o e-mail da Pessoa (ver criação de acesso em pessoas.py).
    user = authenticate(request, username=payload.email, password=payload.senha)
    if user is None:
        raise HttpError(401, "E-mail ou senha inválidos.")

    pessoa = getattr(user, "pessoa", None)
    if pessoa is None:
        raise HttpError(403, "Este usuário não está vinculado a nenhuma Pessoa cadastrada.")

    papel = pessoa.papel_atual
    return LoginOut(
        access_token=gerar_token(user),
        pessoa_id=pessoa.id,
        nome=pessoa.nome,
        papel=papel.tipo if papel else None,
    )


@router.get("/me/", response=MeOut, auth=AuthBearer())
def me(request):
    pessoa = pessoa_do_usuario(request.auth)
    papel = pessoa.papel_atual
    return MeOut(
        pessoa_id=pessoa.id,
        nome=pessoa.nome,
        embaixada_id=pessoa.embaixada_id,
        embaixada_nome=pessoa.embaixada.nome,
        papel=papel.tipo if papel else None,
        cargo_diretoria=papel.cargo_diretoria if papel else None,
    )
