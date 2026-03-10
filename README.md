# Med Flow

> Seu copiloto de plantões — organize sua vida financeira, proteja sua saúde e trabalhe de forma sustentável.

[![CI](https://github.com/luliquintino/medflow/actions/workflows/ci.yml/badge.svg)](https://github.com/luliquintino/medflow/actions/workflows/ci.yml)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Funcionalidades

- **Controle de plantões** — Registre, edite e acompanhe todos os seus plantões em um só lugar. Marque plantões como realizados ou não após a data.
- **Dashboard financeiro** — Visualize receitas, parcelas e projeções de forma clara.
- **Insights de carga de trabalho** — Entenda seus padrões de trabalho com dados reais.
- **Score de exaustão e sustentabilidade** — Saiba quando desacelerar antes que o corpo avise.
- **Simulador "Aceito ou Não?"** — Simule o impacto financeiro e de risco antes de aceitar um plantão.
- **Gestão de hospitais** — Cadastre e gerencie os hospitais onde você trabalha.
- **Templates de plantão** — Crie modelos reutilizáveis para agilizar o registro.
- **Planejamento inteligente (otimização)** — Sugestões de escala baseadas em regras e preferências.
- **Histórico de risco** — Acompanhe sua fadiga ao longo do tempo com avaliações automáticas.
- **Analytics avançado** — Visualize receita por hospital, tipo de plantão e tendência de crescimento ao longo do tempo.
- **Integração com wearables** — Conecte Apple Health, Garmin, Oura ou Whoop para dados de saúde.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) (rodando localmente ou via Docker)
- npm

---

## Quick Start

### 1. Clone o repositório

```bash
git clone https://github.com/luliquintino/medflow.git
cd medflow
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 4. Acesse a aplicação

Abra [http://localhost:3002](http://localhost:3002) no navegador.

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão com o PostgreSQL |
| `JWT_SECRET` | Segredo para assinatura de tokens JWT |
| `JWT_EXPIRY` | Tempo de expiração do access token (ex: `15m`) |
| `JWT_REFRESH_SECRET` | Segredo para refresh tokens |
| `JWT_REFRESH_EXPIRY` | Tempo de expiração do refresh token (ex: `7d`) |
| `PORT` | Porta do servidor (padrão: `3001`) |
| `FRONTEND_URL` | URL do frontend para CORS |
| `RESEND_API_KEY` | API key do Resend (https://resend.com) |
| `RESEND_FROM` | Remetente dos e-mails (ex: `Med Flow <onboarding@resend.dev>`) |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth (opcional) |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth (opcional) |
| `GOOGLE_CALLBACK_URL` | URL de callback do OAuth |

### Frontend (`frontend/.env.local`)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API do backend |

---

## Estrutura do Projeto

```
medflow/
├── backend/
│   ├── prisma/              # Schema e seeds do banco de dados
│   ├── test/                # Mocks compartilhados (Prisma, etc.)
│   └── src/
│       ├── analytics/       # Analytics avançado (receita, rankings, tendências)
│       ├── auth/            # Autenticação (JWT, Google OAuth)
│       ├── common/          # Guards, decorators, filters, interceptors
│       ├── config/          # Configuração da aplicação
│       ├── dashboard/       # Agregação de dados do painel
│       ├── finance/         # Motor financeiro (receitas, parcelas, insights)
│       ├── hospitals/       # Gestão de hospitais
│       ├── mail/            # Envio de e-mails (Resend)
│       ├── optimization/    # Motor de planejamento inteligente
│       ├── prisma/          # Prisma service e module
│       ├── risk-engine/     # Avaliação de risco e fadiga
│       ├── shift-templates/ # Templates reutilizáveis de plantão
│       ├── shifts/          # CRUD e lógica de plantões
│       ├── subscription/    # Gestão de assinaturas
│       ├── users/           # Gestão de usuários e perfis
│       ├── wearable/        # Integração com wearables
│       ├── app.module.ts    # Módulo raiz
│       └── main.ts          # Entry point
├── frontend/
│   ├── public/              # Assets estáticos
│   └── src/
│       ├── app/             # App Router (páginas e layouts)
│       │   ├── (app)/       # Rotas autenticadas (dashboard, shifts, finance...)
│       │   ├── auth/        # Rotas de autenticação (login, register...)
│       │   └── onboarding/  # Onboarding de novos usuários
│       ├── components/      # Componentes reutilizáveis (layout, shifts, UI)
│       ├── lib/             # Utilitários, API client, helpers
│       ├── store/           # Estado global (Zustand)
│       └── types/           # Definições de tipos TypeScript
├── .github/workflows/       # CI/CD (GitHub Actions)
├── CONTRIBUTING.md
├── DOCUMENTATION.md
├── LICENSE
└── README.md
```

---

## Scripts Disponíveis

### Backend (`cd backend`)

| Comando | Descrição |
|---|---|
| `npm run start:dev` | Inicia o servidor em modo de desenvolvimento (watch) |
| `npm run build` | Compila o projeto para produção |
| `npm run start:prod` | Inicia o servidor em modo de produção |
| `npm run seed` | Executa os seeds do banco de dados |
| `npm test` | Executa os testes unitários |
| `npm test -- --coverage` | Executa os testes com relatório de cobertura |
| `npm run lint` | Executa o linter (ESLint) |

### Frontend (`cd frontend`)

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm test` | Executa os testes |
| `npm test -- --coverage` | Executa os testes com relatório de cobertura |
| `npm run lint` | Executa o linter (ESLint) |

---

## Testes

O projeto possui cobertura abrangente de testes com **767 testes** distribuídos em **99 suites**:

### Backend (46 suites / 393 testes)

- **Testes de serviço** — Lógica de negócio de todos os módulos (auth, users, shifts, finance, hospitals, risk-engine, dashboard, subscription, wearable, mail, shift-templates, analytics)
- **Testes de controller** — Rotas HTTP, status codes, validações de DTO (todos os módulos)
- **Testes de engine** — Engines de cálculo financeiro, workload, otimização e analytics
- **Testes E2E** — 11 suites com fluxos completos (auth, users, shifts, finance, hospitals, risk, dashboard, wearable, subscription, optimization, analytics)
- **Testes de infraestrutura** — Guards (JWT), filters (HTTP exceptions), decorators (@Public, @CurrentUser), interceptors (response format)
- **Testes de schema** — Validação do schema Prisma (modelos, enums, relações, tipos de campo)
- **Testes de edge cases** — Cenários limítrofes (usuário sem perfil, dados nulos, permissões)

### Frontend (~53 suites / ~374 testes)

- **Testes de componente** — Componentes UI (Button, Input, Card, ProgressBar, RiskBadge, Spinner), layout (Sidebar, Topbar) e shifts (ShiftCard)
- **Testes de página** — Todas as páginas da aplicação (Dashboard, Shifts, Hospitals, Finance, Simulate, Smart Planner, Risk History, Settings, Onboarding, Analytics)
- **Testes de jornada** — Fluxos completos de login, registro e recuperação de senha
- **Testes de integração** — API client (interceptors, refresh token), auth store (Zustand)
- **Testes de edge cases** — Erros de API, estados vazios, dados nulos, redirecionamentos

### Rodando os testes

```bash
# Backend
cd backend
npx prisma generate      # necessário na primeira vez
npm test                  # rodar todos os testes
npm test -- --coverage    # com relatório de cobertura

# Frontend
cd frontend
npm test                  # rodar todos os testes
npm test -- --coverage    # com relatório de cobertura

# Testes específicos
npm test -- --testPathPattern="auth"     # apenas testes de auth
npm test -- --testPathPattern="shifts"   # apenas testes de shifts
```

---

## CI/CD

O projeto utiliza **GitHub Actions** para integração contínua. A pipeline roda automaticamente em push e pull requests para `main` e `develop`.

A pipeline executa:
- **Backend**: Instala dependências, gera Prisma Client, lint, testes e cobertura (com PostgreSQL 16)
- **Frontend**: Instala dependências, lint, testes, cobertura e build de produção

---

## Como Contribuir

Leia o [CONTRIBUTING.md](./CONTRIBUTING.md) para saber como participar do projeto.

---

## Documentação

Para documentação técnica completa (arquitetura, API, banco de dados, engines de negócio), veja [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## Licença

Este projeto está licenciado sob a [MIT License](./LICENSE).
