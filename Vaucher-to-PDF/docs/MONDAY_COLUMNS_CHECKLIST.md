# Verificación de columnas Monday para Voucher Aéreo

Este documento lista **todas las columnas** que debe tener el board RESERVAS en Monday (ID: 18403483965) para generar automáticamente el voucher en el formato del PDF de referencia (VOUCHER BOLETO - FRANCIS DE OLEO).

---

## Estructura en Monday

- **Item principal** (pulse): datos de la reserva y del pasajero
- **Subitems**: un subitem por cada segmento de vuelo

---

## Columnas del ITEM PRINCIPAL (reservation)

| Campo del voucher | Columna Monday sugerida | Tipo Monday | Obligatorio | Ejemplo |
|-------------------|--------------------------|-------------|------------|---------|
| `passenger_full` | Nombre completo pasajero | text | Sí | FRANCIS WILLYS DE OLEO REYES |
| `passenger_voucher` | Nombre voucher (formato IATA) | text | Sí | DEOLEOREYES/FRANCISWILLYS |
| `passenger_list` | Lista pasajeros | long_text | Sí cuando hay varios pasajeros | DEOLEOREYES/FRANCISWILLYS - 9962426250502 |
| `reservation_code` | Código de reservación | text | Sí | 8ZTDP5 |
| `ticket_number` | Número de boleto | text | Sí | 9962426250502 |
| `airline_main` | Aerolínea principal | text | Sí | AIR EUROPA |
| `agency_name` | Nombre agencia | text | No | JYL Consultores Turismo y Eventos |
| `issuing_office` | Oficina emisora | text | No | WEB AIR EUROPA |
| `agency_emergency_phone` | Teléfono emergencias | text | No | 849-919-1919 |
| `issue_date` | Fecha emisión | date | No | 2026-03-07 |
| `departure_date` | Fecha salida | date | No | 2026-03-11 |
| `return_date` | Fecha retorno | date | No | 2026-03-29 |
| `route_summary` | Ruta resumida | text | No | SDQ-MAD-LGW-MAD-SDQ |
| `travel_class` | Clase | text | No | ECONOMY, V |
| `baggage_allowance` | Equipaje | text | No | 1PC |
| `fare_basis` | Fare basis | text | No | VLYRAE |
| `extras` | Recomendaciones / Extras | long-text (listado por línea) | No (default: []) | Cada línea = un bullet en EXTRAS |

---

## Columnas de cada SUBITEM (segmento de vuelo)

| Campo del voucher | Columna subitem Monday | Tipo Monday | Obligatorio | Ejemplo |
|-------------------|------------------------|-------------|------------|---------|
| `segment_number` | (índice 1,2,3...) | — | Sí (orden) | 1 |
| `voucher_heading_date` | Fecha del segmento | date | Sí | 2026-03-11 |
| `voucher_heading_destination` | Ciudad destino encabezado | text | Sí | MADRID ADOLFO SUAREZ BARAJAS |
| `voucher_trip_type` | Tipo viaje | text | Sí | Salida / Retorno |
| `flight_number` | Número de vuelo | text | Sí | UX88 |
| `operated_by` | Operado por | text | Sí | AIR EUROPA |
| `origin_code` | Código origen | text | Sí | SDQ |
| `origin_city` | Ciudad origen | text | No | Santo Domingo |
| `origin_name` | Nombre aeropuerto origen | text | Sí | SANTO DOMINGO LAS AMERICAS INTL |
| `origin_terminal` | Terminal origen | text | No | — |
| `destination_code` | Código destino | text | Sí | MAD |
| `destination_city` | Ciudad destino | text | No | Madrid |
| `destination_name` | Nombre aeropuerto destino | text | Sí | MADRID ADOLFO SUAREZ BARAJAS |
| `destination_terminal` | Terminal destino | text | No | 1 |
| `departure_date` | Fecha salida | date | Sí | 2026-03-11 |
| `departure_time` | Hora salida | text | Sí | 22:50:00 |
| `arrival_date` | Fecha llegada | date | Sí | 2026-03-12 |
| `arrival_time` | Hora llegada | text | Sí | 11:55:00 |
| `duration` | Duración | text | Sí | 08:05 |
| `ticket_number` | Número boleto | text | Sí | (heredado del item) |
| `seat` | Asiento | text | No | - o 12A |
| `seat_assignments` | Asientos pasajeros | long_text | Recomendado cuando hay varios pasajeros | DEOLEOREYES/FRANCISWILLYS=03A |
| `flight_type` | Tipo vuelo | text | No | Vuelo directo / Vuelo con conexión |
| `travel_class` | Clase | text | No | ECONOMY, V |
| `baggage` | Equipaje | text | No | 1PC |
| `fare_basis` | Fare basis | text | No | VLYRAE |

---

## Campos obligatorios mínimos para generar el voucher

**Item principal:**
- `passenger_full`
- `passenger_voucher`
- `passenger_list`
- `reservation_code`
- `ticket_number`
- `airline_main`

**Cada subitem (al menos 1):**
- `flight_number`
- `origin_code`
- `origin_name`
- `destination_code`
- `destination_name`
- `departure_date`
- `departure_time`
- `arrival_date`
- `arrival_time`
- `duration`
- `voucher_heading_date`
- `voucher_heading_destination`
- `voucher_trip_type`
- `operated_by`
- `ticket_number`
- `seat_assignments`

---

## Nota multi-pasajero

Si un tramo tiene mas de un pasajero, un solo campo `seat` no alcanza. En ese caso usa `seat_assignments` con una linea por pasajero para que el generador PDF pueda resolver los asientos correctamente.

## Mapeo automático por título

El endpoint `/render-voucher-by-pulse` mapea columnas de Monday al voucher por **título de columna**. Nombres sugeridos (o similares) para que el mapeo funcione sin configuración:

- Item principal: "Nombre completo pasajero", "Código reservación", "Aerolínea", "Número boleto", "Agencia", "Extras"
- Subitems: "Número vuelo", "Origen código", "Origen ciudad", "Destino código", "Destino ciudad", "Fecha salida", "Hora salida", "Fecha llegada", "Hora llegada", "Duración", "Operado por", "Tipo viaje"

Si tu board usa otros nombres, crea `monday-column-mapping.json` con los IDs de columna (obtén los IDs con `GET /verify-monday-columns`).

## Ver la estructura completa de tu board

Para ver **toda la estructura** (columnas del item, del board de subitems, y valores reales):

```bash
curl -X POST http://localhost:9110/monday-structure \
  -H "Content-Type: application/json" \
  -d '{"pulse_id": "11482380201"}'
```

La respuesta incluye:
- `main_board_columns`: columnas del item principal
- `segment_board_columns`: columnas de los subitems (pueden ser de otro board)
- `item_columns`: valores del item con `column_id`, `column_title`, `column_type`, `value_preview`
- `subitems`: cada subitem con sus columnas y valores

Usa esta salida para crear `monday-column-mapping.json` o entender por qué un campo no se mapea correctamente.

## Verificación contra tu board

Para listar las columnas actuales de tu board:

```graphql
query {
  boards(ids: [18403483965]) {
    columns {
      id
      title
      type
    }
  }
}
```

Ejecuta esta query en la API de Monday (POST a `https://api.monday.com/v2`) con tu `MONDAY_API_KEY` y compara los `id` y `title` de las columnas con esta checklist.

---

## Mapeo para n8n

En n8n, al leer un item con subitems, las columnas vienen como `column_values` con estructura tipo:

- `columns.id` → valor según tipo (text, date, etc.)
- Para `text`: `column_values["text_xxx"].text`
- Para `date`: `column_values["date_xxx"].date`

Debes crear un nodo Code que mapee cada `column_id` de Monday al campo del payload del voucher según esta tabla.
