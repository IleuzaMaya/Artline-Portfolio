#!/usr/bin/env bash
set -euo pipefail

# --- config rápida ---
DEFAULT_BRANCH="main"     # troque se seu padrão não for main
SCOPE="frontend"          # mantém o commit restrito ao diretório frontend/

# Mensagem de commit (usa o argumento ou gera uma padrão)
MSG="${1:-chore(frontend): commit geral $(date +'%Y-%m-%d %H:%M:%S')}"

# Garante que estamos dentro do repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "✖ Rode dentro do repositório git."; exit 1;
}

# Descobre branch atual
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "HEAD" ] && BRANCH="$DEFAULT_BRANCH"

echo "➜ Branch atual: $BRANCH"

# Atualiza com rebase para evitar merge commits
echo "➜ Atualizando base..."
git fetch origin
git pull --rebase origin "$BRANCH" || true

# Adiciona apenas mudanças do diretório frontend/
echo "➜ Adicionando alterações do '$SCOPE/'..."
git add -A "$SCOPE/"

# Nada para commitar?
if git diff --cached --quiet; then
  echo "ℹ Nenhuma alteração staged em '$SCOPE/'. Nada a commitar."
  exit 0
fi

# Commit
echo "➜ Commitando: $MSG"
git commit -m "$MSG"

# Push
echo "➜ Enviando para origin/$BRANCH..."
git push origin "$BRANCH"

echo "✅ Pronto! Push feito. A Vercel deve iniciar um deploy automaticamente."
