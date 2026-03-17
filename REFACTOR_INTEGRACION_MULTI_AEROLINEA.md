# Refactor de integracion multi-aerolinea

## Tickets analizados

### Air Europa
- Layout tabular IATA clasico.
- Trae PNR, ticket, segmentos, clase, fare basis, equipaje.
- Puede incluir varios pasajeros y asientos distintos dentro del mismo segmento.

### Iberia / agencia
- Layout visual tipo e-ticket.
- Un solo segmento, varios pasajeros, cada pasajero con su boleto.
- El dato estable no es la posicion visual sino la relacion pasajero -> ticket.

### Ticket interno de prueba
- Misma familia IATA textual que Air Europa.
- Expone el problema principal del modelo actual: un segmento puede tener varios asientos, uno por pasajero.

## Problemas del diseño actual

1. El board de Monday no crea varias columnas que el generador PDF ya espera: `Nombre voucher`, `Agencia`, `Oficina emisora`, `Extras`.
2. El mapper automatico del microservicio no estaba leyendo varias columnas de reserva aunque existieran en Monday.
3. Parseur modela `seat` como un solo valor por segmento, pero los tickets reales pueden traer `N` asientos para `N` pasajeros dentro del mismo tramo.
4. `passenger_voucher` no forma parte del contrato de Parseur, por lo que n8n termina improvisando un formato critico para el voucher.

## Estructura refactorizada recomendada

### Parseur

Campos globales:
- pasajero principal
- PNR
- ticket principal
- aerolinea principal
- fecha de emision
- origen principal
- destino final
- destino pasajero
- ruta general
- fecha salida
- fecha regreso
- tipo viaje
- cantidad segmentos
- clase
- equipaje
- fare basis
- estado reserva
- agencia
- oficina emisora

Tabla `passengers`:
- `passenger_number`
- `passenger_name`
- `passenger_voucher`
- `ticket_number`

Tabla `segments`:
- datos operativos del tramo
- `seat`
- `seat_assignments`

`seat_assignments` debe salir en formato una linea por pasajero:

```text
DEOLEOREYES/FRANCISWILLYS=03A
RAMIREZ/ANGELMANUEL=03D
```

### Monday

Item principal:
- mantener datos normalizados de la reserva
- guardar `Nombre voucher`
- guardar `Lista pasajeros`
- guardar `Extras`
- guardar `Agencia` y `Oficina emisora`

Subitems:
- un subitem por segmento
- agregar `Asientos pasajeros` para no perder asientos multi-pasajero

### n8n

Flujo recomendado:

1. Monday recibe `Archivo ticket`.
2. n8n manda el PDF a Parseur.
3. Parseur responde con campos globales + tabla `passengers` + tabla `segments`.
4. n8n deriva:
   - `Nombre voucher` desde `passengers[0].passenger_voucher`
   - `Lista pasajeros` como `APELLIDO/NOMBRE - TICKET`
   - `Ticket principal` desde el primer pasajero o el campo global
5. n8n actualiza el item principal en Monday.
6. n8n crea o reemplaza subitems de segmentos, incluyendo `Asientos pasajeros`.
7. n8n llama a `POST /render-voucher-by-pulse`.
8. El microservicio lee Monday, resuelve asientos por pasajero y genera el PDF final.

## Regla clave

La fuente de verdad del voucher debe ser:

- Reserva global en item principal
- Pasajeros en `Lista pasajeros`
- Segmentos en subitems
- Asientos multi-pasajero en `Asientos pasajeros`

Si un dato solo existe en el PDF original y no queda normalizado en Monday, el flujo queda fragil.
