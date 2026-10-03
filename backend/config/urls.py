from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from ninja import NinjaAPI
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

from cms.api import api_router as wagtail_api_router
from core.docs import ScalarApiReference

api = NinjaAPI(
    title="DAER Nilopolitano API",
    version="1.0.0",
    description=(
        "API do sistema de gestão do DAER Nilopolitano (Departamento Associacional de Embaixadores do Rei Nilopolitano).\n\n"
        "A maior parte dos endpoints exige login: faça `POST /api/auth/login/` com e-mail e senha e envie o `access_token` "
        "recebido em toda requisição, no cabeçalho `Authorization: Bearer <token>`. O token expira em alguns dias "
        "(ver `JWT_EXPIRATION_MINUTES`).\n\n"
        "Os endpoints em **Igrejas**, **Embaixadas (público)** e o próprio login não exigem autenticação. Os demais "
        "respeitam o tipo do membro logado (Diretoria, Conselheiro, Auxiliar ou Embaixador do Rei) e retornam 403 quando "
        "a ação não é permitida para esse papel."
    ),
    docs=ScalarApiReference(),
    openapi_extra={
        "tags": [
            {
                "name": "Autenticação",
                "description": "Login (e-mail e senha) e dados do membro logado.",
            },
            {
                "name": "Igrejas",
                "description": "Lista pública das igrejas participantes — alimenta o mapa do site institucional.",
            },
            {
                "name": "Embaixadas",
                "description": "Gestão de embaixadas: dados, horários de reunião e conselheiros.",
            },
            {
                "name": "Embaixadas (público)",
                "description": "Versão sem dados pessoais, consumida pelo site institucional.",
            },
            {
                "name": "Consulados",
                "description": "Pequenos grupos de embaixadores do rei dentro da embaixada, cada um com seu cônsul (líder). Opcionais.",
            },
            {
                "name": "Membros",
                "description": "Cadastro de conselheiros, auxiliares e embaixadores do rei, e criação de acesso ao sistema.",
            },
            {
                "name": "Diretoria",
                "description": "Mandatos da Diretoria da associação.",
            },
            {
                "name": "Grupos de trabalho",
                "description": "Grupos de trabalho e seus participantes.",
            },
            {
                "name": "Carteirinhas",
                "description": "Emissão e renovação da carteirinha do embaixador do rei. A verificação por QR code é pública.",
            },
            {
                "name": "Estatísticas",
                "description": "Indicadores agregados — escopo varia conforme o papel do membro logado.",
            },
        ]
    },
)

# Router-mestre com todas as entidades (igrejas, embaixadas, membros, papéis, carteirinhas)
api.add_router("/", "core.api.router")

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("cms-admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("api/", api.urls),
    path("api/cms/", wagtail_api_router.urls),
    path("", include(wagtail_urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
