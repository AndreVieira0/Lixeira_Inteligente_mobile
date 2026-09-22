# GitHub Projects — automação das etapas

Este diretório guarda a definição das etapas do roteiro de desenvolvimento (seções
23.1 e 23.3 do `plano_dev.md`) e o script que preenche o **GitHub Projects** sem
cadastro manual.

| Arquivo | Finalidade |
| --- | --- |
| `sprints.yml` | Dados das etapas (Etapas 1 a 14): título, descrição, entregável, responsável, área e status inicial. É o arquivo que você edita. |
| `../scripts/setup-github-project.sh` | Script idempotente: cria issues, garante labels por área e adiciona os itens ao GitHub Project (Project v2). |

## Como funciona

Ao rodar o script, para cada etapa de `sprints.yml`:

1. **Issue** — cria a issue no repositório (com Descrição, Entregável, Responsável
   e Status inicial no corpo). Se já existir issue com o mesmo título, **reutiliza**
   (não duplica).
2. **Labels** — garante que as labels `hardware`, `backend`, `mobile` e `integracao`
   existam e as aplica às issues conforme o campo `areas`.
3. **GitHub Project** — adiciona cada issue ao Project v2 indicado, se ainda não
   estiver lá.

> O script **não cria** o GitHub Project. Você precisa criá-lo antes (referência:
> https://docs.github.com/pt/issues/planning-and-tracking-with-projects/creating-projects).

## Pré-requisitos

- **GitHub CLI** (`gh`) instalado e autenticado:
  ```bash
  gh auth login
  ```
- **Shell Unix** — Git Bash, WSL, Linux ou macOS. Não precisa de `yq`/`jq`.
- **Permissões** — leitura/gravação no repositório e acesso ao projeto.
- O **número do GitHub Project** (o número da aba/URL do projeto).

## Como executar

```bash
# Na raiz do repositório
PROJECT_NUMBER=13 ./scripts/setup-github-project.sh
```

No **Windows (PowerShell)**:

```powershell
$env:PROJECT_NUMBER = '13'
bash ./scripts/setup-github-project.sh
```

### Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `PROJECT_NUMBER` | sim | — | Número da aba do GitHub Project v2 |
| `PROJECT_OWNER` | não | dono do repositório | Dono do projeto (usuário ou organização) |
| `SPRINTS_FILE` | não | `github/sprints.yml` | Caminho do arquivo de dados |
| `DRY_RUN` | não | 0 | `DRY_RUN=1` simula sem alterar nada |
| `FORCE_CREATE` | não | 0 | `FORCE_CREATE=1` recria issues mesmo com título repetido (debug) |

### Simulação antes de aplicar

```bash
PROJECT_NUMBER=13 DRY_RUN=1 ./scripts/setup-github-project.sh
```

## Como editar `sprints.yml`

Cada etapa é um bloco com `- numero:`. Campos:

- `titulo` — título da issue (use "Etapa N — Nome" para manter o padrão).
- `descricao` — resumo da etapa.
- `entregavel` — o que define a etapa como concluída (definição de pronto).
- `responsavel` — responsável(s) sugerido(s), pelas áreas da seção 23.3 do plano.
- `areas` — uma ou mais áreas (separadas por vírgula). Geram as labels aplicadas.
- `status` — status inicial (ex.: `Backlog`).

> Mantenha os valores em **uma única linha**, entre aspas duplas. Na dúvida, rode o
> script em modo `DRY_RUN` primeiro.

Para adicionar/alterar uma etapa, edite o arquivo e rode o script de novo — ele
sincroniza (cria o que faltar, aplica labels, adiciona ao projeto) sem duplicar.

## Labels

| Área | Label | Cor |
| --- | --- | --- |
| Hardware/Firmware (ESP32, HC-SR04, calibração, Wi-Fi) | `hardware` | `#0E8A16` |
| Backend/Firebase (Auth, Firestore, FCM, regras) | `backend` | `#1D76DB` |
| Mobile (React Native, telas, dashboard) | `mobile` | `#E99695` |
| Integração/Testes (fluxo completo e validação) | `integracao` | `#FBCA04` |

## Solução de problemas

| Sintoma | Causa provável / ação |
| --- | --- |
| `gh não autenticado` | Rode `gh auth login`. |
| `GitHub Project #N` falha ao listar/adicionar | Confira `PROJECT_NUMBER` e `PROJECT_OWNER`; valide se você tem acesso ao projeto. |
| `Defina PROJECT_NUMBER` | Informe o número do projeto via variável (veja acima). |
| Issues criadas sem labels | Os `areas` do item estão vazios ou a label ainda não foi aplicada; rode o script novamente. |