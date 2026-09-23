# DAER Nilopolitano — site institucional + sistema de gestão + módulo de cursos

## Visão geral

Portal e sistema de gestão do Departamento Associacional Embaixadores do Rei Nilopolitano. As entidades centrais do domínio:

- **Igreja**: cada igreja participante do DAER Nilopolitano.
- **Embaixada**: o núcleo local da organização numa igreja.
- **Membro**: qualquer cadastrado no sistema — pode ser um Conselheiro, Embaixador do Rei ou Auxiliar.
- **Carteirinha**: identificação do Embaixador do Rei, verificável por QR code.

## Estrutura do repositório

```text
daer-nilopolitano/
├── backend/ # Django + Django Ninja (API) + Wagtail (CMS headless)
│ ├── config/ # settings, urls, wsgi
│ ├── core/ # models de negócio + API (core/api/)
│ └── cms/ # páginas Wagtail (Home, Notícias, Eventos, Sobre)
│
├── frontend/ # Next.js 14 (App Router) + TypeScript + Tailwind
│ ├── app/(public)/ # site institucional
│ ├── app/(app)/ # área logada (/painel/*), protegida por AppShell
│ ├── app/login/ # fora dos dois grupos acima
│ └── app/cursos/ # módulo de cursos (ver seção própria abaixo)
```

## Rodando em desenvolvimento

Pré-requisito: Docker e Docker Compose instalados.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

docker compose up --build
```

Isso sobe três serviços:
- **db** — Postgres 16, na porta 5432
- **backend** — Django, em http://localhost:8000
- **frontend** — Next.js, em http://localhost:3000

Na primeira vez, rode as migrações e crie um superusuário (com os containers já no ar):

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Depois disso:
- Django Admin (gestão de Igreja/Embaixada/Pessoa/Papel/Carteirinha): http://localhost:8000/django-admin/
- Wagtail Admin (notícias, eventos, páginas institucionais): http://localhost:8000/cms-admin/
- API do sistema de gestão (Ninja): http://localhost:8000/api/docs
- API do CMS (Wagtail headless): http://localhost:8000/api/cms/pages/

No Wagtail Admin, a primeira página a criar é a **Home Page** (sob "Root"), depois `NoticiaIndexPage` e `EventoIndexPage` como filhas dela — o sitemap do plano de desenvolvimento mostra a árvore completa.

## Rodando sem Docker (ex.: Windows + PyCharm)

Para rodar sem Docker não precisa de alterar a lógica do projeto — só a forma de configurar o ambiente muda. O `.env` já é carregado automaticamente pelo `settings.py` via `python-dotenv`.

### Backend (Django)

1. Crie e ative um ambiente virtual, depois instale as dependências (Django 5.2 LTS + Wagtail 7.x já suportam versões recentes do Python, então não precisa se preocupar em travar numa versão específica):
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate        # no Windows (cmd/PowerShell)
   pip install -r requirements.txt
   ```
2. Copie o `.env.example` para `.env` (`copy .env.example .env` no Windows) e ajuste o `DATABASE_URL`. Como você não tem Postgres nem Docker instalados, o caminho mais rápido é criar agora mesmo um projeto gratuito no **Neon** ou **Supabase** e colar a connection string dele em `DATABASE_URL` — é o mesmo banco que seria usado em produção, só que já disponível hoje. (Alternativa: instalar o Postgres localmente no Windows e apontar para `localhost`.)
3. Gere e aplique as migrações — isso ainda não foi feito neste scaffold, então o primeiro comando é `makemigrations`, não `migrate` direto:
   ```bash
   python manage.py makemigrations core cms
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```
4. Backend disponível em http://localhost:8000 (mesmos endereços de admin/API descritos acima).

### Frontend (Next.js)

Precisa de Node.js instalado (18+ recomendado):
```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```
Frontend disponível em http://localhost:3000.

## Serviços externos usados em produção

| Componente       | Serviço          |
|------------------|------------------|
| Frontend         | Vercel           |
| Backend          | Northflank (Docker, a partir de `backend/Dockerfile`) |
| Banco            | Neon PostgreSQL  |
| Mídia (imagens/documentos) | Cloudflare R2 (S3-compatível) |
| CMS              | Wagtail (dentro do backend Django) |

Detalhes de cada etapa de deploy e das variáveis de ambiente estão em
[`DEPLOY.md`](DEPLOY.md).

## Autenticação

JWT simples (`core/auth.py`) — login por e-mail/senha devolve um `access_token` (7 dias de validade, sem refresh token), 
usado no header `Authorization: Bearer <token>`. Cada `User` do Django precisa estar vinculado a um `Membro` para logar.

Tipos de membros e o que cada um pode fazer:
- **Diretoria**: acesso total a Embaixada/Membros/Carteirinha.
- **Conselheiro**: só enxerga/edita membros da própria embaixada;
- **Auxiliar**: só enxerga membros da própria embaixada, mas não pode criar nem remover.
- **Embaixador do Rei**: sem acesso aos endpoints de gestão — só `/api/auth/me/` e `/api/carteirinhas/me/`.

O primeiro acesso (bootstrap) não pode ser criado pelo próprio sistema — é manual, pelo `/django-admin/`. 
Passo a passo em [`DEPLOY.md`](DEPLOY.md).

## Módulo de cursos (`app/cursos/`)

Escrito originalmente como um projeto separado (Next.js 15/React 19) e integrado depois ao frontend principal 
(Next.js 14.2.5/React 18) sem mudanças de versão — o único recurso "Next 15" usado é `params` tipado como `Promise`, 
que funciona em Next 14 porque `await` num valor que não é Promise simplesmente resolve para ele mesmo.

### Decisões relevantes:

- Fica **fora** dos grupos de rota `(public)`/`(app)`, por isso não herda o header/footer do site nem a sidebar do painel.
- Tem layout próprio (`app/cursos/layout.tsx`), pensado como experiência de leitura isolada.
- Acesso restrito a Conselheiro/Auxiliar, logados — guard próprio em `app/cursos/_auth-guard.tsx` (client component), 
  já que a rota não passa pelo redirecionamento de login do `AppShell`.
- Link de acesso fica direto na sidebar do painel (`app-shell.tsx`), apontando pra `/cursos` — não existe uma página 
  intermediária dentro de `/painel`.
- Conteúdo dos cursos vem de `frontend/courses/` (JSON + assets), lido em build/runtime via `fs` (não pelo banco de dados).
  Sincronizado por `frontend/scripts/sync-course-assets.mjs`, chamado automaticamente antes de `dev`/`build` 
  (hooks `predev`/`prebuild` no `package.json`).

## Decisões técnicas (ADRs) 

- **Estáticos em produção**: servidos via `whitenoise`, não pelo `runserver` (que só serve estáticos com `DEBUG=True`). 
  Usa `CompressedStaticFilesStorage`, **sem** manifesto — o `CompressedManifestStaticFilesStorage` quebra com um bug 
  conhecido do django-jazzmin (`Missing staticfiles manifest entry for 'vendor/bootswatch'`), que referencia um "arquivo"
  que não existe de verdade.
- **Mídia**: `django-storages` + `boto3`, apontando pro R2, só ativado quando as variáveis `R2_*` estão presentes no 
  ambiente (dev local continua a usar disco). Ver `STORAGES["default"]` em `backend/config/settings.py`.
- **Proxy do Northflank**: termina o TLS antes do container, então o Django precisa de `SECURE_PROXY_SSL_HEADER` pra 
  saber que a conexão original era HTTPS — sem isso, a checagem de CSRF falha em produção mesmo com tudo configurado certo.
