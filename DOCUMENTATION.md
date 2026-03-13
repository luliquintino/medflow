# MedFlow — Documentação Completa

> Copiloto financeiro e de carga para médicos plantonistas.
> Versão: 1.2 · Março 2026

---

## Sumário

1. [Visão do Produto](#1-visão-do-produto)
2. [Personas & Público-Alvo](#2-personas--público-alvo)
3. [Jornada do Usuário](#3-jornada-do-usuário)
4. [Mapa de Features](#4-mapa-de-features)
5. [UX & Design System](#5-ux--design-system)
6. [Arquitetura Técnica](#6-arquitetura-técnica)
7. [Banco de Dados (Prisma Schema)](#7-banco-de-dados-prisma-schema)
8. [Backend — Módulos & API](#8-backend--módulos--api)
9. [Frontend — Páginas & Componentes](#9-frontend--páginas--componentes)
10. [Engines de Negócio](#10-engines-de-negócio)
11. [Autenticação & Segurança](#11-autenticação--segurança)
12. [Planos & Assinatura](#12-planos--assinatura)
13. [Seed & Dados de Teste](#13-seed--dados-de-teste)
14. [Configuração & Variáveis de Ambiente](#14-configuração--variáveis-de-ambiente)
15. [Stack Tecnológica](#15-stack-tecnológica)
16. [Testes & Qualidade](#16-testes--qualidade)
17. [Feature: Realização de Plantões](#17-feature-realização-de-plantões)

---

## 1. Visão do Produto

### O que é o MedFlow?

MedFlow é um **copiloto financeiro e de saúde para médicos plantonistas**. Ele resolve um problema crítico na vida de quem depende de plantões: **equilibrar metas financeiras com saúde e segurança no trabalho**.

### Problemas que Resolve

| Problema | Como o MedFlow Resolve |
|----------|----------------------|
| "Quantos plantões preciso fazer este mês?" | Motor financeiro calcula metas mínima e ideal automaticamente |
| "Devo aceitar esse plantão?" | Simulador mostra impacto financeiro + risco de fadiga antes de aceitar |
| "Estou trabalhando demais?" | Engine de risco avalia fadiga em tempo real com regras baseadas em evidência médica |
| "Qual plantão paga melhor por hora?" | Insights de ROI por tipo de plantão e hospital |
| "Minha renda varia muito, como planejar?" | Projeções de 3 e 6 meses baseadas no ritmo atual |
| "Como organizar meus plantões de forma segura?" | Smart Planner sugere cenários otimizados (maximizar renda + minimizar risco) |

### Proposta de Valor

> **Para médicos plantonistas**, MedFlow é um **copiloto de plantões** que combina planejamento financeiro inteligente com monitoramento de fadiga, permitindo **tomar decisões informadas sobre cada plantão** — maximizando renda sem comprometer saúde.

---

## 2. Personas & Público-Alvo

### Público Primário
Médicos residentes e emergencistas que fazem plantões em hospitais, UPAs e prontos-socorros no Brasil.

### Público Secundário
Qualquer médico com renda variável baseada em plantões (cirurgiões, intensivistas, etc.).

### Personas

#### Persona 1: "Residente em Formação" (Ana)
- **Idade:** 28-32, em programa de residência
- **Custos mensais:** ~R$4.500 (aluguel, alimentação, transporte)
- **Trabalho:** 8-12 plantões/mês
- **Dor:** Precisa cobrir custos + guardar para cursos de especialização
- **Meta:** Atingir meta mínima (R$5.300) + R$2.000 de poupança
- **Plano:** ESSENTIAL

#### Persona 2: "Emergencista de Alto Volume" (Carlos)
- **Idade:** 35-45, emergencista com vários hospitais
- **Custos mensais:** ~R$6.000 (despesas familiares)
- **Trabalho:** 16-20 plantões/mês em 3+ hospitais
- **Dor:** Escala caótica, difícil otimizar quais plantões aceitar
- **Meta:** Atingir meta ideal (R$15.000+) sem passar de 72h/semana
- **Plano:** PRO (Smart Planner, Histórico de Risco, Wearables)

#### Persona 3: "Cirurgião com Renda Extra" (Julia)
- **Idade:** 40+, consultório particular + plantões extras
- **Custos mensais:** R$8.000 (alto padrão de vida)
- **Trabalho:** 5-8 plantões/mês (qualidade > quantidade)
- **Dor:** Quer aceitar apenas plantões de alto valor; precisa evitar burnout
- **Meta:** R$25.000/mês; manter equilíbrio vida-trabalho
- **Plano:** PRO

---

## 3. Jornada do Usuário

### Fase 1: Cadastro

```
/auth/register
├─ Nome completo
├─ CRM (registro médico)
├─ Gênero
├─ E-mail
└─ Senha (mín. 6 caracteres)
```

Alternativa: Login com Google (OAuth 2.0).

### Fase 2: Onboarding (2 Etapas)

**Etapa 1 — Perfil Financeiro:**
```
├─ Meta mínima mensal (R$)
├─ Meta ideal mensal (R$)
└─ Valor médio de plantão (R$)
```

**Etapa 2 — Perfil de Trabalho:**
```
├─ Tipos de plantão (12h Diurno, 12h Noturno, 24h, 24h Invertido)
├─ Máximo de horas semanais (opcional, sem limite superior)
├─ Dias preferidos de descanso (Dom-Sáb)
└─ Custos energéticos pessoais
    ├─ Diurno 12h (0.5–5.0, padrão 1.0) — escala "Leve" a "Pesado"
    ├─ Noturno 12h (0.5–5.0, padrão 1.5)
    └─ Plantão 24h (0.5–5.0, padrão 2.5)
```

**Após Onboarding:**
- Redireciona para o Dashboard
- Cria registros: FinancialProfile, WorkProfile, Subscription (ESSENTIAL)

### Fase 3: Uso Diário

```
1. Registrar plantões → Shifts
2. Acompanhar progresso → Dashboard & Finance
3. Decisão: "Aceito esse plantão?" → Simulate
4. Planejamento inteligente → Smart Planner
5. Monitorar saúde → Risk History & Wearables
```

### Fluxo de Recuperação de Senha

```
Login → "Esqueceu a senha?" → /auth/forgot-password
  → Insere e-mail → Backend gera token UUID (1h validade)
  → E-mail com link para /auth/reset-password?token=xxx
  → Insere nova senha → Redirecionado ao login
```

---

## 4. Mapa de Features

### Visão Geral

```
MEDFLOW
═══════════════════════════════════════════════════

  DASHBOARD (Hub Central)
  ├─ KPIs: Receita, Plantões, Horas/Semana, Risco
  ├─ Barras de progresso (Meta Mínima & Ideal)
  ├─ Avaliação de risco com recomendações
  ├─ Gráfico de projeção 3 meses (Recharts)
  ├─ Wearables (Apple Health, Garmin, Oura, Whoop)
  └─ CTA: "Simular um Plantão"

  PLANTÕES (Shifts)
  ├─ CRUD completo (criar, editar, excluir)
  ├─ Status: CONFIRMED, SIMULATED, CANCELLED
  ├─ Realização: marcar se o plantão aconteceu ou não
  ├─ Filtros por data, tipo, status
  ├─ Vinculação com hospital e template
  └─ Cálculo automático de endDate

  FINANCEIRO (Finance)
  ├─ Navegação por mês (12 meses atrás, 6 adiante)
  ├─ KPIs financeiros com barras de progresso
  ├─ Lista de plantões do mês
  ├─ Parcelamentos ativos
  ├─ Projeções de receita
  ├─ Insights inteligentes (até 5)
  └─ Modal "Meu Orçamento" (editar perfil + CRUD parcelamentos)

  SIMULAR ("Aceito ou Não?")
  ├─ Formulário: tipo, data, valor
  ├─ Impacto financeiro (antes vs depois)
  ├─ Impacto de risco (antes vs depois)
  └─ Veredito: Verde/Amarelo/Vermelho

  SMART PLANNER [PRO]
  ├─ Status financeiro com gap
  ├─ 5 cenários otimizados por IA
  ├─ Score de otimização (0-100)
  ├─ Expandir cenário → ver plantões sugeridos
  └─ "Aplicar" → cria como SIMULATED

  HOSPITAIS
  ├─ CRUD de hospitais
  ├─ Cidade/Estado com dropdown IBGE
  ├─ Dia de pagamento
  └─ Templates de plantão por hospital

  TEMPLATES
  ├─ CRUD por hospital
  ├─ Tipos: Diurno 12h, Noturno 12h, 24h, Personalizado
  ├─ Valor padrão e duração
  └─ Flag de noturno

  RISCO (Risk History) [PRO]
  ├─ Timeline de avaliações (30 dias)
  ├─ Score, nível, métricas
  └─ Recomendações personalizadas

  CONFIGURAÇÕES (Settings)
  ├─ Perfil do usuário
  └─ Custos energéticos pessoais
```

### Conexões entre Features

| Feature | Depende de | Alimenta |
|---------|-----------|----------|
| **Shifts** | Hospitals, Templates | Finance, Dashboard, Risk |
| **Finance** | Shifts, FinanceEngine | Dashboard, Smart Planner |
| **Dashboard** | Finance, Workload, Risk | — (hub de leitura) |
| **Simulate** | FinanceEngine, RiskEngine | Decisão do usuário |
| **Smart Planner** | OptimizationEngine, Templates | Shifts (SIMULATED) |
| **Risk** | Shifts, WorkloadEngine | Dashboard, Simulate |

---

## 5. UX & Design System

### Paleta de Cores

| Cor | Uso | Shades |
|-----|-----|--------|
| **Moss (Verde)** | Cor primária, botões, links, sucesso | 50-900 (600 é a principal) |
| **Cream (Creme)** | Backgrounds, bordas | 50-400 |
| **Sand (Areia)** | Backgrounds de acento | 100-300 |
| **Amber** | Warnings, risco moderado | Tailwind padrão |
| **Red** | Erros, risco alto | Tailwind padrão |
| **Blue/Indigo** | Info secundária | Tailwind padrão |

```
Moss Green:
├─ moss-50:  #f4f7f0  → Background sutil
├─ moss-100: #e6eddc  → Hover leve
├─ moss-200: #ccdcbb  → Bordas
├─ moss-300: #a8c490  → Ícones secundários
├─ moss-400: #84aa66  → Hover de botão
├─ moss-500: #638f46  → Botão secundário
├─ moss-600: #4d7235  → Botão primário, links
├─ moss-700: #3d5a2a  → Hover primário
├─ moss-800: #334924  → Títulos
└─ moss-900: #2b3d1f  → Texto forte

Cream:
├─ cream-50:  #fdfcf8  → Background de página
├─ cream-100: #faf7f0  → Background de card
├─ cream-200: #f4ede0  → Bordas de card
├─ cream-300: #ecddd0  → Bordas ativas
└─ cream-400: #e0c9b8  → Accent

Sand:
├─ sand-100: #f9f6f1
├─ sand-200: #f2ece2
└─ sand-300: #e8dfd3
```

### Tipografia

```
Font Family: Inter (via next/font com CSS variable --font-inter)
Fallback: system-ui, sans-serif

Headings:
├─ h1: text-2xl (24px) font-bold
├─ h2: text-lg (18px) font-semibold
├─ h3: text-base (16px) font-semibold
└─ h4: text-sm (14px) font-medium

Body:
├─ Principal: text-sm (14px)
├─ Secundário: text-sm text-gray-500
└─ Hint/Label: text-xs (12px) font-medium

Peso: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
```

### Espaçamento & Bordas

```
Border Radius:
├─ rounded-xl:  12px  → Inputs, botões
├─ rounded-2xl: 16px  → Cards
├─ rounded-3xl: 24px  → Modais, cards de auth
├─ rounded-4xl: 32px  → Uso especial
└─ rounded-full:       → Avatares, badges

Shadows:
├─ shadow-card:  0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)
└─ shadow-float: 0 4px 24px rgba(0,0,0,0.10)

Gradients:
└─ bg-moss-gradient: linear-gradient(135deg, #4d7235 0%, #638f46 100%)

Animações:
└─ animate-in: fadeIn 0.3s ease-out (translateY 8px → 0)
```

### Responsividade

| Breakpoint | Tela | Sidebar | KPIs | Layout |
|-----------|------|---------|------|--------|
| < 640px (mobile) | Celular | Hamburger overlay | 1 coluna | Stack vertical |
| 640-768px (sm) | Tablet portrait | Hamburger overlay | 2 colunas | Grid 2-col |
| 768-1024px (md) | Tablet landscape | Visível | 2 colunas | Grid 2-col |
| 1024px+ (lg/xl) | Desktop | Fixa 240px | 4 colunas | Full width |

**Sidebar:**
- Desktop: Fixa à esquerda (w-60), sempre visível
- Mobile: Menu hamburger, desliza da esquerda com overlay backdrop
- Transição: 300ms ease-in-out

### Componentes UI

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| **Button** | `ui/button.tsx` | Variantes: primary/secondary/ghost/danger. Tamanhos: sm/md/lg. Loading state |
| **Input** | `ui/input.tsx` | Label, erro, hint, ícone esquerdo, estilo consistente |
| **Card** | `ui/card.tsx` | Container com shadow-card. Sub: CardHeader, CardTitle |
| **Spinner** | `ui/spinner.tsx` | Loader animado. PageSpinner para página inteira |
| **ProgressBar** | `ui/progress-bar.tsx` | Indicador horizontal. 4 cores (moss/amber/red/blue), 3 tamanhos |
| **RiskBadge** | `ui/risk-badge.tsx` | Badge SAFE/MODERATE/HIGH com cores |
| **Sidebar** | `layout/sidebar.tsx` | Navegação principal com logo, links, perfil, logout |
| **Topbar** | `layout/topbar.tsx` | Header com título da página, saudação, notificações |
| **ShiftCard** | `shifts/shift-card.tsx` | Card de plantão com data/tipo/local/horas/valor |
| **ShiftFormModal** | `shifts/shift-form-modal.tsx` | Modal para criar/editar plantão |
| **BudgetModal** | `finance/budget-modal.tsx` | Modal "Meu Orçamento" com edição de perfil + parcelamentos |

### Localização

- **Idioma:** Português (pt-BR)
- **Moeda:** Real Brasileiro (BRL) — `formatCurrency()`
- **Datas:** dd MMM yyyy (ex: "05 mar 2026")
- **Meses:** Nomes completos em português
- **Toda UI textual:** Português

---

## 6. Arquitetura Técnica

### Visão Geral

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 14)                   │
│                      Porta: 3002                             │
│   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐    │
│   │ React 18│  │ Zustand  │  │ React    │  │ Tailwind│    │
│   │ App     │  │ Auth     │  │ Query 5  │  │ CSS 3   │    │
│   │ Router  │  │ Store    │  │ Server   │  │         │    │
│   └────┬────┘  └────┬─────┘  │ State    │  └─────────┘    │
│        │             │        └────┬─────┘                  │
│        └─────────────┴─────────────┘                        │
│                        │                                     │
│            next.config rewrites: /api/v1/* →                │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP (Axios)
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS 11)                     │
│                      Porta: 3001                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │ Auth     │  │ Finance  │  │ Shifts   │  │ Risk     │  │
│   │ Module   │  │ Module   │  │ Module   │  │ Engine   │  │
│   ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  │
│   │ Users    │  │ Hospitals│  │Templates │  │Optimiz.  │  │
│   │ Module   │  │ Module   │  │ Module   │  │ Module   │  │
│   ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  │
│   │Dashboard │  │ Mail     │  │Wearable  │  │Subscript.│  │
│   │ Module   │  │ Module   │  │ Module   │  │ Module   │  │
│   └────┬─────┘  └──────────┘  └──────────┘  └──────────┘  │
│        │                                                     │
│        │  Prisma 7 ORM                                       │
└────────┼─────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────┐
│              PostgreSQL (Railway)                             │
└──────────────────────────────────────────────────────────────┘
```

### Estrutura do Backend

```
backend/
├── src/
│   ├── main.ts                          # Bootstrap
│   ├── app.module.ts                    # Root module
│   ├── health.controller.ts             # GET /health
│   ├── config/
│   │   └── configuration.ts             # Env vars mapping
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts        # Global JWT guard
│   │   │   └── plan.guard.ts            # Subscription plan check
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts      # @Public()
│   │   │   ├── current-user.decorator.ts
│   │   │   └── plan.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   └── utils/
│   │       └── date.utils.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── mail/
│   │   ├── mail.module.ts               # Global
│   │   └── mail.service.ts              # Resend API
│   ├── analytics/                       # Analytics avançado
│   ├── auth/                            # Autenticação
│   ├── users/                           # Perfil e onboarding
│   ├── finance/                         # Motor financeiro
│   ├── shifts/                          # Gestão de plantões
│   ├── hospitals/                       # Hospitais
│   ├── shift-templates/                 # Templates de plantão
│   ├── risk-engine/                     # Avaliação de risco
│   ├── optimization/                    # Smart Planner
│   ├── dashboard/                       # Agregação de dados
│   ├── subscription/                    # Planos
│   └── wearable/                        # Integração wearables
├── prisma/
│   ├── schema.prisma                    # Schema do banco
│   └── seed.ts                          # Dados de teste
├── package.json
└── tsconfig.json
```

### Estrutura do Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Root redirect
│   │   ├── layout.tsx                   # Root layout
│   │   ├── globals.css                  # Estilos globais
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── callback/page.tsx        # OAuth callback
│   │   ├── onboarding/page.tsx
│   │   └── (app)/                       # Rotas protegidas
│   │       ├── layout.tsx               # Layout com sidebar/topbar
│   │       ├── dashboard/page.tsx
│   │       ├── shifts/page.tsx
│   │       ├── hospitals/page.tsx
│   │       ├── hospitals/[hospitalId]/templates/page.tsx
│   │       ├── finance/
│   │       │   ├── page.tsx
│   │       │   └── _components/
│   │       │       └── budget-modal.tsx
│   │       ├── smart-planner/page.tsx
│   │       ├── simulate/page.tsx
│   │       ├── analytics/page.tsx
│   │       ├── risk-history/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── topbar.tsx
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   ├── risk-badge.tsx
│   │   │   └── energy-cost-slider.tsx  # Slider de custo energético (onboarding + settings)
│   │   ├── shifts/
│   │   │   ├── shift-card.tsx
│   │   │   └── shift-form-modal.tsx
│   │   └── providers.tsx                # React Query provider
│   ├── store/
│   │   └── auth.store.ts               # Zustand auth store
│   ├── lib/
│   │   ├── api.ts                       # Axios client
│   │   ├── format.ts                    # Utilitários de formatação
│   │   └── brazil-states.ts             # Dados de estados/cidades
│   └── types/
│       └── index.ts                     # Definições TypeScript
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## 7. Banco de Dados (Prisma Schema)

### Enums

```
ShiftType:         TWELVE_DAY, TWELVE_NIGHT, TWENTY_FOUR, TWENTY_FOUR_INVERTED
ShiftStatus:       CONFIRMED, SIMULATED, CANCELLED
RiskLevel:         SAFE, MODERATE, HIGH
SubscriptionPlan:  ESSENTIAL, PRO
SubscriptionStatus: ACTIVE, INACTIVE, TRIALING, PAST_DUE, CANCELLED
ShiftTemplateType: DIURNO_12H, NOTURNO_12H, PLANTAO_24H, PERSONALIZADO
Gender:            MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY
```

### Modelos e Relacionamentos

```
User (1:1) ──→ FinancialProfile ──→ (1:N) Installment
User (1:1) ──→ WorkProfile
User (1:1) ──→ Subscription
User (1:N) ──→ Shift
User (1:N) ──→ Hospital ──→ (1:N) ShiftTemplate
User (1:N) ──→ Hospital ──→ (1:N) Shift (via hospitalId)
User (1:N) ──→ RiskHistory
User (1:N) ──→ WearableData
User (1:N) ──→ RefreshToken
```

### Detalhes dos Modelos

**User**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| email | String (unique) | E-mail do usuário |
| name | String | Nome completo |
| gender | Gender? | Gênero (opcional) |
| crm | String? | Registro médico |
| passwordHash | String? | Senha (bcrypt) — null se login via Google |
| googleId | String? (unique) | ID do Google OAuth |
| avatarUrl | String? | URL do avatar |
| isEmailVerified | Boolean | E-mail verificado |
| resetPasswordToken | String? | Token de reset de senha |
| resetPasswordExpiry | DateTime? | Expiração do token (1h) |
| onboardingCompleted | Boolean | Onboarding finalizado |

**FinancialProfile**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| savingsGoal | Float | Meta de poupança (default: 0) |
| averageShiftValue | Float | Valor médio de plantão |
| minimumMonthlyGoal | Float | Meta mínima mensal (definida pelo usuário) |
| idealMonthlyGoal | Float | Meta ideal mensal (definida pelo usuário) |

**Installment**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| description | String | Nome do parcelamento |
| monthlyValue | Float | Valor mensal |
| remainingMonths | Int | Meses restantes |
| totalValue | Float | Valor total (mensal × meses) |

**WorkProfile**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| shiftTypes | ShiftType[] | Tipos de plantão aceitos |
| maxWeeklyHours | Int? | Limite pessoal de horas/semana (sem teto) |
| preferredRestDays | Int[] | Dias preferenciais de descanso (0=Dom) |
| maxConsecutiveShifts | Int | Máximo de plantões seguidos (default: 3) |
| maxConsecutiveNights | Int | Máximo de noturnos seguidos (default: 2) |
| energyCostDiurno | Float | Custo energético 12h diurno (0.5–5.0, default: 1.0) |
| energyCostNoturno | Float | Custo energético 12h noturno (0.5–5.0, default: 1.5) |
| energyCost24h | Float | Custo energético 24h (0.5–5.0, default: 2.5) |

**Shift**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| date | DateTime | Início do plantão |
| endDate | DateTime | Fim do plantão |
| type | ShiftType | Tipo (12h Diurno, 12h Noturno, 24h, 24h Invertido) |
| hours | Int | Duração em horas |
| value | Float | Valor em R$ |
| location | String | Hospital/local |
| notes | String? | Observações |
| status | ShiftStatus | CONFIRMED / SIMULATED / CANCELLED |
| realized | Boolean? | Se o plantão foi efetivamente realizado (null = ainda não respondido) |
| hospitalId | String? | FK para Hospital |

**Hospital**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | String | Nome do hospital |
| city | String? | Cidade |
| state | String? | Estado (UF) |
| paymentDay | Int? | Dia de pagamento (1-31) |
| notes | String? | Observações |

**ShiftTemplate**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | String? | Nome do template |
| type | ShiftTemplateType | Tipo (Diurno 12h, Noturno 12h, 24h, Personalizado) |
| durationInHours | Int | Duração |
| defaultValue | Float | Valor padrão |
| isNightShift | Boolean | Flag de noturno |

**RiskHistory**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| riskLevel | RiskLevel | SAFE / MODERATE / HIGH |
| riskScore | Float | Score 0-100 |
| triggerRules | String[] | Regras acionadas |
| recommendation | String | Recomendação personalizada |
| hoursIn5Days | Float | Horas nos últimos 5 dias |
| hoursInWeek | Float | Horas na semana |
| consecutiveNights | Int | Noturnos consecutivos |

**Subscription**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| plan | SubscriptionPlan | ESSENTIAL / PRO |
| status | SubscriptionStatus | ACTIVE / INACTIVE / TRIALING / PAST_DUE / CANCELLED |

**WearableData**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| source | String | Fonte (apple_health, garmin, oura, whoop, mock) |
| hrv | Float? | Variabilidade da frequência cardíaca (ms) |
| sleepScore | Float? | Qualidade do sono (0-100) |
| sleepHours | Float? | Horas dormidas |
| recoveryScore | Float? | Score de recuperação (0-100) |
| restingHR | Float? | Frequência cardíaca em repouso |
| stressLevel | Float? | Nível de estresse |

---

## 8. Backend — Módulos & API

### Mapa de Endpoints

**Base URL:** `/api/v1`

#### Auth (`/auth`) — Público

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cadastro (nome, crm, email, senha, gênero) |
| POST | `/auth/login` | Login (email + senha) → tokens + user |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Invalidar refresh token |
| POST | `/auth/forgot-password` | Solicitar reset de senha via e-mail |
| POST | `/auth/reset-password` | Redefinir senha com token |
| GET | `/auth/google` | Iniciar OAuth Google |
| GET | `/auth/google/callback` | Callback OAuth Google |

#### Users (`/users`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users/me` | Perfil do usuário atual (com perfis) |
| POST | `/users/onboarding` | Completar onboarding (financeiro + trabalho + custos energéticos) |
| PATCH | `/users/profile` | Atualizar perfil (nome, gênero) |
| PATCH | `/users/work-profile` | Atualizar perfil de trabalho (custos energéticos, etc.) |
| DELETE | `/users/account` | Excluir conta (cascade) |

#### Finance (`/finance`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/finance/summary?month=X&year=Y` | Resumo financeiro mensal |
| GET | `/finance/insights` | Insights inteligentes (até 5) |
| PATCH | `/finance/profile` | Atualizar perfil financeiro |
| POST | `/finance/installments` | Adicionar parcelamento |
| PATCH | `/finance/installments/:id` | Editar parcelamento |
| DELETE | `/finance/installments/:id` | Excluir parcelamento |
| POST | `/finance/simulate` | Simular impacto de plantão |

#### Shifts (`/shifts`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/shifts` | Criar plantão |
| GET | `/shifts?from=X&to=Y&type=X&status=X` | Listar com filtros |
| GET | `/shifts/workload` | Resumo de carga |
| POST | `/shifts/simulate-workload` | Simular carga com plantão hipotético |
| GET | `/shifts/:id` | Detalhes do plantão |
| PATCH | `/shifts/:id` | Editar plantão |
| DELETE | `/shifts/:id` | Excluir plantão |

#### Hospitals (`/hospitals`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/hospitals` | Criar hospital |
| GET | `/hospitals` | Listar hospitais (com contagem de plantões) |
| GET | `/hospitals/:id` | Detalhes (com templates) |
| PATCH | `/hospitals/:id` | Editar hospital |
| DELETE | `/hospitals/:id` | Excluir hospital |

#### Templates (`/hospitals/:hospitalId/templates`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/hospitals/:hospitalId/templates` | Criar template |
| GET | `/hospitals/:hospitalId/templates` | Listar templates |
| GET | `/hospitals/:hospitalId/templates/:id` | Detalhes do template |
| PATCH | `/hospitals/:hospitalId/templates/:id` | Editar template |
| DELETE | `/hospitals/:hospitalId/templates/:id` | Excluir template |

#### Risk (`/risk`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/risk/evaluate` | Avaliação atual de risco |
| POST | `/risk/simulate` | Simular risco com plantão hipotético |
| GET | `/risk/history?limit=30` | Histórico de avaliações |

#### Optimization (`/optimization`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/optimization/suggest` | Cenários otimizados de plantão |
| POST | `/optimization/apply` | Aplicar cenário (criar SIMULATED) |

#### Dashboard (`/dashboard`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard` | Dados consolidados (finance + workload + risk) |

#### Subscription (`/subscription`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/subscription` | Assinatura atual |

#### Wearable (`/wearable`) — Autenticado [PRO]

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/wearable/latest` | Dados mais recentes |
| GET | `/wearable/history?days=7` | Histórico de dados |

#### Analytics (`/analytics`) — Autenticado

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/analytics?monthsBack=6` | Analytics agregado (summary, monthlyIncome, hospitalRanking, incomeByShiftType, monthOverMonthGrowth) |

#### Health — Público

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |

### Guards & Middleware

| Componente | Tipo | Descrição |
|-----------|------|-----------|
| JwtAuthGuard | Guard global | Valida JWT em todas as rotas; bypass com `@Public()` |
| ThrottlerGuard | Rate limiting | 100 requests por 60 segundos |
| ValidationPipe | Pipe global | Whitelist, transform, forbidNonWhitelisted |
| AllExceptionsFilter | Filter | Tratamento global de exceções HTTP |
| ResponseInterceptor | Interceptor | Formata respostas da API |

---

## 9. Frontend — Páginas & Componentes

### Rotas e Funcionalidades

| Página | URL | Descrição |
|--------|-----|-----------|
| Root | `/` | Redireciona para login ou dashboard |
| Login | `/auth/login` | Formulário email/senha + link "Esqueceu a senha?" |
| Cadastro | `/auth/register` | Formulário nome, CRM, gênero, email, senha |
| Esqueci Senha | `/auth/forgot-password` | Formulário de e-mail para reset |
| Reset Senha | `/auth/reset-password?token=...` | Nova senha com validação de token |
| OAuth Callback | `/auth/callback?token=...&refresh=...` | Handler de OAuth |
| Onboarding | `/onboarding` | 2 etapas: financeiro + trabalho (inclui custos energéticos) |
| Dashboard | `/dashboard` | Hub com KPIs, risco, projeção e wearables |
| Plantões | `/shifts` | Lista e gestão de plantões |
| Hospitais | `/hospitals` | CRUD de hospitais |
| Templates | `/hospitals/[id]/templates` | Templates por hospital |
| Financeiro | `/finance` | Painel financeiro mensal |
| Simular | `/simulate` | Simulador "Aceito ou Não?" |
| Smart Planner | `/smart-planner` | Cenários otimizados por IA |
| Histórico Risco | `/risk-history` | Timeline de avaliações |
| Configurações | `/settings` | Perfil e custos energéticos |
| Analytics | `/analytics` | Analytics avançado com gráficos e rankings |

#### Componentes da Página Analytics

| Componente | Descrição |
|-----------|-----------|
| **AnalyticsPage** | Página principal com toggle de período (6/12 meses) |
| **AnalyticsKPIs** | 4 cards de KPI (totalRevenue, totalShifts, avgPerShift, bestHospital) |
| **MonthlyIncomeChart** | Gráfico de barras de receita mensal (Recharts) |
| **HospitalRanking** | Lista ranqueada de hospitais por receita |
| **HospitalIncomeChart** | Gráfico donut/pizza de distribuição de receita por hospital |
| **ShiftTypeBreakdown** | Detalhamento de receita por tipo de plantão |
| **GrowthTrendChart** | Gráfico de linha de crescimento mês a mês |

### Gerenciamento de Estado

**Zustand (Auth Store):**
```
medflow-auth (localStorage)
├─ user: User | null
├─ accessToken: string | null
├─ refreshToken: string | null
├─ setUser(), setTokens(), logout()
```

**React Query (Server State):**
```
Query Keys:
├─ ["dashboard"]
├─ ["finance", month, year]
├─ ["finance-insights"]
├─ ["shifts"]
├─ ["hospitals"]
├─ ["risk"]
├─ ["risk-history"]
├─ ["optimization"]
├─ ["subscription"]
├─ ["wearable"]
└─ ["analytics", monthsBack]

Config: staleTime: 30s, retry: 1
```

### API Client (Axios)

```
Base URL: /api/v1 (proxy via next.config rewrites)
→ Redireciona para http://127.0.0.1:3001/api/v1

Request Interceptor:
└─ Injeta Authorization: Bearer <token>

Response Interceptor (401):
├─ Detecta 401
├─ Tenta refresh via /auth/refresh
├─ Queue de requests pendentes
├─ Retry automático após refresh
└─ Fallback: logout + redirect /auth/login

Helpers:
├─ unwrap<T>(response) → extrai response.data.data
└─ getErrorMessage(error) → mensagem amigável
```

### Formulários (React Hook Form + Zod)

Padrão usado em todas as páginas:
```typescript
const schema = z.object({
  campo: z.string().min(1, "Mensagem de erro"),
});

const { register, handleSubmit, formState } = useForm({
  resolver: zodResolver(schema),
});
```

- Validação em tempo real com mensagem de erro sob cada input
- `.refine()` para validação cross-field (ex: confirmação de senha)
- `.coerce` para parsing numérico de inputs
- `.optional()` para campos não obrigatórios

### Headers de Segurança (next.config.mjs)

```
X-Robots-Tag: noindex, nofollow
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
```

---

## 10. Engines de Negócio

### Finance Engine (`finance.engine.ts`)

**Propósito:** Cálculos financeiros puros (sem acesso a DB).

**Cálculos Principais:**
```
metaMínima = custosMensais + totalParcelas
metaIdeal = metaMínima + metaPoupança

plantõesMínimos = ⌈metaMínima / valorMédioPlantão⌉
plantõesIdeais = ⌈metaIdeal / valorMédioPlantão⌉

progressoMínimo = (receitaAtual / metaMínima) × 100
progressoIdeal = (receitaAtual / metaIdeal) × 100

faltaParaMínima = MAX(0, metaMínima - receitaAtual)
faltaParaIdeal = MAX(0, metaIdeal - receitaAtual)
```

**Projeções (3 e 6 meses):**
- Baseadas no ritmo atual (plantões/dia)
- Projeta receita futura por mês
- Indica se meta seria atingida no ritmo atual

**Simulação:**
- Recebe valor de plantão hipotético
- Recalcula todos os indicadores
- Mostra before/after com % de impacto

### Insights Engine (`finance.insights.ts`)

**Propósito:** Geração de insights inteligentes (até 5, ordenados por prioridade).

| Insight | Tipo | Quando Acionado |
|---------|------|-----------------|
| **Ritmo da Meta** | info/positive | Sempre — analisa pace vs meta |
| **Dias de Pagamento** | info | Hospital paga em 7 dias |
| **Tendência de Receita** | positive/warning | Compara 3 meses anteriores |
| **ROI por Plantão** | info | Identifica tipo mais rentável/hora |
| **Prontidão Próx. Mês** | action | Poucos plantões confirmados para mês seguinte |
| **Carga de Parcelas** | warning | Parcelas > 40% da meta mínima |
| **Volatilidade** | warning | Renda varia > 30% mês a mês |

### Workload Engine (`shifts.engine.ts`)

**Propósito:** Cálculos de carga de trabalho.

**Métricas:**
```
horasNaSemana        // Dom-Sáb da semana corrente
horasNoMês           // 1º ao último dia do mês
horasEm5Dias         // Últimos 5 dias calendário
plantõesConsecutivos  // Em sequência (< 48h entre eles)
noturnosConsecutivos  // Noturnos em sequência
receitaDoMês          // Total de confirmed shifts
médiaDePorPlantão     // Total horas / count
recomendaçãoDescanso  // Se ≥ 2 consecutivos
```

### Risk Engine (`risk.engine.ts`)

**Propósito:** Avaliação de fadiga e risco de burnout.

**Regras (baseadas em evidência médica):**

| Regra | Moderado | Alto | Pontos |
|-------|----------|------|--------|
| Horas em 5 dias | ≥ 48h | ≥ 60h | até 40 |
| Horas por semana | ≥ 56h | ≥ 72h | até 30 |
| Noturnos consecutivos | = 2 | ≥ 3 | até 20 |
| Tempo de recuperação | 48-71h | < 48h | até 10 |
| Limite pessoal | > max definido | — | MODERATE |

**Score de Risco (0-100):**
```
score = 40 × (horasEm5Dias / 60)
      + 30 × (horasNaSemana / 72)
      + 20 × (noturnosConsec / 3)
      + 10 × (se recuperação < 48h)
```

**Níveis:**
- **SAFE (0-35):** Dentro de ritmo saudável
- **MODERATE (36-65):** Atenção, uma ou mais métricas se aproximando do limite
- **HIGH (66-100):** Um ou mais limites excedidos, ação imediata recomendada

**Recomendações (Context-Aware):**
- SAFE: "Você está dentro de um ritmo saudável. Continue assim."
- MODERATE: "Atenção: [regra acionada]. Que tal planejar uma folga?"
- HIGH: "Sinal de alerta: [regra]. Recomendamos fortemente uma pausa."

### Optimization Engine (`optimization.engine.ts`)

**Propósito:** Gerar cenários de plantão otimizados.

**Algoritmo:**
```
1. Calcular gap financeiro (ideal - receita atual)
2. Encontrar dias livres (sem conflito + 24h de buffer)
3. Gerar cenários single-template (repetir melhor template)
4. Gerar cenários mistos (combinar 2 templates)
5. Filtrar cenários HIGH-risk
6. Ranquear por score de otimização
7. Retornar top 5
```

**Score de Otimização (0-100):**
```
coberturaMeta (0-40): MIN(receita / gap, 1) × 40
saúdeHorária (0-30):  MAX(0, 1 - horasSemanais / 72) × 30
segurançaNoturna (0-20): MAX(0, 1 - noturnos / 4) × 20
eficiência (0-10):    MAX(0, 1 - numPlantões / 10) × 10
```

### Analytics Engine (`analytics.engine.ts`)

**Propósito:** Cálculos de analytics agregados (sem acesso a DB).

**Input:**
- `shifts`: array de plantões do usuário
- `hospitals`: array de hospitais do usuário
- `monthsBack`: número de meses para análise (6 ou 12)

**Output:**
```
summary          // totalRevenue, totalShifts, avgPerShift, bestHospital
monthlyIncome    // receita agrupada por mês
hospitalRanking  // hospitais ranqueados por receita total
incomeByShiftType // receita agrupada por tipo de plantão
monthOverMonthGrowth // variação percentual mês a mês
```

**Lógica:**
- Filtra plantões pelo período (monthsBack meses a partir da data atual)
- Agrupa receita por mês para gráfico de barras
- Calcula receita total por hospital e ordena por valor
- Agrupa por tipo de plantão (12h, 24h, Noturno)
- Calcula crescimento percentual entre meses consecutivos

---

## 11. Autenticação & Segurança

### Fluxo de Autenticação

```
Registro → Hash bcrypt (10+ rounds) → JWT (15min) + Refresh (7d)
Login → Verificar senha → Gerar tokens → Armazenar refresh no DB
Refresh → Validar refresh token → Deletar antigo → Emitir novo par
Logout → Invalidar refresh tokens → Limpar localStorage
```

### JWT Strategy (Passport)
- Extrai token do header `Authorization: Bearer <token>`
- Valida assinatura + expiração
- Carrega usuário do DB (id, email, onboardingCompleted, subscription)

### Google OAuth (Passport)
- Redirect para Google → Callback com perfil
- Upsert: busca por googleId ou email, cria se novo
- Gera tokens → Redirect para frontend com tokens na query

### Reset de Senha
- Gera token UUID + expiração de 1 hora
- Armazena no DB (`resetPasswordToken`, `resetPasswordExpiry`)
- Envia e-mail HTML via Resend API
- Na redefinição: valida token + expiração → atualiza hash → limpa token

### Validação de CRM

O campo CRM (registro médico) segue o formato `123456/UF` (1-6 dígitos, barra, 2 letras de estado).

- **Backend:** `@Matches(/^\d{1,6}\/[A-Z]{2}$/)` no DTO de registro. Auto-uppercase via `@Transform`.
- **Frontend:** Validação Zod com regex `/^\d{1,6}\/[A-Z]{2}$/` no formulário de cadastro.
- Exemplos válidos: `12345/SP`, `1234/RJ`, `123456/MG`

### Verificação de Propriedade
- Todo endpoint verifica `userId` antes de retornar dados
- Parcelamentos verificam `financialProfileId === profile.id`
- Mismatch → `ForbiddenException` (403)

---

## 12. Planos & Assinatura

### ESSENTIAL (Padrão)
- Dashboard (KPIs, Risco, Projeções)
- Plantões (CRUD)
- Financeiro (Mensal, Orçamento)
- Simular (Cenários)
- Hospitais & Templates

### PRO (Pago)
- Tudo do ESSENTIAL, mais:
- **Smart Planner** (cenários otimizados por IA)
- **Histórico de Risco** (timeline 30 dias)
- **Wearable Integration** (Apple Health, Garmin, Oura, Whoop)
- **Insights Avançados**

### Status de Assinatura
| Status | Descrição |
|--------|-----------|
| ACTIVE | Pagando e ativo |
| INACTIVE | Expirou |
| TRIALING | Em período de teste |
| PAST_DUE | Pagamento falhou |
| CANCELLED | Usuário cancelou |

---

## 13. Seed & Dados de Teste

### Usuários de Demonstração

**1. Ana Lima** (ESSENTIAL)
- Email: `ana@demo.com` / Senha: `Demo1234!`
- Custos: R$4.500/mês, Poupança: R$2.000
- Parcelas: Carro (R$900 × 24m), Especialização (R$400 × 12m)
- 3 hospitais, 4 templates, 5 plantões

**2. Carlos Souza** (PRO, alta carga)
- Email: `carlos@demo.com` / Senha: `Demo1234!`
- Custos: R$6.000/mês, Poupança: R$3.000
- Parcela: Apartamento (R$500 × 180m)
- 3 hospitais, 5 templates, 7 plantões + dados wearable

**3. Julia Martins** (ESSENTIAL, TRIALING)
- Email: `julia@demo.com` / Senha: `Demo1234!`
- Onboarding incompleto (sem perfis financeiro/trabalho)

**4. Luiza Quintino** (PRO)
- Email: `luiza@teste.com` / Senha: `JCHh14025520`
- Custos: R$5.000/mês, Poupança: R$2.500
- Parcela: Aluguel escritório (R$1.200 × 36m)
- 2 hospitais (Copa D'Or, Miguel Couto), 3 templates, 3 plantões

### Comando de Seed
```bash
cd backend && npm run seed
```

---

## 14. Configuração & Variáveis de Ambiente

### Backend (`.env`)

```bash
# App
NODE_ENV=production
PORT=3001
APP_URL=https://medflow-backend.railway.app
FRONTEND_URL=https://medflow.vercel.app  # Default local: http://localhost:3002

# Database
DATABASE_URL="postgresql://user:password@host:5432/medflow"

# JWT
JWT_SECRET=<chave-segura-64-chars>
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=<chave-segura-64-chars>
JWT_REFRESH_EXPIRY=7d

# Bcrypt
BCRYPT_ROUNDS=12

# Email (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM="Med Flow <onboarding@resend.dev>"

# Google OAuth
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_CALLBACK_URL=https://medflow-backend.railway.app/api/v1/auth/google/callback
```

### Frontend

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1  # URL do backend
```

### Servidores de Desenvolvimento (`.claude/launch.json`)

```json
{
  "configurations": [
    {
      "name": "frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--", "-p", "3002"],
      "port": 3002
    },
    {
      "name": "backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:dev"],
      "port": 3001
    }
  ]
}
```

---

## 15. Stack Tecnológica

### Backend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| NestJS | 11 | Framework HTTP |
| Prisma | 7 | ORM para PostgreSQL |
| PostgreSQL | — | Banco de dados (Railway) |
| Passport | — | Autenticação (JWT + Google OAuth) |
| bcrypt | — | Hash de senhas |
| Resend | — | Envio de e-mails transacionais (API) |
| class-validator | — | Validação de DTOs |
| class-transformer | — | Transformação de payloads |
| @nestjs/config | — | Gerenciamento de configuração |
| @nestjs/throttler | — | Rate limiting |

### Frontend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 14.2 | Framework React (App Router) |
| React | 18 | Biblioteca UI |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 3.4 | Estilização utility-first |
| Zustand | 5 | State management (auth) |
| TanStack React Query | 5 | Server state management |
| Axios | 1.13 | HTTP client |
| React Hook Form | 7 | Gestão de formulários |
| Zod | 4 | Validação de schemas |
| Recharts | 3 | Gráficos (AreaChart) |
| Lucide React | 0.575 | Biblioteca de ícones |
| date-fns | 4 | Utilidades de data |
| clsx + tailwind-merge | — | Merge de classes CSS |

### Infraestrutura

| Serviço | Uso |
|---------|-----|
| Railway | PostgreSQL hosting |
| Vercel | Frontend deployment (futuro) |
| Railway | Backend deployment (futuro) |
| Resend | Envio de e-mails transacionais |

---

## 16. Testes & Qualidade

### Visão Geral

O projeto possui **767 testes** distribuídos em **99 suites**, cobrindo todos os módulos, páginas, componentes, jornadas de usuário e testes E2E.

### Backend (46 suites / 393 testes)

| Categoria | Suites | Testes | Cobertura |
|-----------|--------|--------|-----------|
| Serviços | 12 | ~120 | Auth, Users, Shifts, Finance, Hospitals, Risk Engine, Dashboard, Subscription, Wearable, Mail, Shift Templates, Analytics |
| Controllers | 12 | ~100 | Todos os endpoints HTTP com validações de DTO |
| Engines | 4 | ~50 | Finance Engine, Shifts Engine (Workload), Optimization Engine, Analytics Engine |
| Infraestrutura | 4 | ~20 | JWT Guard, HTTP Exception Filter, Decorators, Response Interceptor |
| Schema | 1 | ~41 | Validação do schema Prisma (modelos, enums, relações) |
| E2E | 11 | ~52 | Fluxos completos de auth, users, shifts, finance, hospitals, risk, dashboard, wearable, subscription, optimization, analytics |
| Edge Cases | 2 | ~15 | Cenários limítrofes e permissões |

**Frameworks:** Jest + NestJS Testing Utilities

**Mock Factory:** `backend/test/mocks/prisma.mock.ts` — cria mocks automáticos para todos os modelos do Prisma, eliminando a necessidade de mocks manuais.

### Frontend (~53 suites / ~374 testes)

| Categoria | Suites | Testes | Cobertura |
|-----------|--------|--------|-----------|
| Componentes UI | 6 | ~40 | Button, Input, Card, ProgressBar, RiskBadge, Spinner |
| Componentes Layout | 2 | ~15 | Sidebar, Topbar |
| Componentes Shifts | 1 | ~8 | ShiftCard |
| Páginas App | 10 | ~90 | Dashboard, Shifts, Hospitals, Finance, Simulate, Smart Planner, Risk History, Settings, Onboarding, Analytics |
| Auth Pages | 4 | ~25 | Login, Register, Forgot Password, Reset Password |
| Jornadas | 3 | ~25 | Login Journey, Register Journey, Password Recovery Journey |
| Integração | 2 | ~15 | API Client (interceptors, refresh), Auth Store (Zustand) |
| Edge Cases | 2 | ~20 | Erros de API, estados vazios, dados nulos |

**Frameworks:** Jest + React Testing Library + @testing-library/user-event

### CI/CD

Pipeline GitHub Actions (`.github/workflows/ci.yml`):

```
Push/PR → main ou develop
├── Backend Job
│   ├── PostgreSQL 16 (service container)
│   ├── npm ci + prisma generate
│   ├── ESLint
│   ├── Jest (sem coverage)
│   └── Jest (com coverage)
└── Frontend Job
    ├── npm ci
    ├── ESLint
    ├── Jest (sem coverage)
    ├── Jest (com coverage)
    └── npm run build
```

### Rodando os Testes Localmente

```bash
# Backend
cd backend
npx prisma generate    # necessário na primeira vez
npm test               # rodar testes
npm test -- --coverage # com cobertura

# Frontend
cd frontend
npm test               # rodar testes
npm test -- --coverage # com cobertura

# Filtrar por módulo
npm test -- --testPathPattern="auth"
npm test -- --testPathPattern="shifts"
npm test -- --testPathPattern="finance"
```

---

## 17. Feature: Realização de Plantões

### Descrição

O campo `realized` permite que o médico confirme se um plantão efetivamente aconteceu ou não. Após a data do plantão, um banner aparece no ShiftCard perguntando "Aconteceu?", com botões "Sim" e "Não".

### Fluxo

```
1. Plantão confirmado (status: CONFIRMED) com data no passado
2. UI mostra banner "Aconteceu?" com botões Sim / Não
3. Usuário clica:
   ├─ "Sim" → PATCH /shifts/:id { realized: true }
   │          ShiftCard mostra badge verde "Realizado"
   └─ "Não" → PATCH /shifts/:id { status: "CANCELLED" }
              ShiftCard some da lista de confirmados
4. Plantão com realized=true conta normalmente para cálculos financeiros
5. Plantão cancelado não conta para receita
```

### Impacto no Schema

```prisma
model Shift {
  // ... campos existentes
  realized  Boolean?  // null = não respondido, true = realizado, false = não
}
```

### Endpoints Afetados

| Endpoint | Campo | Comportamento |
|----------|-------|---------------|
| `PATCH /shifts/:id` | `realized: boolean` | Marca o plantão como realizado ou não |
| `GET /shifts` | Inclui `realized` | Retorna o estado de realização |
| `GET /dashboard` | Considera `realized` | Plantões realizados contam para métricas |

### UI

- **Badge "Realizado"**: Verde (moss-100/moss-700) no ShiftCard quando `realized === true`
- **Badge "Simulado"**: Azul (blue-100/blue-700) no ShiftCard quando `status === 'SIMULATED'`
- **Banner "Aconteceu?"**: Aparece para plantões CONFIRMED com data no passado e `realized === null`

---

> Documento gerado em Março 2026. MedFlow v1.1.
