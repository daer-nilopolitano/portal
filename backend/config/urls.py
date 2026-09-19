from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView
from ninja import NinjaAPI
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

from cms.api import api_router as wagtail_api_router

api = NinjaAPI(title="DAER Nilopolitano API", version="1.0.0")

# Router-mestre com todas as entidades (igrejas, embaixadas, membros, papéis, carteirinhas)
api.add_router("/", "core.api.router")

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("cms-admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("api/", api.urls),
    path("api/cms/", wagtail_api_router.urls),
    path("", TemplateView.as_view(template_name="landing.html"), name="landing"),
    path("", include(wagtail_urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
