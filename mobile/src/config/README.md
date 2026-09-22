# config

Configuração de ambiente e inicialização.

- Leitura/tipagem de variáveis de ambiente (`.env.*` via `EXPO_PUBLIC_`)
- Inicialização do Firebase (a partir de `services/firebase`)
- Bootstrap da aplicação (metadados, ambiente ativo)

Prefira acessar configuração através de módulos desta pasta — o resto do código não deve
ler `process.env` diretamente.
