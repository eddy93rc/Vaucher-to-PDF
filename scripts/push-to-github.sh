#!/bin/bash
# Sube el proyecto a GitHub.
# Requiere: gh auth login (una vez) o GH_TOKEN en el entorno.

set -e
cd "$(dirname "$0")/.."

if ! gh auth status &>/dev/null; then
  echo "GitHub CLI no está autenticado. Ejecutando gh auth login..."
  gh auth login --web --git-protocol https
fi

echo "Creando repositorio y subiendo..."
gh repo create eddy93rc/Vaucher-to-PDF --public --source=. --remote=origin --push 2>/dev/null || {
  echo "Intentando push..."
  GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes" git push -u origin main
}

echo "✓ Listo: https://github.com/eddy93rc/Vaucher-to-PDF"
