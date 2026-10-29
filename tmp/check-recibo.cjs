const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const backend={};vm.createContext(backend);vm.runInContext(fs.readFileSync(path.join(root,'AppsScript_UJECA.gs'),'utf8'),backend);
const persona={Nombre:'Campista de ejemplo',Documento:'DOC-EJEMPLO',LiderAsignado:'Katherine Bermudez - Coordinadora General - UJECA - +57 319 4480759',ZonaAsignada:'El Bagre',DeseaCamisa:'No',Edad:17};
for(const [lider,numero] of [['Katherine Bermudez','3194480759'],['Melania Angulo','3216818450'],['Edinson Banquet','3114285949'],['Camila Urango','3126344615'],['Andrés Miranda','']]){
 const orden=backend.crearOrdenPagoInscripcion_({...persona,LiderAsignado:lider},'UJECA-TEST');assert.equal(orden.nequi.numero,numero);assert.equal(orden.total,250000);assert.equal(orden.valorCamisa,0);
}
assert.equal(backend.crearOrdenPagoInscripcion_({...persona,LiderAsignado:'Desconocido'},'TEST').nequi,null);
const orden=backend.crearOrdenPagoInscripcion_({...persona,DeseaCamisa:'Si',TallaCamisa:'M'},'UJECA-EJEMPLO');assert.equal(orden.total,285000);assert.equal(orden.valorCamisa,35000);assert.equal(orden.permisoMenor,true);
assert.equal(backend.crearOrdenPagoInscripcion_({...persona,DeseaCamisa:'Si',TallaCamisa:'XXL'},'TEST').total,295000);
let correo;backend.MailApp={sendEmail:data=>correo=data};assert.equal(backend.enviarCorreoInscripcion_({...persona,Correo:'ejemplo@example.invalid'},'UJECA-TEST'),true);assert.match(correo.body,/3194480759/);assert.match(correo.body,/250/);
let descargado=false;
const ctx={console,Blob,Intl,Date,setTimeout(){},URL:{createObjectURL:()=> 'blob:prueba',revokeObjectURL(){}},document:{body:{appendChild(){}},createElement:()=>({click(){descargado=true},remove(){}})}};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'vendor/qrcode.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'recibo-inscripcion.js'),'utf8'),ctx);
const contenedor={style:{},innerHTML:'',classList:{add(){}}};assert.equal(ctx.ReciboUJECA.emitir(orden,contenedor),true);assert.equal(descargado,true);assert.match(contenedor.innerHTML,/<svg/);assert.match(contenedor.innerHTML,/No es un QR de cobro Nequi/);assert.match(contenedor.innerHTML,/3194480759/);
// La inscripción confirmada de una versión anterior no devuelve ordenPago.
const recuperada=ctx.ReciboUJECA.crearOrdenDesdeInscripcion({...persona,DeseaCamisa:'Si',TallaCamisa:'M',ValorTotal:'285000'},'UJECA-0022');
assert.equal(recuperada.codigo,'UJECA-0022');assert.equal(recuperada.total,285000);assert.equal(recuperada.valorInscripcion,250000);assert.equal(recuperada.valorCamisa,35000);assert.equal(recuperada.nequi.numero,'3194480759');
descargado=false;assert.equal(ctx.ReciboUJECA.emitir(recuperada,contenedor),true);assert.equal(descargado,true);
assert.throws(()=>ctx.ReciboUJECA.crearOrdenDesdeInscripcion(persona,''),/código confirmado/);
assert.equal(ctx.ReciboUJECA.crearOrdenDesdeInscripcion({...persona,ValorTotal:'535000'},'ANTERIOR').total,535000);
const limpio=ctx.ReciboUJECA.documento({...orden,nombre:'<script>alert(1)</script>'});assert.doesNotMatch(limpio,/<script>alert/);assert.match(limpio,/&lt;script&gt;/);assert.match(limpio,/PENDIENTE DE PAGO/);
const pendiente=ctx.ReciboUJECA.documento(backend.crearOrdenPagoInscripcion_({...persona,LiderAsignado:'Andres Miranda'},'TEST'));assert.match(pendiente,/pendiente de configurar/);assert.doesNotMatch(pendiente,/<svg/);
fs.writeFileSync(path.join(__dirname,'orden-pago-ejemplo.html'),ctx.ReciboUJECA.documento(orden));
console.log('Recibo: Nequi según líder, cuenta faltante, precios 250/285/295 mil, datos de correo, QR local, descarga y escape HTML correctos. Ejemplo generado sin registrar ni enviar datos reales.');
