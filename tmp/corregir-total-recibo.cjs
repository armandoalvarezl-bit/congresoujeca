// Ajuste específico autorizado por el usuario para UJECA-0022: 250.000 + camiseta 35.000.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ctx={console,Intl,Date,URL,URLSearchParams};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['api-config.js','vendor/qrcode.js','recibo-inscripcion.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
async function consultar(){
 const url=new URL(ctx.UJECA_API.listado);url.searchParams.set('accion','listado');url.searchParams.set('_',Date.now());
 const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('No se pudo consultar la inscripción');
 const filas=ctx.extraerListaUJECA(await r.json()).filter(r=>String(r.Codigo || '').trim()==='UJECA-0022');
 if(filas.length !== 1)throw Error('No se encontró una inscripción única UJECA-0022');
 return filas[0];
}
(async()=>{
 const antes=await consultar();
 if(Number(antes.ValorTotal)!==285000){
  if(Number(antes.ValorTotal)!==535000)throw Error('El total cambió desde la revisión; no se modificó nada');
  fs.writeFileSync(path.join(__dirname,'UJECA-0022-antes-ajuste.json'),JSON.stringify(antes,null,2));
  try{
   const r=await fetch(ctx.UJECA_API.registro,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({accion:'actualizarInscripcion',CodigoOriginal:'UJECA-0022',DocumentoOriginal:String(antes.Documento || ''),cambios:{ValorTotal:'285000'}}),signal:AbortSignal.timeout(45000)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const respuesta=await r.json();
   if(respuesta.resultado!=='ok')throw Error(respuesta.error || 'El servidor no confirmó el ajuste');
  }catch(error){console.log('Comprobando el resultado del ajuste antes de cualquier reintento: '+error.message);}
 }
 const despues=await consultar();
 if(Number(despues.ValorTotal)!==285000)throw Error('El total no quedó actualizado. No se generó un recibo con otro importe.');
 const cambios=Object.keys(antes).filter(k=>k!=='ValorTotal' && String(antes[k] ?? '')!==String(despues[k] ?? ''));
 if(cambios.length)throw Error('Se detectaron cambios adicionales; revisar la respuesta de la base.');
 const orden=ctx.ReciboUJECA.crearOrdenDesdeInscripcion(ctx.normalizarRegistroUJECA(despues),'UJECA-0022');
 if(orden.total!==285000 || orden.valorCamisa!==35000)throw Error('El desglose no coincide con lo autorizado');
 fs.writeFileSync(path.join(__dirname,'recibo-UJECA-0022.html'),ctx.ReciboUJECA.documento(orden));
 console.log(JSON.stringify({codigo:'UJECA-0022',total:orden.total,inscripcion:orden.valorInscripcion,camiseta:orden.valorCamisa,verificado:true,otrosDatos:'Sin cambios',recibo:'tmp/recibo-UJECA-0022.html'}));
})().catch(error=>{console.error(error.message);process.exitCode=1});
