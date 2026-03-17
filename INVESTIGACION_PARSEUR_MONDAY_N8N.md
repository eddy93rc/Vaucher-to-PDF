# Investigación: Configuración Parseur, Monday y n8n

*Generado el 11 de marzo de 2026*

## 1. Parseur – Buzón Ticket Aereo V2 (id: 171836)

### Configuración verificada vía API

| Aspecto | Valor |
|---------|-------|
| **Nombre** | Ticket Aereo V2 |
| **ID** | 171836 |
| **Email prefix** | ticket.aereo.v2 |
| **AI Engine** | GCP_AI_2 |
| **Webhook** | https://n8n.grupojyl.com/webhook/cb391e5b-eccb-4c7c-b257-047ae52aef13 |
| **Documentos procesados** | 1 (test-ticket.pdf) |

### Campos globales (19)

passenger_name, reservation_code, ticket_number, airline_main, airlines_involved, issue_date, origin_main_code, destination_final_code, passenger_destination, route_summary, departure_date, return_date, trip_type, segment_count, travel_class, baggage_allowance, fare_basis, booking_status, agency_name, issuing_office, currency

### Tabla `passengers`

| Columna | Formato |
|---------|---------|
| passenger_number | NUMBER |
| passenger_name | NAME |
| passenger_voucher | ONELINE |
| passenger_type | ONELINE |
| ticket_number | ONELINE |

### Tabla `segments`

| Columna | Formato |
|---------|---------|
| segment_number, voucher_heading_date, voucher_heading_destination, voucher_trip_type | ✓ |
| marketing_airline, flight_number, operated_by | ✓ |
| origin_code, origin_name, origin_city, origin_terminal | ✓ |
| destination_code, destination_name, destination_city, destination_terminal | ✓ |
| departure_date, departure_time, arrival_date, arrival_time | ✓ |
| duration, travel_class, booking_status, baggage, fare_basis, ticket_number | ✓ |
| seat, seat_assignments | ✓ |

### Extracción real (test-ticket.pdf)

**Errores en la tabla passengers:**

| # | Parseur devolvió | Esperado |
|---|------------------|----------|
| 1 | passenger_voucher: "DIAZ CONTRERAS/ANA ALEXANDRA", **sin ticket_number** | DIAZCONTRERAS/ANAALEXANDRA + 996 2425484279 |
| 2 | passenger_voucher: "DIAZ FELIZ/RAFAEL JOSE **DIAZ CONTRERAS/ANA ALEXANDRA**" (fusionado), ticket: 996 2425484279 | DIAZFELIZ/RAFAELJOSE + 996 2425484280 |
| 3 | passenger_voucher: "DIAZ FELIZ/RAFAEL JOSE", ticket: 996 2425484280 | ✓ Correcto |

- Parseur devuelve 3 pasajeros en vez de 2.
- El pasajero 2 mezcla dos nombres.
- El pasajero 1 no tiene ticket_number.

**Segmentos:**

| Seg | departure_time | arrival_time | seat_assignments |
|-----|----------------|--------------|------------------|
| 1 | 21:10:00 ✓ | 11:20:00 ✓ | ✓ DIAZ CONTRERAS/ANA ALEXANDRA=03A\nDIAZ FELIZ/RAFAEL JOSE=03D |
| 2 | 15:10:00 ✓ | 16:20:00 ✓ | ✓ |
| 3 | 15:35:00 ✓ | 18:15:00 ✓ | **❌ Vacío** (en el ticket sí aparecen asientos) |

---

## 2. Monday.com – Board RESERVAS

### Board principal (18403483965)

Columnas relevantes:

| column_id | Título |
|-----------|--------|
| text_mm1b9vf3 | Pasajero principal |
| text_mm1gwg6h | Nombre voucher |
| text_mm1b1b5w | PNR / Código reserva |
| text_mm1bq9bc | Número de boleto |
| text_mm1b4mb1 | Aerolínea principal |
| text_mm1cd796 | Destino pasajero |
| long_text_mm1c70w4 | Lista pasajeros |
| date_mm1bw16n | Fecha emisión ticket |
| date_mm1bshfd | Fecha salida |
| date_mm1bqrzy | Fecha regreso |
| long_text_mm1gq119 | Extras |
| text_mm1gtmpz | Oficina emisora |
| ... | (resto según MONDAY_PARSEUR_MAPPING) |

### Subboard segmentos (18403484081)

| column_id | Título |
|-----------|--------|
| numeric_mm1bn62n | Segmento # |
| text_mm1bggg | Salida hora |
| text_mm1bhp08 | Llegada hora |
| long_text_mm1gwerx | Asientos pasajeros |
| text_mm1ber8k | Origen código |
| text_mm1bc24j | Destino código |
| text_mm1bs18h | Vuelo |
| ... | (resto según MONDAY_PARSEUR_MAPPING) |

### Item 11522207776 (test-ticket.pdf)

| Campo | Valor en Monday |
|-------|-----------------|
| Pasajero principal | "Diaz Contreras/Ana Alexandra" |
| Lista pasajeros | "DIAZCONTRERAS/ANAALEXANDRA - 996 2425484279\n**DIAZFELIZ/RAFAELJOSEDIAZCONTRERAS/ANAALEXANDRA** - 996 2425484279\nDIAZFELIZ/RAFAELJOSE - 996 2425484280" |
| Destino pasajero | "A CORUNA" |
| PNR | "9HLXCD" |
| Subitems | **Solo 1** (Segmento 1 - 088). Deberían ser 3 |

**Subitem existente (Segmento 1):**

| Columna | Valor |
|---------|-------|
| Salida hora | "21:10:00" ✓ |
| Llegada hora | "11:20:00" ✓ |
| Asientos pasajeros | **null** ❌ (Parseur sí devolvió seat_assignments) |

---

## 3. n8n – Flujo RESERVAS

### Nodos relevantes

1. **Subir a Parseur** → POST https://api.parseur.com/parser/171836/upload (Ticket Aereo V2)
2. **Extraer Datos Parseur** → body → passenger_destination, passengers, segments, etc.
3. **Formatear Lista Pasajeros** → passengers → formatted_passengers_list; segments normalizados
4. **Mapear Parseur a Monday** → item principal
5. **Split Out Segments** → fieldToSplitOut: "segments"
6. **Crear Subitem Segmento GraphQL** → create_subitem con column_values

### Problemas detectados

#### A. Formato de columna `long_text` en Monday

El nodo **Crear Subitem** envía:

```javascript
long_text_mm1gwerx: $json.seat_assignments || ''
```

Según la [API de Monday](https://developer.monday.com/api-reference/reference/long-text), las columnas `long_text` deben recibir:

```json
{"text": "valor"}
```

**Cambio necesario:** usar `{ text: $json.seat_assignments }` en vez de la cadena directa.

#### B. Solo se crea 1 subitem

El flujo tiene Split Out → Crear Subitem por cada segmento. Parseur devuelve 3 segmentos pero Monday solo tiene 1 subitem. Posibles causas:
- Error en alguna ejecución de Crear Subitem (segundos 2 y 3).
- El formato `long_text` incorrecto provoca fallos silenciosos.
- Alguna condición en el flujo que impide ejecutar 2 y 3.

#### C. Datos de pasajeros heredados de Parseur

n8n replica los errores de Parseur en la Lista pasajeros. La corrección debe hacerse en Parseur (mejora de la extracción de la tabla passengers).

---

## 4. Resumen de correcciones

| # | Plataforma | Problema | Acción |
|---|------------|----------|--------|
| 1 | **n8n** | long_text con string en lugar de `{text: "..."}` | Ajustar nodo Crear Subitem: `long_text_mm1gwerx: $json.seat_assignments ? { text: $json.seat_assignments } : undefined` |
| 2 | **n8n** | Solo 1 subitem creado | Revisar si el fix #1 soluciona la creación de todos los subitems. Si no, revisar logs/errores en n8n. |
| 3 | **Parseur** | Tabla passengers con 3 filas y datos mezclados | Ajustar query/instrucciones de la tabla passengers. Probar con más ejemplos. |
| 4 | **Parseur** | Segmento 3 sin seat_assignments | Revisar si aparece en otra página del PDF. Ajustar query de seat_assignments si hace falta. |
| 5 | **Vaucher-to-PDF** | Mapeo "Destino pasajero" → passenger_full | Ya corregido (match más específico). |

---

## 5. Cambio concreto en n8n

En el nodo **Crear Subitem Segmento GraphQL**, dentro de `columnValues`, cambiar:

```javascript
// ANTES
long_text_mm1gwerx: $json.seat_assignments || ''

// DESPUÉS
long_text_mm1gwerx: ($json.seat_assignments && $json.seat_assignments.trim()) ? { text: $json.seat_assignments } : undefined
```

Y asegurarse de que el objeto que se envía a `column_values` incluya correctamente este valor en el JSON que se pasa a la mutación.
