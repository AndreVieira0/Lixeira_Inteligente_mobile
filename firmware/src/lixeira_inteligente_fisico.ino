// =====================================================
// LIXEIRA INTELIGENTE — Firmware ESP32 físico
// Lixeira: BIN-0002
// Pinos: TRIG=GPIO12 (D12)  ECHO=GPIO13 (D13)
// =====================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// =====================================================
// PINOS DO HC-SR04
// =====================================================

#define TRIG_PIN 12   // D12 (GPIO 12)
#define ECHO_PIN 13   // D13 (GPIO 13)

// IMPORTANTE: O HC-SR04 opera em 5V. O ECHO envia 5V,
// mas o ESP32 suporta 3.3V nos GPIO. Use um divisor de
// tensão (ex.: 1kΩ entre ECHO e D13, 2kΩ entre D13 e GND)
// para proteger o pino do ESP32.

// =====================================================
// CONFIGURACAO DA LIXEIRA
// =====================================================

const float ALTURA_LIXEIRA = 40.0;   // Altura em cm — ajuste para a lixeira física
const int NUM_LEITURAS = 5;          // Média de 5 leituras
const int INTERVALO_MEDICAO = 1000;  // 1 segundo entre medições

// =====================================================
// WI-FI — PREENCHA COM A SUA REDE
// =====================================================

const char* WIFI_SSID = "LUCILIO 5G";    // ← TROQUE pelo nome da sua rede
const char* WIFI_SENHA = "Lucilio@09";  // ← TROQUE pela senha da sua rede

// =====================================================
// FIREBASE AUTHENTICATION
// =====================================================

const char* FIREBASE_API_KEY = "AIzaSyA-So4Cb1UZ6abeSIEktXrrxM3u4opW-G8";
const char* FIREBASE_EMAIL = "esp32.lixeira@teste.com";
const char* FIREBASE_SENHA = "esp32lixeira";

const char* FIREBASE_AUTH_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=";

const char* FIREBASE_REFRESH_URL =
  "https://securetoken.googleapis.com/v1/token?key=";

const char* FIRESTORE_COMMIT_URL =
  "https://firestore.googleapis.com/v1/projects/"
  "lixeira-inteligente-65d6d/databases/(default)/documents:commit";

const char* FIRESTORE_GET_BIN_URL =
  "https://firestore.googleapis.com/v1/projects/"
  "lixeira-inteligente-65d6d/databases/(default)/documents/bins/";

const char* BIN_ID = "BIN-0002";   // ← Nova lixeira física

// =====================================================
// TLS — Validacao de certificado no ESP32 físico
// =====================================================
// IMPORTANTE: setInsecure() NÃO valida o certificado TLS.
// É aceitável para testes. Para produção, atualize o ESP32
// Arduino core para 3.x e troque por:
//   #include <esp_cacert.h>
//   cliente.setCACertBundle(x509_crt_bundle_start,
//     x509_crt_bundle_end - x509_crt_bundle_start);

void configurarTLS(WiFiClientSecure &cliente) {
  cliente.setInsecure();
}

// =====================================================
// ESTADO GLOBAL
// =====================================================

String idToken = "";
String refreshToken = "";

bool autenticadoFirebase = false;
bool horarioSincronizado = false;
bool wifiJaConectou = false;
bool reconexaoPendente = false;
bool primeiraMedicaoEnviada = false;

const unsigned long INTERVALO_RETRY_ENVIO = 15000UL;
unsigned long proximaTentativaEnvio = 0;

int ultimoPercentualEnviado = -1;

unsigned long momentoToken = 0;
unsigned long validadeTokenMs = 0;

// Cache de members — lê do Firestore para incluir nas medições (Fase B)
String cachedMembers[10];   // máx 10 UIDs
int cachedMembersCount = 0;
unsigned long ultimaLeituraMembers = 0;
const unsigned long INTERVALO_LEITURA_MEMBERS = 300000UL; // 5 minutos

// =====================================================
// CONEXAO WI-FI
// =====================================================

void conectarWiFi() {
  Serial.println();
  Serial.println("=== CONEXAO WI-FI ===");

  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  int tentativas = 0;

  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    wifiJaConectou = true;
  } else {
    Serial.println("Falha na conexao Wi-Fi.");
  }
}

// =====================================================
// HORARIO VIA NTP
// =====================================================

bool sincronizarHorario() {
  time_t agora = time(nullptr);

  if (agora > 1700000000) {
    horarioSincronizado = true;
    return true;
  }

  Serial.println("Sincronizando horario com NTP...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  for (int i = 0; i < 30; i++) {
    agora = time(nullptr);
    if (agora > 1700000000) {
      struct tm horarioUTC;
      gmtime_r(&agora, &horarioUTC);
      Serial.printf(
        "Horario UTC sincronizado: %04d-%02d-%02d %02d:%02d:%02d\n",
        horarioUTC.tm_year + 1900, horarioUTC.tm_mon + 1,
        horarioUTC.tm_mday, horarioUTC.tm_hour,
        horarioUTC.tm_min, horarioUTC.tm_sec
      );
      horarioSincronizado = true;
      return true;
    }
    delay(1000);
  }

  horarioSincronizado = false;
  Serial.println("Nao foi possivel sincronizar o horario NTP.");
  return false;
}

bool obterTimestamp(String &timestamp) {
  if (!sincronizarHorario()) return false;
  time_t agora = time(nullptr);
  struct tm horarioUTC;
  gmtime_r(&agora, &horarioUTC);
  char buffer[25];
  if (strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &horarioUTC) == 0) {
    return false;
  }
  timestamp = String(buffer);
  return true;
}

// =====================================================
// AUTENTICACAO NO FIREBASE
// =====================================================

bool autenticarFirebase() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure cliente;
  HTTPClient https;
  configurarTLS(cliente);

  String url = String(FIREBASE_AUTH_URL) + FIREBASE_API_KEY;

  if (!https.begin(cliente, url)) {
    Serial.println("Falha ao iniciar login Firebase.");
    return false;
  }

  https.addHeader("Content-Type", "application/json");

  JsonDocument requisicao;
  requisicao["email"] = FIREBASE_EMAIL;
  requisicao["password"] = FIREBASE_SENHA;
  requisicao["returnSecureToken"] = true;

  String corpo;
  serializeJson(requisicao, corpo);

  Serial.println("Autenticando no Firebase...");

  int codigoHTTP = https.POST(corpo);
  String resposta = https.getString();

  bool sucesso = false;

  if (codigoHTTP == 200) {
    JsonDocument retorno;
    DeserializationError erro = deserializeJson(retorno, resposta);

    if (!erro &&
        !retorno["idToken"].isNull() &&
        !retorno["refreshToken"].isNull()) {

      idToken = retorno["idToken"].as<String>();
      refreshToken = retorno["refreshToken"].as<String>();

      unsigned long validadeSegundos =
        String(retorno["expiresIn"].as<const char*>()).toInt();

      momentoToken = millis();
      validadeTokenMs = validadeSegundos * 1000UL;

      autenticadoFirebase = true;
      Serial.println("Login Firebase realizado!");
      Serial.print("Validade do token (segundos): ");
      Serial.println(validadeSegundos);
      sucesso = true;
    } else {
      Serial.println("Resposta de autenticacao invalida.");
    }
  } else {
    Serial.print("Erro no login. HTTP: ");
    Serial.println(codigoHTTP);
    Serial.println(resposta);
  }

  https.end();
  cliente.stop();
  return sucesso;
}

// =====================================================
// RENOVACAO DO TOKEN
// =====================================================

String codificarFormulario(const String &valor) {
  const char hex[] = "0123456789ABCDEF";
  String resultado;
  for (size_t i = 0; i < valor.length(); i++) {
    uint8_t c = (uint8_t)valor[i];
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
        (c >= '0' && c <= '9') ||
        c == '-' || c == '_' || c == '.' || c == '~') {
      resultado += (char)c;
    } else {
      resultado += '%';
      resultado += hex[c >> 4];
      resultado += hex[c & 0x0F];
    }
  }
  return resultado;
}

bool renovarTokenFirebase() {
  if (WiFi.status() != WL_CONNECTED || refreshToken.isEmpty()) return false;

  WiFiClientSecure cliente;
  HTTPClient https;
  configurarTLS(cliente);

  String url = String(FIREBASE_REFRESH_URL) + FIREBASE_API_KEY;

  if (!https.begin(cliente, url)) {
    Serial.println("Falha ao iniciar renovacao do token.");
    return false;
  }

  https.addHeader("Content-Type", "application/x-www-form-urlencoded");
  String corpo = "grant_type=refresh_token&refresh_token=" +
    codificarFormulario(refreshToken);

  Serial.println("Renovando token Firebase...");

  int codigoHTTP = https.POST(corpo);
  String resposta = https.getString();

  bool sucesso = false;

  if (codigoHTTP == 200) {
    JsonDocument retorno;
    DeserializationError erro = deserializeJson(retorno, resposta);

    if (!erro &&
        !retorno["id_token"].isNull() &&
        !retorno["refresh_token"].isNull()) {

      idToken = retorno["id_token"].as<String>();
      refreshToken = retorno["refresh_token"].as<String>();

      unsigned long validadeSegundos =
        String(retorno["expires_in"].as<const char*>()).toInt();

      momentoToken = millis();
      validadeTokenMs = validadeSegundos * 1000UL;
      autenticadoFirebase = true;
      Serial.println("Token renovado com sucesso!");
      sucesso = true;
    }
  }

  if (!sucesso) {
    Serial.print("Falha na renovacao. HTTP: ");
    Serial.println(codigoHTTP);
  }

  https.end();
  cliente.stop();
  return sucesso;
}

bool garantirTokenValido() {
  if (!autenticadoFirebase || idToken.isEmpty()) {
    return autenticarFirebase();
  }
  unsigned long tempoDecorrido = millis() - momentoToken;
  if (validadeTokenMs > 60000UL &&
      tempoDecorrido < validadeTokenMs - 60000UL) {
    return true;
  }
  if (renovarTokenFirebase()) return true;
  autenticadoFirebase = false;
  idToken = "";
  return false;
}

// =====================================================
// VERIFICACAO DO WI-FI
// =====================================================

void verificarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (wifiJaConectou) reconexaoPendente = true;
  Serial.println("Wi-Fi desconectado. Reconectando...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 10) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi reconectado!");
    wifiJaConectou = true;
    autenticadoFirebase = false;
    idToken = "";
    // Força releitura dos members após reconexão
    ultimaLeituraMembers = 0;
  } else {
    Serial.println("Falha na reconexao Wi-Fi.");
  }
}

// =====================================================
// MEDICAO DO HC-SR04
// =====================================================

float medirDistancia() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duracao = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duracao == 0) return -1;
  return duracao * 0.0343 / 2;
}

float obterMediaDistancia() {
  float soma = 0;
  int leiturasValidas = 0;
  for (int i = 0; i < NUM_LEITURAS; i++) {
    float distancia = medirDistancia();
    if (distancia > 0 && distancia <= 400) {
      soma += distancia;
      leiturasValidas++;
    }
    delay(50);
  }
  if (leiturasValidas == 0) return -1;
  return soma / leiturasValidas;
}

// =====================================================
// CALCULO DA OCUPACAO
// =====================================================

float calcularOcupacao(float distancia) {
  float ocupacao = ((ALTURA_LIXEIRA - distancia) / ALTURA_LIXEIRA) * 100.0;
  if (ocupacao < 0) ocupacao = 0;
  if (ocupacao > 100) ocupacao = 100;
  return ocupacao;
}

// =====================================================
// STATUS DA LIXEIRA
// =====================================================

String obterStatus(float ocupacao) {
  if (ocupacao <= 50) return "Normal";
  else if (ocupacao <= 79) return "Atencao";
  else if (ocupacao <= 89) return "Proxima de cheia";
  else if (ocupacao < 100) return "Critica";
  else return "Cheia";
}

// =====================================================
// LEITURA DOS MEMBERS DA LIXEIRA (Fase B)
// Lê bins/BIN-0002 para obter o array members.
// Necessário para que as medições apareçam no app
// automaticamente após o usuário reivindicar a lixeira.
// =====================================================

void lerMembersBin() {
  // Rele a cada 5 minutos, ou se nunca leu
  if (millis() - ultimaLeituraMembers < INTERVALO_LEITURA_MEMBERS &&
      ultimaLeituraMembers != 0) {
    return;
  }

  if (!garantirTokenValido()) return;

  WiFiClientSecure cliente;
  HTTPClient https;
  configurarTLS(cliente);

  String url = String(FIRESTORE_GET_BIN_URL) + String(BIN_ID);

  if (!https.begin(cliente, url)) {
    Serial.println("Falha ao iniciar leitura do bin.");
    return;
  }

  https.addHeader("Authorization", "Bearer " + idToken);

  int codigoHTTP = https.GET();
  String resposta = https.getString();

  if (codigoHTTP == 200) {
    JsonDocument doc;
    DeserializationError erro = deserializeJson(doc, resposta);

    if (!erro && !doc["fields"]["members"].isNull()) {
      JsonArray valores =
        doc["fields"]["members"]["arrayValue"]["values"].as<JsonArray>();

      cachedMembersCount = 0;
      for (JsonVariant v : valores) {
        if (cachedMembersCount < 10 && !v["stringValue"].isNull()) {
          cachedMembers[cachedMembersCount] = v["stringValue"].as<String>();
          cachedMembersCount++;
        }
      }

      Serial.print("Members lidos: ");
      Serial.print(cachedMembersCount);
      Serial.println(" UID(s)");
      ultimaLeituraMembers = millis();
    } else {
      // A lixeira ainda não foi reivindicada — sem members
      Serial.println("Bin sem members (ainda nao reivindicada).");
      cachedMembersCount = 0;
      ultimaLeituraMembers = millis();
    }
  } else {
    Serial.print("Erro ao ler bin. HTTP: ");
    Serial.println(codigoHTTP);
  }

  https.end();
  cliente.stop();
}

// =====================================================
// ENVIO ATOMICO AO FIRESTORE
// Atualiza a lixeira e cria uma medicao no mesmo commit.
// Inclui members se disponível (Fase B).
// =====================================================

bool enviarParaFirestore(int percentual, const String &status,
                         const String &motivo) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sem Wi-Fi: envio adiado.");
    return false;
  }

  if (!garantirTokenValido()) {
    Serial.println("Firebase sem autenticacao valida.");
    return false;
  }

  String timestamp;
  if (!obterTimestamp(timestamp)) {
    Serial.println("Sem horario valido: envio adiado.");
    return false;
  }

  String measurementId =
    String((uint32_t)esp_random(), HEX) + "_" + String(millis());

  String nomeBin =
    "projects/lixeira-inteligente-65d6d/databases/(default)"
    "/documents/bins/" + String(BIN_ID);

  String nomeMedicao =
    "projects/lixeira-inteligente-65d6d/databases/(default)"
    "/documents/measurements/" + measurementId;

  JsonDocument requisicao;

  // --- Escrita 1: atualizar bins/BIN-0002 (telemetria) ---
  JsonObject escritaBin = requisicao["writes"].add<JsonObject>();
  JsonObject updateBin = escritaBin["update"].to<JsonObject>();
  updateBin["name"] = nomeBin;

  JsonObject camposBin = updateBin["fields"].to<JsonObject>();
  camposBin["currentLevel"]["integerValue"] = percentual;
  camposBin["status"]["stringValue"] = status;
  camposBin["lastUpdate"]["timestampValue"] = timestamp;

  JsonArray mascara = escritaBin["updateMask"]["fieldPaths"].to<JsonArray>();
  mascara.add("currentLevel");
  mascara.add("status");
  mascara.add("lastUpdate");

  // --- Escrita 2: criar measurement (com members se disponível) ---
  JsonObject escritaMedicao = requisicao["writes"].add<JsonObject>();
  JsonObject novaMedicao = escritaMedicao["update"].to<JsonObject>();
  novaMedicao["name"] = nomeMedicao;

  JsonObject camposMedicao = novaMedicao["fields"].to<JsonObject>();
  camposMedicao["binId"]["stringValue"] = BIN_ID;
  camposMedicao["level"]["integerValue"] = percentual;
  camposMedicao["reason"]["stringValue"] = motivo;
  camposMedicao["timestamp"]["timestampValue"] = timestamp;

  // Inclui members se houver UIDs em cache (Fase B)
  if (cachedMembersCount > 0) {
    JsonArray valoresMembers =
      camposMedicao["members"]["arrayValue"]["values"].to<JsonArray>();
    for (int i = 0; i < cachedMembersCount; i++) {
      JsonObject item = valoresMembers.add<JsonObject>();
      item["stringValue"] = cachedMembers[i];
    }
  }

  escritaMedicao["currentDocument"]["exists"] = false;

  String corpo;
  serializeJson(requisicao, corpo);

  WiFiClientSecure cliente;
  HTTPClient https;
  configurarTLS(cliente);

  if (!https.begin(cliente, FIRESTORE_COMMIT_URL)) {
    Serial.println("Falha ao iniciar requisicao Firestore.");
    return false;
  }

  https.setConnectTimeout(15000);
  https.setTimeout(15000);
  https.addHeader("Content-Type", "application/json");
  https.addHeader("Authorization", "Bearer " + idToken);

  Serial.println("Enviando medicao ao Firestore...");

  int codigoHTTP = https.POST(corpo);
  String resposta = https.getString();

  bool sucesso = (codigoHTTP == 200);

  if (sucesso) {
    Serial.println("Firestore: gravacao realizada!");
    Serial.print("Lixeira: ");
    Serial.println(BIN_ID);
    Serial.print("Ocupacao: ");
    Serial.print(percentual);
    Serial.print("%  Status: ");
    Serial.println(status);
    Serial.print("Motivo: ");
    Serial.println(motivo);
    if (cachedMembersCount > 0) {
      Serial.print("Members incluidos: ");
      Serial.print(cachedMembersCount);
      Serial.println(" UID(s)");
    } else {
      Serial.println("Sem members (lixeira ainda nao reivindicada).");
    }
  } else {
    Serial.print("Erro Firestore. HTTP: ");
    Serial.println(codigoHTTP);
    Serial.println(resposta);
  }

  https.end();
  cliente.stop();
  return sucesso;
}

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  Serial.println();
  Serial.println("=== LIXEIRA INTELIGENTE (ESP32 fisico) ===");
  Serial.print("Bin ID: ");
  Serial.println(BIN_ID);
  Serial.print("Altura: ");
  Serial.print(ALTURA_LIXEIRA);
  Serial.println(" cm");
  Serial.print("TRIG: D");
  Serial.println(TRIG_PIN);
  Serial.print("ECHO: D");
  Serial.println(ECHO_PIN);

  conectarWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    autenticadoFirebase = autenticarFirebase();
    sincronizarHorario();
    // Tenta ler members na primeira execução
    lerMembersBin();
  }
}

// =====================================================
// LOOP PRINCIPAL
// =====================================================

void loop() {
  verificarWiFi();

  if (WiFi.status() == WL_CONNECTED && !autenticadoFirebase) {
    autenticadoFirebase = autenticarFirebase();
    // Após reautenticar, rele os members
    if (autenticadoFirebase) lerMembersBin();
  }

  // Rele members periodicamente (a cada 5 min)
  lerMembersBin();

  float distancia = obterMediaDistancia();

  if (distancia < 0) {
    Serial.println("Erro: leitura do sensor invalida.");
    delay(INTERVALO_MEDICAO);
    return;
  }

  float ocupacao = calcularOcupacao(distancia);
  int percentual = (int)round(ocupacao);
  String status = obterStatus(ocupacao);

  Serial.println("------------------------------");
  Serial.print("Wi-Fi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Conectado" : "Desconectado");
  Serial.print("Firebase: ");
  Serial.println(autenticadoFirebase ? "Autenticado" : "Nao autenticado");
  Serial.print("Distancia: ");
  Serial.print(distancia, 2);
  Serial.print(" cm  |  Ocupacao: ");
  Serial.print(percentual);
  Serial.print("%  |  Status: ");
  Serial.println(status);
  Serial.print("Members: ");
  Serial.print(cachedMembersCount);
  Serial.println(" UID(s)");

  bool precisaEnviar =
    !primeiraMedicaoEnviada ||
    reconexaoPendente ||
    percentual != ultimoPercentualEnviado;

  bool podeTentarEnviar =
    (long)(millis() - proximaTentativaEnvio) >= 0;

  if (precisaEnviar &&
      WiFi.status() == WL_CONNECTED &&
      autenticadoFirebase &&
      podeTentarEnviar) {

    String motivo = reconexaoPendente ? "reconnection" : "level_change";

    if (enviarParaFirestore(percentual, status, motivo)) {
      ultimoPercentualEnviado = percentual;
      primeiraMedicaoEnviada = true;
      reconexaoPendente = false;
      proximaTentativaEnvio = 0;
    } else {
      proximaTentativaEnvio = millis() + INTERVALO_RETRY_ENVIO;
      Serial.println("Envio falhou. Nova tentativa em 15s.");
    }
  } else if (!precisaEnviar) {
    Serial.println("Ocupacao inalterada: sem novo envio.");
  } else if (!podeTentarEnviar) {
    Serial.println("Aguardando intervalo para nova tentativa.");
  } else if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sem Wi-Fi: medicao pendente.");
  } else if (!autenticadoFirebase) {
    Serial.println("Sem autenticacao Firebase: medicao pendente.");
  }

  Serial.println("------------------------------");
  delay(INTERVALO_MEDICAO);
}
