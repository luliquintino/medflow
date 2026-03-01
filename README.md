# 🏥 Med Flow

> Copiloto financeiro e de carga de trabalho para médicos plantonistas.

Med Flow ajuda médicos a planejar quantos plantões precisam fazer, monitorar carga horária, detectar risco de sobrecarga e simular impacto financeiro antes de aceitar novos plantões.

---

## Stack

| Camada       | Tecnologia                        |
|--------------|-----------------------------------|
| Frontend     | Next.js 14, TypeScript, Tailwind  |
| Backend      | NestJS, TypeScript                |
| Banco        | PostgreSQL + Prisma ORM           |
| Auth         | JWT + Refresh Token + bcrypt      |
| Pagamentos   | Stripe                            |
| Estado       | Zustand + React Query             |
| Charts       | Recharts                          |

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

---

## Setup local

### 1. Clone e instale dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure o banco de dados

Crie um banco PostgreSQL:

```sql
CREATE DATABASE medflow;
```

### 3. Configure variáveis de ambiente

**Backend:**
```bash
cd backend
cp .env.example .env
# Edite .env com suas configurações
```

Variáveis obrigatórias no `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/medflow"
JWT_SECRET=sua-chave-secreta
JWT_REFRESH_SECRET=sua-chave-refresh
```

**Frontend:**
```bash
cd frontend
# .env.local já criado com configuração padrão
# NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 4. Execute as migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Popule o banco com dados demo

```bash
npm run seed
```

Isso cria 3 usuários demo (senha: `Demo1234!`):
| E-mail | Plano | Situação |
|--------|-------|----------|
| ana@demo.com | Essencial | Mês em andamento |
| carlos@demo.com | Pro | Carga alta |
| julia@demo.com | Trial | Onboarding pendente |

### 6. Inicie os servidores

**Terminal 1 — Backend:**
```bash
cd backend
npm run start:dev
# API: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App: http://localhost:3000
```

---

## Estrutura do projeto

```
Medflow/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Schema completo do banco
│   │   └── seed.ts                # Dados demo
│   └── src/
│       ├── auth/                  # JWT, login, registro, refresh
│       ├── users/                 # Perfil, onboarding
│       ├── finance/               # Finance Engine, simulação
│       ├── shifts/                # CRUD plantões, Workload Engine
│       ├── risk-engine/           # Risk Engine, histórico
│       ├── subscription/          # Stripe, webhooks, planos
│       ├── wearable/              # WearableAdapter (mock/Pro)
│       ├── dashboard/             # Agregador de dados
│       ├── common/                # Guards, decorators, filters
│       ├── config/                # Configurações
│       └── prisma/                # PrismaService
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (app)/             # Páginas autenticadas
        │   │   ├── dashboard/     # Dashboard principal
        │   │   ├── shifts/        # Gestão de plantões
        │   │   ├── finance/       # Painel financeiro
        │   │   ├── simulate/      # "Aceito ou Não?"
        │   │   ├── risk-history/  # Histórico de risco (Pro)
        │   │   └── settings/      # Configurações e planos
        │   ├── auth/              # Login, cadastro, recuperação
        │   └── onboarding/        # Onboarding inicial
        ├── components/
        │   ├── ui/                # Design system (Button, Card, Input...)
        │   └── layout/            # Sidebar, Topbar
        ├── lib/                   # API client, formatadores
        ├── store/                 # Zustand (auth)
        └── types/                 # TypeScript types globais
```

---

## Módulos do backend

### Finance Engine
Lógica pura de cálculo financeiro (sem HTTP/DB). Calcula metas, projeções e simulações.

### Workload Engine
Lógica pura de carga horária. Calcula horas acumuladas, consecutivos, ritmo.

### Risk Engine
Motor de regras baseado em medicina do trabalho:
- 60h em 5 dias → Risco Alto
- 72h na semana → Risco Alto
- 3 noturnos consecutivos → Risco Alto
- Menos de 48h de intervalo → Risco Alto
- Versões moderadas de cada regra

### WearableAdapter
Camada abstrata preparada para integrações futuras (Apple Health, Garmin, Oura, Whoop). Retorna dados mock para plano Pro.

---

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/v1/auth/register | Cadastro |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/refresh | Renovar token |
| POST | /api/v1/auth/logout | Logout |
| POST | /api/v1/auth/forgot-password | Recuperar senha |
| POST | /api/v1/auth/reset-password | Redefinir senha |
| GET | /api/v1/users/me | Perfil completo |
| POST | /api/v1/users/onboarding | Completar onboarding |
| GET | /api/v1/dashboard | Dashboard completo |
| GET | /api/v1/finance/summary | Resumo financeiro |
| POST | /api/v1/finance/simulate | Simular plantão |
| GET | /api/v1/shifts | Listar plantões |
| POST | /api/v1/shifts | Criar plantão |
| PATCH | /api/v1/shifts/:id | Atualizar plantão |
| DELETE | /api/v1/shifts/:id | Remover plantão |
| GET | /api/v1/shifts/workload | Carga horária atual |
| GET | /api/v1/risk/evaluate | Avaliar risco |
| POST | /api/v1/risk/simulate | Simular risco |
| GET | /api/v1/risk/history | Histórico [Pro] |
| GET | /api/v1/subscription | Ver assinatura |
| POST | /api/v1/subscription/checkout | Checkout Stripe |
| POST | /api/v1/subscription/portal | Portal Stripe |
| POST | /api/v1/subscription/webhook | Webhook Stripe |
| GET | /api/v1/wearable/latest | Dados wearable [Pro] |
| GET | /api/v1/wearable/history | Histórico wearable [Pro] |

Documentação Swagger: `http://localhost:3001/api/docs`

---

## Stripe (Pagamento)

1. Crie produtos no Stripe Dashboard
2. Configure os Price IDs no `.env`:
   ```env
   STRIPE_PRICE_ESSENTIAL=price_xxx
   STRIPE_PRICE_PRO=price_xxx
   ```
3. Para webhooks locais, use Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3001/api/v1/subscription/webhook
   ```

---

## Deploy

### Backend (Railway / Render / Fly.io)
```bash
npm run build
npm run start:prod
```

### Frontend (Vercel)
```bash
# Conecte o repositório no Vercel
# Configure NEXT_PUBLIC_API_URL com a URL da API em produção
```

### Banco de dados
```bash
# Em produção, rode as migrations:
npx prisma migrate deploy
```

---

## Credenciais demo

| E-mail | Senha | Plano |
|--------|-------|-------|
| ana@demo.com | Demo1234! | Essencial |
| carlos@demo.com | Demo1234! | Pro |
| julia@demo.com | Demo1234! | Trial (onboarding pendente) |
