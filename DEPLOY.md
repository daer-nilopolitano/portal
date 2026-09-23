# Deploy

## Serviços usados

- **Frontend**: Vercel, Root Directory `frontend/`, build automático a partir do repositório.
- **Backend**: Northflank, build via `backend/Dockerfile` (Build context `/backend`, Dockerfile location 
  `/backend/Dockerfile` — atenção, o Northflank resolve o Dockerfile location a partir da raiz do repo, **não** do build context).
- **Banco**: Neon PostgreSQL.
- **Mídia**: Cloudflare R2, bucket `daer-media`, acesso público via subdomínio `r2.dev` (sem domínio próprio configurado).

## Variáveis de ambiente (backend, no Northflank)

```json
{
    "DJANGO_SECRET_KEY": "",
    "JWT_SECRET_KEY": "",
    "DJANGO_DEBUG": "False",
    "DJANGO_ALLOWED_HOSTS": "p01--backend--9l6dvd9xzxnm.code.run",
    "DATABASE_URL": "",
    "WAGTAILADMIN_BASE_URL": "p01--backend--9l6dvd9xzxnm.code.run",
    "WAGTAILAPI_BASE_URL": "p01--backend--9l6dvd9xzxnm.code.run",
    "CORS_ALLOWED_ORIGINS": "https://p01--backend--9l6dvd9xzxnm.code.run,https://daer-nilopolitano.vercel.app",
    "CSRF_TRUSTED_ORIGINS": "https://p01--backend--9l6dvd9xzxnm.code.run",
    "R2_ACCESS_KEY_ID": "",
    "R2_SECRET_ACCESS_KEY": "",
    "R2_BUCKET_NAME": "daer-media",
    "R2_ENDPOINT_URL": "https://<account_id>.r2.cloudflarestorage.com",
    "R2_PUBLIC_DOMAIN": "pub-3665e297a9094e04a5761e404ef4a7cb.r2.dev"
}
```

**Atenção**: `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` e `R2_PUBLIC_DOMAIN` são pegadinhas recorrentes:
- CORS e CSRF exigem o `https://` completo (não só o domínio nu) — o django-cors-headers rejeita com `corsheaders.E013` se faltar.
- `R2_PUBLIC_DOMAIN` é só o hostname, **sem** `https://` na frente — o `AWS_S3_CUSTOM_DOMAIN` do django-storages já prefixa sozinho; 
  colocar o `https://` duas vezes gera URLs de imagem quebradas (`https://https://pub-....r2.dev/...`).

## Variáveis de ambiente (frontend, na Vercel)

```json
{
    "NEXT_PUBLIC_API_URL": "https://p01--backend--9l6dvd9xzxnm.code.run/api"
}
```

E em `frontend/next.config.js`, `images.remotePatterns` precisa incluir o domínio do backend (Northflank) e o domínio 
público do R2 — sem isso o `next/image` recusa carregar as imagens.

## Passo a passo — subindo do zero (ex.: trocando de conta/serviço)

1. **Neon**: criar o banco, guardar a connection string.
2. **Cloudflare R2**: criar o bucket, ativar acesso público (aba Settings → Public Access → R2.dev subdomain), criar um 
   token S3 (Object Read & Write, escopo no bucket) em R2 Object Storage → Manage API tokens.
3. **Northflank**: criar o serviço a partir do repositório, Build type Dockerfile, Build context `/backend`, 
   Dockerfile location `/backend/Dockerfile`. Configurar as variáveis de ambiente da seção acima.
4. Rodar migrations e criar o primeiro superusuário (via shell do Northflank):
    ```bash
       python manage.py migrate
       python manage.py createsuperuser
    ```
5. **Bootstrap do primeiro login do sistema de gestão** (diferente do superusuário do Django): pelo 
   `/django-admin/auth/user/add/`, criar um `User`; depois em `/django-admin/core/pessoa/`, vincular esse `User` à
   Membro da Diretoria. Só depois disso o `/api/auth/login/` funciona para essa pessoa, que então já pode usar 
   `POST /api/pessoas/{id}/criar-acesso/` para dar login a outros usuários.
6. **Vercel**: criar o projeto a partir do mesmo repositório, Root Directory `frontend`, configurar `NEXT_PUBLIC_API_URL`.
7. Voltar no Northflank e atualizar `CORS_ALLOWED_ORIGINS` com a URL definitiva da Vercel.

## Troubleshooting conhecido

- **500 em `/django-admin/` sem nada nos logs**: com `DJANGO_DEBUG=False`, o Django só tentaria mandar o traceback por 
  e-mail pros `ADMINS` (não configurado) — por isso ele desaparece. É preciso o bloco `LOGGING` em `settings.py` (força 
  o traceback pro stdout/stderr) para os erros aparecerem nos logs do Northflank. **Nunca** deixar `DJANGO_DEBUG=True`
  em produção como forma de diagnosticar — expõe segredos e código-fonte publicamente; usar os logs em vez disso.
- **CSS/imagens do admin sumindo (só HTML puro)**: `DEBUG=False` desliga o serving automático de estáticos do `runserver`.
  Resolvido com whitenoise — ver nota em `README.md` sobre o storage sem manifesto.
- **CSRF falha só em produção, nunca em dev**: falta `SECURE_PROXY_SSL_HEADER` — o Northflank termina TLS antes do container.
