# Lixeira Inteligente

Projeto IoT de lixeiras inteligentes — sensores (ESP32 + HC-SR04), Firebase e app mobile.

## Estrutura

- **`mobile/`** — app React Native (Expo + TypeScript). Toda a documentação de
  convenções, estrutura e comandos está em `mobile/README.md`.
- **`firmware/`** *(a criar)* — firmware do ESP32 (C/C++).
- **`firebase/`** *(a criar)* — estrutura e regras do Firestore.
- **`github/`** — automação do GitHub Projects (etapas do roteiro).
- **`scripts/`** — scripts utilitários de gestão do projeto.
- **`plano_dev.md`** — documento oficial de planejamento e especificação.

## Gestão do projeto (GitHub Projects)

As 14 etapas do roteiro (plano_dev.md, seção 23.1) são sincronizadas com o GitHub
Projects via `scripts/setup-github-project.sh`. Veja `github/README.md` para como
editar as etapas e rodar o script.

```bash
PROJECT_NUMBER=<número do projeto> ./scripts/setup-github-project.sh
```

## Começando

```bash
cd mobile
npm install
npm start
```

## Convenções

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, ...).
- **Lint/types:** ESLint (type-checked) + TypeScript strict no `mobile/` — rode
  `npm run lint` e `npm run typecheck` antes de concluir uma tarefa.