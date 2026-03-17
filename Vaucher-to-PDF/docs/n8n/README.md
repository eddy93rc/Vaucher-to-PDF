# n8n: Workflow RESERVAS

El workflow **RESERVAS** orquesta el flujo Monday → Parseur → Monday y genera el voucher PDF.

## Triggers

1. **Webhook Monday** – Detecta subida de ticket en columna "Archivo ticket"
2. **Webhook Parseur** – Recibe datos extraídos del ticket
3. **Webhook emitir voucher** – Dispara generación de PDF (llama a Vaucher-to-PDF)

## Nodos clave

| Nodo | Función |
|------|---------|
| Extraer Datos Parseur | Mapea body del webhook a campos (passenger_name, passengers, passenger_destination, segments, etc.) |
| Formatear Lista Pasajeros | Convierte tabla `passengers` a `APELLIDO/NOMBRE - TICKET` por línea |
| Mapear Parseur a Monday | Actualiza columnas del item principal |
| Split Out Segments | Separa segmentos para procesar uno a uno |
| Formatear Salida Llegada | Genera `salida_llegada` (ej. "SDQ Mié 11 Mar 22:50 → MAD Jue 12 Mar 11:55 +1") |
| Crear Subitem Segmento GraphQL | Crea cada subitem en Monday con sus columnas |

## Integración con Vaucher-to-PDF

n8n llama a:
```
POST http://10.10.12.33:9110/render-voucher-by-pulse
Body: { "pulse_id": "<pulseId del item>" }
```

O con subida automática: `?upload=1`
