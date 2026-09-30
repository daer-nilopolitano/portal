"""
Endpoints da Diretoria da associação (cargo, mandato). Leitura liberada a
qualquer membro logado (saber quem é a Diretoria não é sensível); escrita
restrita a quem já tem mandato ativo na própria Diretoria.
"""
from datetime import date
from typing import Optional

from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from ninja import Field, Query, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, exigir_diretoria, exigir_senha, membro_do_usuario
from ..models import Diretoria, Membro, TipoMembro
from .erros import R400, R401, R403, R404

router = Router(tags=["Diretoria"], auth=AuthBearer())

_DESC_CARGO = (
    "Cargo do membro na Diretoria da associação. Valores: `coordenador`, `presidente`, `vice_presidente`, "
    "`primeiro_secretario`, `segundo_secretario`, `diretor_midia_comunicacao`, `diretor_esportes`."
)
_DESC_DATA_INICIO = "Data de início do mandato, no formato `AAAA-MM-DD`."
_DESC_DATA_FIM = (
    "Data de término do mandato, no formato `AAAA-MM-DD`. `null` significa mandato **ativo**. "
    "Para encerrar um mandato preservando o histórico, preencha este campo via `PUT` em vez de excluir."
)


def _validar_cargo(cargo: Optional[str]) -> None:
    if cargo not in Diretoria.Cargo.values:
        raise HttpError(
            400,
            "Cargo inválido. Valores aceitos: " + ", ".join(Diretoria.Cargo.values) + ".",
        )


class DiretoriaOut(Schema):
    id: int = Field(..., description="Identificador do mandato (não é o id do membro).")
    membro_id: int = Field(..., description="Identificador do membro que ocupa o cargo.")
    membro_nome: str = Field(..., examples=["Maria Exemplo da Silva"])
    cargo: str = Field(..., description=_DESC_CARGO, examples=["presidente"])
    data_inicio: date = Field(..., description=_DESC_DATA_INICIO, examples=["2026-01-15"])
    data_fim: Optional[date] = Field(None, description=_DESC_DATA_FIM)

    @staticmethod
    def resolve_membro_nome(obj: Diretoria) -> str:
        return obj.membro.nome


class DiretoriaIn(Schema):
    membro_id: int = Field(
        ...,
        description=(
            "Membro que assumirá o cargo. Precisa ter `tipo` = `conselheiro` e não pode ter outro mandato ativo."
        ),
        examples=[1],
    )
    cargo: str = Field(..., description=_DESC_CARGO, examples=["presidente"])
    data_inicio: date = Field(..., description=_DESC_DATA_INICIO, examples=["2026-01-15"])
    senha_confirmacao: str = Field(
        ..., description="Sua senha. Conceder cargo na Diretoria dá poder sobre o sistema inteiro."
    )


class DiretoriaUpdate(Schema):
    cargo: Optional[str] = Field(None, description=_DESC_CARGO)
    data_inicio: Optional[date] = Field(None, description=_DESC_DATA_INICIO)
    data_fim: Optional[date] = Field(None, description=_DESC_DATA_FIM)
    senha_confirmacao: Optional[str] = Field(
        None, description="Obrigatória só ao reabrir um mandato encerrado (`data_fim` = null)."
    )


@router.get(
    "/",
    response={200: list[DiretoriaOut], **R401},
    summary="Lista os mandatos da Diretoria",
    operation_id="listar_diretoria",
)
def listar_diretoria(
    request,
    apenas_ativos: bool = Query(
        True,
        description=(
            "Se `true` (padrão), devolve só os mandatos ativos (sem `data_fim`). Use `false` para incluir também o histórico."
        ),
    ),
):
    """
    **Permissão:** qualquer membro logado (Diretoria, conselheiro, auxiliar ou embaixador do rei).

    Por padrão lista apenas os mandatos ativos; envie `apenas_ativos=false` para ver também os encerrados.
    """
    membro_do_usuario(request.auth)  # só exige estar logado
    qs = Diretoria.objects.select_related("membro")
    if apenas_ativos:
        qs = qs.filter(data_fim__isnull=True)
    return qs


@router.post(
    "/",
    response={201: DiretoriaOut, **R400, **R401, **R403, **R404},
    summary="Cria um mandato na Diretoria",
    operation_id="criar_mandato",
)
def criar_mandato(request, payload: DiretoriaIn):
    """
    **Permissão:** restrito à Diretoria (quem já tem mandato ativo). Os demais recebem 403.

    Regras: 404 se `membro_id` não existir; 400 se `cargo` não for um dos valores válidos, se o membro não for
    `conselheiro` ou se já tiver um mandato ativo.
    """
    exigir_diretoria(request)
    exigir_senha(request, payload.senha_confirmacao)
    _validar_cargo(payload.cargo)

    membro_alvo = get_object_or_404(Membro, pk=payload.membro_id)
    if membro_alvo.tipo != TipoMembro.CONSELHEIRO:
        raise HttpError(400, "Só um Membro com tipo=conselheiro pode ocupar cargo na Diretoria.")
    if not membro_alvo.ativo:
        raise HttpError(400, "Esse membro está inativo.")
    if Diretoria.objects.filter(membro=membro_alvo, data_fim__isnull=True).exists():
        raise HttpError(400, "Esse membro já tem um mandato ativo na Diretoria.")

    try:
        with transaction.atomic():
            mandato = Diretoria.objects.create(
                membro=membro_alvo, cargo=payload.cargo, data_inicio=payload.data_inicio
            )
    except IntegrityError:  # dois pedidos simultâneos
        raise HttpError(400, "Esse membro já tem um mandato ativo na Diretoria.")
    return 201, mandato


@router.put(
    "/{mandato_id}/",
    response={200: DiretoriaOut, **R400, **R401, **R403, **R404},
    summary="Atualiza um mandato",
    operation_id="atualizar_mandato",
)
def atualizar_mandato(request, mandato_id: int, payload: DiretoriaUpdate):
    """
    **Permissão:** restrito à Diretoria. Os demais recebem 403.

    Atualização parcial: só os campos enviados são alterados. Para encerrar um mandato mantendo o histórico,
    envie `data_fim`. 404 se o mandato não existir; 400 se `cargo` não for um dos valores válidos ou se
    `cargo` / `data_inicio` forem enviados como `null` (só `data_fim` aceita `null`).
    """
    exigir_diretoria(request)
    mandato = get_object_or_404(Diretoria.objects.select_related("membro"), pk=mandato_id)

    dados = payload.dict(exclude_unset=True)
    senha_confirmacao = dados.pop("senha_confirmacao", None)  # não é campo do modelo
    if "cargo" in dados:
        _validar_cargo(dados["cargo"])
    if "data_inicio" in dados and dados["data_inicio"] is None:
        raise HttpError(400, "data_inicio não pode ser nula.")

    inicio = dados.get("data_inicio", mandato.data_inicio)
    fim = dados.get("data_fim", mandato.data_fim)
    if "data_fim" in dados or "data_inicio" in dados:
        if fim is not None and fim < inicio:
            raise HttpError(400, "data_fim não pode ser anterior a data_inicio.")
    if "data_fim" in dados and fim is not None and fim > date.today():
        raise HttpError(400, "data_fim não pode estar no futuro: o mandato encerra assim que for preenchida.")

    reabrindo = "data_fim" in dados and dados["data_fim"] is None and mandato.data_fim is not None
    if reabrindo:
        if not senha_confirmacao:
            raise HttpError(400, "Informe sua senha para reabrir um mandato.")
        exigir_senha(request, senha_confirmacao)
        if not mandato.membro.ativo or mandato.membro.tipo != TipoMembro.CONSELHEIRO:
            raise HttpError(400, "Só um conselheiro ativo pode ocupar cargo na Diretoria.")
        if Diretoria.objects.filter(membro=mandato.membro, data_fim__isnull=True).exclude(pk=mandato.pk).exists():
            raise HttpError(400, "Esse membro já tem outro mandato ativo na Diretoria.")

    try:
        with transaction.atomic():
            for campo, valor in dados.items():
                setattr(mandato, campo, valor)
            mandato.save()
    except IntegrityError:
        raise HttpError(400, "Esse membro já tem um mandato ativo na Diretoria.")
    return mandato


@router.delete(
    "/{mandato_id}/",
    response={204: None, **R401, **R403, **R404},
    summary="Exclui um mandato",
    operation_id="excluir_mandato",
)
def excluir_mandato(request, mandato_id: int):
    """
    **Permissão:** restrito à Diretoria. Os demais recebem 403.

    Remove o registro definitivamente, inclusive do histórico. Para apenas encerrar o mandato, use `PUT` com `data_fim`.
    404 se o mandato não existir.
    """
    exigir_diretoria(request)
    mandato = get_object_or_404(Diretoria, pk=mandato_id)
    mandato.delete()
    return 204, None
