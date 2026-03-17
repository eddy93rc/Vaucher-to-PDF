# Arquitectura: PDF Extractor con OpenAI + Docker

Este documento describe la nueva arquitectura que reemplaza **Parseur** por un microservicio Docker que usa **OpenAI** (Responses API) para extraer datos de tickets aéreos en PDF.

---

## 1. Visión general

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ Monday          │     │ n8n                │     │ pdf-extractor    │
│ Archivo ticket  │────▶│ Webhook → Descarga  │────▶│ POST /extract    │
│ (PDF subido)    │     │ PDF → POST /extract│     │ (Docker)         │
└─────────────────┘     └─────────────────────┘     └────────┬─────────┘
                                                            │
                                                            │ OpenAI
                                                            │ Responses API
                                                            │ (gpt-4o)
                                                            ▼
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ Monday          │◀────│ n8n                 │◀────│ JSON respuesta  │
│ Item + subitems │     │ Formatear → Mapear  │     │ (passengers,     │
│ (columnas)      │     │ → Crear subitems    │     │  segments, etc)  │
└─────────────────┘     └─────────────────────┘     └──────────────────┘
```

---

## 2. Flujo de datos

1. **Monday** → Nuevo archivo en columna "Archivo ticket" (webhook).
2. **n8n** → Extrae URL pública del PDF, descarga el archivo.
3. **n8n** → `POST /extract` al **pdf-extractor** con:
   - `file`: PDF (multipart/form-data)
   - `monday_pulse_id`: ID del item (opcional si primero se crea el item)
   - `monday_board_id`: ID del board (opcional)
4. **pdf-extractor** → Sube el PDF a OpenAI Files API, llama Responses API con instrucciones y schema JSON.
5. **pdf-extractor** → Devuelve JSON compatible con el flujo actual de n8n.
6. **n8n** → Usa "Formatear Lista Pasajeros" y "Mapear Parseur a Monday" (o equivalentes) como antes.
7. **Monday** → Item actualizado + subitems (segmentos) creados.
8. **Vaucher-to-PDF** → (Opcional) Genera el voucher PDF a partir del `pulse_id`.

---

## 3. Servicio pdf-extractor

### Endpoints

| Método | Ruta       | Descripción                          |
|--------|------------|--------------------------------------|
| POST   | /extract   | Recibe PDF, extrae datos vía OpenAI  |
| GET    | /health    | Health check                         |

### POST /extract

- **Content-Type**: `multipart/form-data`
- **Campos**:
  - `file` (requerido): Archivo PDF del ticket.
  - `monday_pulse_id` (opcional): ID del item en Monday.
  - `monday_board_id` (opcional): ID del board en Monday.

- **Respuesta**: JSON con estructura compatible con "Extraer Datos Parseur":

```json
{
  "document_id": "openai-xxxxxxxx",
  "monday_pulse_id": "123456789",
  "passengers": [
    {
      "passenger_number": 1,
      "passenger_name": "Diaz Contreras Ana",
      "passenger_voucher": "DIAZCONTRERAS/ANAALEXANDRA",
      "passenger_type": "ADT",
      "ticket_number": "9962425484279"
    }
  ],
  "segments": [
    {
      "segment_number": 1,
      "flight_number": "IB658",
      "origin_code": "FCO",
      "destination_code": "MAD",
      "departure_date": "2026-03-26",
      "departure_time": "07:30",
      "arrival_date": "2026-03-26",
      "arrival_time": "10:05",
      "voucher_trip_type": "Salida"
    }
  ],
  "reservation_code": "8ZTDP5",
  "airline_main": "IBERIA"
}
```

---

## 4. Docker

### Build y ejecución

```bash
# Solo pdf-extractor
docker compose up -d pdf-extractor

# Incluir Vaucher-to-PDF
docker compose --profile full up -d

# Variables de entorno (crear .env)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o   # opcional
```

### Puertos

| Servicio         | Puerto |
|------------------|--------|
| pdf-extractor    | 9120   |
| Vaucher-to-PDF   | 9110   |

---

## 5. Cambios en n8n

En lugar de:

```
Descargar PDF → Subir a Parseur → Webhook Parseur (espera callback)
```

Usar:

```
Descargar PDF → POST /extract (pdf-extractor) → JSON directo
```

El nodo "Subir a Parseur" se reemplaza por un **HTTP Request**:

- **URL**: `http://pdf-extractor:9120/extract` (o la URL pública si está en otro host)
- **Method**: POST
- **Body**: multipart-form-data
  - `file`: binario del PDF descargado
  - `monday_pulse_id`: `{{ $('Webhook1').item.json.body.event.pulseId }}`

El nodo "Extraer Datos Parseur" puede mantenerse si se adapta para leer de la respuesta HTTP en lugar de `body` de webhook. La estructura del JSON es la misma.

---

## 6. Nuevo board en Monday

Si se crea un **nuevo board**:

1. Ejecutar `node setup-monday.js` (o adaptar para el nuevo board).
2. Actualizar `MONDAY_BOARD_ID` en `.env` y en el workflow n8n.
3. Los `column_id` (text_mm1..., numeric_mm1...) serán distintos; hay que mapearlos en "Mapear Parseur a Monday" y "Crear Subitem".

---

## 7. Variables de entorno

| Variable          | Uso                                |
|-------------------|------------------------------------|
| OPENAI_API_KEY    | Requerido para pdf-extractor       |
| OPENAI_MODEL      | gpt-4o (default) o gpt-4o-mini    |
| MONDAY_API_TOKEN  | Para setup-monday y Vaucher-to-PDF |
| MONDAY_BOARD_ID   | ID del board RESERVAS              |
