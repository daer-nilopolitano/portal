"""
Endpoints de Carteirinha digital.

O endpoint de verificação (`/carteirinhas/verificar/{identificador}/`) é público de propósito — é para onde o QR code da
carteirinha aponta, então qualquer pessoa que escaneie o cartão consegue confirmar que o cadastro é válido, sem precisar
de estar logada. Ele só devolve o mínimo necessário (nome, embaixada, validade e se está válida) — nunca dados sensíveis
como telefone, e-mail ou contato do responsável.

Os demais endpoints exigem login: emitir/renovar seguem a mesma regra de Embaixada/Pessoa (Diretoria ou o conselheiro
responsável pela embaixada da pessoa); `/carteirinhas/me/` é o que a PWA usa para mostrar a carteirinha de quem está
logado, e funciona para qualquer papel (diretoria, conselheiro ou embaixador do rei).
"""
from datetime import date
from uuid import UUID

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from core.auth import AuthBearer, pessoa_do_usuario
from ..models import Carteirinha, Embaixada, Papel, Pessoa

router = Router(tags=["carteirinhas"], auth=AuthBearer())


class CarteirinhaOut(Schema):
    id: int
    pessoa_id: int
    pessoa_nome: str
    identificador: UUID
    validade: date
    emitida_em: date

    @staticmethod
    def resolve_pessoa_nome(obj: Carteirinha) -> str:
        return obj.pessoa.nome


class CarteirinhaIn(Schema):
    pessoa_id: int
    validade: date


class CarteirinhaUpdate(Schema):
    validade: date


class VerificacaoOut(Schema):
    """Resposta pública da verificação por QR code — só o essencial."""

    nome: str
    embaixada: str
    valida: bool
    validade: date


def _pode_gerenciar_carteirinha_de(pessoa_logada: Pessoa, pessoa_alvo: Pessoa) -> bool:
    papel = pessoa_logada.papel_atual
    if papel and papel.tipo == Papel.Tipo.DIRETORIA:
        return True
    if papel and papel.tipo == Papel.Tipo.CONSELHEIRO:
        return Embaixada.objects.filter(
            pk=pessoa_alvo.embaixada_id, conselheiro_responsavel=pessoa_logada
        ).exists()
    return False


@router.get("/me/", response=CarteirinhaOut)
def minha_carteirinha(request):
    pessoa = pessoa_do_usuario(request.auth)
    carteirinha = get_object_or_404(Carteirinha.objects.select_related("pessoa"), pessoa=pessoa)
    return carteirinha


@router.get("/{pessoa_id}/", response=CarteirinhaOut)
def detalhar_carteirinha(request, pessoa_id: int):
    pessoa_logada = pessoa_do_usuario(request.auth)
    pessoa_alvo = get_object_or_404(Pessoa, pk=pessoa_id)

    eh_ela_mesma = pessoa_logada.id == pessoa_alvo.id
    if not (eh_ela_mesma or _pode_gerenciar_carteirinha_de(pessoa_logada, pessoa_alvo)):
        raise HttpError(403, "Sem permissão para ver a carteirinha desta pessoa.")

    return get_object_or_404(
        Carteirinha.objects.select_related("pessoa"), pessoa_id=pessoa_id
    )


@router.post("/", response={201: CarteirinhaOut})
def emitir_carteirinha(request, payload: CarteirinhaIn):
    pessoa_logada = pessoa_do_usuario(request.auth)
    pessoa_alvo = get_object_or_404(Pessoa, pk=payload.pessoa_id)
    if not _pode_gerenciar_carteirinha_de(pessoa_logada, pessoa_alvo):
        raise HttpError(403, "Você só pode emitir carteirinha para pessoas da sua própria embaixada.")

    if Carteirinha.objects.filter(pessoa=pessoa_alvo).exists():
        raise HttpError(400, "Essa pessoa já tem uma carteirinha emitida — use PUT para renovar.")

    carteirinha = Carteirinha.objects.create(pessoa=pessoa_alvo, validade=payload.validade)
    return 201, carteirinha


@router.put("/{pessoa_id}/", response=CarteirinhaOut)
def renovar_carteirinha(request, pessoa_id: int, payload: CarteirinhaUpdate):
    pessoa_logada = pessoa_do_usuario(request.auth)
    pessoa_alvo = get_object_or_404(Pessoa, pk=pessoa_id)
    if not _pode_gerenciar_carteirinha_de(pessoa_logada, pessoa_alvo):
        raise HttpError(403, "Você só pode renovar carteirinha de pessoas da sua própria embaixada.")

    carteirinha = get_object_or_404(Carteirinha, pessoa_id=pessoa_id)
    carteirinha.validade = payload.validade
    carteirinha.save()
    return carteirinha


@router.get("/verificar/{identificador}/", response=VerificacaoOut, auth=None)
def verificar_carteirinha(request, identificador: UUID):
    """Endpoint público — para onde o QR code da carteirinha aponta."""
    carteirinha = get_object_or_404(
        Carteirinha.objects.select_related("pessoa", "pessoa__embaixada"),
        identificador=identificador,
    )
    pessoa = carteirinha.pessoa
    return VerificacaoOut(
        nome=pessoa.nome,
        embaixada=pessoa.embaixada.nome,
        valida=pessoa.ativo and carteirinha.validade >= date.today(),
        validade=carteirinha.validade,
    )
