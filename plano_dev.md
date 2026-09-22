# Lixeira Inteligente
## Plano de Desenvolvimento do Projeto
**ESP32 • HC-SR04 • Firebase • React Native**

**Alunos:**
- João Italo Cardoso Lima — 2315709
- André Lima Vieira — 2214650

**Orientadora:**
Laldiane de Souza Pinheiro

*Documento de planejamento e especificação*

---

## 1. Visão geral

A Lixeira Inteligente é um sistema de Internet das Coisas (IoT) desenvolvido para monitorar o nível de preenchimento de lixeiras e disponibilizar essas informações em uma aplicação mobile. O sistema combina um sensor ultrassônico, um ESP32, conectividade Wi-Fi e serviços em nuvem para permitir o acompanhamento remoto.

O projeto será desenvolvido inicialmente como um protótipo funcional, com arquitetura preparada para trabalhar com múltiplas lixeiras e múltiplos usuários. Cada lixeira terá uma identificação própria, independente da rede Wi-Fi e da localização física.

---

## 2. Problema

A coleta de resíduos pode ser realizada seguindo horários e rotas previamente definidos, sem considerar o nível real de preenchimento de cada lixeira. Esse modelo dificulta a identificação das lixeiras que realmente necessitam de coleta e pode gerar deslocamentos desnecessários ou permitir que uma lixeira permaneça cheia por mais tempo do que o adequado.

- Falta de informação em tempo real sobre o nível das lixeiras.
- Coletas que podem ocorrer antes de uma lixeira atingir níveis elevados de ocupação.
- Dificuldade para identificar e priorizar lixeiras próximas da capacidade máxima.
- Possibilidade de transbordamento quando a coleta não ocorre no momento adequado.
- Ausência de histórico para analisar o comportamento de preenchimento.

---

## 3. Solução

A solução consiste em instalar um sensor ultrassônico HC-SR04 na parte superior da lixeira e conectá-lo a um ESP32. O sensor realizará medições da distância até a superfície dos resíduos. O ESP32 processará essas medições, estimará o percentual de ocupação e enviará os dados para o Firebase por meio de uma conexão Wi-Fi.

O aplicativo desenvolvido em React Native permitirá cadastrar e acompanhar uma ou mais lixeiras, visualizar o nível atual e o histórico, configurar notificações e consultar uma recomendação de prioridade de coleta.

---

## 4. Objetivo geral

Desenvolver um protótipo de lixeira inteligente capaz de monitorar seu nível de ocupação, transmitir os dados pela internet e disponibilizar essas informações em uma aplicação mobile, permitindo acompanhamento remoto, notificações e recomendações de prioridade de coleta.

---

## 5. Objetivos específicos

1. Desenvolver a montagem eletrônica do protótipo com ESP32 e sensor ultrassônico.
2. Programar o ESP32 para realizar leituras periódicas do nível de preenchimento.
3. Calibrar o sensor de acordo com as dimensões úteis da lixeira.
4. Converter a distância medida em uma porcentagem estimada de ocupação.
5. Conectar o ESP32 à internet por meio de uma rede Wi-Fi.
6. Criar uma estrutura no Firebase para usuários, lixeiras, configurações e medições.
7. Implementar autenticação de usuários.
8. Desenvolver o aplicativo mobile em React Native.
9. Permitir o cadastro e gerenciamento de múltiplas lixeiras.
10. Implementar a configuração inicial da rede Wi-Fi da lixeira.
11. Permitir a alteração da rede Wi-Fi quando a lixeira for deslocada para outro local.
12. Implementar notificações configuráveis para os níveis de 80% e 100%.
13. Permitir múltiplos usuários associados a uma mesma lixeira.
14. Criar histórico das medições e visualização do nível de preenchimento.
15. Criar uma regra de prioridade/recomendação de coleta baseada nos dados disponíveis.
16. Realizar testes em ambiente controlado e posteriormente em ambiente real.

---

## 6. Escopo do MVP

A primeira versão funcional terá como foco demonstrar o funcionamento completo do sistema, desde a medição física até a visualização no aplicativo.

- ESP32 conectado ao sensor HC-SR04.
- Medição e cálculo do nível de ocupação.
- Conexão Wi-Fi e transmissão dos dados pela internet.
- Firebase como infraestrutura de backend e armazenamento.
- Aplicativo mobile desenvolvido em React Native.
- Cadastro e autenticação de usuários.
- Cadastro e gerenciamento de múltiplas lixeiras.
- Configuração inicial do Wi-Fi da lixeira.
- Alteração da rede Wi-Fi posteriormente.
- Monitoramento remoto do nível.
- Histórico das medições.
- Notificações configuráveis em 80% e 100%.
- Suporte a múltiplos usuários por lixeira.
- Recomendação/prioridade de coleta.

---

## 7. Arquitetura do sistema

O sistema será dividido em quatro componentes principais: dispositivo IoT, infraestrutura Firebase, aplicação mobile e regras de negócio.

LIXEIRA
│
▼
┌─────────────┐
│ HC-SR04 │
└──────┬──────┘
│
┌──────▼──────┐
│ ESP32 │
└──────┬──────┘
│
Wi-Fi / Internet
│
▼
┌───────────────┐
│ FIREBASE │
│ Authentication │
│ Firestore │
│ FCM │
└───────┬────────┘
│
Internet
│
▼
┌────────────────┐
│ REACT NATIVE │
│ Dashboard │
│ Lixeiras │
│ Histórico │
│ Notificações │
│ Configurações │
└────────────────┘


---

## 8. Hardware

### 8.1 ESP32

O ESP32 será responsável pelo processamento das leituras, gerenciamento do sensor, conexão Wi-Fi e comunicação com o Firebase. Cada dispositivo deverá possuir uma identificação única.

### 8.2 HC-SR04

O HC-SR04 será utilizado para medir a distância entre a parte superior da lixeira e a superfície dos resíduos. A distância será convertida em uma estimativa de ocupação.

- Instalação em posição fixa.
- Medição da altura útil da lixeira para calibração.
- Definição dos valores correspondentes aos níveis mínimo e máximo.
- Tratamento de leituras inconsistentes ou anômalas.
- Testes com diferentes tipos e disposições de resíduos.

### 8.3 Componentes auxiliares

- Protoboard ou placa de montagem.
- Cabos/jumpers.
- Fonte ou sistema de alimentação adequado.
- Estrutura para fixação do sensor e do ESP32.
- Botão físico para ativar o modo de configuração do dispositivo.

---

## 9. Firmware do ESP32

O firmware deverá transformar o ESP32 em um dispositivo IoT configurável, capaz de realizar medições periódicas e enviá-las para a infraestrutura do sistema.


Inicialização
↓
Verificar configuração de Wi-Fi
↓
[Sem configuração] → Modo de configuração
↓
Conectar ao Wi-Fi
↓
Ler HC-SR04
↓
Validar e filtrar leitura
↓
Calcular % de ocupação
↓
Enviar medição
↓
Aguardar intervalo
↓
Nova medição


---

## 10. Configuração e alteração do Wi-Fi

A configuração da rede não utilizará QR Code. O ESP32 deverá possuir um modo de configuração em que cria temporariamente uma rede Wi-Fi própria. O aplicativo utilizará essa conexão durante a instalação para permitir que o usuário informe as credenciais da rede Wi-Fi disponível no local.

1. Ligar a lixeira.
2. Ativar o modo de configuração do ESP32.
3. O ESP32 cria uma rede Wi-Fi temporária.
4. O usuário inicia "Adicionar lixeira" no aplicativo.
5. O aplicativo realiza a configuração do dispositivo.
6. O usuário informa a rede Wi-Fi e a senha.
7. O ESP32 conecta-se à internet.
8. O dispositivo passa a enviar dados ao Firebase.
9. O aplicativo conclui a vinculação da lixeira.

O mesmo procedimento deverá ser utilizado para alterar a rede posteriormente. A identificação da lixeira não será alterada quando ela mudar de local ou de rede.

---

## 11. Identificação das lixeiras

Cada dispositivo terá um identificador único. Esse identificador será utilizado para diferenciar as lixeiras no Firebase e no aplicativo, independentemente da rede Wi-Fi ou da localização.

Exemplos: `BIN-0001`, `BIN-0002`, `BIN-0003`

O ID permanece associado ao dispositivo durante sua utilização. Dessa forma, uma mudança de local ou de rede altera somente as configurações de conectividade, sem perder o histórico ou as associações existentes.

---

## 12. Firebase

### 12.1 Firebase Authentication

- Cadastro de usuários.
- Login.
- Recuperação de acesso.
- Controle de sessão.

### 12.2 Cloud Firestore

O Firestore será utilizado para armazenar os dados estruturados do sistema.

users
└── userId
├── nome
└── email

bins
└── binId
├── nome
├── local
├── ownerId
├── currentLevel
├── status
└── lastUpdate

measurements
└── measurementId
├── binId
├── level
└── timestamp



### 12.3 Firebase Cloud Messaging

O Firebase Cloud Messaging será utilizado para o envio de notificações push ao aplicativo quando uma lixeira atingir um limite configurado pelo usuário.

---

## 13. Aplicativo mobile

### 13.1 Cadastro e autenticação

- Criar conta.
- Entrar.
- Recuperar acesso.
- Gerenciar sessão.

### 13.2 Dashboard

A tela inicial deverá apresentar uma visão geral das lixeiras associadas ao usuário.

MINHAS LIXEIRAS
Lixeira 01 — 43%
Lixeira 02 — 76%
Lixeira 03 — 98%

PRIORIDADE DE COLETA
Lixeira 03 — Alta
Lixeira 02 — Média
Lixeira 01 — Baixa


### 13.3 Detalhes da lixeira

- Nome.
- Localização.
- Percentual atual.
- Status.
- Última atualização.
- Histórico de medições.
- Gráfico de preenchimento.
- Prioridade/recomendação de coleta.
- Configurações de notificação.
- Opção para reconfigurar o Wi-Fi.

### 13.4 Cadastro de lixeira

O usuário poderá adicionar uma nova lixeira a partir do processo de configuração do dispositivo. Depois que o ESP32 estiver conectado à internet, o aplicativo deverá associar o dispositivo ao usuário e permitir definir nome, local e preferências de notificação.

---

## 14. Monitoramento remoto

Após a configuração, o celular não precisa permanecer na mesma rede Wi-Fi do ESP32. O ESP32 utiliza a internet disponível no local para enviar as medições ao Firebase, enquanto o aplicativo acessa esses dados pela internet.

Lixeira → Wi-Fi do local → Firebase ← Internet ← Aplicativo (Wi-Fi / 4G / 5G)


---

## 15. Notificações

Cada usuário poderá definir, para cada lixeira, os níveis nos quais deseja receber notificações. A configuração inicial terá dois limites: 80% e 100%.

- **80%** — lixeira próxima da capacidade máxima.
- **100%** — lixeira cheia.

O sistema deverá evitar notificações repetidas enquanto a lixeira permanecer no mesmo estado. Após uma coleta e a redução do nível, o sistema poderá emitir novamente um alerta quando o limite for atingido.

---

## 16. Múltiplos usuários

Uma mesma lixeira poderá estar associada a vários usuários. O usuário responsável pelo cadastro inicial será o proprietário no MVP e receberá as notificações configuradas.

A estrutura deverá permitir futuramente o compartilhamento de uma lixeira com outros usuários, com controle de permissões.

---

## 17. Estados de ocupação

Os limites abaixo são uma proposta inicial para visualização no aplicativo e poderão ser ajustados após a calibração e os testes do protótipo.

| Faixa | Status |
|---|---|
| 0–50% | Normal |
| 51–79% | Atenção |
| 80–89% | Próxima de cheia |
| 90–99% | Crítica |
| 100% | Cheia |

---

## 18. Recomendação e prioridade de coleta

O sistema deverá transformar os dados de ocupação em uma indicação de prioridade para auxiliar na decisão de coleta. Na primeira versão, o nível atual será o principal fator. Em seguida, a velocidade de enchimento e o tempo desde a última coleta poderão ser incorporados.

Nível atual
+
Velocidade de enchimento
+
Tempo desde a última coleta
↓
Índice de prioridade
↓
Baixa / Média / Alta


Como evolução, o histórico poderá ser utilizado para estimar quando uma lixeira deverá atingir 100% de ocupação.

---

## 19. Fluxo completo do sistema

USUÁRIO
↓
Criar conta / Entrar
↓
Adicionar lixeira
↓
Ativar modo de configuração do ESP32
↓
Configurar Wi-Fi
↓
ESP32 conecta à internet
↓
Associar dispositivo ao usuário
↓
Definir nome e localização
↓
Escolher notificações
↓
Lixeira começa a enviar medições
↓
Dashboard
↓
Nível + Histórico + Alertas + Prioridade

---

## 20. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF01 | O sistema deve permitir cadastro e autenticação de usuários. |
| RF02 | O sistema deve permitir cadastrar uma ou mais lixeiras. |
| RF03 | Cada lixeira deve possuir um identificador único. |
| RF04 | O ESP32 deve realizar leituras do sensor ultrassônico. |
| RF05 | O sistema deve calcular uma porcentagem estimada de ocupação. |
| RF06 | O ESP32 deve enviar as medições ao Firebase pela internet. |
| RF07 | O aplicativo deve exibir o nível atual de cada lixeira. |
| RF08 | O aplicativo deve permitir visualizar o histórico de medições. |
| RF09 | O usuário deve escolher os níveis de notificação de cada lixeira. |
| RF10 | O sistema deve enviar notificações quando os limites configurados forem atingidos. |
| RF11 | O sistema deve evitar notificações repetidas para o mesmo evento. |
| RF12 | Uma lixeira deve poder estar associada a múltiplos usuários. |
| RF13 | O usuário deve poder alterar nome e localização da lixeira. |
| RF14 | O usuário deve poder iniciar a reconfiguração da rede Wi-Fi da lixeira. |
| RF15 | O sistema deve apresentar uma recomendação/prioridade de coleta. |
| RF16 | O aplicativo deve permitir monitoramento remoto sem exigir que o celular esteja na mesma rede do ESP32. |

---

## 21. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF01 | A comunicação com os serviços Firebase deve utilizar mecanismos de segurança adequados. |
| RNF02 | O aplicativo deve apresentar interface responsiva e de fácil utilização. |
| RNF03 | O sistema deve suportar múltiplas lixeiras. |
| RNF04 | A identidade da lixeira deve ser independente da rede Wi-Fi e da localização. |
| RNF05 | O sistema deve tratar falhas de conexão e permitir recuperação da comunicação. |
| RNF06 | As medições devem possuir registro de data e hora. |
| RNF07 | A arquitetura deve permitir expansão futura. |
| RNF08 | O consumo de energia e a estabilidade do ESP32 devem ser avaliados durante os testes. |

---

## 22. Tecnologias

- **ESP32** — Microcontrolador e conectividade Wi-Fi.
- **HC-SR04** — Medição ultrassônica do nível de preenchimento.
- **C/C++** — Desenvolvimento do firmware.
- **Firebase Authentication** — Cadastro, login e autenticação.
- **Cloud Firestore** — Armazenamento dos dados e histórico.
- **Firebase Cloud Messaging** — Notificações push.
- **React Native** — Aplicação mobile.
- **Git/GitHub** — Controle de versão e colaboração.

---

## 23. Plano de desenvolvimento

| Fase | Foco | Resultado |
|---|---|---|
| Base | Hardware + Firebase | Comunicação ESP32 → Firebase |

- **Planejamento:** Definição dos requisitos, arquitetura e escopo do MVP.
- **Hardware:** Montagem do ESP32 + HC-SR04 e definição da estrutura física.
- **Firmware:** Leitura do sensor, calibração, cálculo de ocupação e conectividade.
- **Firebase:** Authentication, Firestore, estrutura de dados e comunicação.
- **Configuração do dispositivo:** Modo de configuração inicial e alteração da rede Wi-Fi.
- **Aplicativo:** Telas, autenticação, cadastro de lixeiras e dashboard.
- **Notificações:** Regras de 80%/100% e integração com notificações push.
- **Histórico e prioridade:** Gráficos, histórico e algoritmo inicial de recomendação.
- **Integração:** Testar o fluxo completo ESP32 → Firebase → aplicativo.
- **Testes:** Testes de sensor, conectividade, notificações, usuários e múltiplas lixeiras.
- **Teste em ambiente real:** Instalação e observação do protótipo em ambiente universitário.
- **Avaliação:** Análise dos resultados, ajustes e documentação final.

### 23.1 Roteiro de desenvolvimento

O desenvolvimento será incremental. Cada etapa deve gerar um resultado funcional e ser validada antes do início da próxima, reduzindo os riscos de integração entre hardware, backend e aplicativo.

**Etapa 1 — Definição e preparação**
Consolidar requisitos, definir as dimensões da lixeira, separar os componentes e criar o repositório do projeto.
*Entregável:* Estrutura inicial do projeto, lista de componentes e backlog.

**Etapa 2 — Montagem do protótipo**
Montar ESP32 e HC-SR04, definir a posição de instalação e preparar a alimentação.
*Entregável:* Protótipo físico capaz de realizar leituras.

**Etapa 3 — Leitura e calibração**
Programar as leituras, testar diferentes posições e calibrar os valores correspondentes aos níveis de ocupação.
*Entregável:* Leitura estável convertida em percentual.

**Etapa 4 — Conectividade**
Implementar conexão Wi-Fi, reconexão e o modo de configuração inicial do dispositivo.
*Entregável:* Lixeira capaz de receber e manter sua configuração de rede.

**Etapa 5 — Firebase**
Criar Authentication, Firestore e a estrutura de usuários, lixeiras, medições e configurações.
*Entregável:* Backend preparado para receber os dispositivos.

**Etapa 6 — Envio das medições**
Integrar o ESP32 ao Firebase e definir a frequência de envio das leituras.
*Entregável:* Medições registradas automaticamente com data e hora.

**Etapa 7 — Aplicativo base**
Criar o projeto React Native, autenticação, navegação e estrutura das telas.
*Entregável:* Usuário consegue criar conta e acessar o aplicativo.

**Etapa 8 — Cadastro e configuração da lixeira**
Implementar o fluxo de adicionar uma lixeira, vinculá-la ao usuário e configurar ou alterar sua rede Wi-Fi.
*Entregável:* Instalação e reconfiguração funcionando sem QR Code.

**Etapa 9 — Monitoramento**
Criar dashboard, tela de detalhes, nível atual, status, última atualização e histórico.
*Entregável:* Usuário acompanha uma ou várias lixeiras remotamente.

**Etapa 10 — Notificações**
Integrar Firebase Cloud Messaging e criar preferências individuais para os limites de 80% e 100%.
*Entregável:* Alertas enviados de acordo com a configuração do usuário.

**Etapa 11 — Prioridade de coleta**
Criar a primeira regra de classificação usando o nível atual e preparar a inclusão de velocidade de enchimento e histórico.
*Entregável:* Prioridade baixa, média ou alta para cada lixeira.

**Etapa 12 — Múltiplos usuários**
Permitir associação de uma lixeira a mais de um usuário e validar as permissões.
*Entregável:* Usuários autorizados conseguem acompanhar a mesma lixeira.

**Etapa 13 — Integração completa**
Validar o fluxo sensor → ESP32 → Wi-Fi → Firebase → aplicativo → notificação.
*Entregável:* Sistema funcionando de ponta a ponta.

**Etapa 14 — Testes e ajustes**
Testar precisão, conectividade, troca de Wi-Fi, múltiplas lixeiras, múltiplos usuários e notificações.
*Entregável:* MVP estável e pronto para demonstração.

### 23.2 Ordem prática de execução

A sequência abaixo representa a ordem recomendada para implementação. O objetivo é validar primeiro a base técnica e depois construir as funcionalidades de maior nível.

1. Montar e testar o HC-SR04 no ESP32.
2. Calibrar a conversão de distância para percentual.
3. Fazer o ESP32 conectar ao Wi-Fi.
4. Implementar o modo de configuração do Wi-Fi.
5. Criar o projeto Firebase e a estrutura do Firestore.
6. Enviar uma leitura do ESP32 para o Firebase.
7. Confirmar a leitura no aplicativo.
8. Criar autenticação e cadastro de usuários.
9. Implementar o cadastro e a vinculação da lixeira.
10. Implementar dashboard e histórico.
11. Implementar alteração do Wi-Fi.
12. Implementar notificações de 80% e 100%.
13. Implementar múltiplos usuários.
14. Implementar prioridade de coleta.
15. Realizar integração e testes finais.

### 23.3 Divisão sugerida de responsabilidades

As atividades podem ser divididas entre os integrantes, mas a integração deverá ser realizada em conjunto. Cada responsável deve registrar decisões técnicas e manter sua parte do projeto versionada.

- **Hardware/Firmware** — montagem, HC-SR04, ESP32, calibração, Wi-Fi e envio das medições.
- **Backend/Firebase** — Authentication, Firestore, regras de segurança, estrutura dos dados e notificações.
- **Mobile** — React Native, telas, cadastro de lixeiras, dashboard, histórico e configurações.
- **Integração/Testes** — validação do fluxo completo, testes de conectividade, alertas, múltiplos usuários e múltiplas lixeiras.

### 23.4 Critério para considerar uma etapa concluída

Uma etapa será considerada concluída quando o resultado previsto puder ser executado e demonstrado. Falhas encontradas durante a validação devem ser registradas e corrigidas antes de avançar para a etapa seguinte.

---

## 24. Testes previstos

- Precisão do HC-SR04 em diferentes níveis de preenchimento.
- Estabilidade das leituras.
- Perda e recuperação da conexão Wi-Fi.
- Envio e recebimento dos dados no Firebase.
- Monitoramento remoto utilizando redes diferentes.
- Configuração inicial da lixeira.
- Alteração da rede Wi-Fi após mudança de local.
- Associação de uma lixeira a múltiplos usuários.
- Notificações nos níveis configurados.
- Prevenção de notificações repetidas.
- Funcionamento com múltiplas lixeiras.
- Cálculo da prioridade de coleta.

---

## 25. Critérios de sucesso do MVP

- O ESP32 deve realizar medições consistentes do nível da lixeira.
- As medições devem ser enviadas ao Firebase pela internet.
- O aplicativo deve exibir o nível atualizado.
- O usuário deve conseguir cadastrar e acompanhar múltiplas lixeiras.
- A identidade da lixeira deve permanecer a mesma após mudança de rede ou local.
- O usuário deve receber notificações de acordo com suas configurações.
- O aplicativo deve permitir monitoramento remoto.
- O sistema deve apresentar uma indicação de prioridade de coleta.
- O fluxo completo deve funcionar de ponta a ponta em um teste integrado.

---

## 26. Riscos e pontos de atenção

- Precisão do sensor ultrassônico em função do formato da lixeira e da disposição dos resíduos.
- Oscilações causadas por superfícies irregulares do lixo.
- Disponibilidade e estabilidade da rede Wi-Fi no local.
- Consumo de energia e escolha da fonte de alimentação.
- Armazenamento seguro das credenciais Wi-Fi.
- Regras de segurança e autorização no Firebase.
- Proteção física do sensor e da eletrônica.
- Diferenças entre o protótipo e uma solução preparada para produção.

---

## 27. Evoluções futuras

- Mapa com localização das lixeiras.
- Painel web para equipes de limpeza e gestão.
- Compartilhamento de lixeiras entre usuários.
- Previsão do tempo até atingir 100%.
- Otimização de rotas de coleta.
- Sensores adicionais, como sensor de peso.
- Alimentação por bateria de longa duração ou energia solar.
- Conectividade móvel em locais sem Wi-Fi.
- Relatórios de eficiência da coleta.
- Análise histórica dos horários e locais de maior geração de resíduos.

---

## 28. Estrutura inicial do projeto

/lixeira-inteligente
├── firmware/
│ ├── src/
│ └── README.md
│
├── mobile/
│ ├── src/
│ │ ├── screens/
│ │ ├── components/
│ │ ├── services/
│ │ ├── navigation/
│ │ └── utils/
│ └── README.md
│
├── firebase/
│ ├── firestore/
│ └── README.md
│
└── README.md


---

## 29. Decisões técnicas em aberto

- Definir o intervalo ideal entre as medições.
- Definir o método de filtragem das leituras do HC-SR04.
- Definir as dimensões e a posição de instalação do sensor.
- Definir a implementação final do modo de configuração Wi-Fi.
- Definir como o aplicativo descobrirá e se comunicará com o ESP32 durante a configuração.
- Definir a estrutura final das permissões para múltiplos usuários.
- Definir as regras de segurança do Firestore.
- Definir o cálculo final do índice de prioridade de coleta.
- Definir a estratégia de alimentação elétrica do protótipo.
- Definir a interface final do aplicativo.

---

## 30. Resumo

O projeto consiste no desenvolvimento de uma lixeira inteligente capaz de medir seu nível de preenchimento por meio de um HC-SR04 conectado a um ESP32. O dispositivo enviará as medições pela internet para o Firebase, permitindo que uma aplicação React Native apresente o estado das lixeiras de forma remota.

A solução será preparada para múltiplas lixeiras e múltiplos usuários. Cada dispositivo terá uma identificação própria, enquanto suas credenciais de rede poderão ser configuradas e alteradas posteriormente. O usuário poderá definir os níveis de notificação, inicialmente 80% e 100%, e receber alertas de acordo com suas preferências.

Além do monitoramento, os dados coletados serão utilizados para gerar uma recomendação de prioridade de coleta. O projeto terá como foco inicial um protótipo funcional, mantendo a arquitetura aberta para recursos futuros como previsão de enchimento, otimização de rotas e expansão para diferentes ambientes.