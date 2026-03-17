# Migración n8n: Parseur → PDF Extractor (OpenAI)

Esta guía explica cómo migrar el workflow de Parseur al servicio pdf-extractor con OpenAI.

---

## Cambios principales

| Antes (Parseur) | Después (OpenAI) |
|-----------------|------------------|
| Subir a Parseur (POST async) | Extraer con OpenAI (POST síncrono) |
| Webhook Parseur (callback) | Respuesta directa del HTTP Request |
| Extraer Datos Parseur ($json.body) | Extraer Datos ($json en root) |

---

## Workflow RESERVAS-v3

Importar `services/vaucher-to-pdf/docs/n8n/RESERVAS-v3-openai-import.json` en n8n.

### Flujo

```
Monday (archivo) → extraer file → Extraer asset id → Extraer url S3 → URL Archivo
    → Descargar PDF Monday → Extraer con OpenAI → Extraer Datos
    → Formatear Lista Pasajeros → Mapear Parseur a Monday → Split Out Segments
    → Crear Subitem (por segmento) → Es Último Segmento → Emitir Voucher PDF
```

### Configuración antes de activar

1. **Extraer con OpenAI**: Cambiar la URL si pdf-extractor está en otro host.
   - Por defecto: `http://pdf-extractor:9120/extract` (misma red Docker)
   - Si n8n y pdf-extractor en hosts distintos: `http://TU_HOST:9120/extract`

2. **extraer file**: Verificar `colIds: [ 'file_mm1b99xs' ]` — debe coincidir con el ID de la columna "Archivo ticket" de tu board Monday. Para un **nuevo board**, este ID será distinto. Obtenerlo desde Monday o con `setup-monday.js` al final.

3. **Mapear Parseur a Monday**: Los `text_mm1...`, `numeric_mm1...`, etc. son específicos del board. Para un nuevo board, ejecuta `node setup-monday.js` y usa los IDs que imprime.

4. **Crear Subitem Segmento GraphQL**: Igual, actualizar los `column_id` del subboard.

---

## Nuevo board en Monday

1. Ejecutar setup:
   ```bash
   MONDAY_BOARD_NAME="RESERVAS_NUEVO" node setup-monday.js
   ```
   O editar `setup-monday.js` y cambiar la constante del nombre del board.

2. Al final, el script imprime los IDs de columnas. Copiar esos IDs al workflow n8n en:
   - **extraer file**: `file_mm...` (columna Archivo ticket)
   - **Mapear Parseur a Monday**: todos los `text_mm...`, `date_mm...`, etc.
   - **Crear Subitem Segmento GraphQL**: ids del subboard

3. Actualizar **boardId** en "Mapear Parseur a Monday" con el nuevo board ID.
