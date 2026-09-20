"""
Endpoints de Grupos de Trabalho (Música, Programações, Evangelismo).

Criar/renomear um grupo é raro e fica pelo Django Admin por enquanto (mesmo
padrão de Igreja) — aqui só há gestão de quem participa de cada grupo.

Permissão para adicionar/remover/trocar papel de um membro no grupo:
Diretoria (qualquer grupo) ou o próprio líder daquele grupo específico.
"""
from typing import Optional

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from ..auth import AuthBearer, membro_do_usuario
from ..models import GrupoMembro, GrupoTrabalho, Membro, TipoMembro

router = Router(tags=["grupos"], auth=AuthBearer())


class ParticipanteOut(Schema):
    membro_id: int
    membro_nome: str
    papel_no_grupo: str


class GrupoOut(Schema):
    id: int
    nome: str
    participantes: list[ParticipanteOut]

    @staticmethod
    def resolve_participantes(obj: GrupoTrabalho):
        return [
            ParticipanteOut(
                membro_id=p.membro_id, membro_nome=p.membro.nome, papel_no_grupo=p.papel_no_grupo
            )
            for p in obj.participantes.all()
        ]


class ParticipanteIn(Schema):
    membro_id: int
    papel_no_grupo: str  # "lider" | "membro"


def _pode_gerenciar_grupo(membro_logado: Membro, grupo: GrupoTrabalho) -> bool:
    if membro_logado.eh_diretoria:
        return True
    return grupo.participantes.filter(membro=membro_logado, papel_no_grupo="lider").exists()


@router.get("/", response=list[GrupoOut])
def listar_grupos(request):
    membro_do_usuario(request.auth)  # só exige estar logado
    return GrupoTrabalho.objects.prefetch_related("participantes__membro")


@router.put("/{grupo_id}/membros/", response=GrupoOut)
def definir_participante(request, grupo_id: int, payload: ParticipanteIn):
    """
    Adiciona o membro ao grupo, ou atualiza o papel_no_grupo se ele já
    participa (endpoint idempotente — mesma chamada serve pra "adicionar"
    e pra "promover a líder"/"rebaixar a membro").
    """
    membro_logado = membro_do_usuario(request.auth)
    grupo = get_object_or_404(GrupoTrabalho, pk=grupo_id)
    if not _pode_gerenciar_grupo(membro_logado, grupo):
        raise HttpError(403, "Ação restrita à Diretoria ou ao líder deste grupo.")

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


@router.delete("/{grupo_id}/membros/{membro_id}/", response={204: None})
def remover_participante(request, grupo_id: int, membro_id: int):
    membro_logado = membro_do_usuario(request.auth)
    grupo = get_object_or_404(GrupoTrabalho, pk=grupo_id)
    if not _pode_gerenciar_grupo(membro_logado, grupo):
        raise HttpError(403, "Ação restrita à Diretoria ou ao líder deste grupo.")

    get_object_or_404(GrupoMembro, grupo=grupo, membro_id=membro_id).delete()
    return 204, None
