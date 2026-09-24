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

## Rodando em desenvolvimento Com Docker

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

## Rodando em desenvolvimento sem Docker (ex.: Windows + PyCharm)

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

## Banco de dados

PostgreSQL, hospedado no Neon. O esquema é gerado pelas migrações do Django/Wagtail, não há scripts SQL separados.

### Entidades (`backend/core/models.py`)

- **Igreja** — cada igreja participante do DAER. Endereço + lat/long (preenchidas manualmente, não há geocodificação 
  automática) pro mapa do site institucional.
- **Embaixada** — núcleo local do movimento dentro de uma Igreja (`OneToOne`, uma igreja tem no máximo uma embaixada).
- **HorarioReuniao** — dias/horários de reunião de uma Embaixada (pode ter mais de um por semana).
- **Membro** — toda pessoa cadastrada. Campo `tipo` (choices: `conselheiro`, `auxiliar`, `embaixador_do_rei`) define o 
  papel — **não existe um model `Papel` separado**, é um campo na própria `Membro`. Vínculo opcional com `User` (login) 
  via `OneToOne` em `membro.user`, `idade` e `faixa_etaria` são properties calculadas a partir de `data_nascimento`.
- **Diretoria** — mandatos na diretoria da associação (só quem tem `tipo=conselheiro`, validado na API). Mantém histórico 
  (`data_fim`); constraint garante no máximo um mandato ativo por Membro.
- **GrupoTrabalho** / **GrupoMembro** — grupos (Música, Evangelismo etc.) e participação de Membros neles. Constraints: 
  um Membro entra uma vez por grupo, e lidera no máximo um grupo no sistema inteiro.
- **DiretoriaEmbaixada** — quadro de oficiais de uma Embaixada, ocupado pelos próprios Embaixadores do Rei. Sem histórico 
  (atribuir um cargo já ocupado troca o titular).
- **Carteirinha** — exclusiva de `Membro` com `tipo=embaixador_do_rei`. `identificador` é um UUID usado na verificação 
  pública por QR code (`/api/carteirinhas/verificar/{identificador}/`).

Regras de tipo/posto (ex. `posto_embaixador` só preenchido quando `tipo=embaixador_do_rei`) são validadas na camada de 
API, não por constraint de banco.

## Integrações externas

### Cloudflare R2 (armazenamento de mídia)

S3-compatível, usado via `django-storages` + `boto3` para fotos de `Membro`, documentos e imagens do Wagtail. Só ativa 
quando as variáveis `R2_*` estão presentes no ambiente — sem elas, o backend cai para disco local automaticamente.

Bucket: `daer-media`. Acesso público via subdomínio `r2.dev`. Credenciais S3 (Access Key ID/Secret) geradas em: 
R2 Object Storage → Manage API tokens, com escopo restrito ao bucket.

### Mapa (site institucional)

Leaflet + OpenStreetMap — sem chave de API, gratuito. Coordenadas de cada `Igreja` são cadastradas manualmente (sem 
geocodificação automática a partir do endereço).

### Sem integrações configuradas ainda

E-mail transacional (ex. reset de senha, notificações), e outros serviços — nenhum desses está integrado.

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

## Como adicionar uma nova funcionalidade

Checklist geral pra uma funcionalidade que envolve banco + API + tela. Nem todo item se aplica sempre (ex. uma 
funcionalidade só de frontend não mexe em model nenhum).

### 1. Backend — modelo de dados

- Alterar/criar model em `backend/core/models.py` (regras de negócio como "só preenche X se Y" ficam em comentário + 
  validação na API, não em constraint de banco, seguindo o padrão já usado em `Membro`).
- `python manage.py makemigrations` e revisar o arquivo gerado antes de aplicar.
- Se o model precisa de aparecer no Django Admin: registrar em `backend/core/admin.py`.

### 2. Backend — API

- Endpoint novo em `backend/core/api/` (um módulo por entidade, seguindo o padrão existente — ver `carteirinhas.py` como 
  referência de como `.url` de `ImageField` já funciona automaticamente com o storage configurado, sem precisar de lógica extra).
- Autenticação/permissão por papel: seguir o padrão de checar `request.auth.membro.tipo` (ver módulos existentes pra convenção exata).
- Testar em `/api/docs` (Swagger gerado automaticamente pelo Django Ninja — nenhuma documentação manual necessária aqui, 
  é por isso que o Stoplight Elements vai poder consumir isso direto).

### 3. Frontend

- Tela de gestão: entra sob `frontend/app/(app)/painel/`, dentro do `AppShell` (sidebar já filtra itens por papel — ver
  `components/layout/app-shell.tsx`).
- Chamada à API: seguir o padrão de `lib/api.ts` (usa `NEXT_PUBLIC_API_URL` + token do `AuthProvider`).
- Se a tela precisa de acesso restrito por papel, além do filtro da sidebar (que só esconde o link, não bloqueia a URL 
  direta) — replicar o padrão de guard usado em `app/cursos/_auth-guard.tsx` se a rota ficar fora do grupo `(app)`, ou 
  confiar no redirecionamento do `AppShell` se a rota ficar dentro dele.

### 4. Deploy

- Nenhum passo manual de deploy é necessário pra funcionalidade nova em si — Northflank e Vercel buildam automaticamente 
  a cada push. Só é preciso intervenção manual quando a mudança envolve migração de banco (rodar `migrate` pelo shell do
  Northflank, como em qualquer deploy) ou uma variável de ambiente nova.
