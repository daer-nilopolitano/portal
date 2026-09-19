"""
Endpoint de contadores agregados pro painel — nasce escopado por quem está
logado, pra não obrigar o frontend a baixar a lista inteira de membros só
pra contar. Ver plano do painel por tipo:
- Diretoria: contadores da associação inteira.
- Conselheiro/Auxiliar: contadores só da própria embaixada.
- Embaixador do Rei: não tem contadores (não gerencia nada) — recebe só o
  nome dos conselheiros e os aniversariantes do mês da própria embaixada
  (informação não sensível dentro da própria embaixada).
"""
from django.utils import timezone
from ninja import Router, Schema

from ..auth import AuthBearer, membro_do_usuario
from ..models import Embaixada, Membro, TipoMembro

router = Router(tags=["estatisticas"], auth=AuthBearer())


class MembroResumoOut(Schema):
    id: int
    nome: str


class EstatisticasOut(Schema):
    tipo: str
    total_conselheiros: int = 0
    total_auxiliares: int = 0
    total_embaixadores: int = 0
    embaixadores_por_faixa: dict[str, int] = {}
    sem_carteirinha: list[MembroResumoOut] = []
    sem_acesso: list[MembroResumoOut] = []
    aniversariantes_mes: list[MembroResumoOut] = []
    # Só populado pra Diretoria (visão da associação inteira).
    embaixadas_sem_conselheiro: list[str] = []
    # Só populado para quem está logado como embaixador_do_rei.
    conselheiros_embaixada: list[str] = []


@router.get("/", response=EstatisticasOut)
def estatisticas(request):
    membro = membro_do_usuario(request.auth)
    mes_atual = timezone.localdate().month

    if membro.tipo == TipoMembro.EMBAIXADOR_DO_REI:
        conselheiros = Membro.objects.filter(
            embaixada_id=membro.embaixada_id, tipo=TipoMembro.CONSELHEIRO
        )
        aniversariantes = Membro.objects.filter(
            embaixada_id=membro.embaixada_id, data_nascimento__month=mes_atual
        )
        return EstatisticasOut(
            tipo=membro.tipo,
            conselheiros_embaixada=[c.nome for c in conselheiros],
            aniversariantes_mes=[MembroResumoOut(id=m.id, nome=m.nome) for m in aniversariantes],
        )

    escopo = Membro.objects.all() if membro.eh_diretoria else Membro.objects.filter(
        embaixada_id=membro.embaixada_id
    )
    embaixadores = escopo.filter(tipo=TipoMembro.EMBAIXADOR_DO_REI)

    por_faixa: dict[str, int] = {}
    for m in embaixadores:
        faixa = m.faixa_etaria
        if faixa:
            por_faixa[faixa] = por_faixa.get(faixa, 0) + 1

    return EstatisticasOut(
        tipo=membro.tipo,
        total_conselheiros=escopo.filter(tipo=TipoMembro.CONSELHEIRO).count(),
        total_auxiliares=escopo.filter(tipo=TipoMembro.AUXILIAR).count(),
        total_embaixadores=embaixadores.count(),
        embaixadores_por_faixa=por_faixa,
        sem_carteirinha=[
            MembroResumoOut(id=m.id, nome=m.nome) for m in embaixadores.filter(carteirinha__isnull=True)
        ],
        sem_acesso=[MembroResumoOut(id=m.id, nome=m.nome) for m in escopo.filter(user__isnull=True)],
        aniversariantes_mes=[
            MembroResumoOut(id=m.id, nome=m.nome)
            for m in escopo.filter(data_nascimento__month=mes_atual)
        ],
        embaixadas_sem_conselheiro=(
            list(
                Embaixada.objects.exclude(membros__tipo=TipoMembro.CONSELHEIRO)
                .distinct()
                .values_list("nome", flat=True)
            )
            if membro.eh_diretoria
            else []
        ),
    )
