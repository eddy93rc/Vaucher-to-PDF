# Diagnóstico: Datos del ticket vs. Parseur vs. Monday

## Ticket de ejemplo (test-ticket.pdf)

El documento tiene **todos** los datos necesarios para emitir un voucher completo.

### Datos del item principal (reserva)

| Dato en ticket | Campo Parseur | Monday columna | Ejemplo |
|----------------|--------------|---------------|---------|
| CODIGO DE RES.: 9HLXCD | reservation_code | PNR / Código reserva | 9HLXCD |
| FECHA: 13 MARZO 2026 | issue_date | Fecha emisión ticket | 2026-03-13 |
| DIAZ CONTRERAS/ANA ALEXANDRA + DIAZ FELIZ/RAFAEL JOSE | passengers (tabla) | Lista pasajeros | DIAZCONTRERAS/ANAALEXANDRA - 9962425484279\nDIAZFELIZ/RAFAELJOSE - 9962425484280 |
| BILLETE: 996 2425484279, 996 2425484280 | passengers[].ticket_number | (en Lista pasajeros) | Por pasajero |
| AIR EUROPA | airline_main | Aerolínea principal | AIR EUROPA |
| EQUIPAJE PERMITIDO: 2PC | baggage_allowance | Equipaje | 2PC |
| RESERVA CONFIRMADA, BUSINESS | booking_status, travel_class | Estado, Clase | Confirmada, Business |
| AIR EUROPA SDQ CITY OFFICE | issuing_office | Oficina emisora | AIR EUROPA SDQ CITY OFFICE |
| SDQ, MAD, A CORUNA... | route_summary | Ruta general | SDQ-MAD-LCG-MAD-SDQ |

### Datos de subitems (segmentos)

**Segmento 1 (UX 088):**
- Origen: SANTO DOMINGO, DO (LAS AMERICAS INTL) 01 JUN **21:10**
- Llegada: MADRID, ES 02 JUN **11:20**
- Duración: 08:10
- ASIENTO: **03A** POR DIAZ CONTRERAS/ANA ALEXANDRA
- ASIENTO: **03D** POR DIAZ FELIZ/RAFAEL JOSE

**Segmento 2 (UX 7235):**
- Salida: MADRID 02 JUN **15:10**
- Llegada: A CORUNA 02 JUN **16:20**
- Duración: 01:10
- ASIENTO: **03F** DIAZ CONTRERAS, **03D** DIAZ FELIZ

**Segmento 3 (UX 089):**
- Salida: MADRID 11 JUN **15:35**
- Llegada: SANTO DOMINGO 11 JUN **18:15**
- ASIENTO: **02K** DIAZ CONTRERAS, **02G** DIAZ FELIZ

---

## Puntos de posible fallo en la cadena

### 1. Parseur: ¿qué está extrayendo?

Parseur envía un webhook con `body` que debe incluir:

```
body.passengers = [{ passenger_name, passenger_voucher, ticket_number }, ...]
body.segments = [{ flight_number, origin_code, destination_code, departure_date, departure_time, arrival_date, arrival_time, seat_assignments, ... }, ...]
```

**Problemas habituales:**

| Problema | Causa | Verificación |
|----------|-------|--------------|
| `passengers` vacío o ausente | La tabla **passengers** no está configurada en el buzón (error 409 API → añadir manualmente) | Ver [PARSEUR_PASSENGERS_MANUAL.md](Vaucher-to-PDF/docs/setup/PARSEUR_PASSENGERS_MANUAL.md) |
| `segments` con datos incompletos | La tabla segments no tiene todas las columnas o la IA no las extrae bien | Revisar en app.parseur.com → Campos → tabla segments |
| `seat_assignments` vacío | El ticket usa "ASIENTO: 03A CONFIRMADO POR DIAZ CONTRERAS/ANA" (formato inverso). Parseur debe generar `DIAZCONTRERAS/ANAALEXANDRA=03A` | Probar con un ticket y ver el JSON del webhook |
| `departure_time` / `arrival_time` vacíos | Columnas con tipo TIME; la IA debe extraer "21:10" de "01 JUN 21:10" | Revisar salida de Parseur |

**Cómo verificar Parseur:**
1. En app.parseur.com → Buzón Ticket Aereo → Documents → abrir un documento procesado.
2. Revisar los valores extraídos en cada campo.
3. O configurar el webhook para loguear el body (ej. en n8n, nodo antes de Formatear que guarde `$json.body`).

---

### 2. n8n: ¿qué está mapeando?

El flujo ya incluye:
- **Extraer Datos Parseur**: `passenger_destination`, `passengers`, `segments` desde `$json.body`
- **Formatear Lista Pasajeros**: pasa `segments` con `seat`, `seat_assignments` al Crear Subitem
- **Mapear Parseur a Monday**: `long_text_mm1c70w4` ← `formatted_passengers_list`
- **Crear Subitem**: `text_mm1bggg` (Salida hora), `text_mm1bhp08` (Llegada hora), `long_text_mm1gwerx` (seat_assignments)

**Posibles problemas:**

| Problema | Causa | Acción |
|----------|-------|--------|
| `text_mm1gwerx` no existe en Monday | El subboard tiene otra columna para asientos por pasajero | Comprobar IDs en Monday. El mapper del generador PDF busca por **título** ("Asientos pasajeros", etc.), no por ID |
| Errores en Formatear Lista Pasajeros | Si `passengers` está vacío, lanza: "Parseur: faltan pasajeros" | Confirmar que Parseur envía `passengers` |
| Errores en Crear Subitem | Si `segments` está vacío, no hay subitems | Confirmar que Parseur envía `segments` |

---

### 3. Monday: IDs de columnas

El workflow n8n usa IDs fijos. Si el board o subboard cambió, los IDs pueden ser distintos:

| Columna | ID en n8n | Si no coincide |
|---------|-----------|----------------|
| Lista pasajeros | long_text_mm1c70w4 | Actualizar en nodo "Mapear Parseur a Monday" |
| Salida hora (subitem) | text_mm1bggg | Actualizar en "Crear Subitem Segmento GraphQL" |
| Llegada hora (subitem) | text_mm1bhp08 | Idem |
| Asientos pasajeros (subitem) | long_text_mm1gwerx | Idem. Ver MONDAY_PARSEUR_MAPPING para IDs correctos |

---

## Checklist de verificación

1. **Parseur**
   - [ ] Buzón "Ticket Aereo" tiene tabla `passengers` (añadir manualmente si la API devolvió 409)
   - [ ] Tabla `segments` incluye: departure_time, arrival_time, seat_assignments
   - [ ] Probar con test-ticket.pdf y revisar documento procesado

2. **Webhook Parseur → n8n**
   - [ ] Añadir nodo temporal que muestre o guarde `$json.body` al recibir el webhook
   - [ ] Comprobar que `body.passengers` y `body.segments` traen datos

3. **Monday**
   - [ ] Item principal: "Lista pasajeros" con formato `APELLIDO/NOMBRE - TICKET` por línea
   - [ ] Subitems: columnas "Salida hora", "Llegada hora" y "Asientos pasajeros" con valores

4. **Generador PDF**
   - [ ] Ya corregido el mapeo "Destino pasajero" → no debe usarse como nombre de pasajero
   - [ ] Si Lista pasajeros está vacía en Monday, el PDF usará solo Pasajero principal o quedará incompleto

---

## Resumen

El ticket **contiene** todos los datos. La cadena se rompe si:

1. **Parseur** no extrae `passengers` o `segments` completos (tablas mal configuradas o formato del ticket).
2. **Parseur** no genera `seat_assignments` en el formato `APELLIDO/NOMBRE=ASIENTO`.
3. **Monday** no tiene las columnas esperadas o los IDs en n8n no coinciden.

**Siguiente paso recomendado:** Revisar en Parseur un documento procesado con test-ticket.pdf y ver qué valores devuelve en `passengers` y `segments`. Con eso se puede localizar si el fallo está en Parseur, n8n o Monday.
