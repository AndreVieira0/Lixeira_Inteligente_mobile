# firebase

## Autenticação e perfis

As regras executáveis estão em `firestore/firestore.rules`, com configuração de
emuladores em `firebase.json`. Cada usuário acessa apenas `users/{seuUid}`; nomes,
e-mails e datas são validados. Coleções de lixeiras continuam bloqueadas até a
implementação de suas permissões. O CRUD e o fluxo estão documentados em
[`mobile/docs/autenticacao.md`](../mobile/docs/autenticacao.md).

Não foi publicado um backend de produção automaticamente. Para ativar o acesso real,
siga a configuração de Authentication, Firestore e variáveis descrita no documento.

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
