"""
Endpoints de gestão de Embaixadas.

Leitura liberada para qualquer usuário autenticado; criação/edição/exclusão
restrita à Diretoria (a estrutura das embaixadas em si — quais existem, qual
igreja, quem é o conselheiro — é definida pela diretoria, não pelos conselheiros).
"""
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Router, Schema

from ..auth import AuthBearer, exigir_diretoria
from ..models import Embaixada, Igreja, Pessoa

router = Router(tags=["embaixadas"], auth=AuthBearer())


class EmbaixadaOut(Schema):
    id: int
    nome: str
    igreja_id: int
    igreja_nome: str
    conselheiro_responsavel_id: Optional[int] = None
    conselheiro_responsavel_nome: Optional[str] = None

    @staticmethod
    def resolve_igreja_nome(obj: Embaixada) -> str:
        return obj.igreja.nome

    @staticmethod
    def resolve_conselheiro_responsavel_nome(obj: Embaixada) -> Optional[str]:
        return obj.conselheiro_responsavel.nome if obj.conselheiro_responsavel else None


class EmbaixadaIn(Schema):
    nome: str
    igreja_id: int
    conselheiro_responsavel_id: Optional[int] = None


class EmbaixadaUpdate(Schema):
    nome: Optional[str] = None
    igreja_id: Optional[int] = None
    conselheiro_responsavel_id: Optional[int] = None


@router.get("/", response=list[EmbaixadaOut])
def listar_embaixadas(request):
    return Embaixada.objects.select_related("igreja", "conselheiro_responsavel").all()


@router.get("/{embaixada_id}/", response=EmbaixadaOut)
def detalhar_embaixada(request, embaixada_id: int):
    return get_object_or_404(
        Embaixada.objects.select_related("igreja", "conselheiro_responsavel"),
        pk=embaixada_id,
    )


@router.post("/", response={201: EmbaixadaOut})
def criar_embaixada(request, payload: EmbaixadaIn):
    exigir_diretoria(request)
    igreja = get_object_or_404(Igreja, pk=payload.igreja_id)
    conselheiro = None
    if payload.conselheiro_responsavel_id:
        conselheiro = get_object_or_404(Pessoa, pk=payload.conselheiro_responsavel_id)

    embaixada = Embaixada.objects.create(
        nome=payload.nome,
        igreja=igreja,
        conselheiro_responsavel=conselheiro,
    )
    return 201, embaixada


@router.put("/{embaixada_id}/", response=EmbaixadaOut)
def atualizar_embaixada(request, embaixada_id: int, payload: EmbaixadaUpdate):
    exigir_diretoria(request)
    embaixada = get_object_or_404(Embaixada, pk=embaixada_id)

    dados = payload.dict(exclude_unset=True)
    if "igreja_id" in dados:
        embaixada.igreja = get_object_or_404(Igreja, pk=dados.pop("igreja_id"))
    if "conselheiro_responsavel_id" in dados:
        conselheiro_id = dados.pop("conselheiro_responsavel_id")
        embaixada.conselheiro_responsavel = (
            get_object_or_404(Pessoa, pk=conselheiro_id) if conselheiro_id else None
        )
    for campo, valor in dados.items():
        setattr(embaixada, campo, valor)
    embaixada.save()
    return embaixada


@router.delete("/{embaixada_id}/", response={204: None})
def excluir_embaixada(request, embaixada_id: int):
    exigir_diretoria(request)
    embaixada = get_object_or_404(Embaixada, pk=embaixada_id)
    embaixada.delete()
    return 204, None
