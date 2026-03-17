# Mapeo de columnas Monday - RESERVAS

Referencia de columnas del board RESERVAS para el flujo n8n.

**Board principal:** 18403483965  
**Subboard (segmentos):** 18403484081

---

## Columnas del item principal (reserva)

| Columna | column_id | Tipo | Origen Parseur |
|---------|-----------|------|----------------|
| Pasajero principal | `text_mm1b9vf3` | text | passenger_name |
| PNR / Código reserva | `text_mm1b1b5w` | text | reservation_code |
| Número de boleto | `text_mm1bq9bc` | text | ticket_number |
| Lista pasajeros | `long_text_mm1c70w4` | long_text | tabla passengers |
| Aerolínea principal | `text_mm1b4mb1` | text | airline_main |
| Fecha emisión ticket | `date_mm1bw16n` | date | issue_date |
| Origen principal | `text_mm1b8rv7` | text | origin_main_code |
| Destino final | `text_mm1bxfa3` | text | destination_final_code |
| Destino pasajero | `text_mm1cd796` | text | passenger_destination |
| Ruta general | `long_text_mm1bpk6w` | long_text | route_summary |
| Fecha salida | `date_mm1bshfd` | date | departure_date |
| Fecha regreso | `date_mm1bqrzy` | date | return_date |
| Tipo viaje | `color_mm1b30rv` | status | trip_type |
| Cantidad segmentos | `numeric_mm1bhwn0` | numbers | segment_count |
| Clase | `text_mm1b7ycn` | text | travel_class |
| Equipaje | `text_mm1bk9hf` | text | baggage_allowance |
| Fare basis | `text_mm1bacys` | text | fare_basis |
| Estado reserva | `color_mm1b1pjr` | status | booking_status |
| DocumentID Parseur | `text_mm1b1eh` | text | — |
| Correo cliente | `email_mm1bapge` | email | — |
| Teléfono cliente | `phone_mm1bs0mp` | phone | — |
| Correo agencia | `email_mm1bzm83` | email | — |
| Teléfono agencia | `phone_mm1b5c7a` | phone | — |

### Columnas nuevas (destino pasajero + múltiples pasajeros)

| Columna | column_id | Origen | Uso en n8n |
|---------|-----------|--------|------------|
| Destino pasajero | `text_mm1cd796` | passenger_destination | Mapeo directo |
| Lista pasajeros | `long_text_mm1c70w4` | tabla passengers | Formatear: APELLIDO/NOMBRE - TICKET, una línea por pasajero |

---

## Subitems (segmentos) – sin cambios

El flujo de subitems para segments NO cambia. Ver MONDAY_PARSEUR_MAPPING.md para el mapeo completo de la tabla segments.

---

## Nota sobre IDs

Monday asigna los IDs automáticamente. Los valores anteriores corresponden al board 18403483965. Si el script crea un board nuevo, los IDs serán distintos. Ejecuta `node setup-monday.js` y usa el resumen final para obtener los IDs actuales.
