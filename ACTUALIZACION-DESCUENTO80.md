Actualizacion del descuento de $30.000

1. Reemplazar el codigo del proyecto de Google Apps Script por AppsScript_UJECA.gs.
2. Ejecutar activarDescuento80 desde el editor con la cuenta administradora y autorizar los permisos solicitados. Esto aplica el descuento a los pagos existentes y crea un disparador cada 5 minutos para completar o reintentar los correos.
3. En Implementar > Gestionar implementaciones, editar la implementacion web existente y seleccionar una nueva version. Conservar su URL y ejecutar como propietario.
4. Subir form.html y pasarelapago.html actualizados al alojamiento.

La primera peticion al servidor actualizado tambien aplica el proceso. Los correos se envian en lotes de hasta 10, segun la cuota disponible. Una direccion invalida o un envio fallido permanece pendiente; corregir Correo para reintentarlo. CorreoDescuento80 contiene la fecha del envio exitoso. No borrar esa columna ni la propiedad DESCUENTO80_CUPOS_V1.

Se cuentan personas con al menos un abono positivo, ordenadas por la fecha de registro de su primer pago (FechaPago como alternativa y orden de inscripcion para empates o fechas ausentes). Los cupos asignados quedan fijos: los siguientes pagos completan los 80 restantes sin desplazar beneficiarios anteriores. Los abonos adicionales de una persona no consumen otro cupo. El beneficio fija el descuento total en $30.000; no se acumula con otro descuento anterior.

Se conservan los importes abonados y el precio de la camiseta, se actualizan totales y comprobantes y los correos muestran el saldo a favor cuando corresponda. Un fallo excepcional entre el envio del correo y guardar su fecha podria causar un reenvio; MailApp no ofrece una transaccion conjunta con la hoja.

Verificacion local: node test-descuento80.cjs. Las pruebas usan datos simulados; no envian correos ni modifican la hoja real.
