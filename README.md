# Lixeira Inteligente

Projeto IoT de lixeiras inteligentes — sensores (ESP32 + HC-SR04), Firebase e app mobile.

## Estrutura

- **`mobile/`** — app React Native (Expo + TypeScript). Toda a documentação de
  convenções, estrutura e comandos está em `mobile/README.md`.
- **`firmware/`** *(a criar)* — firmware do ESP32 (C/C++).
- **`firebase/`** *(a criar)* — estrutura e regras do Firestore.

> Documentos de planejamento e automação de gestão (`plano_dev.md`, `github/`,
> `scripts/`) são mantidos apenas localmente, fora do controle de versão.

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