"""
Endpoints de Carteirinha digital — exclusiva para Membro com
tipo=embaixador_do_rei (conselheiro e auxiliar não têm carteirinha).

O endpoint de verificação (`/carteirinhas/verificar/{identificador}/`) é
público de propósito — é para onde o QR code da carteirinha aponta, então
qualquer pessoa que escaneie o cartão consegue confirmar que o cadastro é
válido, sem precisar estar logada. Ele só devolve o mínimo necessário
(nome, embaixada, validade e se está válida) — nunca dados sensíveis como
telefone, e-mail ou contato do responsável.

Os demais endpoints exigem login: emitir/renovar é permitido à Diretoria ou
ao conselheiro da própria embaixada do membro; `/carteirinhas/me/` é o que
a PWA usa pra mostrar a carteirinha de quem está logado.
"""
from datetime import date
from typing import Optional
from uuid import UUID

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import Carteirinha, Membro, TipoMembro

router = Router(tags=["carteirinhas"], auth=AuthBearer())


class CarteirinhaOut(Schema):
    id: int
    membro_id: int
    membro_nome: str
    foto_url: Optional[str] = None
    embaixada_nome: str
    posto: Optional[str] = None
    identificador: UUID
    validade: date
    emitida_em: date

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
    membro_id: int
    validade: date


class CarteirinhaUpdate(Schema):
    validade: date


class VerificacaoOut(Schema):
    """Resposta pública da verificação por QR code — só o essencial."""

    nome: str
    embaixada: str
    valida: bool
    validade: date


def _pode_gerenciar_carteirinha_de(membro_logado: Membro, membro_alvo: Membro) -> bool:
    if membro_logado.eh_diretoria:
        return True
    return (
        membro_logado.tipo == TipoMembro.CONSELHEIRO
        and membro_logado.embaixada_id == membro_alvo.embaixada_id
    )


@router.get("/me/", response=CarteirinhaOut)
def minha_carteirinha(request):
    membro = membro_do_usuario(request.auth)
    carteirinha = get_object_or_404(
        Carteirinha.objects.select_related("membro", "membro__embaixada"), membro=membro
    )
    return carteirinha


@router.get("/{membro_id}/", response=CarteirinhaOut)
def detalhar_carteirinha(request, membro_id: int):
    membro_logado = membro_do_usuario(request.auth)
    membro_alvo = get_object_or_404(Membro, pk=membro_id)

    eh_ele_mesmo = membro_logado.id == membro_alvo.id
    if not (eh_ele_mesmo or _pode_gerenciar_carteirinha_de(membro_logado, membro_alvo)):
        raise HttpError(403, "Sem permissão para ver a carteirinha deste membro.")

    return get_object_or_404(
        Carteirinha.objects.select_related("membro", "membro__embaixada"), membro_id=membro_id
    )


@router.post("/", response={201: CarteirinhaOut})
def emitir_carteirinha(request, payload: CarteirinhaIn):
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


@router.put("/{membro_id}/", response=CarteirinhaOut)
def renovar_carteirinha(request, membro_id: int, payload: CarteirinhaUpdate):
    membro_logado = membro_do_usuario(request.auth)
    membro_alvo = get_object_or_404(Membro, pk=membro_id)
    if not _pode_gerenciar_carteirinha_de(membro_logado, membro_alvo):
        raise HttpError(403, "Você só pode renovar carteirinha de membros da sua própria embaixada.")

    carteirinha = get_object_or_404(Carteirinha, membro_id=membro_id)
    carteirinha.validade = payload.validade
    carteirinha.save()
    return carteirinha


@router.get("/verificar/{identificador}/", response=VerificacaoOut, auth=None)
def verificar_carteirinha(request, identificador: UUID):
    """Endpoint público — para onde o QR code da carteirinha aponta."""
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
