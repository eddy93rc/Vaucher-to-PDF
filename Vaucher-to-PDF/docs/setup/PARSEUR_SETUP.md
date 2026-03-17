# Parseur: Buzón para Tickets Aéreos

## Propósito del buzón

El buzón **Ticket Aereo** recibe tickets PDF emitidos por aerolíneas (en español) y extrae datos estructurados para:

1. **Mapear a Monday**: Los datos globales y segmentos se envían a n8n para actualizar el tablero RESERVAS.
2. **Generar documentos**: Voucher, itinerario, factura y recibo (cada segmento puede tener su propio voucher).

El buzón usa **IA** para la extracción y está orientado a devolver solo valores limpios, sin etiquetas.

---

## Arquitectura de datos

```
┌─────────────────────────────────────────────────────────────────┐
│                     TICKET AÉREO PDF                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PARSEUR (IA extraction)                        │
├─────────────────────────────────────────────────────────────────┤
│  CAMPOS GLOBALES (1 reserva)        │  TABLA segments (N filas) │
│  - passenger_name                   │  - segment_number          │
│  - reservation_code                 │  - flight_number           │
│  - ticket_number                    │  - origin_code             │
│  - airline_main                     │  - destination_code         │
│  - issue_date                       │  - departure_date           │
│  - origin_main_code                 │  - arrival_date             │
│  - destination_final_code           │  - ... (23 columnas)       │
│  - route_summary                    │                            │
│  - departure_date / return_date     │  Una fila por segmento      │
│  - trip_type, segment_count         │  de vuelo del ticket        │
│  - travel_class, baggage, fare_basis │                            │
│  - booking_status                   │                            │
│  - agency_name, issuing_office      │                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  n8n → Monday (item principal + subitems por segmento)           │
│  n8n → Generación de vouchers por tramo                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diferencia entre campos globales y tablas

| Aspecto        | Campos globales | Tabla `passengers` | Tabla `segments` |
|----------------|-----------------|--------------------|------------------|
| Cantidad       | 19 campos       | N filas (1 por pasajero) | N filas (1 por tramo) |
| Contenido      | Datos reserva   | Nombre + boleto por pasajero | Datos de cada tramo |
| Uso en Monday  | Item principal  | Columna "Lista pasajeros" (concatenado) | Subitems |
| Uso en voucher | Encabezado      | Líneas PASAJERO ASIENTO TICKET | Cada fila = 1 página voucher |

---

## Campos globales (lista completa)

| Campo             | Tipo Parseur | Descripción                          |
|-------------------|--------------|--------------------------------------|
| passenger_name    | NAME         | Nombre del pasajero principal        |
| reservation_code  | ONELINE      | PNR / código de reserva             |
| ticket_number     | ONELINE      | Número de boleto                     |
| airline_main      | ONELINE      | Aerolínea principal                  |
| issue_date        | DATE         | Fecha de emisión                     |
| origin_main_code  | ONELINE      | Código IATA origen principal         |
| destination_final_code | ONELINE | Código IATA destino final            |
| passenger_destination | ONELINE | Destino principal del viaje (ciudad o código) |
| route_summary     | TEXT         | Resumen de la ruta                   |
| departure_date    | DATE         | Fecha de salida                      |
| return_date       | DATE         | Fecha de regreso                     |
| trip_type         | ONELINE      | Solo ida / Ida y vuelta / Multiciudad|
| segment_count     | NUMBER       | Cantidad de segmentos               |
| travel_class      | ONELINE      | Clase de servicio                    |
| baggage_allowance | ONELINE      | Inclusión de equipaje                |
| fare_basis        | ONELINE      | Código tarifa                        |
| booking_status    | ONELINE      | Estado de la reserva                 |
| agency_name       | ONELINE      | Nombre de la agencia                 |
| issuing_office    | ONELINE      | Oficina emisora                      |

---

## Columnas de la tabla `passengers`

| Columna           | Tipo Parseur | Descripción                    |
|-------------------|--------------|--------------------------------|
| passenger_number  | NUMBER       | Número del pasajero (1, 2, 3…)|
| passenger_name    | NAME         | Nombre completo del pasajero  |
| ticket_number     | ONELINE      | Número de boleto del pasajero  |

---

## Columnas de la tabla `segments`

| Columna                   | Tipo Parseur | Descripción                         |
|---------------------------|--------------|-------------------------------------|
| segment_number            | NUMBER       | Número del segmento (1, 2, 3...)    |
| voucher_heading_date      | DATE         | Fecha para encabezado voucher       |
| voucher_heading_destination | ONELINE   | Destino del tramo                   |
| voucher_trip_type         | ONELINE      | Salida / Conexión / Retorno         |
| flight_number             | ONELINE      | Número de vuelo                     |
| operated_by               | ONELINE      | Aerolínea operadora                 |
| origin_code               | ONELINE      | Código IATA origen                  |
| origin_name               | ONELINE      | Nombre aeropuerto origen            |
| origin_terminal           | ONELINE      | Terminal de salida                  |
| destination_code          | ONELINE      | Código IATA destino                 |
| destination_name          | ONELINE      | Nombre aeropuerto destino           |
| destination_terminal      | ONELINE      | Terminal de llegada                 |
| departure_date            | DATE         | Fecha de salida del tramo           |
| departure_time            | TIME         | Hora de salida                      |
| arrival_date              | DATE         | Fecha de llegada                    |
| arrival_time              | TIME         | Hora de llegada                     |
| duration                  | ONELINE      | Duración del vuelo                  |
| travel_class              | ONELINE      | Clase en este tramo                 |
| booking_status            | ONELINE      | Estado del segmento                 |
| baggage                   | ONELINE      | Equipaje en el tramo                |
| fare_basis                | ONELINE      | Fare basis del tramo               |
| ticket_number             | ONELINE      | Número de ticket del segmento       |
| seat                      | ONELINE      | Asiento asignado                    |

---

## Variables de entorno

| Variable              | Requerida | Default              | Descripción                    |
|-----------------------|-----------|----------------------|--------------------------------|
| `PARSEUR_API_KEY`     | Sí        | -                    | API key de Parseur             |
| `PARSEUR_API_URL`     | No        | `https://api.parseur.com` | URL base de la API      |
| `PARSEUR_MAILBOX_NAME`| No        | `Ticket Aereo`       | Nombre del buzón a crear       |

---

## Cómo ejecutar setup-parseur.js

### Requisitos

- Node.js 18+

### Pasos

1. **Configurar variables** (copiar y editar):

   ```bash
   cp .env.parseur.example .env
   # Añadir al .env existente o crear:
   # PARSEUR_API_KEY=tu_api_key
   # PARSEUR_MAILBOX_NAME=Ticket Aereo
   ```

2. **Obtener API key**: En [Parseur Account → API keys](https://app.parseur.com/account/api-keys)

3. **Ejecutar**:

   ```bash
   node setup-parseur.js
   ```

4. **Verificar**: El script imprime qué se creó y qué pendiente queda manualmente.

---

## Limitaciones reales de la API de Parseur

### Lo que SÍ permite la API

- Crear buzón (POST `/parser`) con nombre, `ai_engine`, `ai_instructions`
- Actualizar buzón (PUT `/parser/{id}`) con `parser_object_set`
- Definir campos con: `name`, `format`, `query` (instrucciones para la IA)
- Campos tipo: TEXT, ONELINE, DATE, TIME, NUMBER, NAME, ADDRESS, TABLE
- Tabla (TABLE) con `parser_object_set` anidado para columnas
- Listar buzones (GET `/parser`) para detectar si ya existe

### Limitaciones detectadas

1. **IDs de campos**: Los campos son read-only una vez creados; los IDs los asigna Parseur.
2. **Tabla segments**: La estructura TABLE con `parser_object_set` se define por API; la representación interna puede variar respecto a la UI.
3. **choice_set**: Solo para formato ONELINE; útil para `trip_type` y `voucher_trip_type`.
4. **Instrucciones por campo**: El campo `query` es la única forma de guiar a la IA por campo; no hay documentación explícita de “solo valores, sin etiquetas” más allá de `ai_instructions`.

### Pendientes de configuración manual (si aplica)

- Si la API rechaza la tabla `segments` completa, añadirla desde la UI.
- **Actualizar buzón existente con nuevos campos**: La API devuelve 409 por conflicto de posición al actualizar buzones existentes. Deben añadirse manualmente en app.parseur.com:
  - **passenger_destination** (campo global)
  - **Tabla passengers** (passenger_number, passenger_name, ticket_number)
- Ver `PARSEUR_PASSENGERS_MANUAL.md` e `IMPLEMENTATION_NOTES.md` para instrucciones detalladas.
- Si algún formato (p. ej. TIME) falla, usar ONELINE como alternativa.
- Ajustar `query` de campos concretos tras pruebas con tickets reales.

---

## Instrucciones generales del buzón

Texto usado como `ai_instructions`:

> Estos documentos son tickets aéreos en PDF en español. Extrae los datos de TODOS los pasajeros (puede haber uno o varios), de la reserva y de los segmentos de vuelo. Devuelve solo los valores, sin etiquetas como 'Número de Itinerario', 'Código de Reserva' o 'Boleto aéreo'. Mantén nombres, códigos, correos y teléfonos exactamente como aparecen. Ignora textos legales, políticas de cambios y restricciones no necesarios para el voucher.
