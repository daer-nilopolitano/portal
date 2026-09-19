"""
Endpoints da Diretoria da associação (cargo, mandato). Leitura liberada a
qualquer membro logado (saber quem é a Diretoria não é sensível); escrita
restrita a quem já tem mandato ativo na própria Diretoria.
"""
from datetime import date
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, exigir_diretoria, membro_do_usuario
from ..models import Diretoria, Membro, TipoMembro

router = Router(tags=["diretoria"], auth=AuthBearer())


class DiretoriaOut(Schema):
    id: int
    membro_id: int
    membro_nome: str
    cargo: str
    data_inicio: date
    data_fim: Optional[date] = None

    @staticmethod
    def resolve_membro_nome(obj: Diretoria) -> str:
        return obj.membro.nome


class DiretoriaIn(Schema):
    membro_id: int
    cargo: str
    data_inicio: date


class DiretoriaUpdate(Schema):
    cargo: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None


@router.get("/", response=list[DiretoriaOut])
def listar_diretoria(request, apenas_ativos: bool = True):
    membro_do_usuario(request.auth)  # só exige estar logado
    qs = Diretoria.objects.select_related("membro")
    if apenas_ativos:
        qs = qs.filter(data_fim__isnull=True)
    return qs


@router.post("/", response={201: DiretoriaOut})
def criar_mandato(request, payload: DiretoriaIn):
    exigir_diretoria(request)

    membro_alvo = get_object_or_404(Membro, pk=payload.membro_id)
    if membro_alvo.tipo != TipoMembro.CONSELHEIRO:
        raise HttpError(400, "Só um Membro com tipo=conselheiro pode ocupar cargo na Diretoria.")
    if Diretoria.objects.filter(membro=membro_alvo, data_fim__isnull=True).exists():
        raise HttpError(400, "Esse membro já tem um mandato ativo na Diretoria.")

    mandato = Diretoria.objects.create(
        membro=membro_alvo, cargo=payload.cargo, data_inicio=payload.data_inicio
    )
    return 201, mandato


@router.put("/{mandato_id}/", response=DiretoriaOut)
def atualizar_mandato(request, mandato_id: int, payload: DiretoriaUpdate):
    exigir_diretoria(request)
    mandato = get_object_or_404(Diretoria, pk=mandato_id)
    for campo, valor in payload.dict(exclude_unset=True).items():
        setattr(mandato, campo, valor)
    mandato.save()
    return mandato


@router.delete("/{mandato_id}/", response={204: None})
def excluir_mandato(request, mandato_id: int):
    exigir_diretoria(request)
    mandato = get_object_or_404(Diretoria, pk=mandato_id)
    mandato.delete()
    return 204, None
