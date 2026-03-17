# Prompt: App Generadora de PDF de Vouchers

Documento de referencia para la aplicación que genera el PDF del voucher a partir de datos en Monday.com. La app recibe `pulse_id`, obtiene el item y sus subitems desde Monday, y estructura el documento.

---

## 1. Flujo de datos (Parseur → n8n → Monday)

```
Ticket PDF → Parseur (extrae) → n8n (mapea) → Monday
                                         ↓
                              Item principal (reserva)
                              + Subitems (segmentos)
```

- **Parseur** extrae del ticket: pasajeros, PNR, aerolínea, segmentos de vuelo, fechas, etc.
- **n8n** recibe el webhook de Parseur, formatea la lista de pasajeros como `APELLIDO/NOMBRE - TICKET` (una línea por pasajero), y escribe en Monday.
- **Monday** almacena: un **item** por reserva y **subitems** por cada segmento de vuelo.

---

## 2. Acceso a datos por pulse_id

| Concepto | Descripción |
|----------|-------------|
| **pulse_id** | ID del item principal (reserva) en Monday. Es el `pulseId` que recibe la app. |
| **Item principal** | Contiene los datos globales de la reserva: pasajeros, PNR, aerolínea, fechas, etc. |
| **Subitems** | Hijos del item; uno por cada segmento de vuelo. Contienen origen, destino, vuelo, hora, etc. |

**Pasos de la app:**
1. Obtener el item por `pulse_id` (board 18403483965).
2. Obtener los subitems del item (subboard 18403484081).
3. Para el voucher: usar datos del item + iterar subitems (un tramo = una página o sección).

---

## 3. Estructura de columnas Monday

### 3.1 Item principal (reserva)

| column_id | Columna | Tipo | Ejemplo valor |
|-----------|---------|------|----------------|
| `name` | Nombre del item | string | "De Oleo Reyes Francis" |
| `text_mm1b9vf3` | Pasajero principal | text | "De Oleo Reyes Francis Willys Mr" |
| `text_mm1b1b5w` | PNR / Código reserva | text | "8ZTDP5" |
| `text_mm1bq9bc` | Número de boleto | text | "996 2426250502" |
| `long_text_mm1c70w4` | **Lista pasajeros** | long_text | Ver sección 4 |
| `text_mm1b4mb1` | Aerolínea principal | text | "IBERIA" |
| `date_mm1bw16n` | Fecha emisión ticket | date | `{"date":"2026-03-07"}` |
| `text_mm1b8rv7` | Origen principal | text | "FCO" |
| `text_mm1bxfa3` | Destino final | text | "MAD" |
| `text_mm1cd796` | Destino pasajero | text | "MAD" o "Madrid" |
| `long_text_mm1bpk6w` | Ruta general | long_text | "FCO-MAD" |
| `date_mm1bshfd` | Fecha salida | date | `{"date":"2026-03-26"}` |
| `date_mm1bqrzy` | Fecha regreso | date | `{"date":"2026-03-29"}` |
| `color_mm1b30rv` | Tipo viaje | status | `{"label":"Solo ida"}` |
| `numeric_mm1bhwn0` | Cantidad segmentos | number | 4 |
| `text_mm1b7ycn` | Clase | text | "ECONOMY" |
| `text_mm1bk9hf` | Equipaje | text | "1PC" |
| `text_mm1bacys` | Fare basis | text | "VLYRAE" |
| `color_mm1b1pjr` | Estado reserva | status | `{"label":"Confirmada"}` |
| `phone_mm1b5c7a` | Teléfono agencia | phone | Para EXTRAS |
| `email_mm1bzm83` | Correo agencia | email | Opcional |

### 3.2 Subitems (segmentos)

| column_id | Columna | Tipo | Ejemplo |
|-----------|---------|------|---------|
| `name` | Nombre subitem | string | "Segmento 1 - UX88" |
| `numeric_mm1bn62n` | Segmento # | number | 1 |
| `date_mm1bdr4b` | Fecha encabezado voucher | date | `{"date":"2026-03-26"}` |
| `text_mm1b2khv` | Destino voucher | text | "ROMA (FCO) - MADRID, MAD" |
| `color_mm1bj7np` | Tipo tramo | status | `{"label":"Salida"}` |
| `text_mm1bs18h` | Vuelo | text | "658" |
| `text_mm1bdzkw` | Operado por | text | "IBERIA" |
| `text_mm1ber8k` | Origen código | text | "FCO" |
| `text_mm1b7ra3` | Origen nombre | text | "Leonardo Da Vinci" |
| `text_mm1byh8c` | Origen terminal | text | "1" |
| `text_mm1bc24j` | Destino código | text | "MAD" |
| `text_mm1bqsgh` | Destino nombre | text | "Barajas Arpt" |
| `text_mm1b8xev` | Destino terminal | text | "4" |
| `date_mm1bhq59` | Salida fecha | date | `{"date":"2026-03-26"}` |
| `text_mm1bggg` | Salida hora | text | "07:30" o "07:30:00" |
| `date_mm1b8wej` | Llegada fecha | date | `{"date":"2026-03-26"}` |
| `text_mm1bhp08` | Llegada hora | text | "10:05" |
| `text_*` | **Salida y llegada** | text | "SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55 +1" |
| `text_mm1bg1g3` | Duración | text | "02:35" |
| `text_mm1bp2sm` | Clase segmento | text | "ECONOMY" |
| `text_mm1b9824` | Equipaje segmento | text | "1PC" |
| `text_mm1bevde` | Ticket No. | text | "075-5011056620" |
| `text_mm1bhvz6` | Asiento | text | "" o "12A" |

### 3.3 Valores de tipo status (color)

- **Tipo viaje:** `Solo ida`, `Ida y vuelta`, `Multiciudad`
- **Tipo tramo:** `Salida`, `Conexión`, `Retorno`
- **Estado reserva:** `Pendiente`, `Confirmada`, `Emitida`, `Cancelada`, `Reprogramada`

Extraer `column_value.label` o equivalente según la API de Monday.

---

## 4. Formato de Lista pasajeros (long_text_mm1c70w4)

### 4.1 Estructura

Cada línea = un pasajero:
```
APELLIDO/NOMBRE - TICKET
```

- **APELLIDO** y **NOMBRE** vienen **pegados** (sin espacios): `RAMIREZDELAMPARO`, `KIRSYSUSANA`.
- Separador entre apellido y nombre: `/`
- Separador antes del ticket: ` - ` (espacio guión espacio)
- Líneas separadas por `\n`.

**Ejemplo crudo:**
```
RAMIREZDELAMPARO/KIRSYSUSANA - 0755011056620
JIMENEZCARVAJAL/YOHANMANUEL - 0755011056621
PADUADELAROSADERAMIREZ/ANACEFERINA - 0755011056622
```

### 4.2 Separar nombres pegados para mostrarlos

Para la sección "PREPARADO PARA" o para formato legible, insertar espacios en los nombres concatenados.

**Reglas para APELLIDOS (antes del /):**
- Insertar espacio **antes** de: `DEL`, `DE LA`, `DE LOS`, `DE ` (cuando va seguido de otra parte del apellido).
- Ejemplos:
  - `RAMIREZDELAMPARO` → `RAMIREZ DEL AMPARO`
  - `PADUADELAROSADERAMIREZ` → `PADUA DE LA ROSA DE RAMIREZ`
  - `GONZALEZDELEON` → `GONZALEZ DE LEON`

**Reglas para NOMBRES (después del /):**
- Si no hay partículas conocidas, asumir 2 palabras: primera parte (4–6 letras) + resto.
- Ejemplo: `KIRSYSUSANA` → `KIRSY SUSANA`
- Ejemplo: `YOHANMANUEL` → `YOHAN MANUEL`
- Heurística: si la longitud es par y > 6, partir por la mitad; si no, usar 4–5 primeras letras como primer nombre.

**Algoritmo para separar apellidos:**
1. Reemplazar (en orden, para no solapar):
   - `"DEL"` → `" DEL "` (cuando está entre dos bloques de letras: `RAMIREZDELAMPARO` → `RAMIREZ DEL AMPARO`)
   - `"DELA"` → `" DE LA "` (De La: `PADUADELAROSA` → `PADUA DE LA ROSA`)
   - `"DELOS"` → `" DE LOS "`
   - `"DE"` seguido de letra mayúscula → `" DE "` (ej. `ROSADERAMIREZ` → `ROSA DE RAMIREZ`)

**Algoritmo para separar nombres (después del /):**
- Si longitud ≤ 6: no separar.
- Si hay partícula ("DEL", "DE", etc.): igual que apellidos.
- Si no: heurística típica = primer nombre 4–5 letras: `KIRSYSUSANA` → `KIRSY SUSANA`, `YOHANMANUEL` → `YOHAN MANUEL`.

**Código de referencia (JavaScript):**
```javascript
function separarApellidos(s) {
  if (!s) return '';
  return s
    .replace(/([A-Z])DELA([A-Z])/g, '$1 DE LA $2')  // Antes que DEL: PADUADELAROSA → PADUA DE LA ROSA
    .replace(/([A-Z])DELOS([A-Z])/g, '$1 DE LOS $2')
    .replace(/([A-Z])DEL([A-Z])/g, '$1 DEL $2')     // RAMIREZDELAMPARO → RAMIREZ DEL AMPARO
    .replace(/([A-Z])DE([A-Z])/g, '$1 DE $2')       // Al final: ROSADERAMIREZ → ROSA DE RAMIREZ
    .replace(/\s+/g, ' ').trim();
}
function separarNombres(s) {
  if (s.length <= 6) return s;
  const m = s.match(/^(DEL|DE LA|DE LOS|DE)(.+)$/);
  if (m) return separarApellidos(s);
  const cut = s.length > 10 ? 5 : 4;
  return s.slice(0, cut) + ' ' + s.slice(cut);
}
function parsearLineaPasajero(linea) {
  // "RAMIREZDELAMPARO/KIRSYSUSANA - 0755011056620"
  const [parte, ticket] = linea.split(' - ').map(x => x.trim());
  const [apellido, nombre] = (parte || '').split('/');
  return {
    apellidoDisplay: separarApellidos(apellido || ''),
    nombreDisplay: separarNombres(nombre || ''),
    apellidoNombre: parte,
    ticket: ticket || ''
  };
}
```

**Formato final para display:**
- Cada palabra con mayúscula inicial: "Ramirez Del Amparo" / "Kirsy Susana"
- O todo mayúsculas con espacios: "RAMIREZ DEL AMPARO" / "KIRSY SUSANA"

---

## 5. Manejo de datos faltantes

| Situación | Acción |
|-----------|--------|
| Columna vacía o null | Omitir esa sección o usar `"—"` / `"TBA"` |
| Sin subitems | Generar voucher con solo datos del item (sin tramos por segmento) |
| `departure_time` vacío | Mostrar solo fecha en "SALIDA" |
| `seat` vacío | Usar `"–"` o `"TBA"` en columna asiento |
| `Lista pasajeros` vacía | Usar `passenger_name` (text_mm1b9vf3) como única persona |
| `phone_mm1b5c7a` vacío | Usar teléfono por defecto en EXTRAS (ej. 849-919-1919) |

---

## 6. Estructura del voucher PDF (referencia)

Por cada subitem (segmento):

```
[Destino del tramo: text_mm1b2khv]
[SALIDA Y LLEGADA: columna "Salida y llegada" - ejemplo "SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55 +1"]

PREPARADO PARA
[Lista pasajeros separada y formateada - una línea por pasajero con nombres legibles]

CÓDIGO DE RESERVACIÓN: [text_mm1b1b5w]
AEROLINEA: [text_mm1b4mb1]
VUELO: [text_mm1bs18h]
[Usar columna "Salida y llegada" si existe; si no, armar con date_mm1bhq59 + text_mm1bggg + date_mm1b8wej + text_mm1bhp08]

PASAJERO    ASIENTO    TICKET NO.
[tabla: APELLIDO/NOMBRE compacto | seat o – | ticket]

EXTRAS:
• Texto fijo...
• Teléfono: [phone_mm1b5c7a o por defecto]
```

---

## 7. Resumen para la app

1. **Entrada:** `pulse_id` (item principal).
2. **Obtener:** item + subitems de Monday (board 18403483965, subboard 18403484081).
3. **Valores:** dates como `{date: "YYYY-MM-DD"}`, status como `{label: "..."}`; extraer el valor útil.
4. **Lista pasajeros:** parsear líneas `APELLIDO/NOMBRE - TICKET`; para display, separar con espacios usando partículas (DEL, DE LA, etc.) y heurística para nombres.
5. **Datos faltantes:** omitir o usar valor por defecto; no fallar por campos vacíos.
6. **Un subitem = un tramo** en el voucher; ordenar por `numeric_mm1bn62n` o por orden de subitems.
7. **Columna "Salida y llegada":** si existe, usarla tal cual para el encabezado del tramo (ej. "SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55 +1"). Evita formatear fechas a mano.
