# Notas de implementación

## Supuestos realizados

1. **Diseño visual**: Basado en el PDF "VOUCHER BOLETO - FRANCIS DE OLEO": PREPARADO PARA/CÓDIGO/AEROLÍNEA solo en primera página; EXTRAS en cada página; numeración "-- 1 of N --"; paginación: 2 segmentos en página 1, 1 por página en el resto.

2. **Imagen base**: Se usa la imagen oficial de Playwright (`mcr.microsoft.com/playwright:v1.40.0-jammy`) para garantizar Chromium funcional en Docker sin depender de `playwright install` en runtime.

3. **Assets opcionales**: Si no existen `logo.png` o `watermark.png` en `./assets`, la plantilla omite esas imágenes sin fallar.

4. **Múltiples segmentos**: Se fuerza un salto de página entre cada segmento excepto el último. No se replica la paginación exacta del voucher manual (ej. 2 segmentos en una página).

5. **Extras**: Provienen exclusivamente del array `reservation.extras` del payload. No hay lista fija por defecto.

## Reglas de negocio implementadas

| Regla | Implementación |
|-------|----------------|
| Encabezado Retorno/Destino | `viewModelBuilder` según `voucher_trip_type` |
| Día de semana en español | `getWeekdaySpanish()` en dateFormatters |
| Fecha "11 MARZO 2026" | `formatDateLongSpanish()` |
| Asiento `-` si vacío | Schema Zod transform + viewModel default |
| `passenger_voucher` en fila inferior | Inyectado en tabla por segmento |
| `passenger_full` en PREPARADO PARA | Inyectado en bloque |

## Branding configurable

Colocar en `./assets`:
- `logo.png` o `logo.svg`: logo principal de la agencia
- `watermark.png` o `watermark.svg`: marca de agua de fondo

Los colores y fuentes se pueden ajustar en `templates/voucher.css` (variables de diseño en bloque header, flight-card, etc.).

## Endpoint `/render-voucher-and-upload`

Implementado:
- Recibe el payload del voucher + `item_id` (pulse ID del item en Monday)
- Genera el PDF
- Sube a la columna `file_mm1bxc89` del board `18403483965`
- Variables de entorno: `MONDAY_API_KEY`, `MONDAY_BOARD_ID`, `MONDAY_FILE_COLUMN_ID`

## Integración n8n

- Puerto por defecto: **9110**
- URL de ejemplo en red interna: `http://10.10.12.33:9110`
- n8n debe hacer POST a `http://10.10.12.33:9110/render-voucher` con el payload JSON (reservation + segments)
- El contenedor escucha en todas las interfaces (0.0.0.0), permitiendo conexiones desde la red
