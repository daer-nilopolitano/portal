"""Endpoints de autenticação: login (e-mail + senha) e dados do membro logado."""
import hashlib
from typing import Optional

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, gerar_token, membro_do_usuario
from ..models import Membro
from .erros import R401, R403, R429

router = Router(tags=["Autenticação"])

_DESC_TIPO = (
    "Tipo do membro: `conselheiro`, `auxiliar` ou `embaixador_do_rei`. Quem está na Diretoria da associação tem "
    "`tipo` = `conselheiro` — veja `cargo_diretoria`."
)
_DESC_POSTO = (
    "Posto do Embaixador do Rei — só vem preenchido quando tipo é `embaixador_do_rei`. "
    "Valores: `escudeiro`, `arauto`, `senior`, `emerito`."
)
_DESC_CARGO_DIRETORIA = (
    "Cargo do membro na Diretoria da associação, se ele tiver mandato ativo; caso contrário, `null`. "
    "Valores: `coordenador`, `presidente`, `vice_presidente`, `primeiro_secretario`, `segundo_secretario`, "
    "`diretor_midia_comunicacao`, `diretor_esportes`. Um valor não nulo indica que o membro pertence à Diretoria."
)


# Proteção contra força bruta no login. Conta só as tentativas que FALHARAM (senha errada), numa janela fixa que começa
# na primeira falha: por e-mail (protege uma conta específica) e por IP (protege contra quem testa vários e-mails).
# Estourou o limite -> 429 até a janela acabar. Ajuste os valores conforme o uso real.
_MAX_FALHAS_POR_EMAIL = 5
_MAX_FALHAS_POR_IP = 20  # maior, porque várias pessoas podem sair pelo mesmo IP (ex.: rede de uma igreja)
_JANELA_LOGIN_SEGUNDOS = 15 * 60


def _ip_do_cliente(request) -> str:
    """
    IP do cliente. Atrás de proxy (Render, Vercel, Nginx...), REMOTE_ADDR é o IP do proxy.
    Defina NUM_PROXIES_CONFIAVEIS no settings com o número de proxies confiáveis existentes na frente da aplicação;
    com 0 (padrão), usa REMOTE_ADDR e ignora X-Forwarded-For, que o cliente poderia forjar.
    """
    n = getattr(settings, "NUM_PROXIES_CONFIAVEIS", 0)
    if n > 0:
        partes = [p.strip() for p in request.META.get("HTTP_X_FORWARDED_FOR", "").split(",") if p.strip()]
        if len(partes) >= n:
            return partes[-n]
    return request.META.get("REMOTE_ADDR", "desconhecido")


def _chaves_falhas_login(request, email: str) -> tuple[str, str]:
    email_hash = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()
    return f"login_falhas_email_{email_hash}", f"login_falhas_ip_{_ip_do_cliente(request)}"


def _contar_falha(chave: str) -> None:
    if cache.add(chave, 1, timeout=_JANELA_LOGIN_SEGUNDOS):
        return
    try:
        cache.incr(chave)
    except ValueError:  # a chave expirou entre o add e o incr
        cache.set(chave, 1, timeout=_JANELA_LOGIN_SEGUNDOS)


def _cargo_diretoria_ativo(membro: Membro) -> Optional[str]:
    mandato = membro.mandatos_diretoria.filter(data_fim__isnull=True).first()
    return mandato.cargo if mandato else None


class LoginIn(Schema):
    email: str = Field(
        ...,
        description="E-mail cadastrado no Membro (é o nome de usuário do login).",
        examples=["conselheiro@exemplo.org"],
    )
    senha: str = Field(..., description="Senha definida na criação do acesso.")


class LoginOut(Schema):
    access_token: str = Field(
        ...,
        description=(
            "Token JWT. Envie-o em toda requisição autenticada, no cabeçalho `Authorization: Bearer <token>`. "
            "Expira após o prazo configurado no servidor; depois disso, faça login novamente."
        ),
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
    )
    membro_id: int = Field(..., description="Identificador do Membro vinculado ao usuário.")
    nome: str = Field(..., examples=["Paulo Roberto de Souza"])
    tipo: str = Field(..., description=_DESC_TIPO, examples=["conselheiro"])
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    cargo_diretoria: Optional[str] = Field(None, description=_DESC_CARGO_DIRETORIA)


class MeOut(Schema):
    membro_id: int = Field(..., description="Identificador do Membro vinculado ao usuário do token.")
    nome: str = Field(..., examples=["Paulo Roberto de Souza"])
    embaixada_id: int = Field(..., description="Identificador da embaixada do membro.")
    embaixada_nome: str = Field(..., examples=["Embaixada Vale da Bênção"])
    tipo: str = Field(..., description=_DESC_TIPO, examples=["conselheiro"])
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    cargo_diretoria: Optional[str] = Field(None, description=_DESC_CARGO_DIRETORIA)


@router.post(
    "/login/",
    response={200: LoginOut, **R401, **R403, **R429},
    auth=None,
    summary="Login com e-mail e senha",
    operation_id="login",
)
def login(request, payload: LoginIn):
    """
    **Permissão:** público, sem login. É a porta de entrada da API.

    Autentica com e-mail e senha e devolve um `access_token` (JWT). Envie-o nas próximas requisições como
    `Authorization: Bearer <token>`.

    401 se e-mail ou senha estiverem errados; 403 se o usuário existir, mas não estiver vinculado a nenhum Membro
    cadastrado (não deveria acontecer em uso normal — ver `core/auth.py`) ou se o Membro estiver inativo.

    429 se houver tentativas demais com senha errada para o mesmo e-mail ou o mesmo IP: aguarde alguns minutos antes de
    tentar de novo. Um login correto zera o contador do e-mail.
    """
    # O username do Django User é o e-mail do Membro (ver criação de acesso em membros.py).
    chave_email, chave_ip = _chaves_falhas_login(request, payload.email)
    if cache.get(chave_email, 0) >= _MAX_FALHAS_POR_EMAIL or cache.get(chave_ip, 0) >= _MAX_FALHAS_POR_IP:
        raise HttpError(429, "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.")

    import logging
    logging.getLogger(__name__).warning(
        "REMOTE_ADDR=%s XFF=%s",
        request.META.get("REMOTE_ADDR"), request.META.get("HTTP_X_FORWARDED_FOR"),
    )

    user = authenticate(request, username=payload.email, password=payload.senha)
    if user is None:
        _contar_falha(chave_email)
        _contar_falha(chave_ip)
        raise HttpError(401, "E-mail ou senha inválidos.")
    # Login correto zera o contador do e-mail. O do IP não é zerado, para não permitir "lavar" tentativas
    # alternando com o login de uma conta própria.
    cache.delete(chave_email)

    membro = getattr(user, "membro", None)
    if membro is None:
        raise HttpError(403, "Este usuário não está vinculado a nenhum Membro cadastrado.")
    if not membro.ativo:
        raise HttpError(403, "Este membro está inativo. Procure o conselheiro da sua embaixada ou a Diretoria.")

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
    """
    **Permissão:** qualquer membro logado, sempre para os **próprios** dados.

    Devolve os dados do Membro vinculado ao usuário do token — usado pelo frontend logo após o login para saber o tipo,
    a embaixada e o cargo na Diretoria de quem entrou.

    401 se o token estiver ausente, inválido ou expirado, ou se o Membro tiver sido inativado depois da emissão do token;
    403 se o usuário do token não estiver vinculado a nenhum Membro.
    """
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
