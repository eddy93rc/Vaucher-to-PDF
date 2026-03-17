# Mapeo Monday ↔ Parseur

Estructura completa del board RESERVAS con IDs reales para mapear con la respuesta de Parseur.

---

## IDs de boards

| Concepto | ID |
|----------|-----|
| Board principal (reservas) | `18403483965` |
| Subboard (segmentos/subitems) | `18403484081` |

---

## Columnas del item principal (reserva)

Mapeo: Parseur → Monday

| Parseur (campo global) | Monday columna | Monday column_id |
|------------------------|----------------|------------------|
| `passenger_name` | Pasajero principal | `text_mm1b9vf3` |
| `reservation_code` | PNR / Código reserva | `text_mm1b1b5w` |
| `ticket_number` | Número de boleto | `text_mm1bq9bc` |
| `passengers` (tabla) | Lista pasajeros | `long_text_mm1c70w4` |
| `airline_main` | Aerolínea principal | `text_mm1b4mb1` |
| `issue_date` | Fecha emisión ticket | `date_mm1bw16n` |
| `origin_main_code` | Origen principal | `text_mm1b8rv7` |
| `destination_final_code` | Destino final | `text_mm1bxfa3` |
| `passenger_destination` | Destino pasajero | `text_mm1cd796` |
| `route_summary` | Ruta general | `long_text_mm1bpk6w` |
| `departure_date` | Fecha salida | `date_mm1bshfd` |
| `return_date` | Fecha regreso | `date_mm1bqrzy` |
| `trip_type` | Tipo viaje | `color_mm1b30rv` |
| `segment_count` | Cantidad segmentos | `numeric_mm1bhwn0` |
| `travel_class` | Clase | `text_mm1b7ycn` |
| `baggage_allowance` | Equipaje | `text_mm1bk9hf` |
| `fare_basis` | Fare basis | `text_mm1bacys` |
| `booking_status` | Estado reserva | `color_mm1b1pjr` |

**Nota sobre múltiples pasajeros:** La tabla `passengers` de Parseur se mapea a "Lista pasajeros" (long_text). n8n debe formatear: por cada fila de `passengers`, concatenar `APELLIDO/NOMBRE - TICKET` y unir con salto de línea. Ejemplo: `DEOLEO/FRANCIS - 9962426250502\nRAMIREZ/ANGEL - 2302154387478`.

**Columnas no mapeables desde Parseur (archivos / otros):**
| Columna | column_id |
|---------|-----------|
| Name | `name` |
| Leer ticket | `color_mm1byxme` |
| Archivo ticket | `file_mm1b99xs` |
| Voucher PDF | `file_mm1bxc89` |
| Itinerario PDF | `file_mm1bmp0v` |
| Factura PDF | `file_mm1bzsh` |
| Recibo PDF | `file_mm1bcm37` |
| Estado Parseur | `color_mm1by1dx` |
| DocumentID Parseur | `text_mm1b1eh` |
| Correo cliente | `email_mm1bapge` |
| Teléfono cliente | `phone_mm1bs0mp` |
| Correo agencia | `email_mm1bzm83` |
| Teléfono agencia | `phone_mm1b5c7a` |
| Subitems | `subtasks_mm1bcags` |

---

## Columnas de subitems (tabla `segments` de Parseur)

Mapeo: `segments[i].*` → subitem columnas

| Parseur (segments) | Monday columna | Monday column_id |
|--------------------|----------------|------------------|
| `segment_number` | Segmento # | `numeric_mm1bn62n` |
| `voucher_heading_date` | Fecha encabezado voucher | `date_mm1bdr4b` |
| `voucher_heading_destination` | Destino voucher | `text_mm1b2khv` |
| `voucher_trip_type` | Tipo tramo | `color_mm1bj7np` |
| `flight_number` | Vuelo | `text_mm1bs18h` |
| `operated_by` | Operado por | `text_mm1bdzkw` |
| `origin_code` | Origen código | `text_mm1ber8k` |
| `origin_name` | Origen nombre | `text_mm1b7ra3` |
| `origin_city` | Origen ciudad | `text_mm1gaa33` |
| `origin_terminal` | Origen terminal | `text_mm1byh8c` |
| `destination_code` | Destino código | `text_mm1bc24j` |
| `destination_name` | Destino nombre | `text_mm1bqsgh` |
| `destination_city` | Destino ciudad | `text_mm1gkxb5` |
| `destination_terminal` | Destino terminal | `text_mm1b8xev` |
| `departure_date` | Salida fecha | `date_mm1bhq59` |
| `departure_time` | Salida hora | `text_mm1bggg` |
| `arrival_date` | Llegada fecha | `date_mm1b8wej` |
| `arrival_time` | Llegada hora | `text_mm1bhp08` |
| *(derivado en n8n)* | Salida y llegada | `text_*` (ver N8N_SALIDA_LLEGADA.md) |
| `duration` | Duración | `text_mm1bg1g3` |
| `travel_class` | Clase segmento | `text_mm1bp2sm` |
| `booking_status` | Estado segmento | `color_mm1b3vt0` |
| `baggage` | Equipaje segmento | `text_mm1b9824` |
| `fare_basis` | Fare basis segmento | `text_mm1bdxdz` |
| `ticket_number` | Ticket No. | `text_mm1bevde` |
| `seat` | Asiento | `text_mm1bhvz6` |

**Columnas de subitem no mapeables desde Parseur:**
| Columna | column_id |
|---------|-----------|
| Name | `name` |
| Owner | `person` |
| Estado | `status` |
| Date | `date0` |

---

## Valores de status para columnas tipo color/status

### Tipo viaje (`color_mm1b30rv`)
- `Solo ida`
- `Ida y vuelta`
- `Multiciudad`

### Estado reserva (`color_mm1b1pjr`)
- `Pendiente`
- `Confirmada`
- `Emitida`
- `Cancelada`
- `Reprogramada`

### Estado Parseur (`color_mm1by1dx`)
- `Pendiente`
- `Listo para extraer`
- `Enviado a Parseur`
- `Procesado`
- `Error`

### Tipo tramo (`color_mm1bj7np`)
- `Salida`
- `Conexión`
- `Retorno`

### Estado segmento (`color_mm1b3vt0`)
- `Confirmado`
- `Pendiente`
- `Cancelado`
- `Cambiado`

---

## Formato de fechas para Monday

Monday acepta fechas en formato ISO: `YYYY-MM-DD`  
Ejemplo: `2025-03-15`

---

## Ejemplo de payload n8n (actualizar item principal)

```json
{
  "column_values": {
    "text_mm1b9vf3": "Juan Pérez",
    "text_mm1b1b5w": "ABC123",
    "text_mm1bq9bc": "1234567890123",
    "text_mm1b4mb1": "AA",
    "date_mm1bw16n": { "date": "2025-03-10" },
    "text_mm1b8rv7": "SDQ",
    "text_mm1bxfa3": "MIA",
    "long_text_mm1bpk6w": "SDQ-MIA-SDQ",
    "date_mm1bshfd": { "date": "2025-03-15" },
    "date_mm1bqrzy": { "date": "2025-03-20" },
    "color_mm1b30rv": { "label": "Ida y vuelta" },
    "numeric_mm1bhwn0": 2,
    "text_mm1b7ycn": "Economy",
    "text_mm1bk9hf": "1 pieza 23kg",
    "text_mm1bacys": "Y",
    "color_mm1b1pjr": { "label": "Confirmada" },
    "text_mm1b1eh": "doc_parseur_123"
  }
}
```

---

## Ejemplo de creación de subitem con columnas

```json
{
  "item_name": "Segmento 1",
  "column_values": {
    "numeric_mm1bn62n": 1,
    "date_mm1bdr4b": { "date": "2025-03-15" },
    "text_mm1b2khv": "Miami",
    "color_mm1bj7np": { "label": "Salida" },
    "text_mm1bs18h": "AA123",
    "text_mm1bdzkw": "American Airlines",
    "text_mm1ber8k": "SDQ",
    "text_mm1b7ra3": "Las Américas",
    "text_mm1byh8c": "A",
    "text_mm1bc24j": "MIA",
    "text_mm1bqsgh": "Miami Intl",
    "text_mm1b8xev": "D",
    "date_mm1bhq59": { "date": "2025-03-15" },
    "text_mm1bggg": "08:30",
    "date_mm1b8wej": { "date": "2025-03-15" },
    "text_mm1bhp08": "11:45",
    "text_mm1bg1g3": "2h 15min",
    "text_mm1bp2sm": "Economy",
    "color_mm1b3vt0": { "label": "Confirmado" },
    "text_mm1b9824": "1 pieza",
    "text_mm1bdxdz": "Y",
    "text_mm1bevde": "1234567890123",
    "text_mm1bhvz6": "12A"
  }
}
```
