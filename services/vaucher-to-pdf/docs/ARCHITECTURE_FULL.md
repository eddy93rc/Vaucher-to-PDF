# Arquitectura completa: Auto-Vaucher

Automatización de reservas aéreas con **Monday.com**, **Parseur**, **n8n** y este microservicio de generación de vouchers PDF.

---

## Diagrama del flujo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Agente    │────▶│   Monday   │────▶│    n8n      │────▶│   Parseur    │────▶│   n8n (mapeo)       │
│ sube PDF    │     │  (ticket)  │     │ detecta PDF │     │ extrae datos │     │ Monday + documentos │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────────────┘
                                                                                           │
                                                                                           ▼
                                                                                  ┌─────────────────────┐
                                                                                  │ Vaucher-to-PDF       │
                                                                                  │ (este servicio)      │
                                                                                  └─────────────────────┘
```

---

## Resumen del flujo

1. **Entrada**: El agente sube el ticket PDF a la columna "Archivo ticket" de un item en el tablero RESERVAS (Monday).
2. **Detección**: n8n detecta el nuevo archivo (webhook de Monday).
3. **Extracción**: n8n envía el PDF a Parseur, que con IA extrae: PNR, pasajeros, aerolínea, segmentos de vuelo, fechas, etc.
4. **Mapeo**: n8n recibe el webhook de Parseur y:
   - Actualiza las columnas del item principal en Monday.
   - Crea subitems por cada segmento de vuelo.
   - Formatea la lista de pasajeros (APELLIDO/NOMBRE - TICKET).
5. **Generación de PDF**: n8n llama a este servicio con `pulse_id`; la app obtiene datos de Monday y genera el voucher PDF.
6. **Subida**: El PDF se devuelve a n8n o se sube directamente a la columna "Voucher PDF" del item.

---

## Componentes

| Componente | Responsabilidad |
|------------|-----------------|
| **Monday** | Almacena items (reservas) y subitems (segmentos). Columnas para ticket, pasajeros, PNR, fechas, archivos. |
| **Parseur** | Extrae datos del ticket PDF (IA). Campos globales + tabla `passengers` + tabla `segments`. |
| **n8n** | Orquesta el flujo: Monday → Parseur → Monday, formatea datos, invoca el generador PDF. |
| **Vaucher-to-PDF** | Microservicio que genera el PDF del voucher a partir de datos de Monday (por `pulse_id`). |

---

## IDs de referencia

| Concepto | ID |
|----------|-----|
| Board principal (reservas) | `18403483965` |
| Subboard (segmentos/subitems) | `18403484081` |

---

## Documentación por componente

| Documento | Contenido |
|-----------|-----------|
| [parseur/README.md](parseur/README.md) | Buzón Ticket Aereo, campos, tablas |
| [monday/README.md](monday/README.md) | Columnas del board |
| [monday/MAPPING.md](monday/MAPPING.md) | Mapeo Parseur ↔ Monday |
| [n8n/README.md](n8n/README.md) | Workflow RESERVAS, nodos clave |
| [PROMPT_APP_GENERADOR_PDF.md](PROMPT_APP_GENERADOR_PDF.md) | Especificación para la app de PDF |

---

## Endpoint principal para n8n

```
POST /render-voucher-by-pulse
Body: { "pulse_id": "11482380201" }
```

La app obtiene el item y subitems de Monday, mapea columnas y genera el PDF.
