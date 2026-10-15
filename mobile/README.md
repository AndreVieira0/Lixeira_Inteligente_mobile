# Lixeira Inteligente — App Mobile

Aplicação definitiva do projeto **Lixeira Inteligente** (IoT: ESP32 + HC-SR04 + Firebase).
Este pacote contém o app **React Native (Expo + TypeScript)**.

## Componentes visuais

A interface usa [React Native Paper](https://oss.callstack.com/react-native-paper/docs/guides/getting-started)
para cartões, campos, botões, busca e indicadores, com ícones Material Community fornecidos por
[@expo/vector-icons](https://docs.expo.dev/guides/icons/). As fontes dos ícones são empacotadas com o app.
O tema verde está em `src/constants/paperTheme.ts`; os componentes compartilhados ficam em `src/components/common/`.
As bibliotecas são dependências do projeto, sob suas respectivas licenças MIT.

## Prévia das telas — APP-02

O modo padrão (`EXPO_PUBLIC_APP_MODE=demo`) abre uma demonstração sem backend:
login/cadastro → Minhas lixeiras → detalhes, histórico, edição, cadastro e perfil.
A recuperação informa indisponibilidade enquanto não houver integração de e-mail.
Não informe credenciais reais na prévia. As alterações ficam em memória e são limpas ao sair.

A interface não exibe faixas de demonstração nem controles de simulação.
A lista começa com a lixeira mockada da coordenação; a busca aparece a partir de duas lixeiras.
O botão + cadastra nome/localização e retorna à lista. O lápis edita esses dados e retorna à tela de origem.
O cadastro cria apenas um cartão sem leitura; a configuração Wi-Fi permanece indisponível sem dispositivo vinculado.
Dados reais, Better Auth, API e banco Neon serão integrados nas próximas tasks.
O caminho Firebase legado continua separado e é ativado apenas com o modo `firebase`.

Validação das telas: `npx playwright test --config tests/preview/playwright.config.cjs`.
O teste usa Chrome instalado e inicia o Expo web na porta 8082, em modo demonstração.

> Status: **autenticação e CRUD de perfil implementados**: cadastro, login, recuperação,
> sessão persistida, consulta/edição do nome e exclusão de conta com reautenticação.
> Acesso real depende de configurar o projeto Firebase e publicar as regras.
> Consulte [lógica de negócio e configuração](docs/autenticacao.md).

---

## Stack

| Camada       | Tecnologia                                              |
| ------------ | ------------------------------------------------------- |
| Framework    | React Native via **Expo** (SDK 57)                      |
| Linguagem    | **TypeScript** (strict)                                 |
| Navegação    | Fluxos condicionais de autenticação; React Navigation disponível para expansão |
| Backend      | Firebase SDK — Authentication, Firestore, Messaging     |
| Lint/Type    | ESLint (flat config + type-check) + TypeScript strict   |
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
├── eslint.config.js
├── tsconfig.json
└── package.json
```

Cada pasta de `src/` contém um `README.md` descrevendo sua finalidade e regras.

---

## Como rodar em desenvolvimento

Pré-requisitos: Node.js 20+ e o app **Expo Go** (ou emulador).

```bash
# 1. Dentro de mobile/
cd mobile
npm install

# 2. Suba o servidor de desenvolvimento
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
| `npm run doctor`       | Diagnostica dependências/config do Expo   |
| `npm test`             | Testes das regras de negócio e proteção de ambiente |
| `npm run test:emulators` | Integração e regras com Firebase local |
| `npm run test:e2e`      | Jornada completa das telas no Chrome com Firebase local |

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

### Lint e tipagem

- ESLint roda com **type-checking** — rode `npm run typecheck` junto ao lint.
- TypeScript em modo **strict** (`strict: true`), com regras type-checked do
  `typescript-eslint` (consistent-type-imports, switch-exhaustiveness-check, etc.).

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
