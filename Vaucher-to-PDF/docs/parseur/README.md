# Parseur: Buzón Ticket Aereo

El buzón **Ticket Aereo** extrae datos estructurados de tickets PDF de aerolíneas (en español) usando IA.

## Estructura de datos

| Tipo | Uso en Monday |
|------|---------------|
| **Campos globales** (19) | Item principal |
| **Tabla passengers** | Columna "Lista pasajeros" (formateada por n8n) |
| **Tabla segments** | Subitems (uno por tramo de vuelo) |

## Campos globales principales

- `passenger_name`, `reservation_code`, `ticket_number`, `airline_main`
- `origin_main_code`, `destination_final_code`, `passenger_destination`
- `departure_date`, `return_date`, `trip_type`, `segment_count`
- `travel_class`, `baggage_allowance`, `fare_basis`, `booking_status`

## Tabla passengers

- `passenger_number`, `passenger_name`, `ticket_number`

## Tabla segments

- `segment_number`, `flight_number`, `voucher_heading_date`, `voucher_heading_destination`, `voucher_trip_type`
- `origin_code`, `origin_name`, `origin_city`, `origin_terminal`
- `destination_code`, `destination_name`, `destination_city`, `destination_terminal`
- `departure_date`, `departure_time`, `arrival_date`, `arrival_time`, `duration`
- `travel_class`, `baggage`, `fare_basis`, `ticket_number`, `seat`

## Webhook

Parseur envía los datos extraídos a n8n por webhook. n8n debe validar el header `x-parseur-secret`.

## Configuración manual (si API devuelve 409)

Si la API no permite añadir campos a buzones existentes:
- Añadir `passenger_destination` y tabla `passengers` manualmente en app.parseur.com
