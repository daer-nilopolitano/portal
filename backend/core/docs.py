"""
Visualizador customizado da documentação da API: Scalar no lugar do Swagger UI padrão do Django Ninja.

O Django Ninja já gera o OpenAPI em /api/openapi.json; esta classe só troca a página que consome esse JSON.
Nenhuma refatoração dos endpoints é necessária — ver core/api/*.py para os metadados (summary, description, tags,
response) que aparecem na página.
"""
import json

from django.conf import settings
from django.http import HttpResponse
from django.urls import NoReverseMatch, reverse
from ninja.openapi.docs import DocsBase

# Versão fixada do @scalar/api-reference — evita que uma atualização do pacote no jsDelivr quebre a página sem aviso.
# Ao atualizar, teste local antes de subir.
SCALAR_VERSION = "1.72.1"


class ScalarApiReference(DocsBase):
    """
    Documentação da API com Scalar (https://github.com/scalar/scalar).

    O "Try it" ("Test Request", no Scalar) fica ligado por padrão, em dev e em produção — settings.API_DOCS_TRY_IT
    controla isso (True por padrão); defina API_DOCS_TRY_IT=False no ambiente para desligar sem modificar o código.
    """

    def render_page(self, request, api, **kwargs):
        try:
            openapi_url = reverse(f"{api.urls_namespace}:openapi-json")
        except NoReverseMatch:
            # Fallback: caminho direto configurado no NinjaAPI (openapi_url).
            openapi_url = api.openapi_url

        config = {
            "url": openapi_url,

            # Aparência
            "layout": "modern",
            "withDefaultFonts": True,

            # Navegação
            "showSidebar": True,
            "hideClientButton": True,
            "hideSearch": False,
            "operationTitleSource": "summary",

            # Operações
            "hideTestRequestButton": not settings.API_DOCS_TRY_IT,
            "showOperationId": False,

            # Modelos e schemas
            "hideModels": False,
            "documentDownloadType": "json",
            "expandAllParameters": True,
            "orderSchemaPropertiesBy": "alpha",
            "orderRequiredPropertiesFirst": True,

            # Interface
            "hideDarkModeToggle": False,

            # Desenvolvimento
            "showDeveloperTools": "localhost",
            "showToolbar": "localhost",

            # Privacidade
            "persistAuth": False,
            "telemetry": False,

            # API Nome
            "slug": "daer-nilopolitano-api",
            "title": "DAER Nilopolitano API",

            # IA
            "agent": {
                "disabled": True,
            },
            "mcp": {
                "disabled": True,
            },
        }

        html = f"""<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{api.title}</title>
    <style>
      html, body {{ margin: 0; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@{SCALAR_VERSION}"></script>
    <script>
      Scalar.createApiReference('#app', {json.dumps(config)});
    </script>
  </body>
</html>"""
        return HttpResponse(html)
