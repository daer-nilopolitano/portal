"""Endpoints de autenticação: login (e-mail + senha) e dados do membro logado."""
from typing import Optional

from django.contrib.auth import authenticate
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, gerar_token, membro_do_usuario
from ..models import Membro
from .erros import R401, R403

router = Router(tags=["Autenticação"])

_DESC_TIPO = (
    "Tipo do membro: `conselheiro`, `auxiliar` ou `embaixador_do_rei`."
)
_DESC_POSTO = (
    "Posto do Embaixador do Rei — só vem preenchido quando tipo é "
    "`embaixador_do_rei`. Valores: `escudeiro`, `arauto`, `senior`, `emerito`."
)


def _cargo_diretoria_ativo(membro: Membro) -> Optional[str]:
    mandato = membro.mandatos_diretoria.filter(data_fim__isnull=True).first()
    return mandato.cargo if mandato else None


class LoginIn(Schema):
    email: str = Field(..., examples=["conselheiro@exemplo.org"])
    senha: str


class LoginOut(Schema):
    access_token: str
    membro_id: int
    nome: str
    tipo: str = Field(..., description=_DESC_TIPO)
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    cargo_diretoria: Optional[str] = Field(
        None,
        description=(
            "Cargo do membro na Diretoria da associação, se ele tiver mandato "
            "ativo — caso contrário, `null`."
        ),
    )


class MeOut(Schema):
    membro_id: int
    nome: str
    embaixada_id: int
    embaixada_nome: str
    tipo: str = Field(..., description=_DESC_TIPO)
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    cargo_diretoria: Optional[str] = Field(
        None,
        description=(
            "Cargo do membro na Diretoria da associação, se ele tiver mandato "
            "ativo — caso contrário, `null`."
        ),
    )


@router.post(
    "/login/",
    response={200: LoginOut, **R401, **R403},
    auth=None,
    summary="Login com e-mail e senha",
    operation_id="login",
)
def login(request, payload: LoginIn):
    """
    Autentica com e-mail e senha e devolve um `access_token` (JWT). Envie-o
    nas próximas requisições como `Authorization: Bearer <token>`.

    401 se e-mail ou senha estiverem errados; 403 se o usuário existir, mas
    não estiver vinculado a nenhum Membro cadastrado (não deveria acontecer
    em uso normal — ver `core/auth.py`).
    """
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


@router.get(
    "/me/",
    response={200: MeOut, **R401, **R403},
    auth=AuthBearer(),
    summary="Dados do membro logado",
    operation_id="me",
)
def me(request):
    """Dados do Membro vinculado ao usuário do token — usado pelo frontend logo após o login."""
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
