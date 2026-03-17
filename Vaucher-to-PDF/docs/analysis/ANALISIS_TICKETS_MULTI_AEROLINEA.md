# Análisis: Tickets multi-aerolínea y decisión de buzón

## Documentos analizados

| Archivo | Aerolínea / Emisor | Formato |
|---------|-------------------|---------|
| 8ZTDP5 - FRANCIS DE OLEO | Air Europa | IATA clásico, tabla de segmentos |
| ETKT_1772901859922 | Copa Airlines | Narrativo, "Id de Orden", segmentos tipo Origen-Destino |
| Aéreo_1556486 | Iberia / Agentes CMS | Compacto, tabla, múltiples pasajeros |
| VOUCHER BOLETO - FRANCIS DE OLEO | — | Modelo de voucher a generar |

---

## Comparativa de formatos

### Air Europa (8ZTDP5)
- Pasajero: "De Oleo Reyes Francis Willys Mr"
- PNR: UX/8ZTDP5
- Boleto: 996 2426250502
- Segmentos en tabla con columnas: Vuelo, De, To, Salida, Llegada, Clase, Operado por
- Terminología: Localizador, Número de billete, Base de tarifa

### Copa Airlines (ETKT_1772901859922)
- Pasajero: "ANGELMANUEL RAMIREZPEREZ"
- PNR: "Id de Orden" BD1V5F
- Boleto: 2302154387478
- Segmentos: "SANTO DOMINGO(SDQ) - PANAMA CITY(PTY) - Número de Vuelo- CM 129"
- Destino principal viaje: BUENOS AIRES (EZE)

### Iberia / Agentes CMS (Aéreo_1556486)
- 3 pasajeros con boletos separados
- "Número de Itinerario": 8018505
- "Código de Reserva": KNL1Q
- Un segmento: FCO → MAD
- Boletos: 075-5011056620, 075-5011056621, 075-5011056622
- Destino: MADRID (MAD)

---

## Decisión: alimentar el buzón existente

### Recomendación: usar un solo buzón "Ticket Aereo"

**Motivos:**

1. **IA adaptable**: Parseur usa GCP_AI_2, que puede interpretar distintos layouts sin templates rígidos.
2. **Campos genéricos**: Los campos actuales (passenger_name, reservation_code, segments, etc.) aplican a todos los formatos.
3. **Flujo simple**: Un PDF → un buzón → extracción → Monday. Varios buzones complicarían n8n.
4. **Mantenimiento**: Un solo buzón es más fácil de ajustar (instrucciones, campos) que varios.
5. **Destino del pasajero**: Es un concepto común en todos los tickets; se puede extraer por IA.

**Cuándo crear buzón nuevo:**
- Si ciertos tickets fallan de forma sistemática y no mejoran con ajustes.
- Si hubiera documentos muy distintos (ej. facturas, no solo tickets).

---

## Nuevo campo: Destino del pasajero

### Definición
**Destino del pasajero**: Ciudad o código IATA del destino principal del viaje (a dónde va el pasajero), no el punto de retorno.

| Ticket | Destino pasajero |
|--------|------------------|
| Air Europa SDQ→MAD→LGW→MAD→SDQ | LGW (Londres) o MAD (Madrid) según criterio |
| Copa SDQ→PTY→EZE→PTY→SDQ | EZE (Buenos Aires) |
| Iberia FCO→MAD | MAD (Madrid) |

### Instrucción para la IA
"Destino principal del viaje: ciudad o código IATA del aeropuerto de destino principal. En viajes ida y vuelta o multiciudad, el destino más lejano o el principal al que va el pasajero (ej: EZE para SDQ-PTY-EZE-PTY-SDQ, MAD para FCO-MAD). No confundir con el punto de retorno al origen."

---

## Estructura del voucher modelo (referencia)

Cada página = 1 segmento:

```
[FECHA] DESTINO [CIUDAD] ([CÓDIGO])   o   RETORNO [CIUDAD] ([CÓDIGO])
PREPARADO PARA
[NOMBRE COMPLETO]
CÓDIGO DE RESERVACIÓN: [PNR]
AEROLINEA: [AEROLÍNEA]
SALIDA: [DÍA SEMANA] [FECHA]
PASAJERO ASIENTO TICKET NO.
[APELLIDO]/[NOMBRE] - [TICKET]

EXTRAS: (texto fijo + teléfono agencia)
```

### Datos necesarios en Monday para generación automática

| Dato | Origen | Campo Monday |
|------|--------|--------------|
| Nombre completo | Parseur | Pasajero principal |
| Formato voucher (APELLIDO/NOMBRE) | Derivado | (transformar en generador) |
| PNR | Parseur | PNR / Código reserva |
| Aerolínea | Parseur | Aerolínea principal |
| Fecha + día semana | Parseur | Calcular en generador |
| Ticket | Parseur | Número de boleto |
| Destino por tramo | Parseur segments | Destino voucher (subitem) |
| Teléfono emergencia | Config agencia | Teléfono agencia |
| **Destino pasajero** | Parseur (nuevo) | **Destino pasajero (nuevo)** |

---

## Cambios implementados

1. **Monday**: Columna "Destino pasajero" creada (id: `text_mm1cd796`)
2. **Parseur**: Campo `passenger_destination` añadido al script. La API devolvió error 409 (conflicto de position) al actualizar el buzón existente.
3. **Pendiente manual Parseur**: Añadir el campo "passenger_destination" en app.parseur.com → Buzón Ticket Aereo → Campos. Instrucción: "Destino principal del viaje: ciudad o código IATA del aeropuerto al que va el pasajero (ej: EZE, MAD, LGW). En ida y vuelta, el destino más lejano, no el retorno."
