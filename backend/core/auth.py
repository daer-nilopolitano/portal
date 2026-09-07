"""
Autenticação e autorização da API.

Abordagem: JWT simples (um único access token, sem refresh token por enquanto - TODO se o tempo de expiração de 7 dias
se mostrar curto demais na prática). O token carrega só o id do usuário Django; a Pessoa e o papel atual são resolvidos
a cada request a partir dele, então uma mudança de papel (ex.: promovido a diretoria) já vale no próximo request, sem
precisar gerar um novo token.
"""
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from ninja.errors import HttpError
from ninja.security import HttpBearer

from core.models import Papel, Pessoa

User = get_user_model()


def gerar_token(user) -> str:
    agora = datetime.now(timezone.utc)
    payload = {
        "user_id": user.pk,
        "iat": agora,
        "exp": agora + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


class AuthBearer(HttpBearer):
    """Valida o token e devolve o usuário Django autenticado (fica em request.auth)."""

    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

        try:
            return User.objects.get(pk=payload["user_id"], is_active=True)
        except User.DoesNotExist:
            return None


def pessoa_do_usuario(user) -> Pessoa:
    """
    Devolve a Pessoa vinculada ao usuário autenticado, ou levanta 403 se o usuário não tiver uma Pessoa associada (não
    deveria acontecer em uso normal, mas é possível com um superusuário criado direto no Django).
    """
    pessoa = getattr(user, "pessoa", None)
    if pessoa is None:
        raise HttpError(403, "Este usuário não está vinculado a nenhuma Pessoa cadastrada.")
    return pessoa


def exigir_diretoria(request):
    """Levanta 403 se a pessoa logada não for da Diretoria."""
    pessoa = pessoa_do_usuario(request.auth)
    papel = pessoa.papel_atual
    if papel is None or papel.tipo != Papel.Tipo.DIRETORIA:
        raise HttpError(403, "Ação restrita à Diretoria.")
    return pessoa


def exigir_diretoria_ou_conselheiro_da_embaixada(request, embaixada_id: int):
    """
    Levanta 403 a menos que a pessoa logada seja da Diretoria, ou seja,
    o conselheiro responsável pela embaixada em questão (cadastro descentralizado).
    """
    pessoa = pessoa_do_usuario(request.auth)
    papel = pessoa.papel_atual

    if papel and papel.tipo == Papel.Tipo.DIRETORIA:
        return pessoa

    if papel and papel.tipo == Papel.Tipo.CONSELHEIRO:
        from .models import Embaixada  # import local pra evitar ciclo no topo do arquivo

        eh_responsavel = Embaixada.objects.filter(
            pk=embaixada_id, conselheiro_responsavel=pessoa
        ).exists()
        if eh_responsavel:
            return pessoa

    raise HttpError(
        403, "Ação restrita à Diretoria ou ao conselheiro responsável por esta embaixada."
    )
