# components

Componentes reutilizáveis da UI.

- `common/` — componentes genéricos e agnósticos de domínio (ex.: `Button`, `Input`, `Card`, `ScreenContainer`)
- `forms/` — componentes específicos de formulários (campos validadós, pickers)

Componentes com estado de apresentação apenas. Componentes que dependem de dados de
negócio devem recebê-los via props ou hooks, nunca ler de contexts/firebase diretamente.
