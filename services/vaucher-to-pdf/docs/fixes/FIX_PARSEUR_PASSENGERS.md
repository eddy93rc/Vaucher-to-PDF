# Fix: Parseur – Instrucciones para apellidos compuestos

Si Parseur omite partes de apellidos compuestos (ej. "De Ramirez" en "Padua De La Rosa De Ramirez"), actualiza la configuración del buzón **Ticket Aereo**.

---

## Tabla `passengers` – instrucción para `passenger_name`

En [app.parseur.com](https://app.parseur.com) → Buzón **Ticket Aereo** → Campos → Tabla **passengers** → columna **passenger_name**:

### Instrucción recomendada

> **Nombre completo del pasajero tal como aparece en el ticket, incluyendo TODOS los apellidos. No omitir ninguna parte de apellidos compuestos como "De", "De La", "De Los", "Del", "Van", "Von". Ejemplo: si el ticket dice "Ana Ceferina Padua De La Rosa De Ramirez", extraer exactamente eso, sin truncar "De Ramirez". Mantener mayúsculas y ortografía exacta del documento (Ramirez, no Ramires).**

### Instrucción corta (alternativa)

> **Nombre completo del pasajero con todos los apellidos. Incluir partes "De", "Del", "De La" en apellidos compuestos. Ejemplo: "Padua De La Rosa De Ramirez" completo, no solo "Padua De La Rosa".**

---

## Campo global `passenger_name`

Si el pasajero principal también se trunca, aplica la misma instrucción al campo global `passenger_name`:

> **Nombre completo del pasajero principal tal como aparece en el ticket, con todos los apellidos (incluyendo "De", "Del", "De La" en apellidos compuestos). No truncar.**

---

## Verificación

Tras procesar un ticket de prueba (ej. Aéreo_1556486.pdf), revisa el webhook/payload de Parseur:

- `passengers[2].passenger_name` debería ser **"Ana Ceferina Padua De La Rosa De Ramirez"** completo.
- `passengers[0].passenger_name` debe ser **"Kirsy Susana Ramirez Del Amparo"** (con Z en Ramirez, no Ramires).

Si Parseur sigue truncando, puede ser una limitación del modelo. En ese caso, el fix de `normalizeName` en n8n mitigará solo cuando Parseur envíe el nombre completo.
