# Configuración manual: Tabla passengers en Parseur

La API de Parseur devuelve error 409 al actualizar el buzón existente. Debes añadir la tabla **passengers** manualmente.

## Pasos en app.parseur.com

1. Entra a [Parseur](https://app.parseur.com) y abre el buzón **Ticket Aereo**.
2. Ve a **Campos** / **Fields**.
3. Añade un campo de tipo **Tabla** (TABLE).
4. Nombre: `passengers`
5. Instrucción para la IA: *"Tabla de pasajeros: cada fila es un pasajero. Extrae TODOS los pasajeros del ticket con su nombre y número de boleto."*
6. Añade las siguientes columnas a la tabla:

| Columna           | Tipo  | Instrucción |
|-------------------|-------|-------------|
| passenger_number  | NUMBER | Número del pasajero (1, 2, 3...) |
| passenger_name    | NAME   | Nombre completo del pasajero |
| ticket_number     | ONELINE | Número de boleto de este pasajero |

## Formato de salida

Parseur devolverá algo como:

```json
{
  "passengers": [
    { "passenger_number": 1, "passenger_name": "Kirsy Susana Ramirez Del Amparo", "ticket_number": "075-5011056620" },
    { "passenger_number": 2, "passenger_name": "Yohan Manuel Jimenez Carvajal", "ticket_number": "075-5011056621" },
    { "passenger_number": 3, "passenger_name": "Ana Ceferina Padua De La Rosa De Ramirez", "ticket_number": "075-5011056622" }
  ]
}
```

## Mapeo a Monday

n8n debe formatear la tabla `passengers` para la columna "Lista pasajeros" (id: `long_text_mm1c70w4`):

- Por cada pasajero: convertir nombre a formato `APELLIDO/NOMBRE` (apellidos unidos + "/" + nombres)
- Concatenar: `APELLIDO/NOMBRE - TICKET`
- Unir todos con salto de línea (`\n`)

Ejemplo para el JSON anterior:
```
RAMIREZDELAMPARO/KIRSY - 0755011056620
JIMENEZCARVAJAL/YOHAN - 0755011056621
PADUADELAROSA/ANA - 0755011056622
```
