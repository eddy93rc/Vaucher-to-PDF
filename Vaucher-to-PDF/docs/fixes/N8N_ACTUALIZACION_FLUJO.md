# Actualización del flujo n8n RESERVAS - Tablas faltantes

## Estado actual (verificado vía MCP)

El flujo **RESERVAS** (ID: `UJXlRR7kDFP5xIEYlJyap`) ya tiene la mayoría del mapeo configurado:

| Componente | Estado |
|------------|--------|
| **Mapear Parseur a Monday** | ✅ Ya incluye `text_mm1cd796` (Destino pasajero) y `long_text_mm1c70w4` (Lista pasajeros) |
| **Formatear Lista Pasajeros** | ✅ Ya formatea `passengers` → `APELLIDO/NOMBRE - TICKET` |
| **Extraer Datos Parseur** | ⚠️ **Faltan** `passenger_destination` y `passengers` |
| **Subitems (segmentos)** | ✅ Mapeo completo de `segments` a subboard 18403484081 |

---

## Cambio requerido (manual en n8n)

Como el MCP de n8n no permite editar workflows, debes agregar **2 asignaciones** manualmente en el nodo **Extraer Datos Parseur**.

### Pasos

1. Abre n8n → workflow **RESERVAS**
2. Localiza el nodo **Extraer Datos Parseur** (tipo Set, después de Validar Secreto)
3. En las asignaciones, añade estas 2 filas:

| name | value |
|------|-------|
| `passenger_destination` | `={{ $json.body.passenger_destination \|\| "" }}` |
| `passengers` | `={{ $json.body.passengers \|\| [] }}` |

### Orden sugerido (para mantener coherencia)

```
document_id
monday_pulse_id
monday_board_id
passenger_name
passenger_destination   ← NUEVO
passengers              ← NUEVO
reservation_code
ticket_number
airline_main
departure_date
return_date
segment_count
segments
full_payload
```

---

## Flujo de datos actual

```
Webhook Parseur → Validar Secreto → Extraer Datos Parseur → Formatear Lista Pasajeros → Mapear Parseur a Monday
                                       ↑                            ↑
                              Añade passengers y           Usa passengers para generar
                              passenger_destination        formatted_passengers_list
```

### Lo que ya existe

- **Formatear Lista Pasajeros** usa `$json.passengers` y genera `formatted_passengers_list`
- **Mapear Parseur a Monday** envía:
  - `text_mm1cd796` ← `passenger_destination`
  - `long_text_mm1c70w4` ← `formatted_passengers_list`

Si Parseur envía `passenger_destination` y `passengers` en el webhook, el flujo funcionará correctamente una vez añadidas esas dos asignaciones en Extraer Datos Parseur.

---

## Verificación

Tras agregar las asignaciones:

1. Publica el workflow.
2. Sube un ticket de prueba a Monday.
3. Espera a que Parseur procese y llame al webhook.
4. Revisa el item en Monday: deben aparecer **Destino pasajero** y **Lista pasajeros** con datos.
