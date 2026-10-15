# Lixeira Inteligente — escopo e arquitetura inicial

Data: 13 de outubro de 2026.

Status: consolidação da conversa e proposta inicial. Este documento não representa uma migração já executada. As integrações existentes com Firebase continuam no código até sua substituição.

Detalhamento da APP-01: [arquitetura, autenticação e hospedagem](./app-01-arquitetura-servicos.md). A proposta pesquisada é Hono/TypeScript em Neon Functions, Better Auth com integração Expo e PostgreSQL no Neon. A recuperação usará OTP de seis dígitos, com entrega por e-mail proposta via Brevo para o piloto sem domínio próprio, sujeita à validação. O usuário confirmou que só existem dados de teste no Firebase, portanto não há migração de contas reais no escopo.

## 1. Objetivo

Criar um aplicativo simples para consultar a ocupação de uma lixeira e identificar quando ela precisa de coleta. O aplicativo também apresentará informações do dispositivo, como última comunicação e bateria, quando o hardware fornecer essa medição.

O primeiro dispositivo ficará na coordenação da faculdade, em um ambiente real. O projeto deve permitir evolução para uso comercial, sem incluir agora a complexidade de uma plataforma de gestão de equipes.

## 2. Decisões e limites do primeiro escopo

- O primeiro uso terá uma lixeira física, mas uma conta poderá cadastrar várias lixeiras.
- Cadastrar mais lixeiras será uma possibilidade, não uma etapa obrigatória para usar o aplicativo.
- Como proposta inicial, cada lixeira ficará vinculada a uma única conta. Compartilhamento entre contas será uma evolução futura.
- Quem acompanha o dispositivo e quem realiza a coleta utilizarão o mesmo fluxo de consulta. Não haverá perfis separados de gestor e coletor nesta etapa.
- O coletor consultará quais lixeiras precisam de coleta; não precisará registrar manualmente o esvaziamento.
- Após o esvaziamento, novas leituras do sensor atualizarão o nível apresentado. Isso não equivale a implementar um registro formal de eventos de coleta.
- O sistema deve considerar operação contínua em ambiente real. O número futuro de dispositivos ainda não está definido.
- A intenção do usuário é retirar o Firebase, incluindo a autenticação, e utilizar PostgreSQL no Neon.

## 3. Funcionalidades iniciais

### Conta

- Criar conta, entrar e sair.
- Recuperar acesso.
- Consultar e editar os dados básicos do perfil.
- Preservar a sessão conforme a solução de autenticação escolhida.
- Considerar o fluxo de exclusão de conta já existente ao planejar a migração, incluindo o destino das vinculações dos dispositivos.

### Lixeiras

- Listar as lixeiras vinculadas à conta.
- Adicionar e dar nome a uma lixeira.
- Consultar ocupação atual e indicação de necessidade de coleta.
- Consultar última atualização e situação de comunicação.
- Mostrar bateria somente quando houver uma medição válida fornecida pelo hardware.
- Consultar um histórico simples de ocupação, como complemento da tela de detalhes.
- Configurar ou alterar a rede Wi-Fi do dispositivo.

### Confiabilidade da informação

- Diferenciar uma leitura atual de uma leitura antiga.
- Sinalizar ausência de comunicação após um intervalo a definir.
- Não interpretar ausência de leitura como ocupação de 0%.
- Não apresentar bateria fictícia ou inferida apenas por o dispositivo estar conectado.
- Prever carregamento, lista vazia, falha de comunicação e opção de tentar novamente.

## 4. Estrutura das telas

| Tela | Conteúdo e ações |
| --- | --- |
| Entrar | E-mail, senha, acesso ao cadastro e recuperação de senha |
| Criar conta | Dados básicos e credenciais |
| Recuperar acesso | Informar e-mail, receber OTP de seis dígitos e definir nova senha no aplicativo |
| Minhas lixeiras | Lista com nome, ocupação, indicação de coleta e última atualização; acesso a adicionar lixeira e perfil |
| Detalhes da lixeira | Ocupação, situação de comunicação, última leitura, bateria quando disponível e histórico simples |
| Adicionar lixeira | Orientações de configuração do ESP32, conexão à rede local, vinculação e nome do dispositivo |
| Configurações da lixeira | Edição do nome e alteração do Wi-Fi |
| Minha conta | Dados do usuário e ações da conta |

A tela **Minhas lixeiras** será a página inicial após o login. Não haverá um dashboard separado nesta etapa. Ela deve funcionar bem tanto com um único dispositivo quanto com vários.

```text
Entrar / Criar conta / Recuperar acesso
                 ↓
          Minhas lixeiras
            ├── Detalhes da lixeira
            │     ├── Histórico simples
            │     └── Configurações da lixeira
            ├── Adicionar lixeira
            └── Minha conta
```

O histórico pode ser uma seção da tela de detalhes, sem exigir uma tela independente.

## 5. Comunicação entre dispositivo e aplicativo

```text
Sensor → ESP32 → Wi-Fi do local → API → PostgreSQL no Neon
                                  ↑
                            Aplicativo Expo
```

1. O sensor mede a distância até a superfície dos resíduos.
2. O ESP32 processa a leitura e calcula a ocupação conforme a calibração da lixeira.
3. O ESP32 envia os dados pela internet para a API.
4. A API autentica o dispositivo, valida a medição e armazena os dados.
5. O aplicativo consulta a API usando a sessão do usuário.
6. A API retorna somente as lixeiras que a conta pode acessar.

Depois da instalação, o celular não precisa estar na mesma rede Wi-Fi da lixeira. O acesso remoto depende da conexão do dispositivo e do aplicativo à internet.

As credenciais do banco ficam no servidor. O aplicativo e o ESP32 não recebem a senha de acesso ao PostgreSQL.

## 6. Cadastro e configuração de uma lixeira

Fluxo proposto, alinhado ao planejamento existente, sem QR Code:

1. O usuário entra na conta e escolhe **Adicionar lixeira**.
2. Ativa o modo de configuração do ESP32 por um botão físico.
3. O ESP32 disponibiliza uma rede Wi-Fi temporária.
4. O usuário conecta o celular a essa rede, seguindo as orientações do aplicativo.
5. Informa a rede Wi-Fi do local e sua senha para o dispositivo.
6. O ESP32 conecta à internet e se comunica com a API.
7. O sistema confirma a vinculação à conta.
8. O usuário define um nome, como “Lixeira da coordenação”.

O identificador do dispositivo permanece o mesmo quando seu nome, local ou rede Wi-Fi mudar.

A implementação deve comprovar acesso ao dispositivo durante a vinculação. Conhecer apenas um identificador público não deve permitir assumir uma lixeira. O mecanismo exato de comprovação e o protocolo de comunicação local ainda serão definidos.

As credenciais do Wi-Fi devem ser tratadas no fluxo de configuração do dispositivo, sem aparecer em logs ou serem armazenadas como dados comuns da conta no backend.

## 7. Arquitetura de software proposta

Modelo SQL e diagrama da APP-03: [modelagem de dados](./app-03-modelagem-dados.md). Migrações em `api/migrations/`; validação local isolada, sem aplicação remota automática.

### Aplicativo

Manter **React Native com Expo e TypeScript**, aproveitando a base existente.

| Parte | Responsabilidade |
| --- | --- |
| Telas | Apresentar informações e receber ações do usuário |
| Componentes | Elementos reutilizáveis de interface |
| Navegação | Fluxos de autenticação, lista, detalhes e configuração |
| Hooks e estado | Coordenar consultas, sessão e estados da interface |
| Serviços | Comunicação com a API e, durante a configuração, com o dispositivo |
| Tipos e utilitários | Contratos de dados, validações e formatação |

As telas não devem acessar diretamente o banco. Dados demonstrativos devem continuar claramente separados dos dados reais.

### API

Utilizar uma única API em TypeScript, organizada por responsabilidade, sem microserviços nesta etapa:

- Contas e integração com autenticação.
- Cadastro e vinculação de lixeiras.
- Autorização de acesso por conta.
- Recebimento e validação de medições.
- Consulta do estado atual e histórico.
- Regras de indicação de coleta e leitura desatualizada.

Framework, hospedagem e solução de autenticação ainda precisam ser definidos. A API integrará a solução escolhida; não se pressupõe criar um sistema próprio de senhas do zero.

### Banco

Utilizar **PostgreSQL no Neon** como direção proposta para substituir o Firestore.

Modelo conceitual inicial:

| Entidade | Finalidade |
| --- | --- |
| Usuário / perfil | Identidade e dados básicos, relacionados ao provedor de autenticação |
| Lixeira | Identificador estável, conta responsável, nome e configurações |
| Estado atual | Última ocupação válida, horário de comunicação e bateria opcional |
| Medição | Histórico de leituras associado à lixeira |
| Credencial de dispositivo | Autenticação individual do ESP32, com armazenamento e revogação adequados |

Relações principais: **uma conta possui várias lixeiras; uma lixeira possui várias medições**. A separação entre estado atual e histórico é lógica; a definição das tabelas será feita no desenho do banco.

## 8. Medições e indicação de coleta

- O sensor poderá medir com maior frequência do que o ESP32 envia dados.
- Como proposta, enviar periodicamente e também quando houver mudança relevante, com limites para evitar excesso de transmissões.
- Manter uma comunicação periódica mesmo sem mudança de nível, permitindo distinguir nível estável de dispositivo sem comunicação.
- Filtrar leituras inconsistentes antes de alterar a indicação apresentada ao usuário.
- Ao esvaziar a lixeira, a ocupação deve cair conforme as novas leituras válidas.
- Definir nos testes o percentual para indicar necessidade de coleta e o tratamento de oscilações próximo desse limite.

Os limites de 80% e 100% aparecem no planejamento anterior, mas não ficam aprovados automaticamente como regra final deste escopo simplificado.

Para o aplicativo, a proposta inicial é consultar periodicamente enquanto a tela estiver em uso e permitir atualização manual. O intervalo será definido junto com a frequência de envio do ESP32.

## 9. Custos e operação real

A preferência é iniciar sem custo, usando planos gratuitos. Isso é uma restrição de planejamento, não uma garantia de gratuidade permanente.

Tanto Firebase quanto Neon possuem opções gratuitas e pagas. Na consulta realizada durante esta conversa, o Neon Free anunciava 1 GB de armazenamento e 100 CU-horas mensais por projeto, sem exigir cartão. Os limites devem ser conferidos novamente antes da implantação.

Envios frequentes podem manter o banco ativo; o histórico cresce com o número de dispositivos e medições. Também devem ser considerados autenticação, hospedagem da API e recuperação de senha por e-mail.

Antes da operação contínua, definir:

- Frequência de medição, transmissão e consulta.
- Prazo de retenção das leituras detalhadas.
- Possibilidade de resumir leituras antigas para preservar histórico com menos armazenamento.
- Acompanhamento do consumo das franquias gratuitas.
- Comportamento do sistema quando um serviço estiver indisponível ou atingir seus limites.

Referências consultadas:

- [Planos do Neon](https://neon.com/pricing)
- [Planos do Firebase](https://firebase.google.com/pricing)
- [Documentação do Neon](https://neon.com/docs/introduction)

## 10. Situação do código existente

O repositório já contém:

- Aplicativo Expo com TypeScript.
- Fluxos de autenticação e perfil implementados com Firebase.
- Dashboard demonstrativo com dados ilustrativos.
- Estrutura de pastas para componentes, navegação, serviços e tipos.

Na inspeção realizada, o fluxo autenticado real abre o perfil, enquanto o dashboard está no fluxo de demonstração.

A retirada do Firebase exige substituir autenticação, persistência de perfil e testes relacionados. A arquitetura descrita aqui ainda não foi implementada e o Firebase não foi removido por este documento.

Este documento consolida o escopo mobile discutido e reduz a proposta inicial do `plano_dev.md`. Os recursos mais amplos daquele plano não entram automaticamente nesta primeira entrega.

## 11. Evoluções futuras

- Compartilhar uma lixeira entre contas.
- Equipes e permissões específicas.
- Notificações push.
- Registro formal e análise de coletas.
- Mapas e rotas.
- Relatórios e previsão de enchimento.
- Recursos comerciais conforme validação do uso real.

Esses recursos não são necessários para validar a primeira lixeira na coordenação.

## 12. Pontos técnicos a resolver antes da implementação correspondente

| Ponto | Decisão necessária |
| --- | --- |
| Autenticação | Escolher substituto do Firebase e validar compatibilidade com Expo, sessão e recuperação de senha |
| Hospedagem | Escolher onde executar a API e conferir limites gratuitos |
| Configuração Wi-Fi | Validar comunicação do celular com a rede temporária do ESP32 e requisitos nativos |
| Vinculação | Definir prova de acesso físico, credenciais e tratamento de dispositivo já vinculado |
| Alimentação | Confirmar se haverá bateria e circuito para medir sua carga |
| Calibração | Definir parâmetros para converter distância em ocupação |
| Atualizações | Definir intervalos de envio, consulta e detecção de ausência de comunicação |
| Coleta | Definir limiar e tratamento de oscilações do sensor |
| Histórico | Definir período exibido, retenção e agregações |
| Migração | Confirmado: apenas testes no Firebase; iniciar novas contas de teste sem migrar contas reais |

## 13. Critérios de sucesso da primeira entrega

- O usuário consegue criar conta e acessar o aplicativo.
- Consegue vincular e nomear a lixeira da coordenação.
- A estrutura permite adicionar outra lixeira à mesma conta.
- O ESP32 envia medições reais pela rede Wi-Fi do local.
- O aplicativo mostra ocupação, última atualização e indicação de coleta.
- Após o esvaziamento, novas leituras atualizam a ocupação sem registro manual.
- A interface distingue dados desatualizados de dados atuais.
- Cada conta acessa somente suas lixeiras.
- Bateria só aparece quando houver suporte real de medição.
- O acompanhamento funciona com o celular em outra rede.

## 14. Sequência proposta de trabalho

1. Revisar este escopo e resolver as escolhas de autenticação e hospedagem.
2. Definir contratos da API, modelo do banco e protocolo de vinculação.
3. Estruturar navegação, telas e componentes com estados demonstrativos identificados.
4. Substituir a integração Firebase e conectar conta e lixeiras à nova API.
5. Integrar configuração Wi-Fi e envio de medições do ESP32.
6. Validar o fluxo completo com a lixeira da coordenação, incluindo esvaziamento e perda de conexão.
7. Ajustar frequência de atualização, histórico e consumo com base no uso real.
