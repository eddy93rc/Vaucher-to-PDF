# PDF Extractor (OpenAI)

Microservicio que extrae datos estructurados de tickets aéreos en PDF usando **OpenAI Responses API** (gpt-4o). Sustituye a Parseur en el flujo n8n → Monday.

## Uso

```bash
# Desarrollo
npm run dev

# Producción
npm run build && npm start

# Docker
docker build -t pdf-extractor .
docker run -p 9120:9120 -e OPENAI_API_KEY=sk-... pdf-extractor
```

## Endpoints

### POST /extract

Recibe un PDF y devuelve JSON compatible con n8n.

**Body** (multipart/form-data):
- `file` (requerido): archivo PDF
- `monday_pulse_id` (opcional): ID del item en Monday
- `monday_board_id` (opcional): ID del board

**Ejemplo curl**:
```bash
curl -X POST http://localhost:9120/extract \
  -F "file=@ticket.pdf" \
  -F "monday_pulse_id=123456789"
```

### GET /health

Estado del servicio.

## Variables de entorno

| Variable        | Requerido | Default |
|-----------------|-----------|---------|
| OPENAI_API_KEY  | Sí        | -       |
| OPENAI_MODEL    | No        | gpt-4o  |
| PORT            | No        | 9120    |
| UPLOAD_DIR      | No        | /tmp/pdf-extractor |
