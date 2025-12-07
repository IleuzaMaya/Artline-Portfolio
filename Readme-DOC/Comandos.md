✅ Fluxo diário (pull → editar → commit → push)

git status                          # ver o que mudou
git pull                            # trazer mudanças remotas
git add .                           # preparar tudo p/ commit (ou git add caminho/arquivo)
git commit -m "mensagem objetiva"   # criar commit
git push                            # enviar p/ remoto (branch atual)


✅ Trabalhando em branches

git checkout -b feat/minha-feature   # criar e entrar numa nova branch
git switch main                      # voltar p/ main (ou: git checkout main)
git pull                             # atualizar a main
git merge feat/minha-feature         # mesclar a feature na main (resolve conflitos se houver)
git push                             # enviar a main atualizada


✅ Rebase (opcional, histórico limpo)

git switch feat/minha-feature
git fetch origin
git rebase origin/main               # “reaplica” seus commits sobre a main mais recente
# se houver conflitos: resolva nos arquivos, depois:
git add .
git rebase --continue
git push --force-with-lease          # atualiza a branch remota com segurança


✅ Ajustar o último commit

git add arquivo-que-esqueci.js
git commit --amend                   # altera mensagem e/ou inclui novos arquivos
git push --force-with-lease          # se já tinha feito push do commit anterior


✅ Desfazer coisas com segurança

git restore arquivo.jsx              # descarta mudanças locais NÃO comitadas nesse arquivo
git restore --staged arquivo.jsx     # tira do stage (volta para “modified”)
git reset --soft HEAD~1              # volta 1 commit mantendo alterações no stage
git reset --mixed HEAD~1             # volta 1 commit mantendo alterações (não staged)
git reset --hard HEAD~1              # ⚠️ apaga commit e alterações (irrecuperável)


✅ Stash (guardar alterações sem commit)

git stash               # guarda alterações locais
git stash list          # lista “pacotes” guardados
git stash pop           # reaplica e remove da pilha
git stash apply stash@{n}   # reaplica um stash específico (mantém na pilha)


✅ Tags (versões)

git tag v1.0.0
git push origin v1.0.0
# anotada (com mensagem):
git tag -a v1.0.0 -m "Primeira versão"
git push origin --tags


✅ Reverter um commit que já está no remoto

git log --oneline
git revert <hash_do_commit>      # cria um commit que desfaz o commit alvo
git push


✅ Configuração inicial (uma vez por máquina)

git config --global user.name "Seu Nome"
git config --global user.email "seuemail@exemplo.com"


✅ Primeiro push de um repositório novo

git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main


✅ Histórico rápido e bonito

git log --oneline --graph --decorate --all


✅ (Opcional) Usar SSH em vez de HTTPS

ssh-keygen -t ed25519 -C "seuemail@exemplo.com"
# adicione a chave pública (~/.ssh/id_ed25519.pub) no GitHub → Settings → SSH and GPG keys
git remote set-url origin git@github.com:SEU_USUARIO/SEU_REPO.git


=====================

🟩  Branches do projeto

main: produção (o que está na Vercel + Supabase)

dev: integração/testes (deploy opcional em preview)

feat/*: novas features

fix/*: correções de bug

hotfix/*: correção urgente direto para produção

chore/*: manutenção (deps, build, CI, etc.)

Exemplos:

feat/orcamento-entre-vidros
fix/admin-reset-password
hotfix/fix-env-prod
chore/update-deps-2025-12


🟩 Convenção de commits (Conventional Commits)

Use prefixos para padronizar e facilitar changelog:

feat: nova funcionalidade

fix: correção de bug

docs: documentação (README, comentários)

style: formatação sem mudar lógica (prettier, css)

refactor: refatoração sem alterar comportamento

perf: performance

test: testes

chore: manutenção (deps, scripts, CI)

Exemplos reais do seu repo:
feat(admin): fluxo “definir minha senha” com supabase.auth.updateUser
fix(favicon): alterna ícone claro/escuro via prefers-color-scheme
feat(orcamento): regra de reforço manual p/ profundidade < 3cm
chore(supabase): deploy função ping com --no-verify-jwt


🟩 Fluxos prontos
1) Nova feature (ex.: reforço manual no Orçamento)

git switch dev
git pull
git checkout -b feat/orcamento-reforco-manual

# — edite, teste, commit —
git add .
git commit -m "feat(orcamento): reforço manual quando profundidade < 3cm"

git push -u origin feat/orcamento-reforco-manual
# Abra PR: feat/orcamento-reforco-manual → dev


2) Subir dev → main (release)

git switch dev
git pull
git switch main
git pull
git merge --no-ff dev -m "chore(release): merge dev into main"
git push


3) Hotfix direto para produção

git switch main
git pull
git checkout -b hotfix/fix-icone-favicon
# — edite, teste —
git add .
git commit -m "fix(favicon): corrige fallback e cache-control"
git push -u origin hotfix/fix-icone-favicon
# PR: hotfix/fix-icone-favicon → main (merge)
git switch dev
git pull
git merge main
git push


🟩 Tags e versões

Quando publicar algo importante na main, crie uma tag:

git switch main
git pull
git tag -a v0.5.0 -m "Orçamento: reforço manual, EV margin, ícones"
git push origin v0.5.0


🟩 Arquivos sensíveis e .gitignore (multi-package)

Crie/complete um .gitignore na raiz:
# Node / Vite
node_modules/
dist/
.build/
.cache/
coverage/

# Ambiente
.env
.env.*
!.env.example

# SO/Editor
.DS_Store
.vscode/

# Vercel
.vercel/

# Supabase
.supabase/
supabase/.temp/

Crie um .env.example na raiz (sem segredos):

# FRONTEND
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_FUNCTIONS_URL=
VITE_ADMIN_API_TOKEN=

# BACKEND (se usar)
API_BASE_URL=


🟩 Hook de commit (opcional, mas recomendado)

Para evitar “commit quebrado”, adicione um pre-commit simples na raiz:

.husky/pre-commit (se usar Husky)
ou .githooks/pre-commit (hook nativo):

#!/usr/bin/env bash
echo "🔎 Rodando checks..."
# formata e verifica rapidamente frontend
if [ -d "frontend" ]; then
  (cd frontend && npm run -s lint || true)
  (cd frontend && npm run -s typecheck || true)
fi
# checagens do backend se existirem
if [ -d "backend" ]; then
  (cd backend && npm run -s lint || true)
fi
echo "✅ OK (ou warnings ignorados)."


Para githooks nativos:

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit


🟩 Scripts sugeridos (frontend)

No frontend/package.json:

{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint --ext .js,.jsx src || true",
    "typecheck": "tsc --noEmit || true"
  }
}

🟩 Fluxo de commit no VS Code (UI)

1. Source Control (ícone do Git) → digite mensagem → ✓ Commit

2. “Publish/Sync changes” (⭮) para push

3. Para branch nova: ... → Branch → Create Branch → digite o nome → Publique.

🔸 PR checklist (curto)

    ▫️ Build passou (local ou CI)

    ▫️ Testei no navegador (login, orçamentos, Admin/Reset)

    ▫️ Variáveis de ambiente ok na Vercel/Supabase

    ▫️ Sem segredos em .env.example / commits

    ▫️ Título/descrição do PR claros

🟩 Atualizar a sua branch com dev (rebase limpo)
git switch feat/orcamento-reforco-manual
git fetch origin
git rebase origin/dev
# resolva conflitos → git add .
git rebase --continue
git push --force-with-lease

🟩  Recuperar de erro comum

Esqueci arquivo no commit:
git add ARQUIVO && git commit --amend → se já deu push, git push --force-with-lease

Voltar 1 commit mantendo alterações:
git reset --soft HEAD~1

Descartar modificações de um arquivo:
git restore caminho/arquivo


=======

Resumo:

# vá para a raiz do repo
cd /Users/michellemaya/Downloads/IleuzaMaya/art-emoldurados-webapp

# garante a pasta de hooks nativos
mkdir -p .githooks

# ---- .gitignore ----
cat > .gitignore << 'EOF'
# Node / Vite
node_modules/
dist/
.build/
.cache/
coverage/

# Ambiente
.env
.env.*
!.env.example

# SO/Editor
.DS_Store
.vscode/

# Vercel
.vercel/

# Supabase
.supabase/
supabase/.temp/
EOF

# ---- .githooks/pre-commit ----
cat > .githooks/pre-commit << 'EOF'
#!/usr/bin/env bash
set -e

echo "🔎 Rodando checks (lint/typecheck quando disponíveis)..."

# Frontend
if [ -d "frontend" ]; then
  if [ -f "frontend/package.json" ]; then
    (cd frontend && npm run -s lint || true)
    (cd frontend && npm run -s typecheck || true)
  fi
fi

# Backend (se tiver)
if [ -d "backend" ]; then
  if [ -f "backend/package.json" ]; then
    (cd backend && npm run -s lint || true)
  fi
fi

echo "✅ Pre-commit: OK (erros fatais parariam aqui; warnings foram ignorados)."
EOF

# deixa o hook executável
chmod +x .githooks/pre-commit

# aponta o Git para usar essa pasta de hooks
git config core.hooksPath .githooks

# ---- .env.example ----
cat > .env.example << 'EOF'
# ===============================
# FRONTEND (Vite + React)
# ===============================
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_FUNCTIONS_URL=
VITE_ADMIN_API_TOKEN=

# (opcional) título default do Helmet
VITE_APP_TITLE=Artemoldurados

# ===============================
# BACKEND (se aplicável)
# ===============================
API_BASE_URL=
EOF


Commit:
 - Tudo (inclui novos/excluídos/renomeados):

git status
git add -A

 - Apenas alguns arquivos (se quiser selecionar):

 git add frontend/src/pages/Admin.jsx frontend/src/pages/Orcamento.jsx

 - Só parte de um arquivo (interativo):

git add -p frontend/src/pages/Orcamento.jsx

 - Conferir o que vai entrar no commit:

 git diff --staged

 - Comitar

 git commit -m "feat(admin): reset de senha e ajustes de listagem"
# ou
git commit -m "fix(orcamento): corrige cálculo de reforço e bloqueios de M2/M3"
# ou
git commit -m "chore(ui): troca favicon e título via Helmet"

