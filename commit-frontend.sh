set -euo pipefail

DEFAULT_BRANCH="main"    
SCOPE="frontend"          

MSG="${1:-chore(frontend): commit geral $(date +'%Y-%m-%d %H:%M:%S')}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "✖ Rode dentro do repositório git."; exit 1;
}

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "HEAD" ] && BRANCH="$DEFAULT_BRANCH"

echo "➜ Branch atual: $BRANCH"

echo "➜ Atualizando base..."
git fetch origin
git pull --rebase origin "$BRANCH" || true

echo "➜ Adicionando alterações do '$SCOPE/'..."
git add -A "$SCOPE/"

if git diff --cached --quiet; then
  echo "ℹ Nenhuma alteração staged em '$SCOPE/'. Nada a commitar."
  exit 0
fi

echo "➜ Commitando: $MSG"
git commit -m "$MSG"

echo "➜ Enviando para origin/$BRANCH..."
git push origin "$BRANCH"

echo "✅ Pronto! Push feito. A Vercel deve iniciar um deploy automaticamente."
