# Mapeo Parseur ↔ Monday

Estructura completa del board RESERVAS con IDs para mapear con Parseur y n8n.

---

## IDs de boards

| Concepto | ID |
|----------|-----|
| Board principal (reservas) | `18403483965` |
| Subboard (segmentos/subitems) | `18403484081` |

---

## Columnas del item principal (reserva)

| Parseur (campo global) | Monday columna | Monday column_id |
|------------------------|----------------|------------------|
| `passenger_name` | Pasajero principal | `text_mm1b9vf3` |
| `reservation_code` | PNR / Código reserva | `text_mm1b1b5w` |
| `ticket_number` | Número de boleto | `text_mm1bq9bc` |
| `passengers` (tabla) | Lista pasajeros | `long_text_mm1c70w4` |
| `airline_main` | Aerolínea principal | `text_mm1b4mb1` |
| `passenger_destination` | Destino pasajero | `text_mm1cd796` |
| ... | Ver MONDAY_COLUMNS_CHECKLIST.md | |

**Lista pasajeros:** n8n formatea `passengers` como `APELLIDO/NOMBRE - TICKET`, una línea por pasajero.

---

## Columnas de subitems (tabla `segments`)

| Parseur | Monday columna | Monday column_id |
|---------|----------------|------------------|
| `origin_code`, `origin_name`, `origin_city` | Origen código/nombre/ciudad | `text_mm1ber8k`, `text_mm1b7ra3`, `text_mm1gaa33` |
| `destination_code`, `destination_name`, `destination_city` | Destino código/nombre/ciudad | `text_mm1bc24j`, `text_mm1bqsgh`, `text_mm1gkxb5` |
| `departure_date`, `departure_time` | Salida fecha/hora | `date_mm1bhq59`, `text_mm1bggg` |
| `arrival_date`, `arrival_time` | Llegada fecha/hora | `date_mm1b8wej`, `text_mm1bhp08` |
| *(derivado n8n)* | Salida y llegada | `text_mm1c8jse` |
| `flight_number` | Vuelo | `text_mm1bs18h` |
| ... | Ver MONDAY_COLUMNS_CHECKLIST.md | |
