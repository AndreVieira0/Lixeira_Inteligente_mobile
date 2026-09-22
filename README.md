# Lixeira Inteligente

Projeto IoT de lixeiras inteligentes — sensores (ESP32 + HC-SR04), Firebase e app mobile.

## Estrutura

- **`mobile/`** — app React Native (Expo + TypeScript). Toda a documentação de
  convenções, estrutura e comandos está em `mobile/README.md`.

## Começando

```bash
npm install          # husky (hooks de git) — raiz do repositório
cd mobile
npm install
npm start
```

## Convenções

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, ...).
- **Lint/format:** ESLint (type-checked) + Prettier, com pre-commit automático via Husky + lint-staged.