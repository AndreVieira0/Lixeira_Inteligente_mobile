// =====================================================
// LIXEIRA INTELIGENTE — Firmware ESP32 físico
// Lixeira: BIN-0002
// Pinos: TRIG=GPIO12 (D12)  ECHO=GPIO32 (D32)
// =====================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

#define TRIG_PIN 12
#define ECHO_PIN 32
#define LED_PIN  2

const float DISTANCIA_VAZIA  = 15.0;
const float DISTANCIA_CHEIA  = 2.5;
const int   NUM_LEITURAS     = 15;
const int   INTERVALO_MEDICAO = 1000;
const int   LIMIAR_MUDANCA   = 2;
const unsigned long INTERVALO_HEARTBEAT = 20000UL;

const char* WIFI_SSID = "LUCILIO 2G";
const char* WIFI_SENHA = "Lucilio@09";

const char* FIREBASE_API_KEY = "AIzaSyA-So4Cb1UZ6abeSIEktXrrxM3u4opW-G8";
const char* FIREBASE_EMAIL   = "esp32.lixeira@teste.com";
const char* FIREBASE_SENHA   = "esp32lixeira";

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

const char* BIN_ID = "BIN-0002";

void configurarTLS(WiFiClientSecure &cliente) { cliente.setInsecure(); }

String idToken = "";
String refreshToken = "";
bool autenticadoFirebase    = false;
bool horarioSincronizado    = false;
bool wifiJaConectou         = false;
bool reconexaoPendente      = false;
bool primeiraMedicaoEnviada = false;

const unsigned long INTERVALO_RETRY_ENVIO = 15000UL;
unsigned long proximaTentativaEnvio  = 0;
unsigned long ultimoEnvioHeartbeat   = 0;
int ultimoPercentualEnviado = -1;
unsigned long momentoToken    = 0;
unsigned long validadeTokenMs = 0;

String cachedMembers[10];
int    cachedMembersCount = 0;
unsigned long ultimaLeituraMembers = 0;
const unsigned long INTERVALO_LEITURA_MEMBERS = 300000UL;

// =====================================================
// KEEP-ALIVE POWER BANK
// =====================================================

void keepAlivePowerBank() {
  digitalWrite(LED_PIN, HIGH);
}

// =====================================================
// WI-FI
// =====================================================

void conectarWiFi() {
  Serial.println();
  Serial.println("=== CONEXAO WI-FI ===");
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  int t = 0;
  while (WiFi.status() != WL_CONNECTED && t < 20) { delay(500); Serial.print("."); t++; }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi conectado!");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
    wifiJaConectou = true;
  } else { Serial.println("Falha na conexao Wi-Fi."); }
}

void verificarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (wifiJaConectou) reconexaoPendente = true;
  Serial.println("Wi-Fi desconectado. Reconectando...");
  WiFi.disconnect(); WiFi.begin(WIFI_SSID, WIFI_SENHA);
  int t = 0;
  while (WiFi.status() != WL_CONNECTED && t < 10) { delay(500); Serial.print("."); t++; }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi reconectado!");
    wifiJaConectou = true; autenticadoFirebase = false;
    idToken = ""; ultimaLeituraMembers = 0;
  } else { Serial.println("Falha na reconexao."); }
}

// =====================================================
// NTP
// =====================================================

bool sincronizarHorario() {
  time_t agora = time(nullptr);
  if (agora > 1700000000) { horarioSincronizado = true; return true; }
  Serial.println("Sincronizando NTP...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  for (int i = 0; i < 30; i++) {
    agora = time(nullptr);
    if (agora > 1700000000) {
      struct tm h; gmtime_r(&agora, &h);
      Serial.printf("Horario UTC: %04d-%02d-%02d %02d:%02d:%02d\n",
        h.tm_year+1900, h.tm_mon+1, h.tm_mday, h.tm_hour, h.tm_min, h.tm_sec);
      horarioSincronizado = true; return true;
    }
    delay(1000);
  }
  Serial.println("Falha NTP."); return false;
}

bool obterTimestamp(String &ts) {
  if (!sincronizarHorario()) return false;
  time_t agora = time(nullptr);
  struct tm h; gmtime_r(&agora, &h);
  char buf[25];
  if (strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &h) == 0) return false;
  ts = String(buf); return true;
}

// =====================================================
// FIREBASE AUTH
// =====================================================

bool autenticarFirebase() {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure c; HTTPClient h; configurarTLS(c);
  if (!h.begin(c, String(FIREBASE_AUTH_URL) + FIREBASE_API_KEY)) return false;
  h.addHeader("Content-Type", "application/json");
  JsonDocument req;
  req["email"] = FIREBASE_EMAIL; req["password"] = FIREBASE_SENHA; req["returnSecureToken"] = true;
  String corpo; serializeJson(req, corpo);
  Serial.println("Autenticando...");
  int cod = h.POST(corpo); String resp = h.getString(); bool ok = false;
  if (cod == 200) {
    JsonDocument ret; deserializeJson(ret, resp);
    if (!ret["idToken"].isNull()) {
      idToken = ret["idToken"].as<String>();
      refreshToken = ret["refreshToken"].as<String>();
      unsigned long val = String(ret["expiresIn"].as<const char*>()).toInt();
      momentoToken = millis(); validadeTokenMs = val * 1000UL;
      autenticadoFirebase = true;
      Serial.println("Login OK! Validade: " + String(val) + "s");
      ok = true;
    }
  } else { Serial.println("Erro login HTTP: " + String(cod)); Serial.println(resp); }
  h.end(); c.stop(); return ok;
}

String codificarFormulario(const String &v) {
  const char hex[] = "0123456789ABCDEF"; String r;
  for (size_t i = 0; i < v.length(); i++) {
    uint8_t c = (uint8_t)v[i];
    if ((c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'||c=='_'||c=='.'||c=='~')
      r += (char)c;
    else { r += '%'; r += hex[c>>4]; r += hex[c&0x0F]; }
  }
  return r;
}

bool renovarTokenFirebase() {
  if (WiFi.status() != WL_CONNECTED || refreshToken.isEmpty()) return false;
  WiFiClientSecure c; HTTPClient h; configurarTLS(c);
  if (!h.begin(c, String(FIREBASE_REFRESH_URL) + FIREBASE_API_KEY)) return false;
  h.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int cod = h.POST("grant_type=refresh_token&refresh_token=" + codificarFormulario(refreshToken));
  String resp = h.getString(); bool ok = false;
  if (cod == 200) {
    JsonDocument ret; deserializeJson(ret, resp);
    if (!ret["id_token"].isNull()) {
      idToken = ret["id_token"].as<String>();
      refreshToken = ret["refresh_token"].as<String>();
      unsigned long val = String(ret["expires_in"].as<const char*>()).toInt();
      momentoToken = millis(); validadeTokenMs = val * 1000UL;
      autenticadoFirebase = true; Serial.println("Token renovado!"); ok = true;
    }
  }
  if (!ok) Serial.println("Falha renovacao HTTP: " + String(cod));
  h.end(); c.stop(); return ok;
}

bool garantirTokenValido() {
  if (!autenticadoFirebase || idToken.isEmpty()) return autenticarFirebase();
  unsigned long dec = millis() - momentoToken;
  if (validadeTokenMs > 60000UL && dec < validadeTokenMs - 60000UL) return true;
  if (renovarTokenFirebase()) return true;
  autenticadoFirebase = false; idToken = ""; return false;
}

// =====================================================
// SENSOR
// =====================================================

float medirDistancia() {
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  if (dur == 0) return -1;
  return dur * 0.0343 / 2;
}

float obterMediaDistancia() {
  float leituras[NUM_LEITURAS];
  int validas = 0;
  for (int i = 0; i < NUM_LEITURAS; i++) {
    float d = medirDistancia();
    if (d >= 1.5 && d <= 50.0)
      leituras[validas++] = d;
    delay(50);
  }
  if (validas == 0) return -1;
  for (int i = 0; i < validas-1; i++)
    for (int j = 0; j < validas-i-1; j++)
      if (leituras[j] > leituras[j+1]) {
        float t = leituras[j]; leituras[j] = leituras[j+1]; leituras[j+1] = t;
      }
  if (validas >= 3) return leituras[1];
  return leituras[0];
}

// =====================================================
// OCUPACAO E STATUS
// =====================================================

float calcularOcupacao(float distancia) {
  float ocupacao = ((DISTANCIA_VAZIA - distancia) /
                    (DISTANCIA_VAZIA - DISTANCIA_CHEIA)) * 100.0;
  if (ocupacao < 0)   ocupacao = 0;
  if (ocupacao > 100) ocupacao = 100;
  return ocupacao;
}

String obterStatus(float ocupacao) {
  if (ocupacao <= 50) return "Normal";
  if (ocupacao <= 79) return "Atencao";
  if (ocupacao <= 89) return "Proxima de cheia";
  if (ocupacao < 100) return "Critica";
  return "Cheia";
}

// =====================================================
// MEMBERS (Fase B)
// =====================================================

void lerMembersBin() {
  if (ultimaLeituraMembers != 0 &&
      millis() - ultimaLeituraMembers < INTERVALO_LEITURA_MEMBERS) return;
  if (!garantirTokenValido()) return;
  WiFiClientSecure c; HTTPClient h; configurarTLS(c);
  if (!h.begin(c, String(FIRESTORE_GET_BIN_URL) + String(BIN_ID))) return;
  h.addHeader("Authorization", "Bearer " + idToken);
  int cod = h.GET(); String resp = h.getString();
  if (cod == 200) {
    JsonDocument doc; deserializeJson(doc, resp);
    if (!doc["fields"]["members"].isNull()) {
      JsonArray vals = doc["fields"]["members"]["arrayValue"]["values"].as<JsonArray>();
      cachedMembersCount = 0;
      for (JsonVariant v : vals)
        if (cachedMembersCount < 10 && !v["stringValue"].isNull())
          cachedMembers[cachedMembersCount++] = v["stringValue"].as<String>();
      Serial.print("Members: "); Serial.print(cachedMembersCount); Serial.println(" UID(s)");
    } else {
      Serial.println("Bin sem members."); cachedMembersCount = 0;
    }
    ultimaLeituraMembers = millis();
  } else { Serial.print("Erro bin HTTP: "); Serial.println(cod); }
  h.end(); c.stop();
}

// =====================================================
// FIRESTORE
// =====================================================

bool enviarParaFirestore(int percentual, const String &status, const String &motivo) {
  if (WiFi.status() != WL_CONNECTED) { Serial.println("Sem Wi-Fi."); return false; }
  if (!garantirTokenValido()) { Serial.println("Sem auth."); return false; }
  String ts;
  if (!obterTimestamp(ts)) { Serial.println("Sem horario."); return false; }

  String mid = String((uint32_t)esp_random(), HEX) + "_" + String(millis());
  String nomeBin     = "projects/lixeira-inteligente-65d6d/databases/(default)/documents/bins/" + String(BIN_ID);
  String nomeMedicao = "projects/lixeira-inteligente-65d6d/databases/(default)/documents/measurements/" + mid;

  JsonDocument req;
  JsonObject wb = req["writes"].add<JsonObject>();
  JsonObject ub = wb["update"].to<JsonObject>(); ub["name"] = nomeBin;
  JsonObject fb = ub["fields"].to<JsonObject>();
  fb["currentLevel"]["integerValue"] = percentual;
  fb["status"]["stringValue"]        = status;
  fb["lastUpdate"]["timestampValue"] = ts;
  JsonArray mask = wb["updateMask"]["fieldPaths"].to<JsonArray>();
  mask.add("currentLevel"); mask.add("status"); mask.add("lastUpdate");

  JsonObject wm = req["writes"].add<JsonObject>();
  JsonObject um = wm["update"].to<JsonObject>(); um["name"] = nomeMedicao;
  JsonObject fm = um["fields"].to<JsonObject>();
  fm["binId"]["stringValue"]        = BIN_ID;
  fm["level"]["integerValue"]       = percentual;
  fm["reason"]["stringValue"]       = motivo;
  fm["timestamp"]["timestampValue"] = ts;
  if (cachedMembersCount > 0) {
    JsonArray mv = fm["members"]["arrayValue"]["values"].to<JsonArray>();
    for (int i = 0; i < cachedMembersCount; i++) {
      JsonObject item = mv.add<JsonObject>(); item["stringValue"] = cachedMembers[i];
    }
  }
  wm["currentDocument"]["exists"] = false;

  String corpo; serializeJson(req, corpo);
  WiFiClientSecure c; HTTPClient h; configurarTLS(c);
  if (!h.begin(c, FIRESTORE_COMMIT_URL)) return false;
  h.setConnectTimeout(15000); h.setTimeout(15000);
  h.addHeader("Content-Type", "application/json");
  h.addHeader("Authorization", "Bearer " + idToken);
  Serial.println("Enviando...");
  int cod = h.POST(corpo); String resp = h.getString();
  bool ok = (cod == 200);
  if (ok) {
    Serial.println("Gravado!");
    Serial.print("Ocupacao: "); Serial.print(percentual); Serial.print("%  Status: "); Serial.println(status);
    Serial.print("Motivo: "); Serial.println(motivo);
    if (cachedMembersCount > 0) { Serial.print("Members: "); Serial.print(cachedMembersCount); Serial.println(" UID(s)"); }
  } else {
    Serial.print("Erro Firestore HTTP: "); Serial.println(cod); Serial.println(resp);
  }
  h.end(); c.stop(); return ok;
}

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN,  OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN,  HIGH);
  Serial.println();
  Serial.println("=== LIXEIRA INTELIGENTE (ESP32 fisico) ===");
  Serial.print("Bin: ");          Serial.println(BIN_ID);
  Serial.print("Vazia: ");        Serial.print(DISTANCIA_VAZIA); Serial.println(" cm = 0%");
  Serial.print("Cheia: ");        Serial.print(DISTANCIA_CHEIA); Serial.println(" cm = 100%");
  Serial.print("Limiar envio: "); Serial.print(LIMIAR_MUDANCA);  Serial.println("%");
  Serial.print("Heartbeat: ");    Serial.print(INTERVALO_HEARTBEAT/1000); Serial.println("s");
  conectarWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    autenticadoFirebase = autenticarFirebase();
    sincronizarHorario();
    lerMembersBin();
  }
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  keepAlivePowerBank();

  verificarWiFi();
  if (WiFi.status() == WL_CONNECTED && !autenticadoFirebase) {
    autenticadoFirebase = autenticarFirebase();
    if (autenticadoFirebase) lerMembersBin();
  }
  lerMembersBin();

  float distancia = obterMediaDistancia();
  if (distancia < 0) {
    Serial.println("Sem leitura - verifique o sensor!");
    delay(INTERVALO_MEDICAO);
    return;
  }

  float ocupacao = calcularOcupacao(distancia);
  int percentual = (int)round(ocupacao);
  String status  = obterStatus(ocupacao);

  Serial.println("------------------------------");
  Serial.print("Wi-Fi: ");     Serial.println(WiFi.status() == WL_CONNECTED ? "Conectado" : "Desconectado");
  Serial.print("Firebase: ");  Serial.println(autenticadoFirebase ? "Autenticado" : "Nao autenticado");
  Serial.print("Distancia: "); Serial.print(distancia, 2);
  Serial.print(" cm  |  Ocupacao: "); Serial.print(percentual);
  Serial.print("%  |  Status: "); Serial.println(status);
  Serial.print("Members: "); Serial.print(cachedMembersCount); Serial.println(" UID(s)");

  bool heartbeat = (millis() - ultimoEnvioHeartbeat >= INTERVALO_HEARTBEAT);

  bool precisaEnviar =
    !primeiraMedicaoEnviada ||
    reconexaoPendente ||
    abs(percentual - ultimoPercentualEnviado) >= LIMIAR_MUDANCA ||
    heartbeat;

  bool podeTentarEnviar = (long)(millis() - proximaTentativaEnvio) >= 0;

  if (precisaEnviar && WiFi.status() == WL_CONNECTED && autenticadoFirebase && podeTentarEnviar) {
    String motivo = reconexaoPendente ? "reconnection" : "level_change";
    if (enviarParaFirestore(percentual, status, motivo)) {
      ultimoPercentualEnviado = percentual;
      primeiraMedicaoEnviada  = true;
      reconexaoPendente       = false;
      proximaTentativaEnvio   = 0;
      ultimoEnvioHeartbeat    = millis();
    } else {
      proximaTentativaEnvio = millis() + INTERVALO_RETRY_ENVIO;
      Serial.println("Envio falhou. Nova tentativa em 15s.");
    }
  } else if (!precisaEnviar)              Serial.println("Ocupacao inalterada: sem novo envio.");
  else if (!podeTentarEnviar)             Serial.println("Aguardando intervalo.");
  else if (WiFi.status() != WL_CONNECTED) Serial.println("Sem Wi-Fi: medicao pendente.");
  else if (!autenticadoFirebase)          Serial.println("Sem autenticacao: medicao pendente.");

  Serial.println("------------------------------");
  delay(INTERVALO_MEDICAO);
}
