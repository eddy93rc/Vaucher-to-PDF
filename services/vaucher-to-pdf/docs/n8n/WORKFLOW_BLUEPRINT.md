# n8n workflow blueprint

Flujo objetivo:

1. Monday detecta archivo nuevo en `Archivo ticket`.
2. n8n descarga el PDF y lo envía al buzón `Ticket Aereo` de Parseur.
3. Parseur llama el webhook de n8n con campos globales, `passengers` y `segments`.
4. n8n normaliza la reserva:
   - `Pasajero principal` = `passengers[0].passenger_name`
   - `Nombre voucher` = `passengers[0].passenger_voucher || passengers[0].passenger_name`
   - `Número de boleto` = `passengers[0].ticket_number || ticket_number`
   - `Lista pasajeros` = una línea por pasajero `APELLIDO/NOMBRE - TICKET`
   - `Aerolínea principal` = primera de `segments[].marketing_airline || segments[].operated_by`
   - `Aerolíneas involucradas` = lista única de marketing/operadora
   - `Extras` = texto fijo de agencia o plantilla por defecto
5. n8n actualiza el item principal en Monday.
6. n8n reemplaza subitems existentes y crea uno por cada segmento.
7. n8n llama `POST /render-voucher-by-pulse?upload=1`.

## Reglas duras

- Error si falta `reservation_code`
- Error si `passengers.length === 0`
- Error si `segments.length === 0`
- Error si hay más pasajeros que tickets útiles y no existe `ticket_number` global
- Error si llegada < salida dentro del mismo segmento

## Campos mínimos por subitem

- `Segmento #`
- `Tipo tramo`
- `Fecha encabezado voucher`
- `Destino voucher`
- `Vuelo`
- `Marketing airline`
- `Operado por`
- `Origen código`
- `Origen nombre`
- `Origen ciudad`
- `Origen terminal`
- `Destino código`
- `Destino nombre`
- `Destino ciudad`
- `Destino terminal`
- `Salida fecha`
- `Salida hora`
- `Llegada fecha`
- `Llegada hora`
- `Duración`
- `Clase segmento`
- `Estado segmento`
- `Equipaje segmento`
- `Fare basis segmento`
- `Ticket No.`
- `Asiento`
- `Asientos pasajeros`

## Formato esperado para `Asientos pasajeros`

```text
DEOLEOREYES/FRANCISWILLYS=03A
RAMIREZPEREZ/ANGELMANUEL=03D
```
