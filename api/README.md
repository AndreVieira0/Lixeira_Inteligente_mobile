# API — APP-04

API Hono/TypeScript com PostgreSQL e validação de sessão pelo Better Auth. Node 22.19+ e PostgreSQL 17+. Dependências e lockfile fixados. Bootstrap Node separado de `createApp` para permitir adaptar a hospedagem.

## Executar

```powershell
cd api
npm ci
Copy-Item .env.example .env
# Preencher .env localmente e provisionar os dois logins descritos abaixo.
npm run migrate
npm run dev
```

Para produção: `npm run build` e `npm start`, com HTTPS na plataforma/proxy. A implantação deve incluir `dist/`; para migrar, incluir também `migrations/` e as ferramentas do comando `migrate`. O servidor não aplica migrações automaticamente. Neon remoto e hospedagem não foram provisionados nesta entrega.

## Ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL privado, login de execução membro de `lixeira_api` |
| `MIGRATION_DATABASE_URL` | Somente comando de migrações; conexão administrativa dedicada |
| `BETTER_AUTH_SECRET` | Segredo aleatório de pelo menos 32 caracteres; mesmo segredo da emissão das sessões na APP-05 |
| `BETTER_AUTH_URL` | Origem fixa da API sem caminho/barra final; HTTPS, exceto desenvolvimento local |
| `ALLOWED_ORIGINS` | Origens exatas separadas por vírgula, sem caminhos/curingas |
| `PORT` | Porta HTTP, padrão 3000 |
| `NODE_ENV` | `production` exige HTTPS nas origens web |

Nunca colocar essas credenciais em `EXPO_PUBLIC_*`. O processo implantado não deve receber a URL administrativa. Conexões PostgreSQL remotas verificam certificado TLS. Pool: cinco conexões, timeout de conexão de 5 s e de consultas de 10 s no servidor. Logs de falha contêm apenas código e requestId, sem cookies, SQL ou credenciais.

## Migrações e permissões

`0001_auth.sql` e `0002_bins.sql` foram preservados. `0003_api_role.sql` adiciona o grupo `lixeira_api` sem login, permissões mínimas e índice de paginação. Modelo: [APP-03](../mobile/docs/app-03-modelagem-dados.md).

O runner adquire advisory lock, verifica ordem e SHA-256 do SQL UTF-8 com quebras normalizadas em LF e aplica cada migração com seu registro em `app_meta.migrations` na mesma transação. `.gitattributes` também mantém LF nos arquivos SQL. Repetir não reaplica SQL; arquivo alterado/ausente ou inserido antes dos já aplicados causa falha. Uma falha desfaz aquela migração, preservando as anteriores. Não editar arquivos já aplicados; adicionar arquivo numerado com envelope externo `BEGIN; ... COMMIT;`, sem comandos internos de controle de transação. Migrações são código administrativo confiável.

URLs PostgreSQL aceitam somente `sslmode` e `channel_binding` como parâmetros adicionais. Destino e credenciais devem estar na parte principal da URL; parâmetros como `host` e `ssl` são rejeitados para impedir sobrescrita das validações de TLS. O bootstrap também verifica permissões efetivas de tabela/coluna, incluindo grants herdados, e rejeita acessos além do escopo APP-04. Evoluções de autenticação e telemetria devem ampliar grants e essa verificação em conjunto.

Banco anteriormente migrado manualmente não é adotado automaticamente. Para testes descartáveis, usar banco/branch vazio. Havendo dados a preservar, fazer backup, comparar o schema real e revisar uma adoção explícita antes de registrar versões. Não apagar dados nem marcar versões automaticamente para contornar divergências.

A migração pressupõe banco privado desta aplicação: remove `CREATE` de `PUBLIC` no schema `public`. Provisionar um login separado, sem privilégios administrativos, e conceder o grupo com herança. Exemplo sem credenciais:

```sql
CREATE ROLE lixeira_runtime LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT lixeira_api TO lixeira_runtime;
-- Configurar a senha por canal seguro antes do uso remoto.
```

O bootstrap rejeita proprietário de schema/tabelas e roles administrativas. A role pode ler usuário/sessão, excluir sessões expiradas (comportamento do SDK), ler lixeiras/estado e alterar somente nome/localização. Não pode executar DDL, ler hashes de senha/credenciais do dispositivo ou inserir telemetria. Não conceder roles administrativas ao login. O isolamento entre contas é aplicado nas consultas da API; não há RLS por usuário. Nunca entregar esse login ao mobile/ESP32 nem publicar o schema via Data API.

## Contratos HTTP

Todas as respostas têm `X-Request-Id` gerado no servidor e `Cache-Control: no-store`.

| Método e rota | Resposta |
| --- | --- |
| `GET /health` | Público: `{ "status": "ok" }`; liveness sem consultar banco |
| `GET /v1/me` | `{ id, name, email, emailVerified }` |
| `GET /v1/bins?limit=50&after=<uuid>` | `{ items: Bin[], nextCursor: string ou null }` |
| `GET /v1/bins/:id` | `Bin`; 404 também quando pertence a outra conta |
| `PATCH /v1/bins/:id` | `Bin` atualizado; corpo com `name` e/ou `location` |

`Bin`: `id`, `deviceId`, `name`, `location`, `disabledAt`, `levelPercent`, `batteryPercent`, `measuredAt`, `receivedAt`, `lastSeenAt`. Datas UTC ISO 8601; nível/bateria são números ou `null`. Ausência de leitura não vira 0%. A view preserva a leitura mais recente por horário medido, mesmo se evento antigo chega depois.

Lista ordenada por UUID ascendente; limite 1–100 (padrão 50); cursor exclusivo `after`. Paginação não representa fotografia transacional entre requisições; refazer a primeira página para atualizar a lista. Parâmetros desconhecidos/repetidos são rejeitados. A conta vem exclusivamente da sessão.

PATCH exige `Content-Type: application/json`, corpo até 8 KiB e ao menos um campo permitido. Nome: 1–80 caracteres; localização: até 100, vazio ou `null` limpa o campo. Espaços são normalizados. Campos desconhecidos, IDs inválidos, `ownerId` e `deviceId` são rejeitados. A propriedade faz parte do predicado do `UPDATE`.

Erro padronizado:

```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Entre na sua conta para continuar.", "requestId": "uuid" } }
```

| HTTP | Código |
| --- | --- |
| 400 | `INVALID_INPUT` |
| 401 | `UNAUTHENTICATED` |
| 403 | `ORIGIN_FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 503 | `SERVICE_UNAVAILABLE` (banco/sessão indisponível) |
| 500 | `INTERNAL_ERROR` |

## Sessão e CORS

O SDK verifica o cookie assinado e consulta o banco por requisição. Cookie cache e renovação nas consultas estão desabilitados; expiração/revogação têm efeito imediato. Não há assinatura artesanal nem autenticação por userId/token avulso. `/api/auth/*` ainda não é exposto: emissão pública, persistência Expo e renovação pertencem à APP-05.

Origens web autorizadas recebem CORS com credenciais. Origem desconhecida é rejeitada, inclusive `null`. PATCH exige `Origin` autorizado; no nativo, enviar o scheme configurado, por exemplo `lixeira-inteligente://`. GET nativo pode omitir `Origin`, mas exige cookie válido. Preflight é público. Integração do plugin Expo e validação em aparelho ficam na APP-05.

## Testar

```powershell
npm test
npm run typecheck
npm run build
powershell -NoProfile -File tests/run-integration.ps1
```

O último comando requer `psql`, `initdb` e `pg_ctl` no PATH. Cria cluster efêmero em diretório temporário, escuta somente em `127.0.0.1:55440`, usa trust somente nesse cluster e encerra em `finally`. Não lê URLs de banco do projeto. Preserva logs/dados temporários para diagnóstico. `-Port` escolhe outra porta; porta ocupada causa falha.

Testes integram cookies emitidos pelo SDK, PostgreSQL real e role restrita: contas isoladas, paginação, edição, sessão falsa/expirada/revogada, falha do banco, null/números/datas, checksum, rollback, concorrência e recusa de baseline manual. A suíte SQL anterior roda em banco vazio separado no mesmo cluster. `npm run test:integration` sozinho exige `API_TEST_PORT` do harness, sem fallback para `DATABASE_URL`.

Better Auth core fixado em 1.7.12, exercitado com sessões reais. Na APP-05, comparar também o SQL gerado com os plugins Expo/Email OTP escolhidos antes de ativar cadastro/login públicos. Implantação remota permanece pendente.

Referências: [integração Hono](https://better-auth.com/docs/integrations/hono), [sessões Better Auth](https://better-auth.com/docs/concepts/session-management).
