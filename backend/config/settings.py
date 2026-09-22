"""
Configurações do backend do DAER Nilopolitano.
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Em dev sem Docker (rodando direto no PyCharm/terminal), carrega o .env manualmente.
# Em Docker, as variáveis já vêm do docker-compose.yml e isso não tem efeito sobre as que já estiverem definidas no ambiente.
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-troque-em-producao")
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    # Wagtail (CMS para notícias e páginas institucionais)
    "wagtail.contrib.forms",
    "wagtail.contrib.redirects",
    "wagtail.embeds",
    "wagtail.sites",
    "wagtail.users",
    "wagtail.snippets",
    "wagtail.documents",
    "wagtail.images",
    "wagtail.search",
    "wagtail.admin",
    "wagtail.api.v2",
    "wagtail",
    "modelcluster",
    "taggit",

    # Terceiros
    "jazzmin",
    "corsheaders",

    # Django padrão
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Apps do projeto
    "core",
    "cms",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "wagtail.contrib.redirects.middleware.RedirectMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Banco de dados: defina DATABASE_URL apontando para o Neon.
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get(
            "DATABASE_URL", "postgres://postgres:postgres@db:5432/daer"
        )
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Whitenoise serve os arquivos de STATIC_ROOT direto pelo processo Django —
# sem isso, com DEBUG=False, nada de CSS/JS/ícones do admin é servido.
# (MEDIA continua em disco local por enquanto; migra pro R2 depois.)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS — libera o frontend Next.js a chamar a API
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

# Necessário atrás de proxy (Northflank termina o TLS antes do container) —
# sem isso o Django acha que a conexão é HTTP e falha a checagem de CSRF/CSRF cookie em produção.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Origens confiáveis para POST (login do django-admin/cms-admin). Precisa do scheme completo, igual ao CORS_ALLOWED_ORIGINS.
CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:8000"
).split(",")

# Constante de identificação do site
SITE_NAME = "DAER Nilopolitano"

WAGTAIL_SITE_NAME = SITE_NAME
WAGTAILADMIN_BASE_URL = os.environ.get(
    "WAGTAILADMIN_BASE_URL", "http://localhost:8000"
)
# Necessário para a Wagtail API devolver URLs absolutas de imagem (capa/galeria das
# notícias) — sem isso, o campo "url" das renditions vem relativo e quebra no
# frontend, que roda em outra origem (Next.js).
WAGTAILAPI_BASE_URL = os.environ.get("WAGTAILAPI_BASE_URL", WAGTAILADMIN_BASE_URL)

# Autenticação da API (JWT simples, sem refresh token por enquanto — ver core/auth.py).
# Por padrão reaproveita a SECRET_KEY do Django; em produção, defina um valor próprio em JWT_SECRET_KEY no .env.
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
JWT_EXPIRATION_MINUTES = int(os.environ.get("JWT_EXPIRATION_MINUTES", "10080"))  # 7 dias

# Configuração do django-jazzmin (tema do Django Admin).
JAZZMIN_SETTINGS = {
    "site_title": SITE_NAME,
    "site_header": SITE_NAME,
    "site_brand": SITE_NAME,
    "welcome_sign": f"Administração do {SITE_NAME}",
    "copyright": SITE_NAME,
    "site_logo": "img/logo.png",
    "login_logo": "img/logo.png",
    "site_logo_classes": "img-fluid",
    "site_icon": "img/favicon.png",
}
