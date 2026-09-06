"""
Expondo o conteúdo do Wagtail (notícias, eventos, páginas institucionais)
como API para o frontend Next.js consumir — a arquitetura escolhida usa
Django só como backend, então o Wagtail também é consumido de forma
headless em vez de renderizar templates Django.
"""
from wagtail.api.v2.router import WagtailAPIRouter
from wagtail.api.v2.views import PagesAPIViewSet
from wagtail.documents.api.v2.views import DocumentsAPIViewSet
from wagtail.images.api.v2.views import ImagesAPIViewSet

api_router = WagtailAPIRouter("wagtailapi")

api_router.register_endpoint("pages", PagesAPIViewSet)
api_router.register_endpoint("images", ImagesAPIViewSet)
api_router.register_endpoint("documents", DocumentsAPIViewSet)
