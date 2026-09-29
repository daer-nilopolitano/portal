"""
Endpoints de Carteirinha digital — exclusiva para Membro com tipo=embaixador_do_rei (conselheiro e auxiliar não têm carteirinha).

O endpoint de verificação (`/carteirinhas/verificar/{identificador}/`) é público de propósito — é para onde o QR code da
carteirinha aponta, então qualquer pessoa que escaneie o cartão consegue confirmar que o cadastro é válido, sem precisar
de estar logada. Ele só devolve o mínimo necessário (nome, embaixada, validade e se está válida) — nunca dados sensíveis
como telefone, e-mail ou contato do responsável.

Os demais endpoints exigem login: emitir/renovar é permitido à Diretoria ou ao conselheiro da própria embaixada do membro;
`/carteirinhas/me/` é o que a PWA usa para mostrar a carteirinha de quem está logado.
"""
from datetime import date
from typing import Optional
from uuid import UUID

from django.shortcuts import get_object_or_404
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import Carteirinha, Membro, TipoMembro
from .erros import R400, R401, R403, R404

router = Router(tags=["Carteirinhas"], auth=AuthBearer())

_DESC_POSTO = "Posto do Embaixador do Rei. Valores: `escudeiro`, `arauto`, `senior`, `emerito`."
_DESC_IDENTIFICADOR = (
    "Identificador único (UUID) da carteirinha, gerado na emissão e não editável. É ele que vai no QR code e na "
    "URL pública `/carteirinhas/verificar/{identificador}/`."
)
_DESC_VALIDADE = "Data limite de validade da carteirinha, no formato `AAAA-MM-DD`. No dia da validade ela ainda é válida."


class CarteirinhaOut(Schema):
    id: int = Field(..., description="Identificador da carteirinha (não é o `identificador` do QR code nem o id do membro).")
    membro_id: int = Field(..., description="Identificador do membro dono da carteirinha.")
    membro_nome: str = Field(..., examples=["Lucas Pereira de Souza"])
    foto_url: Optional[str] = Field(None, description="URL da foto do membro, ou `null` se ele não tiver foto cadastrada.")
    embaixada_nome: str = Field(..., examples=["Embaixada Rei Davi"])
    posto: Optional[str] = Field(None, description=_DESC_POSTO, examples=["escudeiro"])
    identificador: UUID = Field(..., description=_DESC_IDENTIFICADOR, examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"])
    validade: date = Field(..., description=_DESC_VALIDADE, examples=["2027-03-31"])
    emitida_em: date = Field(..., description="Data de emissão, preenchida automaticamente. Não muda nas renovações.", examples=["2026-03-10"])

    @staticmethod
    def resolve_membro_nome(obj: Carteirinha) -> str:
        return obj.membro.nome

    @staticmethod
    def resolve_foto_url(obj: Carteirinha) -> Optional[str]:
        return obj.membro.foto.url if obj.membro.foto else None

    @staticmethod
    def resolve_embaixada_nome(obj: Carteirinha) -> str:
        return obj.membro.embaixada.nome

    @staticmethod
    def resolve_posto(obj: Carteirinha) -> Optional[str]:
        return obj.membro.posto_embaixador


class CarteirinhaIn(Schema):
    membro_id: int = Field(
        ...,
        description="Membro que receberá a carteirinha. Precisa ter `tipo` = `embaixador_do_rei` e ainda não ter carteirinha.",
        examples=[1],
    )
    validade: date = Field(..., description=_DESC_VALIDADE, examples=["2027-03-31"])


class CarteirinhaUpdate(Schema):
    validade: date = Field(..., description="Nova data de validade, no formato `AAAA-MM-DD`.", examples=["2028-03-31"])


class VerificacaoOut(Schema):
    """Resposta pública da verificação por QR code — só o essencial."""


    nome: str = Field(..., examples=["Lucas Pereira de Souza"])
    embaixada: str = Field(..., examples=["Embaixada Rei Davi"])
    valida: bool = Field(
        ...,
        description=(
            "`true` somente se o membro estiver ativo **e** a validade não tiver passado. "
            "Membro inativo ou carteirinha vencida resultam em `false`."
        ),
    )
    validade: date = Field(..., description=_DESC_VALIDADE, examples=["2027-03-31"])


def _pode_gerenciar_carteirinha_de(membro_logado: Membro, membro_alvo: Membro) -> bool:
    if membro_logado.eh_diretoria:
        return True
    return (
        membro_logado.tipo == TipoMembro.CONSELHEIRO
        and membro_logado.embaixada_id == membro_alvo.embaixada_id
    )


@router.get(
    "/me/",
    response={200: CarteirinhaOut, **R401, **R403, **R404},
    summary="Minha carteirinha",
    operation_id="minha_carteirinha",
)
def minha_carteirinha(request):
    """
    **Permissão:** qualquer membro logado, sempre para a **própria** carteirinha. É o que a PWA usa para exibi-la.

    404 se o membro logado não tiver carteirinha: conselheiros e auxiliares nunca têm, e um embaixador do rei só passa a
    ter depois que ela for emitida.
    """
    membro = membro_do_usuario(request.auth)
    carteirinha = get_object_or_404(
        Carteirinha.objects.select_related("membro", "membro__embaixada"), membro=membro
    )
    return carteirinha


@router.get(
    "/{membro_id}/",
    response={200: CarteirinhaOut, **R401, **R403, **R404},
    summary="Detalha a carteirinha de um membro",
    operation_id="detalhar_carteirinha",
)
def detalhar_carteirinha(request, membro_id: int):
    """
    **Permissão:** o próprio membro, a Diretoria, ou o conselheiro da própria embaixada do membro. Os demais (inclusive
    auxiliares e outros embaixadores) recebem 403.

    404 se o membro não existir ou se ele não tiver carteirinha emitida.
    """
    membro_logado = membro_do_usuario(request.auth)
    membro_alvo = get_object_or_404(Membro, pk=membro_id)

    eh_ele_mesmo = membro_logado.id == membro_alvo.id
    if not (eh_ele_mesmo or _pode_gerenciar_carteirinha_de(membro_logado, membro_alvo)):
        raise HttpError(403, "Sem permissão para ver a carteirinha deste membro.")

    return get_object_or_404(
        Carteirinha.objects.select_related("membro", "membro__embaixada"), membro_id=membro_id
    )


@router.post(
    "/",
    response={201: CarteirinhaOut, **R400, **R401, **R403, **R404},
    summary="Emite uma carteirinha",
    operation_id="emitir_carteirinha",
)
def emitir_carteirinha(request, payload: CarteirinhaIn):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da própria embaixada do membro. Os demais recebem 403.

    404 se `membro_id` não existir; 400 se o membro não for `embaixador_do_rei` ou se já tiver carteirinha (para
    estender a validade, use `PUT /carteirinhas/{membro_id}/`).
    """
    membro_logado = membro_do_usuario(request.auth)
    membro_alvo = get_object_or_404(Membro, pk=payload.membro_id)
    if not _pode_gerenciar_carteirinha_de(membro_logado, membro_alvo):
        raise HttpError(403, "Você só pode emitir carteirinha para membros da sua própria embaixada.")
    if membro_alvo.tipo != TipoMembro.EMBAIXADOR_DO_REI:
        raise HttpError(400, "Carteirinha é exclusiva para membros com tipo=embaixador_do_rei.")

    if Carteirinha.objects.filter(membro=membro_alvo).exists():
        raise HttpError(400, "Esse membro já tem uma carteirinha emitida — use PUT para renovar.")

    carteirinha = Carteirinha.objects.create(membro=membro_alvo, validade=payload.validade)
    return 201, carteirinha


@router.put(
    "/{membro_id}/",
    response={200: CarteirinhaOut, **R401, **R403, **R404},
    summary="Renova uma carteirinha",
    operation_id="renovar_carteirinha",
)
def renovar_carteirinha(request, membro_id: int, payload: CarteirinhaUpdate):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da própria embaixada do membro. Os demais recebem 403.

    Só altera a `validade`; o `identificador` (e portanto o QR code) e a data de emissão continuam os mesmos. 404 se o
    membro não existir ou não tiver carteirinha emitida (nesse caso, use `POST /carteirinhas/`).
    """
    membro_logado = membro_do_usuario(request.auth)
    membro_alvo = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_carteirinha_de(membro_logado, membro_alvo):
        raise HttpError(403, "Você só pode renovar carteirinha de membros da sua própria embaixada.")

    carteirinha = get_object_or_404(Carteirinha, membro_id=membro_id)
    carteirinha.validade = payload.validade
    carteirinha.save()
    return carteirinha


@router.get(
    "/verificar/{identificador}/",
    response={200: VerificacaoOut, **R404},
    auth=None,
    summary="Verifica uma carteirinha (público)",
    operation_id="verificar_carteirinha",
)
def verificar_carteirinha(request, identificador: UUID):
    """
    **Permissão:** público, sem login. É para onde o QR code da carteirinha aponta.

    Devolve só nome, embaixada, validade e se a carteirinha está válida (membro ativo e dentro da validade), nunca dados
    de contato. 404 se o `identificador` não existir.
    """
    carteirinha = get_object_or_404(
        Carteirinha.objects.select_related("membro", "membro__embaixada"),
        identificador=identificador,
    )
    membro = carteirinha.membro
    return VerificacaoOut(
        nome=membro.nome,
        embaixada=membro.embaixada.nome,
        valida=membro.ativo and carteirinha.validade >= date.today(),
        validade=carteirinha.validade,
    )
