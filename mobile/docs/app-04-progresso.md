# Execução — mobile/docs/app-04-plano.md

Base: 73b47ad. Execução autorizada em 22/10/2026, no workspace atual conforme o plano existente.

## Decisões e sequência

- Manter o escopo e os contratos do plano APP-04 já apresentado e autorizado.
- Testes HTTP → configuração/rotas → PostgreSQL/sessões reais → migrações/permissões → revisão final.
- As migrações 0001/0002 permanecem intactas; o runner removerá somente o envelope externo BEGIN/COMMIT para registrar checksum e SQL na mesma transação.
- Sessões nesta etapa não são renovadas nas consultas; login e renovação pública pertencem à APP-05.
- Testes usam cluster PostgreSQL efêmero próprio e não leem DATABASE_URL do ambiente de uso.

## Progresso

- Testes HTTP e configuração escritos antes da implementação.
- 11 testes HTTP passaram após falhas observadas com rotas vazias.
- Sessões reais, permissões, checksum, rollback e concorrência passaram no PostgreSQL 17 temporário.
- Listagem/detalhes/edição falharam com repositório vazio e passaram após implementação SQL parametrizada.
- Ajustes de testes: inicialização Better Auth somente após migrações; regressão SQL usa banco vazio separado pois suas contagens assumem ausência de fixtures HTTP.
- Mobile: 16 testes, typecheck e lint passaram no baseline.

## Conclusão e revisão — 26/10/2026

- 12 testes HTTP/configuração passaram; 11 testes de integração PostgreSQL passaram; regressão SQL original passou em banco separado.
- Typecheck e build da API passaram. Nenhum Neon/Firebase remoto foi alterado.
- Revisão independente sem achados críticos, com três achados importantes reproduzidos por testes antes das correções:
  - Checksum CRLF/LF: falhou na troca de quebras; passou após normalização UTF-8/LF e política `.gitattributes`.
  - Grants excedentes: guarda aceitava leitura de hashes; agora rejeita permissões efetivas de tabela/coluna fora do escopo e associação administrativa.
  - TLS: parâmetro `host` podia sobrescrever destino local; validação agora rejeita parâmetros de sobrescrita e também é aplicada pelo pool.
- Sugestão menor adiada: afirmar explicitamente os campos do corpo retornado pelo PATCH no teste de integração. O teste atual verifica status e persistência; a revisão confirmou o uso correto de RETURNING para o corpo.
- Escopo mantido após revisão: login público/Expo/renovação ficam na APP-05; OTP/perfil na APP-06; provisionamento/telemetria nas APP-08/10; implantação no Neon não faz parte desta entrega. As migrações futuras continuam sendo SQL administrativo confiável, com proibição documentada de comandos internos de transação.
- Implementação inicialmente mantida local para revisão; publicação no GitHub autorizada pelo usuário em seguida. Kanban remoto não alterado nesta entrega.
