"""
Schema e atalhos de resposta de erro, compartilhados entre os routers.

Todo HttpError levantado pelo Ninja (ver core/auth.py e core/api/*.py) já devolve {"detail": "..."}, e o ErroOut só
formaliza isso na documentação.

Uso nos endpoints:

    from ..erros import ErroOut, R401, R403, R404

    @router.put("/{membro_id}/", response={200: MembroOut, **R401, **R403, **R404})
    def atualizar_membro(request, membro_id: int, payload: MembroUpdate):
        ...

O "response=" no Ninja precisa do código de sucesso explícito (200, 201, 204...) quando combinado com códigos de erro.

R401 vale para todo endpoint com auth=AuthBearer() (token ausente, inválido ou expirado).
"""
from ninja import Schema


class ErroOut(Schema):
    """Formato de erro devolvido por todo HttpError da API (ver ninja.errors.HttpError)."""

    detail: str


R400 = {400: ErroOut}
R401 = {401: ErroOut}  # token ausente, inválido ou expirado, ou membro inativo — endpoints com AuthBearer()
R403 = {403: ErroOut}
R404 = {404: ErroOut}
R429 = {429: ErroOut}  # tentativas demais — hoje só o login
