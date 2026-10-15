# Dados da API — APP-03

Modelo completo: [modelagem de dados](../mobile/docs/app-03-modelagem-dados.md).

Esta pasta contém migrações PostgreSQL e testes de integridade. Ainda não contém servidor HTTP nem integração executada com Better Auth. Nenhuma migração é aplicada automaticamente ao iniciar o aplicativo.

## Aplicação em banco vazio

Usar PostgreSQL 17 ou posterior. Selecionar um banco/branch de desenvolvimento vazio e executar em ordem:

1. `migrations/0001_auth.sql`
2. `migrations/0002_bins.sql`

Cada arquivo abre sua própria transação. Uma falha desfaz aquele arquivo; o arquivo anterior permanece aplicado. Nunca executar novamente um arquivo já aplicado. Os arquivos falham em objetos existentes para evitar esconder divergências. O runner versionado com controle de checksum/lock será adicionado na APP-04 antes de implantação automatizada.

No SQL Editor do Neon, conferir projeto e branch antes de colar cada arquivo. Não colocar URL de conexão ou senha em documentação, no aplicativo ou no histórico do shell. A aplicação remota não faz parte da validação local desta entrega.

`0001_auth.sql` é um baseline manual do core documentado do Better Auth, não SQL gerado por uma versão instalada. Na APP-05, fixar a versão e os plugins e comparar o resultado de `auth generate`; registrar qualquer diferença em nova migração. Não ativar login antes desse check e dos testes reais.

## Teste isolado no Windows

Requer binários PostgreSQL no PATH (psql, initdb e pg_ctl no mesmo diretório):

```powershell
powershell -NoProfile -File api/tests/run-schema.ps1
```

O script cria um cluster temporário próprio, escuta apenas em `127.0.0.1:55439`, aplica ambas as migrações e executa `tests/schema.sql`. Não lê DATABASE_URL nem conecta ao PostgreSQL/Neon já configurado. Autenticação trust é usada somente neste cluster local efêmero; ele é encerrado ao final, inclusive em falha. Logs e dados temporários são mantidos no diretório informado para diagnóstico. Uma porta ocupada causa falha; outra pode ser passada com `-Port`.

Os testes usam transação com rollback e não deixam usuários ou leituras fictícias no banco. Não execute o SQL de testes em produção.
