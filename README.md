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

Para rodar sem Docker, não precisa de alterar a lógica do projeto — só a forma de configurar o ambiente muda. O `.env` já é carregado automaticamente pelo `settings.py` via `python-dotenv`.

### Backend (Django)

1. Crie e ative um ambiente virtual, depois instale as dependências:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate        # no Windows (cmd/PowerShell)
   pip install -r requirements.txt
   ```
2. Copie o `.env.example` para `.env` (`copy .env.example .env` no Windows) e ajuste o `DATABASE_URL`.
3. Gere e aplique as migrações:
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


- Models de negócio (`core/models.py`) para as entidades fechadas no planejamento: Igreja, Embaixada, Pessoa, Papel e Carteirinha, com faixa etária calculada a partir da data de nascimento.
- Django Admin configurado para essas entidades (uso interno da diretoria/conselheiros enquanto as telas React não existem).
- Páginas Wagtail para Home, páginas institucionais simples (Sobre/Contato), Notícias e Eventos — Evento fica como página por enquanto; o modelo Django equivalente está comentado em `core/models.py`, pronto para ativar se precisar de inscrição/confirmação de presença no futuro.
- Router de exemplo do Django Ninja (`core/api.py`) listando as igrejas — serve de modelo para os próximos endpoints (embaixadas, pessoas, papéis, carteirinha).
- Scaffold do Next.js com Tailwind configurado com uma paleta inicial azul/branco/amarelo (ajustar os tons exatos a partir do logo enviado).
- `docker-compose.yml` já orquestrando os três serviços.

## O que falta (próximos passos de código)

1. Rodar `makemigrations`/`migrate` para gerar a primeira migração das entidades de `core`.
2. Cadastrar a primeira embaixada real (Igreja + Embaixada + Pessoa/conselheiro) via Django Admin.
3. Criar os endpoints Ninja que faltam: Embaixada, Pessoa, Papel, Carteirinha (com as regras de permissão por papel).
4. Implementar a autenticação (Django + JWT ou sessão, a decidir) e o controle de acesso por papel nas rotas da API.
5. Construir as telas do Next.js seguindo o sitemap: home, sobre, notícias, eventos, mapa, área logada, minha-carteirinha, materiais.
6. Configurar o deploy real: Vercel (frontend), Northflank (backend), Neon ou Supabase (banco) — os arquivos de ambiente já preveem isso via `DATABASE_URL`.

## Variáveis de ambiente

Ver `backend/.env.example` e `frontend/.env.local.example`. Em produção, troque `DATABASE_URL` pela connection string do Neon/Supabase e `NEXT_PUBLIC_API_URL`/`CORS_ALLOWED_ORIGINS` pelos domínios reais do backend/frontend.
