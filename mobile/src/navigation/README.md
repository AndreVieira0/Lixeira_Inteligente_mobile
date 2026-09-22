# navigation

Configuração de rotas e stacks (React Navigation).

- `types.ts` — tipos dos parâmetros e nomes das rotas
- Stacks e tabs (ex.: `RootNavigator`, `AuthStack`, `AppStack`)

Aqui vive **somente** a configuração de navegação. Telas são importadas de `screens`
e compostas aqui; nenhuma tela deve instanciar gestores de navegação por conta própria.
