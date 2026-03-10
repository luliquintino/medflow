# Como Contribuir

Obrigado pelo interesse em contribuir com o Med Flow! Este documento descreve as diretrizes e o fluxo de trabalho para colaborar com o projeto.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) rodando localmente ou via Docker
- npm
- Git

---

## Setup do Ambiente de Desenvolvimento

1. Faça um fork do repositório e clone-o localmente:

```bash
git clone https://github.com/luliquintino/medflow.git
cd medflow
```

2. Configure o backend:

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL
npx prisma generate
npx prisma db push
npm run seed
npm run start:dev
```

3. Configure o frontend (em outro terminal):

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

4. Acesse [http://localhost:3002](http://localhost:3002) para verificar que tudo está funcionando.

---

## Padrões de Código

O projeto utiliza **ESLint** e **Prettier** para manter a consistência do código.

- Antes de commitar, rode o linter em cada pasta:

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

- Recomendamos configurar seu editor para formatar automaticamente ao salvar (VS Code: extensões ESLint e Prettier).

---

## Estrutura de Testes

### Backend

- **Framework:** Jest + NestJS Testing Utilities
- **Localização:** Arquivos de teste ficam em `__tests__/` dentro de cada módulo com o sufixo `.spec.ts`
- **Rodar testes:** `cd backend && npm test`
- **Cobertura:** `cd backend && npm test -- --coverage`

#### Padrão de teste de serviço

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from '../my.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../../test/mocks/prisma.mock';

describe('MyService', () => {
  let service: MyService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    prisma = mockPrismaService;
  });

  it('should do something', async () => {
    prisma.myModel.findMany.mockResolvedValue([]);
    const result = await service.findAll('user-1');
    expect(result).toEqual([]);
  });
});
```

#### Padrão de teste de controller

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyController } from '../my.controller';
import { MyService } from '../my.service';

describe('MyController', () => {
  let controller: MyController;
  let service: { myMethod: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyController],
      providers: [
        {
          provide: MyService,
          useValue: { myMethod: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<MyController>(MyController);
    service = module.get(MyService);
  });

  it('should call service method', async () => {
    service.myMethod.mockResolvedValue({ id: '1' });
    const result = await controller.myEndpoint('user-1');
    expect(service.myMethod).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: '1' });
  });
});
```

#### Mock Factory (Prisma)

O mock de Prisma fica em `backend/test/mocks/prisma.mock.ts` e cria mocks automáticos para todos os modelos do schema. Sempre use `mockPrismaService` em vez de criar mocks manuais.

#### Padrão Controller + Service + Engine

Novos módulos seguem o padrão **controller + service + engine**. O `analytics` module é um bom exemplo:

- `analytics.controller.ts` — Define rotas HTTP e delega para o service
- `analytics.service.ts` — Busca dados via Prisma e passa para o engine
- `analytics.engine.ts` — Lógica pura de cálculo (sem acesso a DB), fácil de testar

Ao criar um novo módulo, siga esse mesmo padrão para manter a separação de responsabilidades.

#### Testes E2E

O projeto inclui testes end-to-end que testam o fluxo completo da API.

**Pré-requisitos:**
- PostgreSQL rodando e acessível via `DATABASE_URL`
- Dados de seed aplicados (`npm run seed`)

**Como rodar:**
```bash
cd backend
npx jest test/auth.e2e.spec.ts
```

**Padrão:** Os testes E2E usam `supertest` com o `AppModule` real do NestJS e um usuário seed para validar fluxos completos (registro, login, refresh token, etc.).

### Frontend

- **Framework:** Jest + React Testing Library + @testing-library/user-event
- **Localização:** Arquivos de teste ficam em `__tests__/` dentro de cada diretório com o sufixo `.test.tsx`
- **Rodar testes:** `cd frontend && npm test`
- **Cobertura:** `cd frontend && npm test -- --coverage`

#### Padrão de teste de componente

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent label="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

#### Padrão de teste de página (com mocks)

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Mocks devem vir ANTES do import do componente
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/my-page',
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

import MyPage from '../page';

describe('MyPage', () => {
  it('should render with data', () => {
    (require('@tanstack/react-query').useQuery as jest.Mock).mockReturnValue({
      data: { /* mock data */ },
      isLoading: false,
    });

    render(<MyPage />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

#### Dicas para testes de formulário (React Hook Form + Zod)

- **Use `userEvent` em vez de `fireEvent.change`** — O `react-hook-form` pode não registrar valores com `fireEvent.change`. Prefira `userEvent.type()`:

```tsx
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.type(screen.getByPlaceholderText('Nome'), 'Maria Silva');
await user.click(screen.getByRole('button', { name: /salvar/i }));
```

- **Mock de `lucide-react`** — Se o componente usa `Button` (que importa `Loader2`), inclua no mock:

```tsx
jest.mock('lucide-react', () => ({
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader" {...props} />,
  // outros ícones usados...
}));
```

---

## Fluxo de Pull Requests

1. Crie uma branch a partir de `main`:

```bash
git checkout -b feature/minha-feature
```

2. Implemente suas alterações seguindo os padrões de código.

3. Escreva ou atualize testes quando aplicável.

4. Certifique-se de que todos os testes passam:

```bash
cd backend && npx prisma generate && npm test
cd frontend && npm test
```

5. Certifique-se de que o lint passa sem erros:

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

6. Faça commit das suas alterações (veja a seção de commits abaixo).

7. Envie sua branch e abra um Pull Request para `main`.

8. Descreva claramente o que foi feito e por quê no PR.

9. Aguarde a revisão de código. Ajustes podem ser solicitados.

### Checklist para PRs

Antes de abrir um PR, verifique:

- [ ] Testes unitários backend passando (`cd backend && npm test`)
- [ ] Testes E2E backend passando (`cd backend && npx jest test/auth.e2e.spec.ts`)
- [ ] Testes frontend passando (`cd frontend && npm test`)
- [ ] Lint backend sem erros (`cd backend && npm run lint`)
- [ ] Lint frontend sem erros (`cd frontend && npm run lint`)
- [ ] Build do frontend sem erros (`cd frontend && npm run build`)
- [ ] Novos testes adicionados para código novo
- [ ] Testes existentes atualizados se o comportamento mudou
- [ ] Documentação atualizada se necessário (README, DOCUMENTATION.md)
- [ ] Sem credenciais ou dados sensíveis no commit

---

## Padrão de Commits

Utilizamos **Conventional Commits** para manter um histórico claro e facilitar a geração de changelogs.

Formato: `tipo(escopo): descrição`

Tipos mais comuns:

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Alterações na documentação |
| `style` | Formatação (sem mudança de lógica) |
| `refactor` | Refatoração de código |
| `test` | Adição ou correção de testes |
| `chore` | Tarefas de manutenção (deps, configs) |

Exemplos:

```
feat(shifts): adicionar campo realized para confirmar plantões
fix(finance): corrigir cálculo de parcelas com desconto
test(auth): adicionar testes de controller para registro
docs: atualizar README com instruções de teste
```

---

## Estrutura de Diretórios para Testes

```
backend/src/
├── analytics/
│   └── __tests__/
│       ├── analytics.service.spec.ts  # Testes de serviço
│       ├── analytics.controller.spec.ts # Testes de controller
│       └── analytics.engine.spec.ts   # Testes de engine
├── auth/
│   └── __tests__/
│       ├── auth.service.spec.ts       # Testes de serviço
│       └── auth.controller.spec.ts    # Testes de controller
├── common/
│   └── __tests__/
│       ├── jwt-auth.guard.spec.ts     # Testes de guard
│       ├── http-exception.filter.spec.ts
│       ├── decorators.spec.ts
│       └── response.interceptor.spec.ts
├── prisma/
│   └── __tests__/
│       └── schema.spec.ts            # Validação do schema
└── __tests__/
    └── edge-cases.spec.ts            # Edge cases gerais

backend/test/
└── auth.e2e.spec.ts                  # Testes E2E de autenticação

frontend/src/
├── app/
│   ├── auth/
│   │   └── __tests__/
│   │       ├── login-journey.test.tsx        # Jornada completa
│   │       ├── register-journey.test.tsx
│   │       └── password-recovery-journey.test.tsx
│   └── (app)/
│       ├── dashboard/
│       │   └── __tests__/
│       │       └── page.test.tsx      # Teste de página
│       └── analytics/
│           └── __tests__/
│               └── page.test.tsx      # Teste de página
├── components/
│   ├── ui/
│   │   └── __tests__/
│   │       ├── button.test.tsx        # Teste de componente
│   │       ├── input.test.tsx
│   │       └── ...
│   └── layout/
│       └── __tests__/
│           ├── sidebar.test.tsx
│           └── topbar.test.tsx
└── __tests__/
    └── edge-cases.test.tsx           # Edge cases gerais
```

---

## Dúvidas?

Abra uma [issue](https://github.com/luliquintino/medflow/issues) no repositório ou entre em contato com os mantenedores.
