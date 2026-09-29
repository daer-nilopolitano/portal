"""
Endpoints de gestão de Embaixadas.

Leitura liberada para qualquer usuário autenticado. Criar/excluir uma embaixada, e editar nome/igreja de uma já existente,
é restrito à Diretoria — são dados mais "estruturais". Editar os horários de reunião é liberado também para o conselheiro
da própria embaixada (é quem lida com isso no dia a dia). Cadastro de Igreja somente pelo Django Admin.
"""
from typing import Optional

from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, exigir_diretoria, membro_do_usuario
from ..models import DiaSemana, Embaixada, HorarioReuniao, Igreja, Membro, TipoMembro
from .erros import R401, R403, R404

router = Router(tags=["Embaixadas"], auth=AuthBearer())

# Router público, sem autenticação — consumido pelo card de destaques da home. Schema próprio (EmbaixadaPublicaOut),
# separado do EmbaixadaOut de gestão: garante que campos adicionados no futuro para uso interno não vazem aqui sem
# decisão explícita — os dois nunca compartilham definição.
router_publico = Router(tags=["Embaixadas (público)"])

_DESC_DIA_SEMANA = (
    "Dia da semana: `domingo`, `segunda`, `terca`, `quarta`, `quinta`, "
    "`sexta` ou `sabado`."
)


def _com_relacionados():
    """
    Embaixadas já com tudo que os schemas de saída usam, em 3 consultas fixas (embaixadas+igreja, conselheiros, horários),
    independente de quantas embaixadas existam. Os conselheiros vêm num Prefetch já filtrado: chamar `obj.membros.filter(...)`
    dentro do resolver ignora o prefetch e faz uma consulta nova por embaixada.
    """
    return Embaixada.objects.select_related("igreja").prefetch_related(
        Prefetch(
            "membros",
            queryset=Membro.objects.filter(tipo=TipoMembro.CONSELHEIRO).only(
                "id", "nome", "embaixada_id"
            ),
            to_attr="conselheiros_carregados",
        ),
        "horarios_reuniao",
    )


def _nomes_conselheiros(obj: Embaixada) -> list[str]:
    carregados = getattr(obj, "conselheiros_carregados", None)
    if carregados is None:
        # Objeto que não veio de _com_relacionados() (ex.: recém-criado/atualizado).
        carregados = obj.membros.filter(tipo=TipoMembro.CONSELHEIRO)
    return [m.nome for m in carregados]


class HorarioReuniaoOut(Schema):
    id: int
    dia_semana: str = Field(..., description=_DESC_DIA_SEMANA)
    dia_semana_display: str = Field(..., description="Nome do dia por extenso, para exibição (ex.: \"Sábado\").")
    horario: str = Field(..., description="Horário no formato HH:MM.", examples=["19:30"])

    @staticmethod
    def resolve_dia_semana_display(obj: HorarioReuniao) -> str:
        return obj.get_dia_semana_display()

    @staticmethod
    def resolve_horario(obj: HorarioReuniao) -> str:
        return obj.horario.strftime("%H:%M")


class HorarioReuniaoPublicoOut(Schema):
    dia_semana: str = Field(..., description=_DESC_DIA_SEMANA)
    horario: str = Field(..., description="Horário no formato HH:MM.", examples=["19:30"])

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
    conselheiro_nomes: list[str] = []
    horarios_reuniao: list[HorarioReuniaoOut] = []

    @staticmethod
    def resolve_igreja_nome(obj: Embaixada) -> str:
        return obj.igreja.nome

    @staticmethod
    def resolve_conselheiro_nomes(obj: Embaixada) -> list[str]:
        return _nomes_conselheiros(obj)

    @staticmethod
    def resolve_horarios_reuniao(obj: Embaixada) -> list[HorarioReuniao]:
        return list(obj.horarios_reuniao.all())


class EmbaixadaPublicaOut(Schema):
    """Somente o que o site institucional precisa mostrar — sem qualquer dado pessoal (telefone, e-mail, data de
    nascimento) que existe em Membro."""

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
        return _nomes_conselheiros(obj)

    @staticmethod
    def resolve_horarios_reuniao(obj: Embaixada) -> list[HorarioReuniao]:
        return list(obj.horarios_reuniao.all())


class HorarioReuniaoIn(Schema):
    dia_semana: str = Field(..., description=_DESC_DIA_SEMANA)
    horario: str = Field(..., description="Horário no formato HH:MM.", examples=["19:30"])


class EmbaixadaIn(Schema):
    nome: str = Field(..., examples=["Embaixada Vale da Bênção"])
    igreja_id: int
    horarios_reuniao: list[HorarioReuniaoIn] = []


class EmbaixadaUpdate(Schema):
    nome: Optional[str] = None
    igreja_id: Optional[int] = None
    horarios_reuniao: Optional[list[HorarioReuniaoIn]] = Field(
        None,
        description=(
            "Lista completa dos horários da embaixada — substitui os horários existentes por inteiro (não é um incremento)."
        ),
    )


def _sincronizar_horarios(embaixada: Embaixada, horarios: list[HorarioReuniaoIn]) -> None:
    """Substitui todos os horários da embaixada pela lista enviada."""
    embaixada.horarios_reuniao.all().delete()
    HorarioReuniao.objects.bulk_create(
        [
            HorarioReuniao(embaixada=embaixada, dia_semana=h.dia_semana, horario=h.horario)
            for h in horarios
        ]
    )


@router.get(
    "/",
    response={200: list[EmbaixadaOut], **R401},
    summary="Lista as embaixadas",
    operation_id="listar_embaixadas",
)
def listar_embaixadas(request):
    return _com_relacionados()


@router.get(
    "/{embaixada_id}/",
    response={200: EmbaixadaOut, **R401, **R404},
    summary="Detalha uma embaixada",
    operation_id="detalhar_embaixada",
)
def detalhar_embaixada(request, embaixada_id: int):
    return get_object_or_404(_com_relacionados(), pk=embaixada_id)


@router.post(
    "/",
    response={201: EmbaixadaOut, **R401, **R403, **R404},
    summary="Cria uma embaixada",
    operation_id="criar_embaixada",
)
def criar_embaixada(request, payload: EmbaixadaIn):
    """Restrito à Diretoria. 404 se `igreja_id` não existir."""
    exigir_diretoria(request)
    igreja = get_object_or_404(Igreja, pk=payload.igreja_id)

    embaixada = Embaixada.objects.create(nome=payload.nome, igreja=igreja)
    if payload.horarios_reuniao:
        _sincronizar_horarios(embaixada, payload.horarios_reuniao)
    return 201, embaixada


@router_publico.get(
    "/",
    response={200: list[EmbaixadaPublicaOut]},
    summary="Lista as embaixadas (público)",
    operation_id="listar_embaixadas_publicas",
)
def listar_embaixadas_publicas(request):
    """Consumido pelo card de destaques da home — só os campos de EmbaixadaPublicaOut."""
    return _com_relacionados()


@router.put(
    "/{embaixada_id}/",
    response={200: EmbaixadaOut, **R401, **R403, **R404},
    summary="Atualiza uma embaixada",
    operation_id="atualizar_embaixada",
)
def atualizar_embaixada(request, embaixada_id: int, payload: EmbaixadaUpdate):
    """
    A Diretoria pode alterar qualquer campo. O conselheiro da própria embaixada só pode alterar `horarios_reuniao` —
    tentar mudar `nome` ou `igreja_id` devolve 403.
    """
    membro_logado = membro_do_usuario(request.auth)
    embaixada = get_object_or_404(Embaixada, pk=embaixada_id)

    dados = payload.dict(exclude_unset=True)
    mudando_dados_estruturais = "nome" in dados or "igreja_id" in dados

    if membro_logado.eh_diretoria:
        pass
    elif membro_logado.tipo == TipoMembro.CONSELHEIRO and membro_logado.embaixada_id == embaixada_id:
        if mudando_dados_estruturais:
            raise HttpError(
                403, "Nome e igreja da embaixada só podem ser alterados pela Diretoria — você pode editar os horários de reunião."
            )
    else:
        raise HttpError(403, "Ação restrita à Diretoria ou ao conselheiro desta embaixada.")

    if "igreja_id" in dados:
        embaixada.igreja = get_object_or_404(Igreja, pk=dados.pop("igreja_id"))
    horarios_reuniao = dados.pop("horarios_reuniao", None)

    for campo, valor in dados.items():
        setattr(embaixada, campo, valor)
    embaixada.save()

    if horarios_reuniao is not None:
        _sincronizar_horarios(embaixada, [HorarioReuniaoIn(**h) for h in horarios_reuniao])

    return embaixada


@router.delete(
    "/{embaixada_id}/",
    response={204: None, **R401, **R403, **R404},
    summary="Exclui uma embaixada",
    operation_id="excluir_embaixada",
)
def excluir_embaixada(request, embaixada_id: int):
    """Restrito à Diretoria."""
    exigir_diretoria(request)
    embaixada = get_object_or_404(Embaixada, pk=embaixada_id)
    embaixada.delete()
    return 204, None
