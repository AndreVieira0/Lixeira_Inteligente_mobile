# screens

Telas da aplicação, organizadas por domínio.

- `auth/` — login, registro, recuperação de senha
- `dashboard/` — visão geral e indicadores
- `bin/` — lixeiras, níveis de preenchimento e histórico

Regra: cada arquivo deve representar **uma** tela, nomeado por domínio + finalidade
(ex.: `bin/BinDetailScreen.tsx`). Telas não devem conter lógica de negócio — apenas
compor componentes e disparar ações via hooks/services.
