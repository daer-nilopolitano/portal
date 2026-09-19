"""
Router-mestre da API do sistema de gestão (Django Ninja).

Cada entidade tem seu próprio módulo de router aqui dentro; este arquivo só
combina todos eles sob os prefixos certos. Registrado uma única vez em
config/urls.py.
"""
from ninja import Router

from .auth import router as auth_router
from .carteirinhas import router as carteirinhas_router
from .diretoria import router as diretoria_router
from .embaixadas import router as embaixadas_router
from .embaixadas import router_publico as embaixadas_publicas_router
from .estatisticas import router as estatisticas_router
from .grupos import router as grupos_router
from .igrejas import router as igrejas_router
from .membros import router as membros_router

router = Router()

router.add_router("/auth", auth_router)
router.add_router("/igrejas", igrejas_router)
router.add_router("/embaixadas", embaixadas_router)
router.add_router("/embaixadas-publicas", embaixadas_publicas_router)
router.add_router("/membros", membros_router)
router.add_router("/diretoria", diretoria_router)
router.add_router("/grupos", grupos_router)
router.add_router("/carteirinhas", carteirinhas_router)
router.add_router("/estatisticas", estatisticas_router)
