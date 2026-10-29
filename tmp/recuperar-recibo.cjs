// Recuperación de solo lectura. No registra inscripciones ni envía correos.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const codigo=String(process.argv[2] || '').trim();
if(!/^UJECA-[a-z0-9_-]+$/i.test(codigo))throw Error('Indica el código UJECA del registro existente');
const ctx={console,Intl,Date,URL,URLSearchParams};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'api-config.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'vendor/qrcode.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'recibo-inscripcion.js'),'utf8'),ctx);
(async()=>{
 const url=new URL(ctx.UJECA_API.listado);url.searchParams.set('accion','listado');
 const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('La base no respondió: HTTP '+r.status);
 const data=await r.json();
 const lista=ctx.extraerListaUJECA(data);
 const coincidencias=lista.filter(row=>String(row.Codigo || row.codigo || '').trim().toUpperCase()===codigo.toUpperCase());
 if(coincidencias.length !== 1)throw Error(coincidencias.length ? 'Hay más de un registro con ese código; hay que revisar la base antes de emitir.' : 'Todavía no aparece el código en la base. No se realizó ninguna inscripción.');
 const orden=ctx.ReciboUJECA.crearOrdenDesdeInscripcion(ctx.normalizarRegistroUJECA(coincidencias[0]),codigo);
 const archivo=path.join(__dirname,'recibo-'+codigo.toUpperCase()+'.html');
 fs.writeFileSync(archivo,ctx.ReciboUJECA.documento(orden));
 console.log(JSON.stringify({codigo,archivo,total:orden.total,estado:'Recibo recuperado del registro existente; no se creó otra inscripción'}));
})().catch(error=>{console.error(error.message);process.exitCode=1});
