# Fix: Formatear Lista Pasajeros (n8n) – normalizeName mejorado

Reemplaza el código del nodo **Formatear Lista Pasajeros** (Code) en el workflow RESERVAS con la versión mejorada a continuación.

---

## Cambios realizados

1. **Typo Ramires → Ramirez**: Corrección automática de errores OCR frecuentes en apellidos españoles.
2. **Apellidos compuestos**: Heurística ajustada: primeros 2 tokens = nombres, resto = apellidos (para "Ana Ceferina Padua De La Rosa De Ramirez" → PADUADELAROSADERAMIREZ/ANACEFERINA).
3. **Formato "Apellidos, Nombres"**: Si el nombre viene con coma (ej. "Padua De La Rosa De Ramirez, Ana Ceferina"), se usa directamente.
4. **Estructura Parseur**: Si Parseur envía `{ first, last }` o `{ full }`, se usa la estructura en lugar de la heurística.
5. **Títulos**: Eliminación de MR, MRS, MS, DR, etc., preservada.

---

## Código completo para el nodo Code

Copia y pega este código en el nodo **Formatear Lista Pasajeros**:

```javascript
// Correcciones de typos OCR comunes en apellidos españoles
const TYPO_FIXES = [
  ['Ramires', 'Ramirez'],
  ['Gonzales', 'Gonzalez'],
  ['Rodrigues', 'Rodriguez'],
  ['Sanches', 'Sanchez'],
  ['Lopes', 'Lopez'],
  ['Martines', 'Martinez'],
];

function fixTypos(str) {
  if (!str || typeof str !== 'string') return str;
  let s = str;
  for (const [wrong, correct] of TYPO_FIXES) {
    s = s.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), correct);
  }
  return s;
}

function normalizeName(raw) {
  if (!raw) return '';

  let full = '';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      full = parsed.full || raw;
    } catch {
      full = raw;
    }
  } else if (typeof raw === 'object') {
    // Si Parseur envía first/last estructurado, usarlo directamente
    if (raw.first != null && raw.last != null) {
      const apellido = fixTypos(String(raw.last)).replace(/\s+/g, '').toUpperCase();
      const nombre = String(raw.first).replace(/\s+/g, '').toUpperCase();
      return `${apellido}/${nombre}`;
    }
    full = raw.full || [raw.first, raw.middle, raw.last].filter(Boolean).join(' ');
  }

  full = fixTypos(String(full))
    .replace(/\b(MR|MRS|MS|MISS|SR|SRA|DR)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!full) return '';

  // Formato "Apellidos, Nombres" (ej. "Padua De La Rosa De Ramirez, Ana Ceferina")
  if (full.includes(',')) {
    const [apellidos, nombres] = full.split(',').map(s => s.trim());
    if (apellidos && nombres) {
      return (
        apellidos.replace(/\s+/g, '').toUpperCase() +
        '/' +
        nombres.replace(/\s+/g, '').toUpperCase()
      );
    }
  }

  const parts = full.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].toUpperCase();

  // Heurística: primeros 2 tokens = nombres, resto = apellidos
  // Ej: "Ana Ceferina Padua De La Rosa De Ramirez" → nombre="Ana Ceferina", apellido="Padua De La Rosa De Ramirez"
  const givenCount = Math.min(2, Math.max(1, Math.floor(parts.length / 2)));
  const firstName = parts.slice(0, givenCount).join('').toUpperCase();
  const lastName = parts.slice(givenCount).join('').toUpperCase();

  return `${lastName}/${firstName}`;
}

const passengers = $json.passengers || [];
const formatted = passengers
  .map((p) => {
    const name = normalizeName(p.passenger_name || p.name || '');
    const ticket = String(p.ticket_number || '').trim().replace(/\s+/g, '');
    if (!name && !ticket) return '';
    return ticket ? `${name} - ${ticket}` : name;
  })
  .filter(Boolean)
  .join('\n');

return [
  {
    json: {
      ...$json,
      formatted_passengers_list: formatted,
    },
  },
];
```

---

## Cómo aplicarlo en n8n

1. Abre el workflow **RESERVAS** en n8n.
2. Haz doble clic en el nodo **Formatear Lista Pasajeros**.
3. Pega el código anterior reemplazando el contenido actual del editor.
4. Guarda y publica el workflow.

---

## Resultados esperados

| Entrada | Salida anterior | Salida nueva |
|---------|------------------|--------------|
| Kirsy Susana Ramirez Del Amparo | RAMIRESDELAMPARO/... (typo) | RAMIREZDELAMPARO/KIRSYSUSANA |
| Ana Ceferina Padua De La Rosa De Ramirez | PADUADELAROSA/ANACEFERINA | PADUADELAROSADERAMIREZ/ANACEFERINA |
| Yohan Manuel Jimenez Carvajal | JIMENEZCARVAJAL/YOHANMANUEL | (sin cambio) |

---

## Nota sobre Parseur

Si Parseur sigue omitiendo "De Ramirez" u otros apellidos compuestos, hay que ajustar las instrucciones del campo `passenger_name` en la tabla `passengers`. Ver `FIX_PARSEUR_PASSENGERS.md`.
