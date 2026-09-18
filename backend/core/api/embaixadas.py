"""
Endpoints de gestão de Embaixadas.

Leitura liberada para qualquer usuário autenticado; criação/edição/exclusão
restrita à Diretoria (a estrutura das embaixadas em si — quais existem, qual
igreja, quem são os conselheiros — é definida pela diretoria, não pelos
conselheiros).
"""
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Router, Schema

from ..auth import AuthBearer, exigir_diretoria
from ..models import Embaixada, HorarioReuniao, Igreja, Membro

router = Router(tags=["embaixadas"], auth=AuthBearer())

# Router público, sem autenticação — consumido pelo card de destaques da
# home. Schema próprio (EmbaixadaPublicaOut), separado do EmbaixadaOut de
# gestão: garante que campos adicionados no futuro para uso interno não
# vazem aqui sem decisão explícita — os dois nunca compartilham definição.
router_publico = Router(tags=["embaixadas-publico"])


class HorarioReuniaoOut(Schema):
    id: int
    dia_semana: str
    dia_semana_display: str
    horario: str

    @staticmethod
    def resolve_dia_semana_display(obj: HorarioReuniao) -> str:
        return obj.get_dia_semana_display()

    @staticmethod
    def resolve_horario(obj: HorarioReuniao) -> str:
        return obj.horario.strftime("%H:%M")


class HorarioReuniaoPublicoOut(Schema):
    dia_semana: str
    horario: str

    @staticmethod
    def resolve_dia_semana(obj: HorarioReuniao) -> str:
        return obj.get_dia_semana_display()

    @staticmethod
    def resolve_horario(obj: HorarioReuniao) -> str:
        return obj.horario.strftime("%H:%M")


class EmbaixadaOut(Schema):
    id: int
    nome: str
    igreja_id: int
    igreja_nome: str
    conselheiro_responsavel_id: Optional[int] = None
    conselheiro_responsavel_nome: Optional[str] = None
    conselheiro_ids: list[int] = []
    conselheiro_nomes: list[str] = []
    horarios_reuniao: list[HorarioReuniaoOut] = []

    @staticmethod
    def resolve_igreja_nome(obj: Embaixada) -> str:
        return obj.igreja.nome

    @staticmethod
    def resolve_conselheiro_responsavel_nome(obj: Embaixada) -> Optional[str]:
        return obj.conselheiro_responsavel.nome if obj.conselheiro_responsavel else None

    @staticmethod
    def resolve_conselheiro_ids(obj: Embaixada) -> list[int]:
        return [p.id for p in obj.conselheiros.all()]

    @staticmethod
    def resolve_conselheiro_nomes(obj: Embaixada) -> list[str]:
        return [p.nome for p in obj.conselheiros.all()]

    @staticmethod
    def resolve_horarios_reuniao(obj: Embaixada) -> list[HorarioReuniao]:
        return list(obj.horarios_reuniao.all())


class EmbaixadaPublicaOut(Schema):
    """Somente o que o site institucional precisa mostrar — sem
    conselheiro_responsavel_id nem qualquer dado pessoal (telefone, e-mail,
    data de nascimento) que existe em Membro."""

    id: int
    nome: str
    igreja_id: int
    igreja_nome: str
    conselheiros_nomes: list[str] = []
    horarios_reuniao: list[HorarioReuniaoPublicoOut] = []

    @staticmethod
    def resolve_igreja_nome(obj: Embaixada) -> str:
        return obj.igreja.nome

    @staticmethod
    def resolve_conselheiros_nomes(obj: Embaixada) -> list[str]:
        # Responsável + demais conselheiros, sem duplicar caso a mesma
        # membro apareça nos dois (ex.: cadastro feito de forma redundante).
        nomes_vistos: dict[int, str] = {}
        if obj.conselheiro_responsavel:
            nomes_vistos[obj.conselheiro_responsavel.id] = obj.conselheiro_responsavel.nome
        for membro in obj.conselheiros.all():
            nomes_vistos.setdefault(membro.id, membro.nome)
        return list(nomes_vistos.values())

    @staticmethod
    def resolve_horarios_reuniao(obj: Embaixada) -> list[HorarioReuniao]:
        return list(obj.horarios_reuniao.all())


class HorarioReuniaoIn(Schema):
    dia_semana: str
    horario: str


class EmbaixadaIn(Schema):
    nome: str
    igreja_id: int
    conselheiro_responsavel_id: Optional[int] = None
    conselheiro_ids: list[int] = []
    horarios_reuniao: list[HorarioReuniaoIn] = []


class EmbaixadaUpdate(Schema):
    nome: Optional[str] = None
    igreja_id: Optional[int] = None
    conselheiro_responsavel_id: Optional[int] = None
    conselheiro_ids: Optional[list[int]] = None
    horarios_reuniao: Optional[list[HorarioReuniaoIn]] = None


def _sincronizar_horarios(embaixada: Embaixada, horarios: list[HorarioReuniaoIn]) -> None:
    """Substitui todos os horários da embaixada pela lista enviada — mais
    simples e previsível do que tentar diferenciar quais mudaram, já que o
    formulário do painel sempre manda a lista completa."""
    embaixada.horarios_reuniao.all().delete()
    HorarioReuniao.objects.bulk_create(
        [
            HorarioReuniao(embaixada=embaixada, dia_semana=h.dia_semana, horario=h.horario)
            for h in horarios
        ]
    )


@router.get("/", response=list[EmbaixadaOut])
def listar_embaixadas(request):
    return Embaixada.objects.select_related("igreja", "conselheiro_responsavel").prefetch_related(
        "conselheiros", "horarios_reuniao"
    )


@router.get("/{embaixada_id}/", response=EmbaixadaOut)
def detalhar_embaixada(request, embaixada_id: int):
    return get_object_or_404(
        Embaixada.objects.select_related("igreja", "conselheiro_responsavel").prefetch_related(
            "conselheiros", "horarios_reuniao"
        ),
        pk=embaixada_id,
    )


@router.post("/", response={201: EmbaixadaOut})
def criar_embaixada(request, payload: EmbaixadaIn):
    exigir_diretoria(request)
    igreja = get_object_or_404(Igreja, pk=payload.igreja_id)
    conselheiro_responsavel = None
    if payload.conselheiro_responsavel_id:
        conselheiro_responsavel = get_object_or_404(Membro, pk=payload.conselheiro_responsavel_id)

    embaixada = Embaixada.objects.create(
        nome=payload.nome,
        igreja=igreja,
        conselheiro_responsavel=conselheiro_responsavel,
    )
    if payload.conselheiro_ids:
        embaixada.conselheiros.set(Membro.objects.filter(pk__in=payload.conselheiro_ids))
    if payload.horarios_reuniao:
        _sincronizar_horarios(embaixada, payload.horarios_reuniao)
    return 201, embaixada


@router_publico.get("/", response=list[EmbaixadaPublicaOut])
def listar_embaixadas_publicas(request):
    """Consumido pelo card de destaques da home — só os campos de EmbaixadaPublicaOut."""
    return Embaixada.objects.select_related("igreja", "conselheiro_responsavel").prefetch_related(
        "conselheiros", "horarios_reuniao"
    )


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
            get_object_or_404(Membro, pk=conselheiro_id) if conselheiro_id else None
        )
    conselheiro_ids = dados.pop("conselheiro_ids", None)
    horarios_reuniao = dados.pop("horarios_reuniao", None)

    for campo, valor in dados.items():
        setattr(embaixada, campo, valor)
    embaixada.save()

    if conselheiro_ids is not None:
        embaixada.conselheiros.set(Membro.objects.filter(pk__in=conselheiro_ids))
    if horarios_reuniao is not None:
        _sincronizar_horarios(embaixada, [HorarioReuniaoIn(**h) for h in horarios_reuniao])

    return embaixada


@router.delete("/{embaixada_id}/", response={204: None})
def excluir_embaixada(request, embaixada_id: int):
    exigir_diretoria(request)
    embaixada = get_object_or_404(Embaixada, pk=embaixada_id)
    embaixada.delete()
    return 204, None
