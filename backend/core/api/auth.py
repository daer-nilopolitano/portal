"""Endpoints de autenticação: login (e-mail + senha) e dados do membro logado."""
import hashlib
import logging
import threading
from typing import Optional

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import F, Q
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from .erros import R401, R403, R429
from ..auth import AuthBearerTrocaSenha, contar_falha, gerar_token, membro_do_usuario
from ..models import Membro
from ..senhas import enviar_link_definir_senha, usuario_por_uid

logger = logging.getLogger(__name__)
router = Router(tags=["Autenticação"])
User = get_user_model()

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


def _cargo_diretoria_ativo(membro: Membro) -> Optional[str]:
    mandato = membro.mandatos_diretoria.filter(data_fim__isnull=True).first()
    return mandato.cargo if mandato else None


def _validar_nova_senha(user, senha: str) -> None:
    try:
        validate_password(senha, user=user)
    except ValidationError as e:
        raise HttpError(400, " ".join(e.messages))


def _enviar_em_segundo_plano(membro):
    try:
        enviar_link_definir_senha(membro, convite=False)
    except Exception:
        logger.exception("Falha ao enviar e-mail de redefinição")


class TrocarSenhaIn(Schema):
    senha_atual: str
    nova_senha: str


class EsqueciSenhaIn(Schema):
    email: str


class RedefinirSenhaIn(Schema):
    uid: str
    token: str
    nova_senha: str


class NovoTokenOut(Schema):
    access_token: str


class MensagemOut(Schema):
    mensagem: str


@router.post(
    "/trocar-senha/",
    auth=AuthBearerTrocaSenha(),
    response={200: NovoTokenOut, **R401, **R403, **R429},
    summary="Troca a própria senha",
    operation_id="trocar_senha",
)
def trocar_senha(request, payload: TrocarSenhaIn):
    user = request.auth
    membro = membro_do_usuario(user)
    chave = f"troca_senha_falhas_{user.pk}"
    if cache.get(chave, 0) >= _MAX_FALHAS_POR_EMAIL:
        raise HttpError(429, "Muitas tentativas. Aguarde alguns minutos.")
    if not user.check_password(payload.senha_atual):
        contar_falha(chave)
        raise HttpError(400, "Senha atual incorreta.")
    cache.delete(chave)
    if payload.nova_senha == payload.senha_atual:
        raise HttpError(400, "A nova senha deve ser diferente da atual.")
    _validar_nova_senha(user, payload.nova_senha)

    user.set_password(payload.nova_senha)
    user.save(update_fields=["password"])
    membro.deve_trocar_senha = False
    membro.save(update_fields=["deve_trocar_senha"])
    # A troca invalida o token atual (sah mudou); devolve um novo para a pessoa continuar logada.
    return NovoTokenOut(access_token=gerar_token(user))


@router.post(
    "/esqueci-senha/",
    auth=None,
    response={200: MensagemOut, **R429},
    summary="Pede link de redefinição de senha",
    operation_id="esqueci_senha",
)
def esqueci_senha(request, payload: EsqueciSenhaIn):
    resposta = MensagemOut(mensagem="Se existir uma conta com esses dados e um e-mail cadastrado, enviaremos um link.")
    identificador = payload.email.strip().lower()
    email_hash = hashlib.sha256(identificador.encode()).hexdigest()
    chave_email, chave_ip = f"reset_email_{email_hash}", f"reset_ip_{_ip_do_cliente(request)}"

    # Conta todo pedido (não só falhas): limita spam de e-mails para um membro e uso do endpoint por IP.
    if cache.get(chave_email, 0) >= 3 or cache.get(chave_ip, 0) >= 20:
        raise HttpError(429, "Muitos pedidos. Aguarde alguns minutos e tente novamente.")
    contar_falha(chave_email, 60 * 60)
    contar_falha(chave_ip, 60 * 60)

    membros = list(
        Membro.objects.select_related("user")
        .filter(ativo=True, user__isnull=False, user__is_active=True)
        .filter(Q(email__iexact=identificador) | Q(user__username__iexact=identificador))
        .exclude(email__isnull=True).exclude(email="")[:5]
    )
    for membro in membros:
        threading.Thread(target=_enviar_em_segundo_plano, args=(membro,), daemon=True).start()

    return resposta


@router.post(
    "/redefinir-senha/",
    auth=None,
    response={200: MensagemOut},
    summary="Define nova senha a partir do link do e-mail",
    operation_id="redefinir_senha",
)
def redefinir_senha(request, payload: RedefinirSenhaIn):
    erro = HttpError(400, "Link inválido ou expirado. Peça um novo.")
    user = usuario_por_uid(payload.uid)
    if user is None or not user.is_active or not default_token_generator.check_token(user, payload.token):
        raise erro
    membro = getattr(user, "membro", None)
    if membro is None or not membro.ativo:
        raise erro
    _validar_nova_senha(user, payload.nova_senha)
    user.set_password(payload.nova_senha)
    user.save(update_fields=["password"])
    membro.deve_trocar_senha = False
    membro.save(update_fields=["deve_trocar_senha"])
    return MensagemOut(mensagem="Senha definida. Você já pode entrar.")


@router.post(
    "/sair-todos/",
    auth=AuthBearerTrocaSenha(),
    response={200: MensagemOut, **R401, **R403},
    summary="Encerra a sessão em todos os dispositivos",
    operation_id="sair_todos",
)
def sair_de_todos(request):
    membro = membro_do_usuario(request.auth)
    Membro.objects.filter(pk=membro.pk).update(versao_token=F("versao_token") + 1)
    return MensagemOut(mensagem="Todas as sessões foram encerradas.")


class LoginIn(Schema):
    email: str = Field(
        ...,
        description="E-mail ou usuário cadastrado no Membro.",
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
    deve_trocar_senha: bool = Field(False,
                                    description="Se `true`, o membro precisa trocar a senha antes de usar o sistema.")


class MeOut(Schema):
    membro_id: int = Field(..., description="Identificador do Membro vinculado ao usuário do token.")
    nome: str = Field(..., examples=["Paulo Roberto de Souza"])
    usuario: str = Field(..., description="Usuário do Django vinculado ao Membro.")
    embaixada_id: int = Field(..., description="Identificador da embaixada do membro.")
    embaixada_nome: str = Field(..., examples=["Embaixada Vale da Bênção"])
    tipo: str = Field(..., description=_DESC_TIPO, examples=["conselheiro"])
    posto_embaixador: Optional[str] = Field(None, description=_DESC_POSTO)
    cargo_diretoria: Optional[str] = Field(None, description=_DESC_CARGO_DIRETORIA)
    deve_trocar_senha: bool = False


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

    401 se e-mail/usuário ou senha estiverem errados; 403 se o usuário existir, mas não estiver vinculado a nenhum Membro
    cadastrado (não deveria acontecer em uso normal — ver `core/auth.py`) ou se o Membro estiver inativo.

    429 se houver tentativas demais com senha errada para o mesmo e-mail ou o mesmo IP: aguarde alguns minutos antes de
    tentar de novo. Um login correto zera o contador do e-mail.
    """
    # O username do Django User é o e-mail do Membro (ver criação de acesso em membros.py).
    chave_email, chave_ip = _chaves_falhas_login(request, payload.email)
    if cache.get(chave_email, 0) >= _MAX_FALHAS_POR_EMAIL or cache.get(chave_ip, 0) >= _MAX_FALHAS_POR_IP:
        raise HttpError(429, "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.")

    identificador = payload.email.strip()
    # Pode ser e-mail ou usuário gerado (membros sem e-mail). Teclados de celular capitalizam a 1ª letra, então a busca
    # ignora maiúsculas/minúsculas.
    username = (
        User.objects.filter(username__iexact=identificador)
        .values_list("username", flat=True)
        .first()
    )
    user = authenticate(request, username=username or identificador, password=payload.senha)

    if user is None:
        contar_falha(chave_email)
        contar_falha(chave_ip)
        raise HttpError(401, "E-mail/usuário ou senha inválidos.")
    # Login correto zera o contador do e-mail. O do IP não é zerado, para não permitir "lavar" tentativas alternando com
    # o login de uma conta própria.
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
        deve_trocar_senha=membro.deve_trocar_senha,
    )


@router.get(
    "/me/",
    response={200: MeOut, **R401, **R403},
    auth=AuthBearerTrocaSenha(),
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
        usuario=request.auth.username,
        embaixada_id=membro.embaixada_id,
        embaixada_nome=membro.embaixada.nome,
        tipo=membro.tipo,
        posto_embaixador=membro.posto_embaixador,
        cargo_diretoria=_cargo_diretoria_ativo(membro),
        deve_trocar_senha=membro.deve_trocar_senha,
    )
