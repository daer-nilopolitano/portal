# DAER Nilopolitano — site institucional + sistema de gestão

Repositório inicial, gerado a partir do plano de desenvolvimento. Estrutura:

```
daer-nilopolitano/
├── backend/          # Django + Django Ninja (API) + Wagtail (CMS headless)
│   ├── config/       # settings, urls, wsgi/asgi
│   ├── core/         # models de negócio: Igreja, Embaixada, Pessoa, Papel, Carteirinha
│   └── cms/          # páginas Wagtail: Home, Notícias, Eventos, Sobre/Contato
├── frontend/         # Next.js + TypeScript + Tailwind
└── docker-compose.yml
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

Dá pra rodar tudo direto, sem alterar a lógica do projeto — só a forma de configurar o ambiente muda. O `.env` já é carregado automaticamente pelo `settings.py` via `python-dotenv`.

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

## Autenticação (JWT)

A API usa JWT simples (`core/auth.py`): login por e-mail/senha devolve um `access_token`, que vai no header `Authorization: Bearer <token>` nos endpoints protegidos. Não tem refresh token por enquanto (o token dura 7 dias, configurável via `JWT_EXPIRATION_MINUTES`).

Cada Django `User` precisa estar vinculado a uma `Pessoa` (campo `Pessoa.user`) para o login funcionar — é a Pessoa (e o Papel atual dela) que define o que a conta pode fazer:
- **Diretoria**: acesso total a Embaixada/Pessoa/Papel/Carteirinha.
- **Conselheiro**: só enxerga e edita pessoas/papéis/carteirinhas da própria embaixada; só pode atribuir o papel `embaixador_do_rei` (não pode promover ninguém a conselheiro/diretoria).
- **Embaixador do Rei**: sem acesso aos endpoints de gestão — usa `/api/auth/me/` e `/api/carteirinhas/me/`.

### Bootstrap: criando o primeiro login

O endpoint `POST /api/pessoas/{id}/criar-acesso/` **exige estar autenticado** (é assim de propósito, pra só Diretoria/conselheiro darem acesso a outras pessoas). Isso significa que ele não serve pra criar o primeiro login do sistema — ninguém ainda tem token pra chamá-lo. Para o primeiro acesso (tipicamente um membro da Diretoria), faça manualmente pelo Django Admin:

1. Em `/django-admin/auth/user/add/`, crie um usuário com usuário e senha (o *username* pode ser qualquer coisa aqui, mas o mais simples é usar o mesmo e-mail da Pessoa).
2. Em `/django-admin/core/pessoa/`, edite a Pessoa da Diretoria e selecione esse usuário recém-criado no campo **user**. Salve.
3. Teste o login em `/api/docs` ou via `POST /api/auth/login/` com `{"email": "<username escolhido>", "senha": "<senha escolhida>"}` — repare que o login usa o *username* do Django User como "email" (por isso o passo 1 recomenda usar o e-mail real da pessoa como username, pra não confundir depois).

Depois desse primeiro acesso, essa pessoa da Diretoria já pode usar `POST /api/pessoas/{id}/criar-acesso/` para dar login a todo mundo (incluindo os conselheiros, que por sua vez criam acesso para os próprios embaixadores).

## Identidade visual (logo e favicons)

A logo original (`logo_daer_nilopolitano.png`) tinha só 307×364px — pouca resolução pra qualquer uso além de bem pequeno. Usei a versão em `WA0022.jpg` (640×640), removi o fundo quase-branco (deixando transparente) e recortei a sobra transparente, gerando:

- `frontend/public/logo-daer.png` e `backend/static/img/logo.png` — a logo completa (crista + "DAER NILOPOLITANO"), usada no header do site e na sidebar do Jazzmin.
- Favicons: como o brasão completo fica ilegível em 16×16, o favicon usa só o emblema interno "E.R." (a parte mais reconhecível e simples da logo) — é o padrão comum pra esse problema, nenhuma ferramenta de upscaling resolveria o brasão inteiro em 16px. Gerados em `frontend/app/` (favicon.ico, icon.png, apple-icon.png — convenção nativa do Next.js, sem precisar de código) e em `backend/static/img/favicon-32x32.png` (Jazzmin).
- `frontend/public/android-chrome-192x192.png` e `-512x512.png` + `frontend/app/manifest.ts` — não usados ainda, mas deixam o terreno pronto pra quando a carteirinha virar PWA instalável.

**Se quiser refazer esses recortes no futuro** (ex.: logo em melhor resolução), ferramentas gratuitas úteis: [Photopea](https://www.photopea.com/) (edição tipo Photoshop, no navegador) pra retoque manual, [Inkscape](https://inkscape.org/) (grátis, desktop) se algum dia quiser vetorizar a logo pra escalar sem perda, e [realfavicongenerator.net](https://realfavicongenerator.net/) pra gerar o conjunto completo de favicons automaticamente a partir de uma imagem.

**Sobre o CSS do Jazzmin**: recriei o `jazzmin-fixes.css` que já tinha sido descrito numa conversa anterior (os arquivos nunca tinham sido criados de fato, só sugeridos) e corrigi o `STATICFILES_DIRS`, que estava faltando no `settings.py` — sem ele, o Django não achava a pasta `static/` em desenvolvimento, então o CSS/logo davam 404 mesmo existindo. Não tenho como testar esse CSS contra o Jazzmin 3.0.5 de verdade aqui (sem acesso à instalação rodando), então alguns seletores (principalmente o `.brand-image`/`.login-logo img` que ajustei agora) são uma aposta razoável, não certeza — se a logo aparecer esticada ou cortada na sidebar, me manda um print que eu ajusto.

## O que já está pronto

- Models de negócio (`core/models.py`) para as entidades fechadas no planejamento: Igreja, Embaixada, Pessoa, Papel e Carteirinha, com faixa etária calculada a partir da data de nascimento.
- Django Admin configurado para essas entidades (uso interno da diretoria/conselheiros enquanto as telas React não existem), com tema do **django-jazzmin** já aplicado.
- Páginas Wagtail para Home, páginas institucionais simples (Sobre/Contato), Notícias e Eventos — Evento fica como página por enquanto; o modelo Django equivalente está comentado em `core/models.py`, pronto para ativar se precisar de inscrição/confirmação de presença no futuro.
- API completa do Django Ninja (`core/api/`, um módulo por entidade) cobrindo Igreja (leitura pública), Embaixada, Pessoa, Papel e Carteirinha (CRUD completo, com autenticação JWT e permissão por papel), além do endpoint público de verificação por QR code em `/api/carteirinhas/verificar/{identificador}/`.
- Site institucional como **página única**: `app/(public)/page.tsx` compõe as seções Sobre (`components/sobre-secao.tsx`, com o texto institucional real), Eventos/Cronograma (`components/eventos-secao.tsx`, timeline vertical reaproveitada da seção Sobre) e Embaixadas (`components/embaixadas-secao.tsx`, lista + mapa Leaflet buscando `/api/igrejas/`). Notícias e Contato ficaram de fora por decisão do usuário — a pasta `app/(public)/noticias/` continua existindo como placeholder, só não está mais no menu.
- Mapa via **Leaflet + OpenStreetMap** (sem chave de API). Como o Leaflet manipula o DOM diretamente, o componente real (`embaixadas-mapa-interno.tsx`) só carrega no client via `next/dynamic` com `ssr:false` (`embaixadas-mapa.tsx`) — necessário porque a lib quebra em SSR.
  - **Atenção**: `Igreja.latitude`/`longitude` não são preenchidos automaticamente a partir do endereço — precisa cadastrar as coordenadas manualmente pelo Django Admin (pegar no Google Maps) pra cada igreja aparecer no mapa.
- `app/(app)/` — área logada, protegida por `AuthProvider` + `AppShell` (sidebar cujos itens mudam conforme o papel: Diretoria vê tudo, Conselheiro só Embaixadores/Carteirinha/Materiais). Rotas de gestão ficam sob `/painel/*` (`/painel/embaixadas`, `/painel/conselheiros`, `/painel/embaixadores`, `/painel/materiais`).
- `app/login/` — formulário de login, fora dos dois grupos acima (sem header/sidebar).
- `lib/auth-context.tsx` — contexto de autenticação (token JWT + dados da Pessoa logada via `/api/auth/me/`); token guardado em `localStorage` por simplicidade no MVP (ver TODO de segurança no próprio arquivo sobre migrar para cookie httpOnly no futuro).
- `docker-compose.yml` já orquestrando os três serviços.

## O que falta (próximos passos de código)

1. Rodar `makemigrations`/`migrate` para gerar a migração do novo campo `Pessoa.user`, caso ainda não tenha feito.
2. Testar a navegação: `/`, `/login` (com o usuário criado no bootstrap) e as rotas de `/painel/*` — confirmar que a sidebar muda conforme o papel de quem loga.
3. Preencher as páginas públicas (sobre, notícias, eventos, embaixadas/mapa, contato) e as de gestão (`/painel/embaixadas`, `/painel/conselheiros`, `/painel/embaixadores`, `/painel/materiais`, `/minha-carteirinha`) com os dados reais da API — hoje são todas placeholders "Em construção".
4. Configurar o deploy real: Vercel (frontend), Northflank (backend), Neon ou Supabase (banco) — os arquivos de ambiente já preveem isso via `DATABASE_URL`.

## Variáveis de ambiente

Ver `backend/.env.example` e `frontend/.env.local.example`. Em produção, troque `DATABASE_URL` pela connection string do Neon/Supabase e `NEXT_PUBLIC_API_URL`/`CORS_ALLOWED_ORIGINS` pelos domínios reais do backend/frontend.