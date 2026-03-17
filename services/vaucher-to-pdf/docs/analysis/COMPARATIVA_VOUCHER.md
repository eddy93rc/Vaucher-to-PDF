# Comparativa: Ticket Aerolínea vs Voucher Manual vs Monday/Parseur

Análisis para identificar datos faltantes para generar el voucher automátic.

---

## Fuentes

| Documento | Contenido |
|-----------|-----------|
| **Ticket aerolínea** | 8ZTDP5 - FRANCIS WILLYS DE OLEO REYES (Air Europa) |
| **Voucher manual** | VOUCHER BOLETO - FRANCIS DE OLEO (generado por usuario) |
| **Monday item** | 11480338772 (datos de Parseur ya mapeados) |

---

## Estructura del voucher manual (por segmento)

Cada tramo tiene **una página** con:

```
[FECHA] DESTINO [CIUDAD] ([CÓDIGO])
SALIDA: [DÍA SEMANA] [FECHA]
PASAJERO ASIENTO TICKET NO.
[APELLIDO]/[NOMBRE] - [TICKET]

EXTRAS:
• Lista de recomendaciones (texto fijo)
• Teléfono emergencia: 849-919-1919
```

---

## Segmentos del ticket vs voucher

| # | Ticket (origen→destino) | Fecha salida | Voucher encabezado |
|---|-------------------------|--------------|---------------------|
| 1 | SDQ → MAD | 11 Mar 2026 22:50 | 11 MARZO 2026 DESTINO MADRID (MAD) |
| 2 | MAD → LGW | 12 Mar 2026 15:00 | 12 MARZO 2026 DESTINO LONDRES (LGW) |
| 3 | LGW → MAD | 17 Mar 2026 10:00 | 17 MARZO 2026 DESTINO MADRID (MAD) |
| 4 | MAD → SDQ | 29 Mar 2026 16:10 | 29 MARZO 2026 RETORNO SANTO DOMINGO (SDQ) |

---

## Datos en Monday (item 11480338772) – estado actual

### Item principal (reserva)

| Campo Monday | Valor actual | ¿Viene del ticket? |
|--------------|--------------|--------------------|
| Pasajero principal | De Oleo Reyes Francis Willys Mr | ✅ Sí |
| PNR | 8ZTDP5 | ✅ Sí |
| Número boleto | 996 2426250502 | ✅ Sí |
| Aerolínea | Air Europa | ✅ Sí |
| Fecha emisión | 2026-03-07 | ✅ Sí |
| Origen principal | SDQ | ✅ Sí |
| Destino final | SDQ | ⚠️ Es el retorno; correcto para viaje ida/vuelta |
| Ruta general | SANTO DOMINGO...MAD...LGW...MAD...SDQ | ✅ Sí |
| Fecha salida | 2026-03-11 | ✅ Sí |
| Fecha regreso | 2026-03-29 | ✅ Sí |
| Cantidad segmentos | 4 | ✅ Sí |
| Clase | ECONOMY, V | ✅ Sí |
| Equipaje | 1PC | ✅ Sí |
| Fare basis | VLYRAE | ✅ Sí |
| Correo/Teléfono cliente | null | ❌ No está en ticket |
| Correo/Teléfono agencia | null | ❌ Manual en voucher |

### Subitems (segmentos)

**Estado actual: `subitems: []` — no hay subitems creados.**

Los segmentos extraídos por Parseur no se han volcado a subitems en Monday.

---

## Datos necesarios para el voucher que FALTAN o requieren ajuste

### 1. Subitems (segmentos)

Los 4 segmentos deben existir como subitems. Parseur extrae la tabla `segments`, pero el flujo n8n aún no crea subitems. Sin esto no se puede generar el voucher por tramo.

### 2. Formato del nombre en el voucher

- **Ticket:** "De Oleo Reyes Francis Willys Mr"
- **Voucher:** "DEOLEOREYES/FRANCISWILLYS"
- **Transformación:** Apellidos + "/" + Nombres, sin espacios, mayúsculas.

**Propuesta:** Añadir campo derivado o lógica en el generador:  
`passenger_name` → "DEOLEOREYES/FRANCISWILLYS"

### 3. Teléfono de la agencia

El voucher incluye: "849-919-1919" en EXTRAS.

- No viene del ticket.
- Debe configurarse en **Teléfono agencia** (`phone_mm1b5c7a`).
- Origen: datos de la agencia, no de Parseur.

### 4. Día de la semana

El voucher usa: "SALIDA: MIERCOLES 11 MARZO 2026".

- No está en Parseur/Monday.
- Se calcula desde `departure_date`.
- El generador debe formatear la fecha y añadir el día de la semana.

### 5. Etiqueta "RETORNO" en el último tramo

Para el segmento 4 aparece "RETORNO SANTO DOMINGO (SDQ)" en lugar de "DESTINO SANTO DOMINGO (SDQ)".

- Puede inferirse si `destination_code === origin_main_code` (vuelta al origen).
- O usar `voucher_trip_type` = "Retorno" en Parseur/Monday.

### 6. Nombre de ciudad en español

- Ticket: "MADRID ADOLFO SUAREZ BARAJAS", "LONDON GATWICK"
- Voucher: "MADRID", "LONDRES", "SANTO DOMINGO"

Si se quiere el formato corto del voucher, hace falta un mapeo código→ciudad (ej. MAD→MADRID, LGW→LONDRES, SDQ→SANTO DOMINGO) o usar `destination_name` con una lógica de normalización.

### 7. Asiento

- No aparece en el ticket (se asigna en check-in).
- En el voucher figura como " - " entre pasajero y ticket.
- El generador puede usar " - " o "TBA" cuando no haya asiento.

### 8. Texto EXTRAS

- Lista de recomendaciones fija.
- Teléfono de emergencia.
- Origen: plantilla de la agencia, no del ticket.

---

## Resumen: qué hay y qué falta

| Necesario para voucher | ¿En Monday/Parseur? | Acción |
|------------------------|--------------------|--------|
| Pasajero | ✅ | Usar y transformar formato |
| PNR | ✅ | — |
| Aerolínea | ✅ | — |
| Ticket number | ✅ | — |
| Fechas por segmento | ❌ | Crear subitems con datos de `segments` |
| Destino por segmento | ❌ | Idem |
| Vuelo, operado por, etc. | ❌ | Idem |
| Formato pasajero (APELLIDO/NOMBRE) | ❌ | Transformar en generador |
| Día de la semana | ❌ | Calcular desde fecha |
| Teléfono agencia | ❌ | Configurar en Monday (datos agencia) |
| Etiqueta RETORNO | Parcial | Usar `voucher_trip_type` o inferir |
| Mapeo ciudad español | Parcial | Lógica o mapeo en generador |
| Bloque EXTRAS | ❌ | Plantilla fija en generador |
| Asiento | Parcial | Opcional; usar " - " si vacío |

---

## Campos que conviene añadir al board

| Campo | Tipo | Motivo |
|-------|------|--------|
| **Pasajero formato voucher** | text | Apellido/Nombre para el voucher sin tener que transformar en cada generación |
| (Opcional) **Código ciudad destino** | text | Si se quiere normalizar MAD→MADRID, etc. |

**Alternativa:** Hacer la transformación del nombre en el generador de PDF, sin nuevo campo.

---

## Flujo pendiente para generación automática

1. **n8n:** Crear subitems en Monday a partir de la tabla `segments` de Parseur.
2. **Datos agencia:** Rellenar Correo agencia y Teléfono agencia (manual o por configuración).
3. **Generador de voucher:** Usar plantilla con:
   - Datos del item principal.
   - Un subitem = una página del voucher.
   - Formato pasajero: `APELLIDO/NOMBRE`.
   - Día de la semana desde `departure_date`.
   - Bloque EXTRAS fijo (incl. teléfono agencia).
   - Tratamiento especial para tramo "Retorno".
