import logging
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)
User = get_user_model()


# Sem caracteres ambíguos (0/o, 1/l/i) nem maiúsculas: mais fácil de ditar e digitar no celular.
_ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"

def gerar_senha_temporaria(tamanho: int = 10) -> str:
    return "".join(secrets.choice(_ALFABETO) for _ in range(tamanho))


def enviar_link_definir_senha(membro, *, convite: bool) -> None:
    user = membro.user
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/redefinir-senha?uid={uid}&token={token}"
    if convite:
        assunto = "Seu acesso ao sistema do DAER Nilopolitano"
        intro = "Um acesso foi criado para você. Defina sua senha pelo link abaixo:"
    else:
        assunto = "Redefinição de senha - DAER Nilopolitano"
        intro = "Recebemos um pedido para redefinir sua senha. Use o link abaixo:"
    corpo = (
        f"Olá, {membro.nome}!\n\n{intro}\n\n"
        f"Seu usuário para entrar: {user.username}\n\n"
        f"{link}\n\n"
        "O link vale por 24 horas e só pode ser usado uma vez. "
        "Se você não pediu isso, ignore este e-mail."
    )
    send_mail(assunto, corpo, settings.DEFAULT_FROM_EMAIL, [membro.email], fail_silently=False)


def usuario_por_uid(uid: str):
    try:
        return User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None
