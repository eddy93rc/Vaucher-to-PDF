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
gh repo create eddyrodriguez/auto-vaucher --public --source=. --remote=origin --push 2>/dev/null || {
  echo "El repo ya existe o hay un error. Intentando push..."
  git push -u origin main
}

echo "✓ Listo: https://github.com/eddyrodriguez/auto-vaucher"
