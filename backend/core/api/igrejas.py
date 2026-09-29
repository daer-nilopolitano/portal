"""Endpoints públicos de Igreja — usados para alimentar o mapa do site institucional."""
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Router, Schema

from ..models import Igreja
from .erros import R404

router = Router(tags=["Igrejas"])


class IgrejaOut(Schema):
    id: int
    nome: str
    cep: str
    rua: str
    numero: str
    complemento: str
    bairro: str
    municipio: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.get(
    "/",
    response={200: list[IgrejaOut]},
    summary="Lista as igrejas participantes",
    operation_id="listar_igrejas",
)
def listar_igrejas(request):
    """Lista pública das igrejas participantes — usada pelo mapa do site institucional."""
    return Igreja.objects.all()


@router.get(
    "/{igreja_id}/",
    response={200: IgrejaOut, **R404},
    summary="Detalha uma igreja",
    operation_id="detalhar_igreja",
)
def detalhar_igreja(request, igreja_id: int):
    return get_object_or_404(Igreja, pk=igreja_id)
