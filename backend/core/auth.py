"""
Autenticação e autorização da API.

Abordagem: JWT simples (um único access token, sem refresh token com o tempo de expiração de 7 dias). O token carrega o
id do usuário Django e um hash derivado da senha (`sah`); o Membro e o tipo são resolvidos a cada request a partir do
usuário, então uma mudança de tipo (ex.: promovido a conselheiro) já vale no próximo request, sem precisar de gerar um
novo token. Trocar a senha, desativar o usuário ou inativar o Membro invalida os tokens já emitidos.
"""
import hmac
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from ninja.errors import HttpError
from ninja.security import HttpBearer

from .models import Membro, TipoMembro

User = get_user_model()


def gerar_token(user) -> str:
    agora = datetime.now(timezone.utc)
    payload = {
        "user_id": user.pk,
        "sah": user.get_session_auth_hash(),
        "iat": agora,
        "exp": agora + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


class AuthBearer(HttpBearer):
    """Valida o token e devolve o usuário Django autenticado (fica em request.auth). Recusa (401) token inválido ou
    expirado, usuário inativo e membro inativo."""

    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

        try:
            # select_related traz usuário, membro e embaixada numa consulta só (senão cada request pagaria uma consulta
            # extra por user.membro).
            user = User.objects.select_related("membro__embaixada").get(
                pk=payload["user_id"], is_active=True
            )
        except User.DoesNotExist:
            return None

        # Senha trocada depois da emissão: o hash muda e o token antigo deixa de valer.
        # Tokens sem "sah" (emitidos antes desta mudança) também são recusados.
        if not hmac.compare_digest(str(payload.get("sah", "")), user.get_session_auth_hash()):
            return None

        # Membro inativado depois da emissão do token: o token deixa de valer (401) na hora.
        # Usuário sem Membro (ex.: superusuário criado direto no Django) segue adiante, e membro_do_usuario() devolve 403.
        membro = getattr(user, "membro", None)
        if membro is not None and not membro.ativo:
            return None

        return user


def membro_do_usuario(user) -> Membro:
    """
    Devolve o Membro vinculado ao usuário autenticado, ou levanta 403 se o usuário não tiver um Membro associado (não
    deveria acontecer em uso normal, mas é possível com um superusuário criado direto no Django).
    """
    membro = getattr(user, "membro", None)
    if membro is None:
        raise HttpError(403, "Este usuário não está vinculado a nenhum Membro cadastrado.")
    return membro


def exigir_diretoria(request):
    """Levanta 403 se o membro logado não tiver mandato ativo na Diretoria."""
    membro = membro_do_usuario(request.auth)
    if not membro.eh_diretoria:
        raise HttpError(403, "Ação restrita à Diretoria.")
    return membro


def exigir_diretoria_ou_conselheiro_da_embaixada(request, embaixada_id: int):
    """
    Levanta 403 a menos que o membro logado tenha mandato ativo na Diretoria, ou seja, conselheiro da própria embaixada em
    questão (cadastro descentralizado: qualquer conselheiro cuida da própria embaixada, sem precisar de aprovação da Diretoria).
    """
    membro = membro_do_usuario(request.auth)

    if membro.eh_diretoria:
        return membro

    if membro.tipo == TipoMembro.CONSELHEIRO and membro.embaixada_id == embaixada_id:
        return membro

    raise HttpError(
        403, "Ação restrita à Diretoria ou a um conselheiro desta embaixada."
    )
