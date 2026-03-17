# Depurar error "Emitir Voucher PDF"

## Ver el error real del servicio

En n8n, cuando falla el nodo "Emitir Voucher PDF":
1. Abre la ejecución fallida
2. Haz clic en el nodo rojo "Emitir Voucher PDF"
3. Revisa la pestaña **"Error"** o **"Output"** – ahí verás la respuesta HTTP y el cuerpo JSON con el mensaje de error real

Mensajes típicos del servicio:
- `Payload inválido` (400) – falta `pulse_id` o está vacío
- `Item no encontrado en Monday` (404) – el pulse_id no existe
- `Datos de Monday incompletos para el voucher` (400) – faltan columnas o subitems
- `MONDAY_API_KEY no configurada` (500) – falta la variable de entorno
- `No se encontró columna de archivos` (500) – falta columna "Voucher PDF" en el board

## Probar el servicio directamente

Con el `pulse_id` del item (ej. 11522207776):

```bash
curl -X POST http://10.10.12.33:9110/render-voucher-by-pulse?upload=1 \
  -H "Content-Type: application/json" \
  -d '{"pulse_id": "11522207776"}'
```

Si hay error, la respuesta JSON incluirá el mensaje concreto.

## Verificar pulse_id en n8n

El nodo Emitir Voucher PDF usa:
```
$('Webhook').item.json.body.event.pulseId
```

Si el webhook de Monday guarda el cuerpo en otro sitio, prueba:
```
$('Webhook').item.json.event.pulseId
```
o
```
$('Webhook').first().json.body.event.pulseId
```

## Solución: pasar pulse_id explícitamente

Asegúrate de que **Edit Fields1** o un nodo previo pase también el `pulse_id` al flujo, para que Emitir tenga el valor disponible. Si Edit Fields1 solo asigna `challenge`, el body original se pierde y Emitir depende de la referencia `$('Webhook')`.
