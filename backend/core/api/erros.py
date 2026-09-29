"""
Schema e atalhos de resposta de erro, compartilhados entre os routers.

Todo HttpError levantado pelo Ninja (ver core/auth.py e core/api/*.py) já
devolve {"detail": "..."} — o ErroOut só formaliza isso na documentação.

Uso nos endpoints (próxima etapa, endpoint por endpoint):

    from ..erros import ErroOut, RESPOSTAS_AUTH

    @router.put("/{membro_id}/", response={200: MembroOut, **RESPOSTAS_AUTH})
    def atualizar_membro(request, membro_id: int, payload: MembroUpdate):
        ...

As chaves com "response=" no Ninja precisam do código de sucesso explícito
(200, 201, 204...) quando combinadas com códigos de erro — ver os exemplos
em cada router.
"""
from ninja import Schema


class ErroOut(Schema):
    """Formato de erro devolvido por todo HttpError da API (ver ninja.errors.HttpError)."""

    detail: str


# Conjuntos prontos para espalhar num response={200: X, **RESPOSTAS_...}.
# Cobrem só os códigos que hoje aparecem de fato nos routers (ver HttpError em core/auth.py e core/api/*.py).
RESPOSTAS_403 = {403: ErroOut}
RESPOSTAS_404 = {404: ErroOut}
RESPOSTAS_400_403 = {400: ErroOut, 403: ErroOut}
RESPOSTAS_403_404 = {403: ErroOut, 404: ErroOut}
RESPOSTAS_400_403_404 = {400: ErroOut, 403: ErroOut, 404: ErroOut}
RESPOSTAS_LOGIN = {401: ErroOut, 403: ErroOut}
