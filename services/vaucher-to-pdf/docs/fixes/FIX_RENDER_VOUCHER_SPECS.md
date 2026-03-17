# Specs: render-voucher-by-pulse – mejoras sugeridas

El servicio `render-voucher-by-pulse` (http://10.10.12.33:9110) genera el PDF del voucher. Estas son las mejoras sugeridas según el análisis del voucher actual.

---

## Datos que deben mostrarse

### Por segmento (subitem de Monday)

| Campo Monday | column_id | Uso en voucher |
|--------------|-----------|----------------|
| Fecha encabezado voucher | `date_mm1bdr4b` | Ej: "26 MARZO 2026" |
| Destino voucher | `text_mm1b2khv` | Ej: "ROMA (FCO) - MADRID, MAD" |
| Tipo tramo | `color_mm1bj7np` | "Salida", "Conexión", "Retorno" |
| **Vuelo** | `text_mm1bs18h` | **Añadir** – Ej: "658" o "IB 658" |
| **Salida hora** | `text_mm1bggg` | **Añadir** – Ej: "07:30" |
| Operado por | `text_mm1bdzkw` | Aerolínea operadora |

### Item principal (reserva)

| Campo Monday | column_id | Uso en voucher |
|--------------|-----------|----------------|
| Lista pasajeros | `long_text_mm1c70w4` | Tabla PASAJERO ASIENTO TICKET NO. |
| PNR | `text_mm1b1b5w` | CÓDIGO DE RESERVACIÓN |
| Aerolínea | `text_mm1b4mb1` | AEROLINEA |
| Fecha salida | `date_mm1bshfd` | SALIDA: [día] [fecha] |
| Teléfono agencia | `phone_mm1b5c7a` | EXTRAS – emergencia |

---

## Cambios recomendados

### 1. Mostrar hora de salida

**Actual:** `SALIDA: JUEVES 26 MARZO 2026`  
**Propuesto:** `SALIDA: JUEVES 26 MARZO 2026 07:30` (o `07:30 a.m.`)

- Tomar `text_mm1bggg` del subitem del segmento.
- Si está vacío, mostrar solo la fecha.
- Formato sugerido: `HH:MM` o `HH:MM a.m./p.m.`.

### 2. Mostrar número de vuelo

**Propuesto:** Incluir en el encabezado o debajo de la fecha, algo como:
- "Vuelo 658" o
- "IB 658" (con código de aerolínea si está disponible).

- Tomar `text_mm1bs18h` del subitem.
- Opcional: `text_mm1bdzkw` (operado por) para mostrar "Iberia 658".

### 3. Evitar truncamiento de nombres

**Problema:** "PREPARADO PARA" mostraba "ANA CEFERINA PADUA DE LA ROSA" en lugar de "...DE LA ROSA DE RAMIREZ".

- Si hay un límite de caracteres, subirlo o quitarlo.
- Usar `long_text_mm1c70w4` (Lista pasajeros) tal cual; viene ya formateada desde n8n.
- Comprobar que los campos de texto no corten por longitud.

### 4. Formato de la hora

Parseur puede enviar `departure_time` como:
- `"07:30:00"` (24h)
- `"07:30 a. m."`

Normalizar a formato legible (ej. `07:30` o `07:30 a.m.`).

---

## Resumen de columnas a usar

```
Subitem (segmento actual):
  date_mm1bdr4b     → Fecha encabezado
  text_mm1b2khv     → Destino
  color_mm1bj7np    → Tipo tramo (Salida/Conexión/Retorno)
  text_mm1bs18h     → Número de vuelo (AÑADIR)
  text_mm1bggg      → Hora salida (AÑADIR)
  text_mm1bdzkw     → Operado por

Item principal:
  long_text_mm1c70w4 → Lista pasajeros (tabla)
  text_mm1b1b5w     → PNR
  text_mm1b4mb1     → Aerolínea
  date_mm1bshfd     → Fecha salida (para día de la semana)
  phone_mm1b5c7a    → Teléfono emergencia
```
