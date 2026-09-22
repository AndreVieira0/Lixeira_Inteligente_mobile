# services

Comunicação com Firebase e APIs externas.

- `firebase/` — inicialização do Firebase e módulos (auth, firestore, messaging)
- Demais serviços externos (ex.: push, cameras, geolocation) quando necessários

Serviços expõem funções tipadas e isolam o SDK externo do restante da aplicação —
ninguém fora de `services` deve importar o SDK do Firebase diretamente.
