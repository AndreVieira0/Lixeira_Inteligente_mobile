#!/usr/bin/env bash
# =============================================================================
# setup-github-project.sh
# -----------------------------------------------------------------------------
# Sincroniza as etapas do roteiro de desenvolvimento (github/sprints.yml) com o
# GitHub: cria/verifica issues, garante as labels por área e adiciona os itens
# ao GitHub Project (Project v2) do repositório.
#
# O script é IDEMPOTENTE: rodar de novo não cria issues/items duplicados.
#
# PRÉ-REQUISITOS
#   - GitHub CLI (gh) instalado e autenticado ........ `gh auth login`
#   - O GitHub Project (Project v2) JÁ deve existir. Este script NÃO o cria.
#   - Permissões de leitura/gravação no repositório e acesso ao projeto.
#   - Um shell Unix: Git Bash, WSL, Linux ou macOS. (Não requer yq/jq — usa o
#     `--jq` embutido do gh e um parser simples de YAML.)
#
# CONFIGURAÇÃO (variáveis de ambiente)
#   PROJECT_NUMBER   (obrigatório) número da aba do GitHub Project v2.
#   PROJECT_OWNER    dono do projeto (usuário/org). Padrão: dono do repositório.
#   SPRINTS_FILE     caminho do arquivo de dados. Padrão: github/sprints.yml.
#   DRY_RUN=1        apenas mostra o que faria, sem alterar nada.
#
# EXEMPLOS
#   PROJECT_NUMBER=13 ./scripts/setup-github-project.sh
#   PROJECT_NUMBER=13 DRY_RUN=1 ./scripts/setup-github-project.sh
# =============================================================================

set -euo pipefail

# ---- Configuração ------------------------------------------------------------
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
SPRINTS_FILE="${SPRINTS_FILE:-${ROOT}/github/sprints.yml}"
PROJECT_OWNER="${PROJECT_OWNER:-}"
DRY_RUN="${DRY_RUN:-0}"
FORCE_CREATE="${FORCE_CREATE:-0}"   # 1 = recria issues cujo título já exista (debug)

log()  { printf '\033[1;36m[info ]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[  ok ]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn ]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[erro ]\033[0m %s\n' "$*" >&2; exit 1; }

# ---- Pre-flight --------------------------------------------------------------
[ -f "$SPRINTS_FILE" ] || die "Arquivo de sprints não encontrado: $SPRINTS_FILE"
command -v gh >/dev/null 2>&1 || die "GitHub CLI (gh) não instalado. Veja: https://cli.github.com/"

if [ "$DRY_RUN" != "1" ]; then
  gh auth status >/dev/null 2>&1 || die "gh não autenticado. Rode: gh auth login"
fi

[ -n "${PROJECT_NUMBER:-}" ] || die "Defina PROJECT_NUMBER (número do GitHub Project v2). Ex.: PROJECT_NUMBER=13"

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || die "Não foi possível determinar o repositório (execute dentro do repo ou defina GH_REPO).")"
OWNER="${PROJECT_OWNER:-${REPO%/*}}"

log "Repositório: $REPO"
log "GitHub Project #$PROJECT_NUMBER (owner: $OWNER)"
log "Arquivo de sprints: $SPRINTS_FILE"
[ "$DRY_RUN" = "1" ] && warn "Modo DRY-RUN ativo — nenhuma alteração será feita."

# ---- Leitura do YAML (parser simples, valores em uma linha entre aspas) ------
# Extrai um campo de um item:  get_sprint_field <campo> <nº do item (1-based)>
get_sprint_field() {
  local field="$1" idx="$2" starts start end value
  starts="$(grep -n '^  - numero:' "$SPRINTS_FILE" | cut -d: -f1)"
  start="$(printf '%s\n' "$starts" | sed -n "${idx}p")"
  end="$(printf '%s\n' "$starts" | sed -n "$((idx + 1))p")"
  [ -z "$end" ] && end=999999
  value="$(sed -n "${start},${end}p" "$SPRINTS_FILE" | sed -n "s/^    ${field}: *//p" | head -n1)"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

SPRINT_COUNT="$(grep -c '^  - numero:' "$SPRINTS_FILE" || true)"
LABEL_COUNT="$(grep -c '^  - name:' "$SPRINTS_FILE" || true)"
[ "$SPRINT_COUNT" -gt 0 ] || die "Nenhuma etapa encontrada em sprints.yml."

# ---- Garantir labels por área -------------------------------------------------
create_label() {
  local name="$1" color="$2" desc="$3"
  if [ "$DRY_RUN" = "1" ]; then
    warn "(dry) criaria a label '$name'"
    return
  fi
  if [ "$(gh label list --repo "$REPO" --json name --jq "any(.name == \"${name}\")")" = "true" ]; then
    ok "label '$name' já existe"
  else
    gh label create "$name" --repo "$REPO" --description "$desc" --color "$color"
    ok "label '$name' criada"
  fi
}

log "Labels por área:"
for ((l = 1; l <= LABEL_COUNT; l++)); do
  lname_lines="$(grep -n '^  - name:' "$SPRINTS_FILE" | cut -d: -f1)"
  lstart="$(printf '%s\n' "$lname_lines" | sed -n "${l}p")"
  lend="$(printf '%s\n' "$lname_lines" | sed -n "$((l + 1))p")"
  [ -z "$lend" ] && lend=999999
  # o campo `name` está na própria linha de início do bloco (indent de 2 espaços)
  lname="$(sed -n "${lstart}p" "$SPRINTS_FILE" | sed -E 's/^[[:space:]]*- name:[[:space:]]*"?([^"]*)"?$/\1/')"
  lcolor="$(sed -n "${lstart},${lend}p" "$SPRINTS_FILE" | sed -n 's/^    color: *//p' | head -n1 | tr -d '"')"
  ldesc="$(sed -n "${lstart},${lend}p" "$SPRINTS_FILE" | sed -n 's/^    desc: *//p' | head -n1 | tr -d '"')"
  create_label "$lname" "$lcolor" "$ldesc"
done

# ---- Processar cada etapa -----------------------------------------------------
find_issue_number() {
  # Retorna o número da issue existente com o título exato, ou vazio.
  local title="$1"
  gh issue list --repo "$REPO" --limit 20 --search "\"${title}\" in:title" \
    --json number,title \
    --jq "map(select(.title == \"${title}\")) | .[0] | .number // empty" 2>/dev/null || true
}

echo
log "Processando $SPRINT_COUNT etapas..."

for ((i = 1; i <= SPRINT_COUNT; i++)); do
  numero="$(get_sprint_field numero "$i")"
  titulo="$(get_sprint_field titulo "$i")"
  descricao="$(get_sprint_field descricao "$i")"
  entregavel="$(get_sprint_field entregavel "$i")"
  responsavel="$(get_sprint_field responsavel "$i")"
  areas="$(get_sprint_field areas "$i")"
  status="$(get_sprint_field status "$i")"

  labels_csv="${areas//, /,}"

  printf '\n\033[1;35m== %s ==\033[0m\n' "$titulo"

  # 1) Issue (idempotente: reusa issue existente com o mesmo título)
  issue_num="$(find_issue_number "$titulo")"
  if [ -n "$issue_num" ] && [ "$FORCE_CREATE" != "1" ]; then
    ok "issue já existe (#$issue_num) — reutilizada"
  elif [ "$DRY_RUN" = "1" ]; then
    warn "(dry) criaria a issue com labels: ${labels_csv:-<nenhuma>}"
    continue
  else
    body="## Descrição
${descricao}

## Entregável (definição de pronto)
${entregavel}

## Responsável sugerido
${responsavel}

## Status inicial
${status}"
    issue_num="$(gh issue create --repo "$REPO" --title "$titulo" --body "$body" \
      ${labels_csv:+--label "$labels_csv"} | sed 's#.*/issues/##')"
    ok "issue criada (#$issue_num)"
  fi

  issue_url="$(gh issue view "$issue_num" --repo "$REPO" --json url --jq '.url')"

  # 2) Labels (atualiza em issues já existentes, para manter coerência)
  if [ -n "${labels_csv:-}" ]; then
    gh issue edit "$issue_num" --repo "$REPO" --add-label "$labels_csv" >/dev/null
    ok "labels aplicadas: $labels_csv"
  fi

  # 3) GitHub Project (Project v2) — idempotente via lista de items
  existing="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
    --jq '.items[].content.url' 2>/dev/null || true)"
  if printf '%s\n' "$existing" | grep -qxF "$issue_url"; then
    ok "já está no projeto #$PROJECT_NUMBER"
  else
    gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$issue_url" >/dev/null
    ok "adicionada ao projeto #$PROJECT_NUMBER"
  fi
done

echo
ok "Sincronização concluída. Confira o projeto em: https://github.com/${REPO}/issues"