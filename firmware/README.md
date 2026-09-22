# firmware

Firmware do **ESP32** (C/C++), conforme seções 8–10 e 23.1 do `plano_dev.md`.

## Finalidade

Transformar o ESP32 em um dispositivo IoT configurável capaz de:

- Ler o sensor ultrassônico **HC-SR04** e calibrar a conversão de distância em percentual de ocupação (Etapas 2–3).
- Conectar ao **Wi-Fi**, reconectar em falhas e entrar em **modo de configuração** (rede própria temporária) quando não houver configuração de rede (Etapa 4).
- Enviar as medições ao **Firebase** via internet em intervalos definidos (Etapa 6).

## Estrutura

```
firmware/
├── src/          # código-fonte: inicialização, sensor, calibração, Wi-Fi, configuração, envio
└── README.md
```

Regra: cada responsabilidade em um módulo próprio (`sensor`, `wifi`, `config`, `network/http`),
sem hard-code de credenciais — use configuração acessível (ex.: struct de config + modo AP).
Configuração de ambiente/credenciais reais nunca deve ser commitada.