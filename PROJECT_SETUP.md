# Auto-Vaucher: Automatización de Reservas Aéreas

## Propósito del proyecto

Automatizar el flujo completo de reservas aéreas combinando **Monday.com**, **Parseur** y **n8n**:

1. Un agente sube el ticket PDF emitido por la aerolínea a Monday.
2. n8n toma ese PDF y lo envía a Parseur.
3. Parseur extrae los datos estructurados del ticket.
4. n8n mapea esos datos de vuelta a Monday.
5. Se generan automáticamente: voucher de agencia, itinerario, factura y recibo.

---

## Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Agente    │────▶│   Monday   │────▶│    n8n      │────▶│   Parseur    │────▶│   n8n (mapeo)       │
│ sube PDF    │     │  (ticket)  │     │ detecta PDF │     │ extrae datos │     │ Monday + documentos │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────────────┘
                                                                                           │
                                                                                           ▼
                                                                                  ┌─────────────────────┐
                                                                                  │ Voucher, Itinerario │
                                                                                  │ Factura, Recibo     │
                                                                                  └─────────────────────┘
```

---

## Flujo detallado

### Monday → n8n → Parseur → n8n → Monday

1. **Entrada**: El agente (humano o automatizado) sube el ticket PDF a la columna "Archivo ticket" de un item en el tablero RESERVAS.

2. **Detección**: n8n detecta el nuevo archivo (via webhook, polling o trigger de Monday).

3. **Extracción**: n8n envía el PDF a Parseur, que usa OCR/templates para extraer: PNR, pasajero, aerolínea, segmentos de vuelo, fechas, etc.

4. **Mapeo**: n8n recibe los datos estructurados de Parseur y:
   - Actualiza las columnas del item principal en Monday.
   - Crea subitems por cada segmento de vuelo.
   - Actualiza "Estado Parseur" y "DocumentID Parseur".

5. **Generación de documentos**: n8n genera y sube a Monday:
   - Voucher PDF
   - Itinerario PDF
   - Factura PDF
   - Recibo PDF

---

## Estructura del board RESERVAS

### Items principales (reservas)

Cada **item** representa una reserva completa. Sus columnas principales:

| Columna             | Tipo   | Descripción                          |
|---------------------|--------|--------------------------------------|
| Pasajero principal  | text   | Nombre del pasajero principal (1 solo) |
| PNR / Código reserva| text   | Código PNR de la reserva             |
| Número de boleto    | text   | Número del ticket (primer pasajero)  |
| Lista pasajeros     | long_text | Todos los pasajeros con formato APELLIDO/NOMBRE - TICKET (uno por línea) |
| Aerolínea principal | text   | Código o nombre de la aerolínea      |
| Fecha emisión ticket| date   | Fecha de emisión del boleto          |
| Origen principal    | text   | Ciudad/aeropuerto de origen          |
| Destino final       | text   | Ciudad/aeropuerto de destino final   |
| Destino pasajero    | text   | Destino principal del viaje         |
| Ruta general        | long_text | Ruta completa del itinerario      |
| Fecha salida        | date   | Fecha de salida del primer vuelo     |
| Fecha regreso       | date   | Fecha de regreso (si aplica)         |
| Tipo viaje          | status | Solo ida / Ida y vuelta / Multiciudad|
| Cantidad segmentos   | numbers| Número de segmentos de vuelo         |
| Clase               | text   | Clase de servicio                    |
| Equipaje            | text   | Inclusión de equipaje                |
| Fare basis          | text   | Código tarifa                        |
| Estado reserva      | status | Pendiente / Confirmada / Emitida / Cancelada / Reprogramada |
| Archivo ticket      | file   | PDF del ticket subido por el agente  |
| Voucher PDF         | file   | Voucher generado                     |
| Itinerario PDF      | file   | Itinerario generado                  |
| Factura PDF         | file   | Factura generada                     |
| Recibo PDF          | file   | Recibo generado                      |
| Estado Parseur      | status | Pendiente / Listo / Enviado / Procesado / Error |
| DocumentID Parseur  | text   | ID del documento en Parseur         |
| Correo cliente      | email  | Email del cliente                    |
| Teléfono cliente    | phone  | Teléfono del cliente                 |
| Correo agencia      | email  | Email de la agencia                  |
| Teléfono agencia    | phone  | Teléfono de la agencia               |

### Subitems (segmentos de vuelo)

Cada **subitem** representa un segmento/tramo de vuelo dentro de la reserva:

| Columna               | Tipo   | Descripción                      |
|-----------------------|--------|----------------------------------|
| Segmento #            | numbers| Número del segmento (1, 2, 3...) |
| Fecha encabezado voucher| date | Fecha para encabezado            |
| Destino voucher       | text   | Destino del tramo                |
| Tipo tramo            | status | Salida / Conexión / Retorno     |
| Vuelo                | text   | Número de vuelo                  |
| Operado por          | text   | Aerolínea operadora              |
| Origen código        | text   | IATA del origen                  |
| Origen nombre        | text   | Nombre del aeropuerto origen     |
| Origen terminal      | text   | Terminal de salida               |
| Destino código       | text   | IATA del destino                 |
| Destino nombre       | text   | Nombre del aeropuerto destino    |
| Destino terminal     | text   | Terminal de llegada              |
| Salida fecha         | date   | Fecha de salida del tramo         |
| Salida hora          | text   | Hora de salida                   |
| Llegada fecha        | date   | Fecha de llegada                 |
| Llegada hora         | text   | Hora de llegada                  |
| Duración             | text   | Duración del vuelo               |
| Clase segmento       | text   | Clase en este tramo              |
| Estado segmento      | status | Confirmado / Pendiente / Cancelado / Cambiado |
| Equipaje segmento     | text   | Equipaje en el tramo             |
| Fare basis segmento  | text   | Fare basis del tramo             |
| Ticket No.           | text   | Número de ticket del segmento    |
| Asiento              | text   | Asiento asignado                 |

---

## Por qué usar subitems para segmentos

1. **Un voucher por tramo**: Cada subitem puede generar su propio voucher; la estructura refleja la realidad del itinerario.

2. **Escalabilidad**: Una reserva puede tener 1, 2 o muchos segmentos; los subitems se crean dinámicamente según los datos extraídos.

3. **Rollups**: Monday permite columnas rollup para agregar datos (ej. contar segmentos, sumar duraciones) desde los subitems al item padre.

4. **Claridad**: La jerarquía Reserva → Segmentos es fácil de entender y mantener.

5. **Integración**: n8n y Parseur pueden mapear cada segmento extraído a un subitem correspondiente.

---

## Variables de entorno

| Variable           | Requerida | Default                     | Descripción                          |
|-------------------|-----------|-----------------------------|--------------------------------------|
| `MONDAY_API_TOKEN`| Sí        | -                           | Token de API de Monday.com           |
| `MONDAY_API_URL`  | No        | `https://api.monday.com/v2` | URL del endpoint GraphQL de Monday   |

---

## Instrucciones para ejecutar setup-monday.js

### Requisitos

- **Node.js 18+** (para `fetch` nativo)

### Pasos

1. **Copiar el archivo de ejemplo**:
   ```bash
   cp .env.example .env
   ```

2. **Editar `.env`** y añadir tu token de Monday:
   - Obtener token en: [Monday.com Developers](https://developer.monday.com/) → API → Tokens
   - El token necesita permisos de lectura y escritura en boards

3. **Cargar variables y ejecutar**:
   ```bash
   export $(cat .env | xargs) && node setup-monday.js
   ```
   
   O en Windows (PowerShell):
   ```powershell
   Get-Content .env | ForEach-Object { if ($_ -match '^([^#][^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }; node setup-monday.js
   ```

4. **Verificar**: El script imprimirá un resumen de lo creado (board ID, grupo ID, IDs de columnas). Usa esos IDs en n8n para referenciar columnas.

### Notas

- El script es **idempotente**: si el board RESERVAS ya existe, solo añadirá columnas faltantes.
- Creará un item "Plantilla - Reserva" con un subitem en el grupo "Configuración" para inicializar la estructura de subitems. Puedes eliminarlos después o dejarlos como plantilla.
- Si hay errores de permisos, verifica que el token tenga acceso al workspace donde se crea el board.

---

## Documentación técnica

| Archivo | Contenido |
|---------|-----------|
| `MONDAY_MAPPING.md` | Mapeo de columnas Monday para n8n (IDs, tipos, origen Parseur) |
| `MONDAY_PARSEUR_MAPPING.md` | Mapeo completo Parseur ↔ Monday |
| `PARSEUR_SETUP.md` | Estructura del buzón, campos, tablas passengers y segments |
| `PARSEUR_PASSENGERS_MANUAL.md` | Pasos manuales para añadir passengers en Parseur (API 409) |
| `IMPLEMENTATION_NOTES.md` | Resumen de cambios, pendientes manuales, uso en n8n |

## Campos nuevos (destino pasajero + múltiples pasajeros)

- **Destino pasajero** (Monday: `text_mm1cd796`) ← Parseur `passenger_destination`
- **Lista pasajeros** (Monday: `long_text_mm1c70w4`) ← Parseur tabla `passengers` (formatear en n8n)
- **Subitems/segments**: Sin cambios.

## Próximos pasos

1. **Parseur manual**: Añadir `passenger_destination` y tabla `passengers` en app.parseur.com (ver IMPLEMENTATION_NOTES.md).
2. **n8n**: Actualizar flujo para mapear `passenger_destination` y formatear `passengers` → Lista pasajeros.
3. **Generación de documentos**: Implementar lógica para generar voucher, itinerario, factura y recibo (PDF).
