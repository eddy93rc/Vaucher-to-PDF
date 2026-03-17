# Columna "Salida y llegada" en n8n

La columna **Salida y llegada** muestra en un solo campo el tramo completo de cada segmento, como en el voucher manual: origen + fecha/hora salida → destino + fecha/hora llegada.

**Formato:** `SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55` (y `+1` si la llegada es al día siguiente)

---

## 1. Parseur – Sin cambios

Parseur ya extrae los campos necesarios en la tabla `segments`:
- `origin_code`, `departure_date`, `departure_time`
- `destination_code`, `arrival_date`, `arrival_time`

Nada que modificar.

---

## 2. Monday – Nueva columna

Ejecuta el script para crear la columna en el subboard de segmentos:

```bash
node setup-monday.js
```

En la salida, localiza el `column_id` de **"Salida y llegada"** (ej. `text_mm1xxxxx`). Lo usarás en n8n.

Si el board ya existe, el script solo añade la columna que falta.

---

## 3. n8n – Dos cambios

### 3.1 Nodo Code nuevo: "Formatear Salida Llegada"

**Posición:** Entre **Split Out Segments** y **Crear Subitem Segmento GraphQL**.

**Conexiones:**
- Entrada: Split Out Segments  
- Salida: Crear Subitem Segmento GraphQL  

**Código del nodo:**

```javascript
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtFechaHora(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (timeStr ? 'T' + timeStr : 'T00:00:00'));
  if (isNaN(d.getTime())) return dateStr + ' ' + (timeStr || '');
  const dia = DIAS[d.getDay()];
  const num = d.getDate();
  const mes = MESES[d.getMonth()];
  let hora = '';
  if (timeStr) {
    const m = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    hora = m ? m[1] + ':' + m[2] : String(timeStr).slice(0, 5);
  }
  return (dia + ' ' + num + ' ' + mes + (hora ? ' ' + hora : '')).trim();
}

function addPlus1(depDate, arrDate) {
  if (!depDate || !arrDate) return '';
  const d1 = new Date(depDate);
  const d2 = new Date(arrDate);
  if (d1.toDateString() !== d2.toDateString()) return ' +1';
  return '';
}

const items = $input.all();
return items.map(item => {
  const j = item.json;
  const salida = fmtFechaHora(j.departure_date, j.departure_time);
  const llegada = fmtFechaHora(j.arrival_date, j.arrival_time);
  const plus1 = addPlus1(j.departure_date, j.arrival_date);
  const salidaLlegada = [
    (j.origin_code || '').trim(),
    salida,
    '→',
    (j.destination_code || '').trim(),
    llegada + plus1
  ].filter(Boolean).join(' ');
  return { json: { ...j, salida_llegada: salidaLlegada } };
});
```

---

### 3.2 Actualizar "Crear Subitem Segmento GraphQL"

En el `jsonBody` del nodo **Crear Subitem Segmento GraphQL**, agrega la columna **Salida y llegada** al objeto `columnValues`.

Busca el bloque que define `columnValues` y añade esta línea (ajusta `text_mm1XXXXX` con el `column_id` real que devolvió `setup-monday.js`):

```javascript
text_mm1XXXXX: $json.salida_llegada || '',
```

**Ejemplo:** Si el `column_id` es `text_mm1s2l3m`, quedaría:

```javascript
text_mm1s2l3m: $json.salida_llegada || '',
```

Inclúyela junto al resto de columnas, por ejemplo después de `text_mm1bhp08` (Llegada hora).

---

## 4. Resultado esperado

| Segmento   | Salida y llegada                                                                 |
|------------|-----------------------------------------------------------------------------------|
| SDQ → MAD  | `SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55 +1`                                 |
| MAD → LGW  | `MAD Jue 12 Mar 15:00 → LGW Jue 12 Mar 16:25`                                    |

La app de generación de PDF puede leer esta columna directamente para el encabezado de cada tramo.
