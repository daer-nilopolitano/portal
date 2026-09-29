"""
Endpoints de Grupos de Trabalho (Música, Programações, Evangelismo).

Criar/renomear um grupo é uma ação rara e será feita apenas pelo Django Admin (mesmo padrão de Igreja).
Aqui só há gestão de quem participa de cada grupo.

Permissão para adicionar/remover/trocar papel de um membro no grupo:
Diretoria (qualquer grupo) ou o próprio líder daquele grupo específico.
"""
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import GrupoMembro, GrupoTrabalho, Membro, TipoMembro
from .erros import R400, R401, R403, R404

router = Router(tags=["Grupos de trabalho"], auth=AuthBearer())

_DESC_PAPEL = (
    "Papel do membro no grupo: `lider` ou `membro`. Só um Membro com `tipo` = `conselheiro` pode ser `lider`, e cada "
    "conselheiro lidera no máximo 1 grupo."
)


class ParticipanteOut(Schema):
    membro_id: int = Field(..., description="Identificador do membro participante.")
    membro_nome: str = Field(..., examples=["João de Souza Cruz"])
    papel_no_grupo: str = Field(..., description=_DESC_PAPEL, examples=["membro"])


class GrupoOut(Schema):
    id: int
    nome: str = Field(..., examples=["Música"])
    participantes: list[ParticipanteOut] = Field(
        ..., description="Participantes do grupo, líder(es) primeiro e depois por nome."
    )

    @staticmethod
    def resolve_participantes(obj: GrupoTrabalho):
        return [
            ParticipanteOut(
                membro_id=p.membro_id, membro_nome=p.membro.nome, papel_no_grupo=p.papel_no_grupo
            )
            for p in obj.participantes.all()
        ]


class ParticipanteIn(Schema):
    membro_id: int = Field(..., description="Membro a adicionar ao grupo (ou cujo papel será atualizado).", examples=[1])
    papel_no_grupo: str = Field(..., description=_DESC_PAPEL, examples=["membro"])


def _pode_gerenciar_grupo(membro_logado: Membro, grupo: GrupoTrabalho) -> bool:
    if membro_logado.eh_diretoria:
        return True
    return grupo.participantes.filter(membro=membro_logado, papel_no_grupo="lider").exists()


@router.get(
    "/",
    response={200: list[GrupoOut], **R401},
    summary="Lista os grupos de trabalho",
    operation_id="listar_grupos",
)
def listar_grupos(request):
    """
    **Permissão:** qualquer membro logado (Diretoria, conselheiro, auxiliar ou embaixador do rei).

    Devolve todos os grupos, cada um com a lista de participantes e o papel de cada um.
    """
    membro_do_usuario(request.auth)  # só exige estar logado
    return GrupoTrabalho.objects.prefetch_related("participantes__membro")


@router.put(
    "/{grupo_id}/membros/",
    response={200: GrupoOut, **R400, **R401, **R403, **R404},
    summary="Adiciona ou atualiza um participante do grupo",
    operation_id="definir_participante",
)
def definir_participante(request, grupo_id: int, payload: ParticipanteIn):
    """
    **Permissão:** restrito à Diretoria (qualquer grupo) ou ao líder **deste** grupo. Os demais recebem 403.

    Adiciona o membro ao grupo, ou atualiza o `papel_no_grupo` se ele já participa. É idempotente: a mesma chamada serve
    para "adicionar", para "promover a líder" e para "rebaixar a membro". Devolve o grupo atualizado.

    Erros: 404 se o grupo ou o membro não existirem; 400 se `papel_no_grupo` não for `lider` nem `membro`, se o novo
    líder não for `conselheiro` ou se ele já liderar outro grupo.
    """
    membro_logado = membro_do_usuario(request.auth)
    grupo = get_object_or_404(GrupoTrabalho, pk=grupo_id)
    if not _pode_gerenciar_grupo(membro_logado, grupo):
        raise HttpError(403, "Ação restrita à Diretoria ou ao líder deste grupo.")

    if payload.papel_no_grupo not in GrupoMembro.PapelNoGrupo.values:
        raise HttpError(
            400,
            "papel_no_grupo inválido. Valores aceitos: "
            + ", ".join(GrupoMembro.PapelNoGrupo.values)
            + ".",
        )

    membro_alvo = get_object_or_404(Membro, pk=payload.membro_id)

    if payload.papel_no_grupo == GrupoMembro.PapelNoGrupo.LIDER:
        if membro_alvo.tipo != TipoMembro.CONSELHEIRO:
            raise HttpError(400, "Só um Membro com tipo=conselheiro pode liderar um grupo.")
        ja_lidera_outro = (
            GrupoMembro.objects.filter(membro=membro_alvo, papel_no_grupo="lider")
            .exclude(grupo=grupo)
            .exists()
        )
        if ja_lidera_outro:
            raise HttpError(400, "Esse membro já lidera outro grupo — só pode liderar 1 por vez.")

    GrupoMembro.objects.update_or_create(
        grupo=grupo, membro=membro_alvo, defaults={"papel_no_grupo": payload.papel_no_grupo}
    )
    # Recarrega já com participantes+membros (o resolver usa o prefetch).
    return GrupoTrabalho.objects.prefetch_related("participantes__membro").get(pk=grupo.pk)


@router.delete(
    "/{grupo_id}/membros/{membro_id}/",
    response={204: None, **R401, **R403, **R404},
    summary="Remove um participante do grupo",
    operation_id="remover_participante",
)
def remover_participante(request, grupo_id: int, membro_id: int):
    """
    **Permissão:** restrito à Diretoria (qualquer grupo) ou ao líder **deste** grupo. Os demais recebem 403.

    Remove o membro do grupo (não exclui o membro do sistema). 404 se o grupo não existir ou se o membro não participar.
    """
    membro_logado = membro_do_usuario(request.auth)
    grupo = get_object_or_404(GrupoTrabalho, pk=grupo_id)
    if not _pode_gerenciar_grupo(membro_logado, grupo):
        raise HttpError(403, "Ação restrita à Diretoria ou ao líder deste grupo.")

    get_object_or_404(GrupoMembro, grupo=grupo, membro_id=membro_id).delete()
    return 204, None
