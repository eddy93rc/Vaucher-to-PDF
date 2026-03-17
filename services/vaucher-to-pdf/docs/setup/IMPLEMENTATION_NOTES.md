# Notas de implementación - Auto-Vaucher

## Campos y columnas añadidos (destino pasajero + múltiples pasajeros)

### Parseur

**Campo global nuevo:**
- `passenger_destination` (ONELINE)  
  Instrucción: *"Destino principal del pasajero. En viaje solo ida, devolver el código IATA o ciudad del último destino del itinerario. En ida y vuelta, devolver el destino más lejano, no el aeropuerto de retorno."*

**Tabla nueva:**
- `passengers`  
  Columnas: passenger_number, passenger_name, ticket_number  
  Instrucción: *"Extraer una fila por cada pasajero listado en el ticket. Para cada fila devolver passenger_number, passenger_name y ticket_number. Si hay varios pasajeros, devolver todos."*

### Monday

**Columnas nuevas del item principal:**
1. **Destino pasajero** (text) → column_id: `text_mm1cd796`  
   Origen: Parseur `passenger_destination`

2. **Lista pasajeros** (long_text) → column_id: `long_text_mm1c70w4`  
   Origen: tabla `passengers` de Parseur. n8n formateará: APELLIDO/NOMBRE - TICKET, una línea por pasajero.

---

## Lo que NO cambia

- **Subitems / segments**: El flujo de creación de subitems por segmento se mantiene igual.
- **Columnas de subitems**: Sin modificaciones.
- **n8n**: Aún no se ha tocado; se actualizará en una fase posterior.
- **Generador de PDF**: Sin cambios por ahora.

---

## Resumen: qué se pudo crear automáticamente

| Elemento | Monday | Parseur |
|----------|--------|---------|
| Destino pasajero | Sí (script crea columna) | No (409 en API) |
| Lista pasajeros | Sí (script crea columna) | No (409 en API) |
| Tabla passengers | — | No (409 en API) |

---

## Pendiente manual en Parseur

La API de Parseur devuelve **409** al actualizar el buzón existente. Hay que añadir manualmente en [app.parseur.com](https://app.parseur.com) → Buzón **Ticket Aereo**:

1. **Campo global** `passenger_destination`:  
   Instrucción: *"Destino principal del pasajero. En viaje solo ida, devolver el código IATA o ciudad del último destino del itinerario. En ida y vuelta, devolver el destino más lejano, no el aeropuerto de retorno."*

2. **Tabla** `passengers` con columnas:  
   - passenger_number (NUMBER)  
   - passenger_name (NAME)  
   - ticket_number (ONELINE)  
   Instrucción: *"Extraer una fila por cada pasajero listado en el ticket. Para cada fila devolver passenger_number, passenger_name y ticket_number. Si hay varios pasajeros, devolver todos."*

Ver `PARSEUR_PASSENGERS_MANUAL.md` para más detalle.

---

## Uso en n8n (próximos pasos)

### passenger_destination
- Mapeo directo de Parseur a la columna `text_mm1cd796` (Destino pasajero).

### passengers → Lista pasajeros
1. Tomar el array `passengers` de la salida de Parseur.
2. Para cada fila: convertir `passenger_name` a formato APELLIDO/NOMBRE (sin espacios, mayúsculas).
3. Concatenar: `APELLIDO/NOMBRE - ticket_number`.
4. Unir las líneas con `\n`.
5. Escribir el resultado en la columna `long_text_mm1c70w4` (Lista pasajeros).
