# Auto-voucher

Automatización de reservas aéreas: extracción de datos de tickets PDF → Monday.com → generación de vouchers PDF.

## Estructura

```
auto-vaucher/
├── services/
│   ├── pdf-extractor/      # Máquina 1: Extrae datos del PDF con OpenAI (reemplaza Parseur)
│   └── vaucher-to-pdf/     # Máquina 2: Genera el PDF del voucher desde Monday
├── docker-compose.yml
├── setup-monday.js         # Crear board en Monday
├── setup-parseur.js        # Configurar Parseur (legacy)
└── docs/
```

## Servicios Docker

| Servicio        | Puerto | Función                          |
|-----------------|--------|----------------------------------|
| **pdf-extractor** | 9120   | PDF → OpenAI → JSON (pasajeros, segmentos) |
| **vaucher-to-pdf** | 9110   | pulse_id → Monday → PDF voucher  |

## Despliegue

```bash
# Variables de entorno
cp .env.example .env
# Editar .env: OPENAI_API_KEY, MONDAY_API_TOKEN

# Solo extracción (OpenAI)
docker compose up -d pdf-extractor

# Extracción + generación de voucher
docker compose --profile full up -d
```

## Integración n8n

- Workflow v3 (OpenAI): `services/vaucher-to-pdf/docs/n8n/RESERVAS-v3-openai-import.json`
- [Guía de migración](services/vaucher-to-pdf/docs/n8n/N8N_MIGRACION_OPENAI.md)

## Documentación

- [Arquitectura OpenAI + Docker](ARQUITECTURA_OPENAI_DOCKER.md)
- [Setup Monday](PROMPT_APP_GENERADOR_PDF.md)
