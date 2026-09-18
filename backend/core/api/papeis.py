"""
Endpoints de gestão de Papéis (vínculo entre Membro e um tipo: diretoria,
conselheiro ou embaixador do rei — com cargo específico quando for diretoria).

Regras de acesso:
- Diretoria: pode criar/editar/excluir qualquer Papel.
- Conselheiro: só pode criar Papel do tipo "embaixador_do_rei", e só para
  membros da própria embaixada (não pode promover ninguém a conselheiro ou
  diretoria — isso é decisão da Diretoria).
"""
from datetime import date
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import Membro, Papel

router = Router(tags=["papeis"], auth=AuthBearer())


class PapelOut(Schema):
    id: int
    membro_id: int
    membro_nome: str
    tipo: str
    cargo_diretoria: Optional[str] = None
    data_inicio: date
    data_fim: Optional[date] = None

    @staticmethod
    def resolve_membro_nome(obj: Papel) -> str:
        return obj.membro.nome


class PapelIn(Schema):
    membro_id: int
    tipo: str
    cargo_diretoria: Optional[str] = None
    data_inicio: date
    data_fim: Optional[date] = None


class PapelUpdate(Schema):
    tipo: Optional[str] = None
    cargo_diretoria: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None


class PapelFiltros(Schema):
    membro_id: Optional[int] = None
    tipo: Optional[str] = None


def _validar_cargo_diretoria(tipo: str, cargo_diretoria: Optional[str]):
    if tipo == Papel.Tipo.DIRETORIA and not cargo_diretoria:
        raise HttpError(400, "cargo_diretoria é obrigatório quando tipo = diretoria.")
    if tipo != Papel.Tipo.DIRETORIA and cargo_diretoria:
        raise HttpError(400, "cargo_diretoria só deve ser preenchido quando tipo = diretoria.")


def _membro_logado_eh_diretoria(membro_logado: Membro) -> bool:
    papel = membro_logado.papel_atual
    return bool(papel and papel.tipo == Papel.Tipo.DIRETORIA)


def _membro_logado_eh_conselheiro_de(membro_logado: Membro, membro_alvo: Membro) -> bool:
    papel = membro_logado.papel_atual
    if not (papel and papel.tipo == Papel.Tipo.CONSELHEIRO):
        return False
    return membro_alvo.embaixada.conselheiro_responsavel_id == membro_logado.id


def _queryset_visivel(request):
    membro_logado = membro_do_usuario(request.auth)
    qs = Papel.objects.select_related("membro", "membro__embaixada")
    if _membro_logado_eh_diretoria(membro_logado):
        return qs
    # Conselheiro (ou embaixador): só enxerga papéis de membros da própria embaixada.
    return qs.filter(membro__embaixada__conselheiro_responsavel=membro_logado)


@router.get("/", response=list[PapelOut])
def listar_papeis(request, filtros: PapelFiltros = Query(...)):
    qs = _queryset_visivel(request)
    if filtros.membro_id is not None:
        qs = qs.filter(membro_id=filtros.membro_id)
    if filtros.tipo:
        qs = qs.filter(tipo=filtros.tipo)
    return qs


@router.get("/{papel_id}/", response=PapelOut)
def detalhar_papel(request, papel_id: int):
    qs = _queryset_visivel(request)
    return get_object_or_404(qs, pk=papel_id)


@router.post("/", response={201: PapelOut})
def criar_papel(request, payload: PapelIn):
    _validar_cargo_diretoria(payload.tipo, payload.cargo_diretoria)

    membro_logado = membro_do_usuario(request.auth)
    membro_alvo = get_object_or_404(Membro, pk=payload.membro_id)

    eh_diretoria = _membro_logado_eh_diretoria(membro_logado)
    if not eh_diretoria:
        eh_conselheiro_do_alvo = _membro_logado_eh_conselheiro_de(membro_logado, membro_alvo)
        if not (eh_conselheiro_do_alvo and payload.tipo == Papel.Tipo.EMBAIXADOR_DO_REI):
            raise HttpError(
                403,
                "Conselheiros só podem atribuir o papel 'embaixador_do_rei', "
                "e apenas para membros da própria embaixada.",
            )

    papel = Papel.objects.create(
        membro=membro_alvo,
        tipo=payload.tipo,
        cargo_diretoria=payload.cargo_diretoria,
        data_inicio=payload.data_inicio,
        data_fim=payload.data_fim,
    )
    return 201, papel


@router.put("/{papel_id}/", response=PapelOut)
def atualizar_papel(request, papel_id: int, payload: PapelUpdate):
    # Edição/exclusão de papel (promoções, encerramento de mandato) fica
    # restrita à Diretoria por enquanto — é uma operação mais sensível que
    # o cadastro inicial de um embaixador.
    membro_logado = membro_do_usuario(request.auth)
    if not _membro_logado_eh_diretoria(membro_logado):
        raise HttpError(403, "Editar um papel existente é uma ação restrita à Diretoria.")

    papel = get_object_or_404(Papel, pk=papel_id)
    dados = payload.dict(exclude_unset=True)
    tipo_final = dados.get("tipo", papel.tipo)
    cargo_final = dados.get("cargo_diretoria", papel.cargo_diretoria)
    _validar_cargo_diretoria(tipo_final, cargo_final)

    for campo, valor in dados.items():
        setattr(papel, campo, valor)
    papel.save()
    return papel


@router.delete("/{papel_id}/", response={204: None})
def excluir_papel(request, papel_id: int):
    membro_logado = membro_do_usuario(request.auth)
    if not _membro_logado_eh_diretoria(membro_logado):
        raise HttpError(403, "Excluir um papel é uma ação restrita à Diretoria.")

    papel = get_object_or_404(Papel, pk=papel_id)
    papel.delete()
    return 204, None
