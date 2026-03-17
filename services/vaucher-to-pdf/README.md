# Voucher PDF Generator

Microservicio Docker para generar PDFs de vouchers aéreos automáticamente a partir de un payload JSON. Diseñado para integrarse con flujos Monday + Parseur + n8n.

## Propósito

Reemplazar DocuGen (o servicios externos) con un servicio propio que:
- Recibe datos estructurados desde n8n
- Renderiza un voucher PDF con diseño profesional
- Soporta múltiples segmentos (vuelos)
- Devuelve el PDF listo para subir a Monday

## Levantar con Docker

1. Crea un `.env` a partir de `.env.example` y define `MONDAY_API_KEY` (requerido para subir a Monday):

```bash
cp .env.example .env
# Edita .env y añade tu MONDAY_API_KEY
```

2. Levanta el servicio:

```bash
docker-compose up -d --build
```

El servicio queda disponible en `http://localhost:9110`.

## Probar con curl

**Health check:**
```bash
curl http://localhost:9110/health
```

**Generar PDF (respuesta inline):**
```bash
curl -X POST http://localhost:9110/render-voucher \
  -H "Content-Type: application/json" \
  -d @docs/examples/example-payload.json \
  --output voucher.pdf
```

**Generar PDF con descarga forzada (attachment):**
```bash
curl -X POST "http://localhost:9110/render-voucher?download=1" \
  -H "Content-Type: application/json" \
  -d @docs/examples/example-payload.json \
  -o voucher.pdf
```

**Generar PDF y guardar en disco (carpeta ./output):**
```bash
curl -X POST "http://localhost:9110/render-voucher?save=1" \
  -H "Content-Type: application/json" \
  -d @docs/examples/example-payload.json \
  --output voucher.pdf
```

**Generar PDF y subir a Monday:**
```bash
curl -X POST http://10.10.12.33:9110/render-voucher-and-upload \
  -H "Content-Type: application/json" \
  -d @docs/examples/example-upload-payload.json
```
*(Sustituye `item_id` en el JSON por el pulse ID real del item en Monday.)*

## Estructura del payload

Ver `docs/examples/example-payload.json` para la estructura completa. Resumen:

- **reservation**: datos globales del pasajero (nombre, código reserva, aerolínea, extras, etc.)
- **segments**: lista de segmentos de vuelo (origen, destino, fechas, número de vuelo, etc.)

Campos obligatorios principales:
- `reservation.passenger_full`, `passenger_voucher`, `reservation_code`, `airline_main`, `extras`
- `segments[].flight_number`, `origin_code`, `destination_code`, `departure_date`, `arrival_date`, etc.

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Estado del servicio |
| `/render-voucher` | POST | Genera y devuelve el PDF (payload completo en body) |
| `/render-voucher-by-pulse` | POST | Genera PDF a partir del **pulse_id**: obtiene datos de Monday automáticamente |
| `/render-voucher-and-upload` | POST | Genera PDF y lo sube a Monday (columna `file_mm1bxc89`) |
| `/verify-monday-columns` | GET | Lista columnas del board Monday para verificar mapeo |

Query params para `/render-voucher`:
- `download=1`: fuerza `Content-Disposition: attachment`
- `save=1`: guarda también en `./output`

## Limitaciones

- El diseño se basa en especificación textual; puede requerir ajustes al comparar con el voucher manual real.
- Branding (logos, marca de agua) se configura colocando archivos en `./assets`.
- Sin autenticación; asumir red interna o proxy con auth.

## Integración con n8n y Monday

El servicio escucha en el puerto **9110** para que n8n pueda consumirlo desde la red interna.

**URL del servicio (ejemplo en red interna):**
```
http://10.10.12.33:9110
```

**Configuración en n8n (nodo HTTP Request):**
- **Método:** POST
- **URL:** `http://10.10.12.33:9110/render-voucher`
- **Body Content Type:** JSON
- **Body:** objeto con `reservation` y `segments` (mapeado desde Monday)
- **Response Format:** File (para recibir el PDF binario)

1. En n8n: nodo **HTTP Request** → POST a `http://10.10.12.33:9110/render-voucher` con body del item de Monday.
2. Configurar respuesta como binaria para recibir el PDF.
3. Nodo **Monday**: subir el archivo binario al item correspondiente.

**Renderizar desde pulse_id (`/render-voucher-by-pulse`):**
- Body: `{ "pulse_id": "1234567890" }` — la app obtiene el item y subitems de Monday, mapea columnas por título y genera el PDF.
- Query `?upload=1` — además de devolver el PDF, lo sube a la columna de archivos del mismo item.

**Renderizar y subir directamente a Monday (`/render-voucher-and-upload`):**
- El body debe incluir `reservation`, `segments` y `item_id` (pulse ID del item en Monday).
- El PDF se genera y se sube a la columna `file_mm1bxc89` del item indicado.
- Requiere `MONDAY_API_KEY` en el `.env` o en las variables del contenedor.

## Verificación de columnas Monday

Para comprobar si tu board RESERVAS tiene las columnas necesarias:

```bash
curl http://10.10.12.33:9110/verify-monday-columns
```

Revisa también `docs/MONDAY_COLUMNS_CHECKLIST.md` con la lista completa de columnas requeridas para el formato del voucher.

## Arquitectura del ecosistema

Este microservicio forma parte del flujo **Auto-Vaucher**:

**Monday** (ticket) → **n8n** → **Parseur** (extrae) → **n8n** (mapea) → **Vaucher-to-PDF** (genera voucher)

Ver [docs/ARCHITECTURE_FULL.md](docs/ARCHITECTURE_FULL.md) para la arquitectura completa de Parseur, Monday y n8n.

## Scripts de setup

- `scripts/setup-monday.js` – Crea board RESERVAS y columnas en Monday (requiere `MONDAY_API_TOKEN`)
- `scripts/setup-parseur.js` – Crea buzón Ticket Aereo en Parseur (requiere `PARSEUR_API_KEY`)

## Estructura del proyecto

```
├── docs/                    # Documentación
│   ├── ARCHITECTURE_FULL.md  # Arquitectura Parseur/Monday/n8n
│   ├── PROMPT_APP_GENERADOR_PDF.md  # Especificación para la app
│   ├── analysis/            # Análisis de tickets y vouchers
│   ├── fixes/               # Correcciones n8n, Parseur, render
│   ├── setup/               # Configuración Parseur, Monday, proyecto
│   ├── parseur/             # Buzón Ticket Aereo
│   ├── monday/               # Board RESERVAS, mapeo
│   ├── n8n/                  # Workflow RESERVAS
│   ├── examples/            # Payloads de ejemplo
│   └── MONDAY_COLUMNS_CHECKLIST.md
├── scripts/                  # Setup Monday y Parseur
├── src/                      # Código fuente TypeScript
├── templates/                # Plantilla HTML/CSS del voucher
├── assets/                   # Logos y marca de agua
├── output/                   # PDFs guardados (volume Docker)
├── Dockerfile
└── docker-compose.yml
```
