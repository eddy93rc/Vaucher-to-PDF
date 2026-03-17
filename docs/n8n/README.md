# Workflow n8n - PDF Extractor (OpenAI)

## Importar

1. En n8n: **Workflows** → menú (⋮) → **Import from File**
2. Seleccionar: `docs/n8n/RESERVAS-v3-openai-import.json`
3. Configurar credenciales de Monday (Header Auth)
4. **Importante:** Ajustar la URL del nodo **"Extraer con OpenAI"**

## Flujo

```
Monday (archivo en columna) → Webhook n8n → extraer file → Extraer asset id
  → Extraer url S3 → URL Archivo → Descargar PDF Monday
  → Extraer con OpenAI (Docker pdf-extractor → OpenAI API)
  → Extraer Datos → Formatear Lista Pasajeros → Mapear a Monday
  → Crear subitems (segmentos) → Emitir Voucher PDF
```

## URL del pdf-extractor

En el nodo **"Extraer con OpenAI"**, la URL debe apuntar al contenedor:

| Escenario | URL |
|-----------|-----|
| n8n y pdf-extractor en la misma red Docker | `http://pdf-extractor:9120/extract` |
| n8n en el host, pdf-extractor en Docker | `http://localhost:9120/extract` |
| n8n y Docker en servidores distintos | `http://IP_SERVIDOR:9120/extract` |

## Requisitos

1. **pdf-extractor** en marcha: `docker compose up -d pdf-extractor`
2. **OPENAI_API_KEY** en el `.env` del pdf-extractor
3. Webhook de Monday configurado para la columna "Archivo ticket"
4. Columna `file_mm1b99xs`: verificar que coincida con tu board (cambiar si es nuevo board)
