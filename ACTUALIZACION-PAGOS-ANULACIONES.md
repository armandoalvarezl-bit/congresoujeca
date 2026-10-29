# Pasarela compacta y anulación de pagos

La interfaz utiliza dos columnas en escritorio y pestañas de registro e historial. En celular se adapta al ancho disponible con desplazamiento para mantener los campos legibles.

## Actualizar el alojamiento

Reemplazar juntos `cpanel.html`, `pasarelapago.html`, `pagos.css`, `form.html`, `recibo-inscripcion.js`, la carpeta `vendor`, `consulta-deuda.html`, `correos.html`, `PERMISO ADOLESCENTE.docx`, `api-config.js` y `service-worker.js` en la misma carpeta del sitio. Después recargar con Ctrl + F5.

La configuración de registro, listado y pagos apunta a la nueva implementación proporcionada: `https://script.google.com/macros/s/AKfycbwxnBxIP18rfpMU4KkFjf6VTRim0tl5x02SCGD_UweeNQvHLCu5A0Y7rAJXGGxM06Ks/exec`. El cambio local de URL no verifica qué versión del código está publicada en Google.

## Habilitar las anulaciones en la base oficial

1. Abrir el proyecto de Google Apps Script asociado a la URL configurada en `api-config.js`.
2. Actualizar el código con el contenido de `AppsScript_UJECA.gs` y guardar.
3. En Implementar → Gestionar implementaciones, editar la aplicación web existente y seleccionar una nueva versión. Mantener la URL y configuración de acceso actuales.

El archivo `.gs` se actualiza en Google Apps Script; subirlo al alojamiento por sí solo no activa la nueva acción `anularPago`.

La primera lectura de las hojas agrega las columnas de auditoría faltantes conservando las existentes. Al anular se guarda el importe en `ValorAbonoOriginal` y se deja `ValorAbono` en cero para que el abono deje de contar en los saldos del resto de la plataforma. También se guardan `EstadoPago`, `MotivoAnulacion`, `AnuladoPor` y `FechaAnulacion` en pagos y comprobantes. El registro y su soporte permanecen disponibles. Un reintento conserva la auditoría inicial y un pago anulado no puede editarse.

La interfaz solo muestra el pago como anulado tras recibir confirmación del servidor. No existe anulación local sin conexión. Si Apps Script todavía no se actualizó, se muestra el error y no se confirma la operación en pantalla.

## Permiso obligatorio para menores

Para edades entre 1 y 17 años, el formulario exige iniciar la descarga del documento oficial y confirmar que se presentará firmado. La casilla se habilita cuando se recibe el archivo y se solicita su descarga al navegador. Si la descarga falla o se recibe una página de error, la inscripción permanece bloqueada. El navegador controla el guardado final del archivo; el sitio no puede comprobar que el usuario lo haya guardado en su dispositivo.

Al cambiar la edad o limpiar el formulario se reinicia la confirmación. Al terminar una inscripción de menor aparece un recordatorio con otra opción de descarga. Apps Script valida y conserva `PermisoDescargado` y `TienePermiso` en la inscripción. Publicar de nuevo el código actualizado para activar esta validación en el servidor.

## Orden de pago al inscribirse

La respuesta de inscripción incluye una orden emitida por Apps Script con los datos y valores calculados en el servidor. El formulario muestra la orden y solicita su descarga en HTML independiente. Incluye opciones para volver a descargar, imprimir o guardar como PDF desde el navegador y copiar el Nequi. El documento queda marcado como pendiente y no acredita un pago recibido. Si falla su generación, la inscripción confirmada conserva su estado y código.

Compatibilidad: si una implementación confirma el registro con `resultado: "ok"` y código, pero no devuelve `ordenPago`, el formulario genera la orden con los datos de esa inscripción confirmada. No envía otra inscripción para generar el recibo. En la recuperación de registros existentes se conserva el total almacenado; cualquier corrección del importe debe verificarse en la base antes de emitir la orden corregida.

Inscripción base confirmada: $250.000. Camiseta opcional: $35.000; tallas XXL, 2XL, 3XL, XXXL, 4XL y 5XL: $45.000. También se actualizaron los valores base de consulta, pagos y correos; este cambio no migra los importes históricos ya guardados.

Las cuentas se definen en `CUENTAS_NEQUI_POR_LIDER` de `AppsScript_UJECA.gs` y se eligen por el líder asignado, sin elegir una cuenta alternativa. Katherine: 3194480759; Melania: 3216818450; Edinson: 3114285949; Camila: 3126344615. Falta configurar el número de Andrés Miranda. El recibo lo indica y no muestra un destino de pago inventado.

Por ahora se genera un QR local de texto con número, valor y referencia. Se identifica como QR de datos y no como QR de cobro Nequi. Para ofrecer el QR de cobro real, proporcionar la imagen oficial de cada cuenta, alojarla en el sitio y configurar su URL HTTPS en `qrOficial` de la cuenta correspondiente. Nunca se construye un QR de cobro a partir de un número telefónico.

La generación QR usa `qrcode-generator` 1.4.4 de Kazuhiko Arase, incorporado en `vendor/qrcode.js` con licencia MIT en `vendor/qrcode-LICENSE.txt`. No envía los datos del recibo a un servicio QR externo. El ejemplo `tmp/orden-pago-ejemplo.html` usa un participante ficticio.

## Comprobaciones

Desde la carpeta del proyecto:

```text
node tmp/check-payments.cjs
node tmp/check-annulment.cjs
node tmp/check-permiso.cjs
node tmp/check-recibo.cjs
```

Estas pruebas usan datos simulados y hojas en memoria. No registran ni anulan pagos reales. La publicación y revisión visual en el navegador del alojamiento quedan pendientes.
