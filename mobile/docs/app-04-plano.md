# APP-04 — Plano da base da API

Objetivo: API Hono/TypeScript conectada ao PostgreSQL, com sessão validada pelo Better Auth, consultas limitadas à conta e migrações reproduzíveis. Especificação: app-01-arquitetura-servicos.md e app-03-modelagem-dados.md.

Execução direta neste workspace autorizado, preservando arquivos anteriores não commitados. Usar Node instalado 22.19+ localmente, mantendo compatibilidade com Node 24 previsto para hospedagem. Não criar infraestrutura remota nesta task.

## Contratos da entrega

- `GET /health`: público, não consulta banco.
- `GET /v1/me`: perfil mínimo da sessão validada.
- `GET /v1/bins`: lista limitada/paginada por ID; dono obtido exclusivamente da sessão.
- `GET /v1/bins/:id`: detalhes; 404 tanto para inexistência quanto para falta de propriedade.
- `PATCH /v1/bins/:id`: somente nome/localização validados, autorização na mesma consulta UPDATE. Rejeitar ownerId, deviceId e campos desconhecidos.
- Erros JSON com código/mensagem/requestId; não retornar SQL, segredo ou token.
- Cookie da sessão resolvido pelo SDK no servidor, sem implementar assinatura própria. Desabilitar cookie cache para refletir revogação imediatamente. Não montar rotas públicas de cadastro/login nesta etapa (APP-05).
- CORS por allowlist; mutações exigem origem explicitamente autorizada, incluindo scheme nativo documentado, para proteger cookie contra CSRF.

## Etapas

- [x] Instalar dependências fixadas e escrever testes HTTP antes da implementação.
- [x] Implementar configuração estrita, conexão PostgreSQL, adaptador de sessão e repositório por conta.
- [x] Implementar rotas e middleware; validar autenticação, erros, payload e origem.
- [x] Adicionar role de execução sem DDL e runner com checksum/advisory lock; migrações e registro na mesma transação.
- [x] Testar PostgreSQL real isolado: aplicação/repetição/rollback/checksum de migrações, sessão assinada real, expiração/revogação, acesso cruzado e permissões SQL.
- [x] Executar testes, typecheck/build; revisão independente e documentação dos limites.

Registro de execução e revisão: [app-04-progresso.md](app-04-progresso.md). Configuração e contratos: [api/README.md](../../api/README.md).

## Pontos de revisão

Sessão falsa/expirada não autentica; indisponibilidade do banco não vira sessão anônima silenciosa. Query/body não podem trocar owner. IDs inválidos não chegam ao SQL. API não roda com usuário dono do schema. Segredos ficam apenas em env do servidor. Banco previamente migrado manualmente requer procedimento explícito, sem marcar migrações automaticamente. Cadastro de lixeira/telemetria ficam nas APP-08/10.
