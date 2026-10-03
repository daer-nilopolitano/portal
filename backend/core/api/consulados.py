"""
Endpoints de gestão de Consulados — pequenos grupos de Embaixadores do Rei dentro de uma embaixada.

Consulados são opcionais (nem toda embaixada tem). Cada consulado pertence a uma embaixada e tem no máximo um cônsul
(líder), que precisa ser integrante do próprio consulado. Quantos consulados existem e quem participa de cada um é
decisão do conselheiro da embaixada.

Regras de acesso:
- Diretoria: lê e escreve consulados de qualquer embaixada.
- Conselheiro: lê e escreve os consulados da própria embaixada.
- Auxiliar: só lê os da própria embaixada.
- Embaixador do Rei: sem acesso a estes endpoints — usa /api/auth/me/.
"""
from typing import Optional

from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from ninja import Field, Query, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import Consulado, DiretoriaEmbaixada, Embaixada, Membro, TipoMembro
from .erros import R400, R401, R403, R404
from .membros import _pode_gerenciar_embaixada

router = Router(tags=["Consulados"], auth=AuthBearer())


# ---------------------------------------------------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------------------------------------------------
class ConsuladoIntegranteOut(Schema):
    id: int
    nome: str
    eh_consul: bool = Field(False, description="Se este integrante é o cônsul (líder) do consulado.")


class ConsuladoOut(Schema):
    id: int
    nome: str
    embaixada_id: int
    embaixada_nome: str
    consul_id: Optional[int] = Field(None, description="Membro que lidera o consulado; `null` se ainda não há cônsul.")
    consul_nome: Optional[str] = None
    total_integrantes: int
    integrantes: list[ConsuladoIntegranteOut] = []

    @staticmethod
    def resolve_embaixada_nome(obj: Consulado) -> str:
        return obj.embaixada.nome

    @staticmethod
    def resolve_consul_nome(obj: Consulado) -> Optional[str]:
        return obj.consul.nome if obj.consul_id else None

    @staticmethod
    def resolve_total_integrantes(obj: Consulado) -> int:
        return len(obj.integrantes_carregados)

    @staticmethod
    def resolve_integrantes(obj: Consulado) -> list[dict]:
        return [
            {"id": m.id, "nome": m.nome, "eh_consul": m.id == obj.consul_id}
            for m in obj.integrantes_carregados
        ]


class ConsuladoIn(Schema):
    embaixada_id: int
    nome: str = Field(..., min_length=1, max_length=100, examples=["Consulado Leões de Judá"])
    consul_id: Optional[int] = Field(
        None,
        description="Opcional. Embaixador do Rei da mesma embaixada que será o cônsul; ele entra como integrante.",
    )


class ConsuladoUpdate(Schema):
    nome: Optional[str] = Field(None, max_length=100)
    consul_id: Optional[int] = Field(
        None,
        description=(
            "Novo cônsul (precisa ser Embaixador do Rei da mesma embaixada; passa a integrar o consulado) ou `null` "
            "para ficar sem cônsul — nesse caso ele continua como integrante."
        ),
    )


class IntegrantesIn(Schema):
    membro_ids: list[int] = Field(
        ...,
        description=(
            "Lista completa dos integrantes do consulado — substitui os atuais por inteiro (não é um incremento). "
            "Quem sair da lista fica sem consulado. O cônsul, se houver, precisa estar na lista."
        ),
    )


class ConsuladoFiltros(Schema):
    embaixada_id: Optional[int] = None


# ---------------------------------------------------------------------------------------------------------------------
# Auxiliares
# ---------------------------------------------------------------------------------------------------------------------
def _com_relacionados():
    """Consulados já com tudo que o ConsuladoOut usa, em 3 consultas fixas (consulados+embaixada+cônsul, integrantes)."""
    return Consulado.objects.select_related("embaixada", "consul").prefetch_related(
        Prefetch(
            "integrantes",
            queryset=Membro.objects.only("id", "nome", "consulado_id"),
            to_attr="integrantes_carregados",
        )
    )


def _queryset_visivel(request):
    """Leitura — Diretoria vê tudo; conselheiro e auxiliar veem os da própria embaixada."""
    membro_logado = membro_do_usuario(request.auth)
    qs = _com_relacionados()
    if membro_logado.eh_diretoria:
        return qs
    if membro_logado.tipo in (TipoMembro.CONSELHEIRO, TipoMembro.AUXILIAR):
        return qs.filter(embaixada_id=membro_logado.embaixada_id)
    raise HttpError(403, "Sem permissão para ver consulados. Use /api/auth/me/.")


def _consulado_gerenciavel(request, consulado_id: int) -> Consulado:
    """Escrita — Diretoria ou conselheiro da própria embaixada do consulado."""
    membro_logado = membro_do_usuario(request.auth)
    consulado = get_object_or_404(Consulado.objects.select_related("embaixada"), pk=consulado_id)
    if not _pode_gerenciar_embaixada(membro_logado, consulado.embaixada_id):
        raise HttpError(403, "Você só pode gerenciar consulados da sua própria embaixada.")
    return consulado


def _validar_nome_livre(embaixada_id: int, nome: str, ignorar_id: Optional[int] = None) -> None:
    qs = Consulado.objects.filter(embaixada_id=embaixada_id, nome__iexact=nome)
    if ignorar_id is not None:
        qs = qs.exclude(pk=ignorar_id)
    if qs.exists():
        raise HttpError(400, "Já existe um consulado com esse nome nesta embaixada.")


def _validar_integrante(membro: Membro, embaixada_id: int) -> None:
    if membro.tipo != TipoMembro.EMBAIXADOR_DO_REI:
        raise HttpError(400, f"{membro.nome} não é Embaixador do Rei — só eles participam de consulados.")
    if membro.embaixada_id != embaixada_id:
        raise HttpError(400, f"{membro.nome} não é da mesma embaixada do consulado.")


def _definir_consul(consulado: Consulado, consul_id: int) -> None:
    """Valida e atribui o cônsul no objeto; quem chama dá o save() (que já coloca o cônsul como integrante)."""
    membro = get_object_or_404(Membro, pk=consul_id)
    _validar_integrante(membro, consulado.embaixada_id)
    if Consulado.objects.filter(consul=membro).exclude(pk=consulado.pk).exists():
        raise HttpError(400, f"{membro.nome} já é cônsul de outro consulado.")
    if DiretoriaEmbaixada.objects.filter(membro=membro).exists():
        raise HttpError(
            400,
            f"{membro.nome} já ocupa outro cargo na diretoria da embaixada — um membro só pode ter um cargo. "
            "Remova o cargo atual antes.",
        )
    consulado.consul = membro


# ---------------------------------------------------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------------------------------------------------
@router.get(
    "/",
    response={200: list[ConsuladoOut], **R401, **R403},
    summary="Lista consulados",
    operation_id="listar_consulados",
)
def listar_consulados(request, filtros: ConsuladoFiltros = Query(...)):
    """Diretoria vê todos; conselheiro e auxiliar só os da própria embaixada; embaixador do rei recebe 403."""
    qs = _queryset_visivel(request)
    if filtros.embaixada_id is not None:
        qs = qs.filter(embaixada_id=filtros.embaixada_id)
    return qs


@router.get(
    "/{consulado_id}/",
    response={200: ConsuladoOut, **R401, **R403, **R404},
    summary="Detalha um consulado",
    operation_id="detalhar_consulado",
)
def detalhar_consulado(request, consulado_id: int):
    return get_object_or_404(_queryset_visivel(request), pk=consulado_id)


@router.post(
    "/",
    response={201: ConsuladoOut, **R400, **R401, **R403, **R404},
    summary="Cria um consulado",
    operation_id="criar_consulado",
)
def criar_consulado(request, payload: ConsuladoIn):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da embaixada informada em `embaixada_id`.

    404 se a embaixada (ou o `consul_id`) não existir; 400 se o nome já estiver em uso na embaixada ou se o cônsul não
    for um Embaixador do Rei da mesma embaixada, já liderar outro consulado ou já ocupar outro cargo na diretoria.
    """
    membro_logado = membro_do_usuario(request.auth)
    embaixada = get_object_or_404(Embaixada, pk=payload.embaixada_id)
    if not _pode_gerenciar_embaixada(membro_logado, embaixada.pk):
        raise HttpError(403, "Você só pode criar consulados na sua própria embaixada.")

    nome = payload.nome.strip()
    if not nome:
        raise HttpError(400, "nome não pode ser vazio.")
    _validar_nome_livre(embaixada.pk, nome)

    with transaction.atomic():
        consulado = Consulado.objects.create(embaixada=embaixada, nome=nome)
        if payload.consul_id is not None:
            _definir_consul(consulado, payload.consul_id)
            consulado.save()
    return 201, get_object_or_404(_com_relacionados(), pk=consulado.pk)


@router.put(
    "/{consulado_id}/",
    response={200: ConsuladoOut, **R400, **R401, **R403, **R404},
    summary="Atualiza um consulado (nome e/ou cônsul)",
    operation_id="atualizar_consulado",
)
def atualizar_consulado(request, consulado_id: int, payload: ConsuladoUpdate):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da embaixada do consulado.

    Só os campos enviados são alterados. `consul_id: null` remove o cônsul (ele segue como integrante).
    404 se o consulado ou o novo cônsul não existirem; 400 se `nome` for nulo/vazio/repetido ou se o novo cônsul for
    inválido (outra embaixada, não é Embaixador do Rei, já lidera outro consulado ou já tem outro cargo).
    """
    consulado = _consulado_gerenciavel(request, consulado_id)
    dados = payload.dict(exclude_unset=True)

    if "nome" in dados:
        nome = (dados["nome"] or "").strip()
        if not nome:
            raise HttpError(400, "nome não pode ser nulo nem vazio.")
        _validar_nome_livre(consulado.embaixada_id, nome, ignorar_id=consulado.pk)
        consulado.nome = nome

    with transaction.atomic():
        if "consul_id" in dados:
            if dados["consul_id"] is None:
                consulado.consul = None
            else:
                _definir_consul(consulado, dados["consul_id"])
        consulado.save()
    return get_object_or_404(_com_relacionados(), pk=consulado.pk)


@router.put(
    "/{consulado_id}/integrantes/",
    response={200: ConsuladoOut, **R400, **R401, **R403, **R404},
    summary="Define os integrantes do consulado (substitui a lista inteira)",
    operation_id="definir_integrantes_consulado",
)
def definir_integrantes(request, consulado_id: int, payload: IntegrantesIn):
    """
    **Permissão:** restrito à Diretoria ou ao conselheiro da embaixada do consulado.

    Substitui os integrantes por inteiro: quem não estiver na lista fica sem consulado; quem estiver e pertencia a outro
    consulado é movido para este. Todos precisam ser Embaixadores do Rei da mesma embaixada.
    400 se o cônsul atual não estiver na lista, ou se alguém da lista for cônsul de outro consulado.
    """
    consulado = _consulado_gerenciavel(request, consulado_id)
    ids = set(payload.membro_ids)

    membros = list(Membro.objects.filter(pk__in=ids))
    if len(membros) != len(ids):
        raise HttpError(404, "Algum dos membros informados não existe.")
    for m in membros:
        _validar_integrante(m, consulado.embaixada_id)

    if consulado.consul_id is not None and consulado.consul_id not in ids:
        raise HttpError(400, "O cônsul precisa continuar integrante. Troque ou remova o cônsul antes de tirá-lo da lista.")
    if Consulado.objects.filter(consul_id__in=ids).exclude(pk=consulado.pk).exists():
        raise HttpError(400, "Alguém da lista é cônsul de outro consulado. Troque o cônsul de lá antes de movê-lo.")

    with transaction.atomic():
        Membro.objects.filter(consulado=consulado).exclude(pk__in=ids).update(consulado=None)
        Membro.objects.filter(pk__in=ids).update(consulado=consulado)
    return get_object_or_404(_com_relacionados(), pk=consulado.pk)


@router.delete(
    "/{consulado_id}/",
    response={204: None, **R401, **R403, **R404},
    summary="Exclui um consulado",
    operation_id="excluir_consulado",
)
def excluir_consulado(request, consulado_id: int):
    """Restrito à Diretoria ou ao conselheiro da embaixada. Os integrantes não são excluídos: ficam sem consulado."""
    consulado = _consulado_gerenciavel(request, consulado_id)
    consulado.delete()
    return 204, None
