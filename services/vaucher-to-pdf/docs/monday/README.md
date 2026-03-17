# Monday: Board RESERVAS

## IDs

| Concepto | ID |
|----------|-----|
| Board principal | `18403483965` |
| Subboard (segmentos) | `18403484081` |

## Item principal (reserva)

Columnas principales: Pasajero, PNR, Lista pasajeros, Aerolínea, Fechas, Origen/Destino, Archivo ticket, Voucher PDF, Estado Parseur, etc.

Ver [MAPPING.md](MAPPING.md) para el mapeo completo Parseur → column_id.

## Subitems (segmentos)

Un subitem por cada tramo de vuelo. Columnas: Segmento #, Vuelo, Origen/Destino (código, nombre, ciudad), Salida/Llegada (fecha, hora), Salida y llegada (formato unificado), Duración, Asiento, etc.

## Columnas clave para el voucher

- `long_text_mm1c70w4` – Lista pasajeros (APELLIDO/NOMBRE - TICKET, una línea por pasajero)
- `text_mm1c8jse` – Salida y llegada (ej. "SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55 +1")
- `text_mm1bxc89` – Voucher PDF (columna de archivos donde se sube el PDF)
