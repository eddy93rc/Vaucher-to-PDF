# Análisis: Flujo antiguo vs nuevo (subitems en Monday)

## Resumen de problemas

| Problema | Flujo antiguo ✅ | Flujo nuevo ❌ |
|----------|-----------------|----------------|
| **parentItemId** | `$('Extraer Datos Parseur').item.json.monday_pulse_id` | `$json.monday_pulse_id` – tras Split Out, puede no estar en `$json` según la estructura |
| **Estructura del segmento** | Split Out: `$json` = segmento directamente (cada item es el segmento) | Split Out: `$json.segments` = segmento; el Code usaba `$json.segment_number` que es undefined |
| **Creación** | Una sola mutación: `create_subitem` con `column_values` | Dos pasos: crear subitem vacío + actualizar columnas (referencias cruzadas fallan en loops) |
| **Column IDs** | Board documentado: `numeric_mm1bn62n`, `text_mm1b2khv`, etc. | Board nuevo: IDs distintos (`numeric_mm1b2ghv`, `text_mm1b8a1r`, etc.) |
| **voucher_heading_destination** | Parseur lo envía | Nuevo Parseur a veces no lo envía → fallback a `destination_name` |

## Comportamiento de Split Out en n8n

Con `fieldToSplitOut: "segments"`, cada output item tiene:
- `$json.segments` = elemento del array (el segmento)
- Resto de campos del parent: `monday_pulse_id`, `reservation_code`, etc.

El Code usaba `$json.segment_number` pero el valor está en `$json.segments.segment_number`.

## Solución aplicada

1. **Code in JavaScript1**: usar `const seg = $json.segments || $json` para leer siempre el segmento correcto.
2. **parentItemId**: usar `$('Formatear Lista Pasajeros').first().json.monday_pulse_id` (referencia explícita).
3. **Una sola mutación**: `create_subitem` con `column_values` en un único HTTP (como el flujo antiguo).
4. **voucher_heading_destination**: fallback a `seg.destination_name || ""`.
5. **Column IDs**: se mantienen los del board nuevo. Si tu subboard usa los IDs del doc (MONDAY_PARSEUR_MAPPING), habrá que actualizarlos en el nodo.
