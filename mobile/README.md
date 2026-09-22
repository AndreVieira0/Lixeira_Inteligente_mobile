# Lixeira Inteligente — App Mobile

Aplicação definitiva do projeto **Lixeira Inteligente** (IoT: ESP32 + HC-SR04 + Firebase).
Este pacote contém o app **React Native (Expo + TypeScript)**.

> Status: **estrutura inicial**. Nenhuma tela, rota ou integração funcional foi implementada ainda — este
> setup existe para que as próximas etapas (telas, navegação, Firebase) sejam construídas sobre uma base sólida.

---

## Stack

| Camada       | Tecnologia                                              |
| ------------ | ------------------------------------------------------- |
| Framework    | React Native via **Expo** (SDK 57)                      |
| Linguagem    | **TypeScript** (strict)                                 |
| Navegação    | React Navigation (libs instaladas, rotas ainda não)     |
| Backend      | Firebase SDK — Authentication, Firestore, Messaging     |
| Lint/Format  | ESLint (flat config + type-check) + Prettier            |
| Hooks de git | Husky + lint-staged (lint/format em `pre-commit`)       |
| Ambientes    | `.env.development` / `.env.production` (`EXPO_PUBLIC_`) |

---

## Estrutura de pastas

```
mobile/
├── src/
│   ├── screens/      # Telas, organizadas por domínio (auth/, dashboard/, bin/)
│   ├── components/   # Componentes reutilizáveis (common/, forms/)
│   ├── services/     # Comunicação com Firebase e APIs externas
│   ├── navigation/   # Configuração de rotas e stacks
│   ├── hooks/        # Custom hooks reutilizáveis
│   ├── contexts/     # Context API (estado global)
│   ├── types/        # Tipagens TypeScript compartilhadas
│   ├── constants/    # Constantes (cores, enums, limites, tema)
│   ├── utils/        # Funções utilitárias puras
│   └── config/       # Configuração de ambiente e inicialização
├── .env.example
├── .env.development  # (não versionado)
├── .env.production   # (não versionado)
├── .prettierrc.json
├── eslint.config.js
├── tsconfig.json
└── package.json
```

Cada pasta de `src/` contém um `README.md` descrevendo sua finalidade e regras.

---

## Como rodar em desenvolvimento

Pré-requisitos: Node.js 20+ e o app **Expo Go** (ou emulador).

```bash
# 1. Na raiz do repositório: instala apenas o Husky (hooks de git)
npm install

# 2. Dentro de mobile/
cd mobile
npm install

# 3. Suba o servidor de desenvolvimento
npm start          # ou: npm run android | npm run ios | npm run web
```

Para ambientes: copie `.env.example` para `.env.development` (e `.env.production`)
e preencha os valores antes de configurar integrações reais.

---

## Scripts úteis

| Comando                | Descrição                                 |
| ---------------------- | ----------------------------------------- |
| `npm start`            | Inicia o servidor do Expo                 |
| `npm run lint`         | Roda o ESLint                             |
| `npm run lint:fix`     | Corrige problemas de lint automaticamente |
| `npm run typecheck`    | Tipo-checks TypeScript (`tsc --noEmit`)   |
| `npm run format`       | Formata com Prettier                      |
| `npm run format:check` | Verifica formatação                       |
| `npm run doctor`       | Diagnostica dependências/config do Expo   |

---

## Convenções de código

### Escolha do diretório (onde o código mora)

- **`screens/`** — uma tela inteira (página). Só compõe layout e dispara ações.
- **`components/`** — blocos de UI reutilizáveis. Nada de lógica de negócio.
- **`services/`** — qualquer acesso a Firebase/API. **Nunca** importar o SDK do Firebase
  fora desta pasta.
- **`hooks/`** — lógica de estado/efeitos reutilizável que precisa de React.
- **`contexts/`** — estado global legítimo (auth, usuário). Acesso sempre via hook tipado.
- **`utils/`** — funções puras (formatação, validação) que não dependem de React.
- **`constants/`** — valores fixos (cores, limites, enums). Proibido hard-code.
- **`types/`** — tipos compartilhados entre módulos.
- **`config/`** — leitura de variáveis de ambiente e bootstrap.

### Nomenclatura

| Item             | Padrão                                                                   | Exemplos                                   |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| Arquivos TS/TSX  | `PascalCase` para componentes; `camelCase` para o restante               | `BinDetailScreen.tsx`, `useAuth.ts`        |
| Sufixo de tela   | `Screen`                                                                 | `LoginScreen.tsx`                          |
| Componente React | PascalCase + nome do arquivo = nome do componente                        | `Button.tsx` → `export default Button`     |
| Hook custom      | prefixo `use`                                                            | `useBinLevel.ts`                           |
| Contexto         | sufixo `Context` + hook de acesso `useContextNome`                       | `AuthContext`, `useAuth`                   |
| Constantes       | tipos de negócio em `SCREAMING_SNAKE_CASE`; objetos de tema em camelCase | `MAX_NOTIFICATION_LEVEL`, `colors.primary` |
| Tipos            | `PascalCase`, sem sufixo `I`/`T`                                         | `User`, `BinStatus`                        |

### TypeScript

- `strict: true` habilitado. Modo **type-checked** no ESLint (`@typescript-eslint/strict-type-checked`).
- Imports de tipos usam `import type` (`consistent-type-imports`).
- Todos os switches devem ser exaustivos (`switch-exhaustiveness-check`).
- Funções declaradas devem ter retorno explícito sempre que não triviais.

### Lint e formatação

- ESLint roda com **type-checking** — rode `npm run typecheck` junto ao lint.
- Prettier: aspas simples, `trailingComma: all`, 100 colunas, EOF `lf`.
- Antes de commitar, `husky` + `lint-staged` rodam `prettier` e `eslint --fix`
  sobre os arquivos em staging automaticamente.

### Commits

Usamos **[Conventional Commits](https://www.conventionalcommits.org/)**, no formato:

```
<type>(<escopo>): <descrição no imperativo, sem maiúscula inicial>
```

- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: documentação
- `chore`: tarefas de manutenção (deps, tooling)
- `refactor`: mudança sem alterar comportamento
- `style`: formatação/estilo sem mudança de lógica
- `test`: testes
- `build`/`ci`: build e integração contínua

Exemplos: `feat(auth): add login screen`, `fix(bin): correct level calculation`, `chore: bump expo sdk`.

---

## Variáveis de ambiente

Ambientes diferentes exigem arquivos `.env.*` separados (não versionados). O Expo
carrega `.env.development` em desenvolvimento e `.env.production` em produção/builds.
Apenas variáveis prefixadas com **`EXPO_PUBLIC_`** são expostas ao app cliente.
Consulte `.env.example` para a lista completa.
