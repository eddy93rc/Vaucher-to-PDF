# Análisis: Voucher generado vs Ticket fuente

Comparación entre el ticket **Aéreo_1556486.pdf** (Iberia FCO-MAD, 3 pasajeros) y el voucher **VOUCHER BOLETO - KIRSY - DR JIMENEZ.pdf**.

---

## Ticket fuente (Aéreo_1556486.pdf)

| Campo | Valor |
|-------|-------|
| Pasajeros | KIRSY SUSANA RAMIREZ DEL AMPARO, YOHAN MANUEL JIMENEZ CARVAJAL, ANA CEFERINA PADUA DE LA ROSA DE RAMIREZ |
| PNR | KNL1Q |
| Aerolínea | Iberia |
| Vuelo | 658 |
| Ruta | FCO → MAD |
| Fecha | 26 mar 2026 |
| Hora salida | 07:30 a. m. |
| Hora llegada | 10:05 a. m. |
| Boletos | 075-5011056620, 075-5011056621, 075-5011056622 |
| Asientos | No aparecen (típico en e-ticket antes de check-in) |
| Cabina | Económica |
| Tarifa | OPTIMA |
| Equipaje | 1 pieza(s) por persona adulta |

---

## Voucher generado – qué está bien ✅

| Elemento | Estado |
|----------|--------|
| Fecha encabezado | 26 MARZO 2026 ✅ |
| Origen/destino | ROMA (FCO) - MADRID, MAD ✅ |
| PNR | KNL1Q ✅ |
| Aerolínea | IBERIA ✅ |
| Día de la semana | JUEVES 26 MARZO 2026 ✅ |
| 3 pasajeros con tickets | Correctos ✅ |
| Boletos | 075-5011056620, 075-5011056621, 075-5011056622 ✅ |
| EXTRAS + teléfono emergencia | 849-919-1919 ✅ |

---

## Problemas detectados ❌

### 1. **Typo: RAMIRES en lugar de RAMIREZ**

| Esperado | Actual |
|----------|--------|
| RAMIREZDELAMPARO/KIRSYSUSANA | RAMIRESDELAMPARO/KIRSYSUSANA |

**Origen probable:** Parseur o fuente de datos está devolviendo "Ramires" en lugar de "Ramirez".

**Acción:** Revisar en Parseur cómo se extrae el nombre de Kirsy. Si el ticket dice "Ramirez", ajustar instrucciones o template para evitar confusión con "Ramires".

---

### 2. **Apellido truncado: "DE RAMIREZ" faltante**

**Ticket:** "ANA CEFERINA PADUA DE LA ROSA **DE RAMIREZ**"  
**Voucher – "Preparado para":** "ANA CEFERINA PADUA DE LA ROSA" (falta DE RAMIREZ)  
**Voucher – tabla:** PADUADELAROSA/ANACEFERINA (correcto el formato, pero apellido incompleto)

**Origen probable:**
- **Parseur:** Si la tabla `passengers` solo recibe "Padua De La Rosa" como apellido y no "Padua De La Rosa De Ramirez".
- **normalizeName (n8n):** La regla `lastName = parts.slice(0, length-2)` puede cortar apellidos compuestos. Ejemplo: "Ana Ceferina Padua De La Rosa De Ramirez" (8 partes) → lastName = 6 primeras = "Ana Ceferina Padua De La Rosa", firstName = "De Ramirez". Eso daría otro formato, no PADUADELAROSA/ANACEFERINA. Si Parseur envía "Padua De La Rosa" + "Ana Ceferina", el resultado sería coherente con lo que vemos, pero perdería "De Ramirez".
- **Voucher / servicio de generación:** Posible truncamiento por longitud máxima de campo.

**Acción:**
1. Ver payload de Parseur para el pasajero 3 (`passenger_name`, `passengers[2].passenger_name`).
2. Ajustar instrucciones en Parseur para incluir apellidos compuestos completos.
3. Revisar `normalizeName` en n8n para apellidos con varias partes (ej. "De La Rosa De Ramirez").

---

### 3. **Hora de salida ausente en el voucher**

**Ticket:** "07:30 a. m."  
**Voucher:** solo "SALIDA: JUEVES 26 MARZO 2026" (sin hora)

**Origen:** El diseño actual del voucher no incluye la hora, aunque Parseur sí extrae `departure_time` en `segments`.

**Acción:**
- Si quieres mostrar la hora: cambiar la plantilla del servicio `render-voucher-by-pulse` para incluir `departure_time` del segmento.
- Monday ya tiene `text_mm1bggg` (Salida hora) en subitems; el generador solo debe usarla.

---

### 4. **Número de vuelo ausente**

**Ticket:** "Vuelo 658"  
**Voucher:** no se muestra

**Origen:** La plantilla del voucher no incluye el número de vuelo.

**Acción:** Si lo necesitas en el voucher, modificar el generador para usar `flight_number` (Monday: `text_mm1bs18h`) del subitem.

---

### 5. **Asientos vacíos (−)**

**Ticket:** sin asientos (normal en e-ticket antes de check-in)  
**Voucher:** columna ASIENTO con "−" para todos

**Estado:** Correcto. Usar "−" o "TBA" cuando no hay asiento es adecuado.

---

## Resumen por componente

| Componente | ¿Falta algo? | Detalle |
|------------|--------------|---------|
| **Parseur** | Sí | Posible error "Ramires", posible omisión de "De Ramirez" en apellidos compuestos |
| **n8n (Formatear Lista Pasajeros)** | Posible | Revisar `normalizeName` para apellidos largos/compuestos |
| **Monday** | No | Columnas y mapeo adecuados |
| **Generador voucher (render-voucher-by-pulse)** | Sí | No muestra hora de salida ni número de vuelo; posible truncamiento de nombres |

---

## Acciones recomendadas (orden sugerido)

1. **Parseur:** Revisar documento procesado y payload real. Comprobar que:
   - `passenger_name` / `passengers[].passenger_name` incluyan apellidos compuestos completos.
   - No haya "Ramires" en lugar de "Ramirez".
2. **Parseur:** Ajustar instrucciones del campo/tabla `passengers` para apellidos compuestos (ej. "Incluir todos los apellidos, incluyendo 'De', 'De La', etc.").
3. **n8n:** Revisar `normalizeName` en "Formatear Lista Pasajeros" para manejar bien apellidos de 4+ partes.
4. **render-voucher-by-pulse:** Añadir al diseño:
   - Hora de salida (`departure_time` del segmento).
   - Número de vuelo (`flight_number` del segmento).
   - Comprobar si existe un límite de longitud que trunque nombres largos.

---

## Documentos de fix creados

| Archivo | Contenido |
|---------|-----------|
| `FIX_N8N_NORMALIZAR_NOMBRES.md` | Código completo para el nodo Formatear Lista Pasajeros (typos, apellidos compuestos) |
| `FIX_PARSEUR_PASSENGERS.md` | Instrucciones para Parseur – apellidos compuestos |
| `FIX_RENDER_VOUCHER_SPECS.md` | Especificaciones para añadir hora y número de vuelo al voucher |
