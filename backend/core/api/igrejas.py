"""Endpoints públicos de Igreja — usados para alimentar o mapa do site institucional."""
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Router, Schema

from ..models import Igreja

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


@router.get("/", response=list[IgrejaOut])
def listar_igrejas(request):
    """Lista pública das igrejas participantes — usada pelo mapa do site institucional."""
    return Igreja.objects.all()


@router.get("/{igreja_id}/", response=IgrejaOut)
def detalhar_igreja(request, igreja_id: int):
    return get_object_or_404(Igreja, pk=igreja_id)
