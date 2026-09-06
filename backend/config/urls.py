from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from ninja import NinjaAPI
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

from cms.api import api_router as wagtail_api_router

api = NinjaAPI(title="DAER Nilopolitano API", version="1.0.0")

# Cada app registra o seu próprio router aqui conforme for a ser criado.
api.add_router("/igrejas/", "core.api.router")

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("cms-admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("api/", api.urls),
    # Notícias, eventos e páginas institucionais consumidos de forma headless pelo Next.js
    path("api/cms/", wagtail_api_router.urls),
    # Fica por último: qualquer rota não reconhecida acima vira uma página do Wagtail
    # (só é usado pelo preview/admin do Wagtail, o site público real é servido pelo Next.js)
    path("", include(wagtail_urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
