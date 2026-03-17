# Arquitectura - Voucher PDF Generator

Este documento describe la arquitectura **interna** del microservicio. Para el ecosistema completo (Parseur, Monday, n8n), ver [docs/ARCHITECTURE_FULL.md](docs/ARCHITECTURE_FULL.md).

## Diagrama de flujo

```mermaid
flowchart TB
    subgraph client [Cliente n8n]
        HTTP[POST /render-voucher]
    end

    subgraph service [Microservicio]
        Server[server.ts Express]
        Routes[renderVoucher.ts]
        Validate[Zod Schema]
        ViewModel[viewModelBuilder.ts]
        Render[pdfRenderer.ts Playwright]
        Template[voucher.html + voucher.css]
    end

    subgraph assets [Assets]
        AssetsDir[/assets logos, fondos]
        TemplatesDir[/templates]
        OutputDir[/output temporal]
    end

    HTTP --> Server
    Server --> Routes
    Routes --> Validate
    Validate --> ViewModel
    ViewModel --> Render
    Render --> Template
    Render --> AssetsDir
    Render -.->|opcional| OutputDir
```

## Flujo de datos

1. `POST /render-voucher` recibe JSON
2. **Zod** valida y normaliza el payload
3. **viewModelBuilder** construye el view model (fechas en español, encabezado destino/retorno, asiento por defecto, etc.)
4. **Handlebars** inyecta datos en la plantilla HTML; CSS se incrusta inline
5. **Playwright** abre el HTML en Chromium headless y genera PDF
6. El servidor devuelve `application/pdf` o guarda en `/output`

## Stack

- **Node.js + TypeScript**: runtime y tipado
- **Express**: servidor HTTP
- **Zod**: validación del payload
- **Handlebars**: plantilla HTML
- **Playwright**: render HTML → PDF (Chromium)

## Componentes

| Componente | Archivo | Responsabilidad |
|------------|---------|-----------------|
| Schema | `schemas/voucherPayload.ts` | Validación Zod del payload |
| View Model | `services/viewModelBuilder.ts` | Transformar payload a datos de plantilla |
| PDF Renderer | `services/pdfRenderer.ts` | Playwright, generar PDF desde HTML |
| Rutas | `routes/renderVoucher.ts` | Endpoints, compilación de plantilla |
| Utilidades | `utils/dateFormatters.ts`, `passengerFormatters.ts` | Formato fechas y nombres |

## Estrategia de assets

- Los logos y marca de agua se leen desde `./assets` al compilar la plantilla.
- Se convierten a base64 y se incrustan en el HTML como data URLs.
- El HTML resultante es autocontenido; Playwright no requiere resolver URLs externas durante el render.

## Paginación

- Cada segmento tiene `page-break-inside: avoid` para evitar cortes.
- Entre segmentos se inserta `page-break-after: always` (excepto en el último).
- Resultado: un segmento por página cuando hay varios.
