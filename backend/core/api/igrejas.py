"""Endpoints públicos de Igreja — usados para alimentar o mapa do site institucional."""
from typing import Optional

from ninja import Router, Schema

from ..models import Igreja

router = Router(tags=["igrejas"])


class IgrejaOut(Schema):
    id: int
    nome: str
    municipio: str
    bairro: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.get("/", response=list[IgrejaOut])
def listar_igrejas(request):
    """Lista pública das igrejas participantes — usada pelo mapa do site institucional."""
    return Igreja.objects.all()


@router.get("/{igreja_id}/", response=IgrejaOut)
def detalhar_igreja(request, igreja_id: int):
    return Igreja.objects.get(pk=igreja_id)
