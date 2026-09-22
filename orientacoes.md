Contexto: Estou iniciando o app mobile do projeto "Lixeira Inteligente" (IoT: ESP32 + HC-SR04 + Firebase + React Native). Este NÃO é um MVP descartável — é a aplicação definitiva do projeto, que será mantida e evoluída ao longo do tempo. Por isso, quero que a estruturação inicial já siga boas práticas de arquitetura escalável e organização profissional, mesmo que por enquanto eu queira APENAS a estruturação do projeto: instalação da stack e organização de pastas. Não crie telas, componentes com conteúdo, lógica de negócio, navegação configurada ou qualquer integração funcional ainda — isso vem depois, em etapas futuras.

Stack a instalar:
- React Native via Expo (com TypeScript habilitado desde o início — não usar JavaScript puro, já que é uma aplicação definitiva e a tipagem evita problemas de manutenção futura)
- React Navigation (apenas instalar as libs necessárias, sem configurar rotas ainda)
- Firebase SDK (Authentication, Firestore, Cloud Messaging) — apenas instalar, sem criar configuração ou conectar a nenhum projeto Firebase real
- ESLint + Prettier com configuração rigorosa (regras de boas práticas, não apenas o básico)
- Husky + lint-staged (para garantir que lint/format rodem antes de cada commit)
- Suporte a múltiplos ambientes (.env.development, .env.production, .env.example — sem valores reais)

Estrutura de pastas a criar (pensada para escalar, todas vazias exceto por um README.md indicando a finalidade de cada uma):

/mobile
├── src/
│   ├── screens/          # Telas da aplicação, organizadas por domínio (auth/, dashboard/, bin/, etc.)
│   ├── components/       # Componentes reutilizáveis (common/, forms/, etc.)
│   ├── services/         # Comunicação com Firebase e APIs externas
│   ├── navigation/       # Configuração de rotas e stacks
│   ├── hooks/            # Custom hooks
│   ├── contexts/         # Context API (estado global: auth, usuário, etc.)
│   ├── types/            # Tipagens TypeScript compartilhadas
│   ├── constants/        # Constantes da aplicação (cores, enums, limites de notificação, etc.)
│   ├── utils/             # Funções utilitárias puras
│   └── config/            # Configuração de ambiente e inicialização (firebase, etc.)
├── .env.example
├── tsconfig.json
└── README.md

Convenções a documentar no README.md principal:
- Padrão de nomenclatura de arquivos e componentes
- Onde cada tipo de código deve ficar (screens vs components vs services)
- Como rodar o projeto em desenvolvimento

Configuração de versionamento:
- Inicializar repositório Git (se ainda não existir)
- Criar .gitignore adequado para projetos React Native/Expo/TypeScript (node_modules, .env*, build, .expo, etc.)
- Sugerir uma convenção de commits (ex: Conventional Commits), documentada no README

O que EU NÃO QUERO que você faça:
- Não criar nenhuma tela, componente ou hook com conteúdo/lógica
- Não configurar rotas de navegação
- Não conectar a um projeto Firebase real
- Não implementar nenhuma funcionalidade do produto
- Não instalar bibliotecas além das listadas acima, sem antes me perguntar

Ao final, me entregue:
1. Confirmação de que o projeto roda localmente (comando de start)
2. Estrutura de pastas final, em formato de árvore
3. Lista de dependências instaladas e suas versões
4. Um resumo das convenções definidas para o projeto