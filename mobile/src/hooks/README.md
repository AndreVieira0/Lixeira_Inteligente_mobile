# hooks

Custom hooks reutilizáveis.

- Hooks que encapsulam lógica de estado/efeitos reutilizável (ex.: `useAuth`, `useBinLevel`, `useDebounce`)
- Hooks que fazem ponte com `contexts` e `services`

Regra: hooks devem ser autossuficientes e retornar dados tipados. Raciocínio de UI em
componentes, estado reutilizável em hooks.
