# contexts

Context API — estado global da aplicação.

- `auth/` — sessão e usuário autenticado
- Demais contextos globais quando necessário (ex.: preferências, notificações)

Contexts devem expor hooks de acesso tipados (ex.: `useAuth()`) e se concentrar em
estado global autêntico — não usar Context para substituir props em componentes locais.
