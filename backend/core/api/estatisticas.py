"""
Endpoint de contadores agregados para o painel — nasce escopado por quem está logado, para não obrigar o frontend a
baixar a lista inteira de membros só para contar. Ver plano do painel por tipo:
- Diretoria: contadores da associação inteira.
- Conselheiro/Auxiliar: contadores só da própria embaixada.
- Embaixador do Rei: não tem contadores (não gerencia nada) — recebe só o nome dos conselheiros e os aniversariantes do
  mês da própria embaixada (informação não sensível dentro da própria embaixada).
"""
from collections import Counter

from django.db.models import Exists, OuterRef
from django.utils import timezone
from ninja import Field, Router, Schema

from ..auth import AuthBearer, membro_do_usuario
from ..models import Carteirinha, Embaixada, Membro, TipoMembro
from .erros import R401, R403

router = Router(tags=["Estatísticas"], auth=AuthBearer())

_DESC_TIPO = (
    "Tipo do membro logado, que define o escopo dos dados: `conselheiro`, `auxiliar` ou `embaixador_do_rei`. "
    "Um membro da Diretoria também tem `tipo` = `conselheiro`; o escopo dele é a associação inteira."
)
_DESC_FAIXA = (
    "Quantidade de embaixadores do rei por faixa etária: `junior` (9-11 anos), `adolescente` (12-14) e "
    "`juvenil` (15-17). Faixas sem ninguém não aparecem, e embaixadores fora dessas idades contam em "
    "`total_embaixadores`, mas não entram aqui."
)


class MembroResumoOut(Schema):
    id: int = Field(..., description="Identificador do membro.", examples=[1])
    nome: str = Field(..., examples=["Ana Exemplo de Lima"])


class EstatisticasOut(Schema):
    tipo: str = Field(..., description=_DESC_TIPO)
    total_conselheiros: int = Field(0, description="Total de conselheiros no escopo. `0` para embaixador do rei.")
    total_auxiliares: int = Field(0, description="Total de auxiliares no escopo. `0` para embaixador do rei.")
    total_embaixadores: int = Field(0, description="Total de embaixadores do rei no escopo. `0` para embaixador do rei.")
    embaixadores_por_faixa: dict[str, int] = Field(
        default_factory=dict,
        description=_DESC_FAIXA,
        examples=[{"junior": 5, "adolescente": 8, "juvenil": 3}],
    )
    sem_carteirinha: list[MembroResumoOut] = Field(
        default_factory=list,
        description="Embaixadores do rei do escopo que ainda não têm carteirinha emitida.",
    )
    sem_acesso: list[MembroResumoOut] = Field(
        default_factory=list,
        description="Membros do escopo, de qualquer tipo, que ainda não têm login (ver `POST /membros/{id}/criar-acesso/`).",
    )
    aniversariantes_mes: list[MembroResumoOut] = Field(
        default_factory=list,
        description=(
            "Membros do escopo que fazem aniversário no mês atual. Para o embaixador do rei, o escopo é a própria "
            "embaixada."
        ),
    )
    # Só populado pra Diretoria (visão da associação inteira).
    embaixadas_sem_conselheiro: list[str] = Field(
        default_factory=list,
        description="Nomes das embaixadas sem nenhum conselheiro. Só vem preenchido para a Diretoria; para os demais é `[]`.",
        examples=[["Embaixada Rei Davi"]],
    )
    # Só populado para quem está logado como embaixador_do_rei.
    conselheiros_embaixada: list[str] = Field(
        default_factory=list,
        description=(
            "Nomes dos conselheiros da própria embaixada. Só vem preenchido quando o membro logado é "
            "`embaixador_do_rei`; para os demais é `[]`."
        ),
        examples=[["Thiago Andrade de Souza"]],
    )


@router.get(
    "/",
    response={200: EstatisticasOut, **R401, **R403},
    summary="Estatísticas do painel",
    operation_id="obter_estatisticas",
)
def estatisticas(request):
    """
    **Permissão:** qualquer membro logado. O que volta depende de quem chama — não há parâmetros para ampliar o escopo:

    - **Diretoria:** contadores, listas e `embaixadas_sem_conselheiro` da associação inteira.
    - **Conselheiro e auxiliar:** os mesmos contadores e listas, só da própria embaixada.
    - **Embaixador do rei:** sem contadores. Recebe apenas `conselheiros_embaixada` e `aniversariantes_mes` da própria
      embaixada.

    Os contadores consideram apenas membros ativos (`ativo=True`). 401 se o token estiver ausente, inválido ou expirado;
    403 se o usuário não estiver vinculado a nenhum Membro.
    """
    membro = membro_do_usuario(request.auth)
    mes_atual = timezone.localdate().month

    if membro.tipo == TipoMembro.EMBAIXADOR_DO_REI:
        conselheiros = Membro.objects.filter(
            embaixada_id=membro.embaixada_id, tipo=TipoMembro.CONSELHEIRO, ativo=True
        )
        aniversariantes = Membro.objects.filter(
            embaixada_id=membro.embaixada_id, data_nascimento__month=mes_atual, ativo=True
        )
        return EstatisticasOut(
            tipo=membro.tipo,
            conselheiros_embaixada=[c.nome for c in conselheiros],
            aniversariantes_mes=[MembroResumoOut(id=m.id, nome=m.nome) for m in aniversariantes],
        )

    escopo = Membro.objects.filter(ativo=True)
    if not membro.eh_diretoria:
        escopo = escopo.filter(embaixada_id=membro.embaixada_id)
    # Uma única consulta traz os membros do escopo (só as colunas usadas, já com a flag "tem carteirinha");
    # contadores, faixas e listas são calculados em Python. A associação tem centenas de membros no máximo,
    # então isso é bem mais barato do que uma consulta por contador (~137 ms cada no Neon).
    membros = list(
        escopo.annotate(tem_carteirinha=Exists(Carteirinha.objects.filter(membro=OuterRef("pk"))))
        .only("id", "nome", "tipo", "data_nascimento", "user_id")
    )
    embaixadores = [m for m in membros if m.tipo == TipoMembro.EMBAIXADOR_DO_REI]
    por_faixa = Counter(m.faixa_etaria for m in embaixadores if m.faixa_etaria)

    return EstatisticasOut(
        tipo=membro.tipo,
        total_conselheiros=sum(m.tipo == TipoMembro.CONSELHEIRO for m in membros),
        total_auxiliares=sum(m.tipo == TipoMembro.AUXILIAR for m in membros),
        total_embaixadores=len(embaixadores),
        embaixadores_por_faixa=dict(por_faixa),
        sem_carteirinha=[
            MembroResumoOut(id=m.id, nome=m.nome) for m in embaixadores if not m.tem_carteirinha
        ],
        sem_acesso=[MembroResumoOut(id=m.id, nome=m.nome) for m in membros if m.user_id is None],
        aniversariantes_mes=[
            MembroResumoOut(id=m.id, nome=m.nome)
            for m in membros
            if m.data_nascimento.month == mes_atual
        ],
        embaixadas_sem_conselheiro=(
            list(
                Embaixada.objects.filter(
                    ~Exists(
                        Membro.objects.filter(
                            embaixada=OuterRef("pk"), tipo=TipoMembro.CONSELHEIRO, ativo=True
                        )
                    )
                ).values_list("nome", flat=True)
            )
            if membro.eh_diretoria
            else []
        ),
    )
