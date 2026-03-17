#!/bin/bash
# Sube el proyecto al repo Vaucher-to-PDF en GitHub
# Uso: ./push-to-github.sh TU_USUARIO_GITHUB
# Ejemplo: ./push-to-github.sh juanperez

USER="${1:-$GITHUB_USER}"
if [ -z "$USER" ]; then
  echo "Uso: ./push-to-github.sh TU_USUARIO_GITHUB"
  echo "Ejemplo: ./push-to-github.sh juanperez"
  exit 1
fi

cd "$(dirname "$0")"
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/${USER}/Vaucher-to-PDF.git"
echo "Pushing a https://github.com/${USER}/Vaucher-to-PDF ..."
git push -u origin main
