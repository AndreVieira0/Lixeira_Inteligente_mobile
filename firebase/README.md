# firebase

Infraestrutura **Firebase** do projeto (Authentication, Cloud Firestore e Cloud
Messaging), conforme seções 12 e 23.1 (`plano_dev.md` — Etapa 5).

## Finalidade

Preparar o backend para receber os dispositivos:

- **Authentication** — cadastro, login, recuperação de acesso e controle de sessão.
- **Cloud Firestore** — dados estruturados (usuários, lixeiras, medições),
  com regras de segurança (autorização por proprietário/usuários associados).
- **Cloud Messaging** — notificações push nos níveis configurados (80% / 100%).

## Estrutura

```
firebase/
├── firestore/     # estrutura de dados e regras de segurança (.rules)
└── README.md
```

## Modelo de dados de referência (plano_dev.md, seção 12.2)

- `users/{userId}` → `nome`, `email`
- `bins/{binId}` → `nome`, `local`, `ownerId`, `currentLevel`, `status`, `lastUpdate`
- `measurements/{measurementId}` → `binId`, `level`, `timestamp`

Credenciais e variáveis de ambiente **nunca** devem ser commitadas; o app mobile lê
via `EXPO_PUBLIC_*` (veja `mobile/.env.example`).