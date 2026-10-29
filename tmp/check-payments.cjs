// Integración aislada: datos de prueba, sin acceso a la base real.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'pasarelapago.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const file of ['pasarelapago.html','cpanel.html']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:file});
 const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);console.log(file+': sintaxis e IDs correctos');
}
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
// El botón de cada inscrito y el menú general deben reutilizar el iframe.
{
 const panel=fs.readFileSync(path.join(root,'cpanel.html'),'utf8');
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,dataset:{},classList:{add(){},remove(){}},addEventListener(){}});return nodes.get(id)};
 const ctx={URLSearchParams,encodeURIComponent,$:node,sessionStorage:storage(),notificar(){},document:{querySelectorAll:()=>[]},history:{replaceState(a,b,url){this.url=url}},location:{href:'cpanel.html'}};
 vm.createContext(ctx);
 vm.runInContext('const filas=[{key:"primero",documento:"123456789"},{key:"segundo",nombre:"María Pérez"}];'+panel.slice(panel.indexOf('const paginasPanel='),panel.indexOf('function mostrarDashboard()')),ctx);
 for(const [start,end] of [['function abrirPagos(', 'function abrirWhatsApp('],['function abrirPaginaPanel(', 'document.querySelectorAll(".ui-nav a[data-page]").forEach((link)=>{']]){
  const from=panel.indexOf(start);vm.runInContext(panel.slice(from,panel.indexOf(end,from)),ctx);
 }
 vm.runInContext('abrirPagos("primero")',ctx);
 assert.equal(node('pageFrame').src,'pasarelapago.html?v=20261029-3&buscar=123456789');
 assert.equal(node('dashboardView').hidden,true);assert.equal(node('pageView').hidden,false);
 assert.equal(ctx.location.href,'cpanel.html');assert.equal(ctx.history.url,'#pagos');
 vm.runInContext('abrirPagos("segundo")',ctx);
 assert.equal(node('pageFrame').src,'pasarelapago.html?v=20261029-3&buscar=Mar%C3%ADa%20P%C3%A9rez');
 vm.runInContext('abrirPaginaPanel("pagos")',ctx);
 assert.equal(node('pageFrame').src,'pasarelapago.html?v=20261029-3');
 console.log('Botones de inscritos y menú de Pagos: abren dentro del dashboard y conservan la selección');
 const embeddedClasses=[];
 vm.runInNewContext(scripts[0],{window:{self:{},top:{}},document:{documentElement:{classList:{add:name=>embeddedClasses.push(name)}}},sessionStorage:{getItem:()=> '1'}});
 assert.ok(embeddedClasses.includes('payments-embedded'));
 assert.match(fs.readFileSync(path.join(root,'pagos.css'),'utf8'),/\.payments-embedded \.payments-page \.topbar\{display:none\}/);
 assert.doesNotMatch(html,/<header class="topbar">/);
 console.log('El módulo de pagos ya no incluye un encabezado propio');
}
function context(authorized=true){
 const elements=new Map();
 for(const m of html.matchAll(/\bid="([^"]+)"/g))elements.set(m[1],{value:'',textContent:'',innerText:'',innerHTML:'',dataset:{},style:{},disabled:false,hidden:false,attributes:{},setAttribute(k,v){this.attributes[k]=v},showModal(){this.open=true},close(){this.open=false},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(event,callback){this.listeners[event]=callback},focus(){},querySelector(){return {focus(){}}},querySelectorAll(){return []}});
 const ctx={console,URL,URLSearchParams,Date,Intl,Map,Set,Promise,AbortController,setTimeout,clearTimeout,sessionStorage:storage(),localStorage:storage(),location:{search:'',replace(url){this.redirect=url}},document:{getElementById:id=>elements.get(id),querySelectorAll:()=>[],addEventListener(){},body:{appendChild(){}},createElement:()=>({remove(){}})},async fetch(url,options={}){
  if(options.method === 'POST'){
   assert.ok(ctx.allowAnnulment,'No se deben guardar pagos fuera de la prueba de anulación');
   const payload=JSON.parse(options.body);assert.equal(payload.accion,'anularPago');ctx.lastPost=payload;
   return {ok:true,json:async()=>ctx.rejectAnnulment ? {resultado:'error',error:'Error simulado'} : {resultado:'ok',pago:{IdPago:payload.IdPago,EstadoPago:'Anulado',ValorAbono:0,ValorAbonoOriginal:250000,MotivoAnulacion:payload.MotivoAnulacion,AnuladoPor:payload.AnuladoPor,FechaAnulacion:'2026-10-29'}}};
  }
  const action=new URL(url).searchParams.get('accion');
  if(ctx.offline && action==='pagos')throw Error('Sin conexión de prueba');
  const data=action==='listado'?[{Documento:'123456789',Codigo:'TEST01',Nombre:'Participante de prueba',Iglesia:'Bethel',Municipio:'Bogotá',DeseaCamisa:'No'}]:action==='pagos'?[{IdPago:'QA001',Documento:'123456789',Nombre:'Participante de prueba',ValorAbono:250000,FechaPago:'2026-10-28',MedioPago:'Efectivo',ReferenciaPago:'QA-12345',Organizador:'Prueba'}]:[];
  return {ok:!(ctx.httpError && action==='pagos'),json:async()=>data,text:async()=>JSON.stringify(data)};
 }};
 ctx.window=ctx;ctx.self=ctx;ctx.top={};ctx.document.documentElement={classList:{add(){}}};if(authorized)ctx.sessionStorage.setItem('ujeca_cpanel_auth','1');vm.createContext(ctx);return {ctx,elements,run:code=>vm.runInContext(code,ctx)};
}
(async()=>{
 const {ctx,elements,run}=context();run(scripts[0]);assert.equal(ctx.location.redirect,undefined);assert.equal(elements.has('authScreen'),false);
 run(fs.readFileSync(path.join(root,'api-config.js'),'utf8'));run(scripts.at(-1).replace(/cargar\(\);\s*$/,''));
 await run('cargar()');assert.equal(elements.get('conexionPagos').dataset.state,'ready');assert.equal(elements.get('btnActualizarBase').disabled,false);
 elements.get('cedula').value='123456789';let prevented=false;elements.get('buscarParticipanteForm').listeners.submit({preventDefault(){prevented=true}});assert.equal(prevented,true);
 assert.equal(elements.get('nombreLabel').innerText,'Participante de prueba');assert.equal(elements.get('metricSaldo').innerText,'$0');assert.match(elements.get('tablaPagos').innerHTML,/QA-12345/);
 console.log('Sesión del panel, búsqueda con Enter, saldo e historial: correctos');
 run('mostrarVistaPago("historial")');assert.equal(elements.get('registro').hidden,true);assert.equal(elements.get('historial').hidden,false);assert.equal(elements.get('tabHistorial').attributes['aria-selected'],'true');
 run('abrirAnulacionPago(0)');assert.equal(elements.get('dialogAnularPago').open,true);
 elements.get('motivoAnulacion').value='Registro duplicado por error';elements.get('responsableAnulacion').value='Tesorería';
 ctx.allowAnnulment=true;ctx.rejectAnnulment=true;
 await elements.get('formAnularPago').listeners.submit({preventDefault(){}});
 assert.match(elements.get('errorAnulacion').textContent,/Error simulado/);assert.equal(run('totalPagadoDocumento("123456789")'),250000);assert.equal(elements.get('dialogAnularPago').open,true);
 ctx.rejectAnnulment=false;await elements.get('formAnularPago').listeners.submit({preventDefault(){}});
 assert.equal(run('totalPagadoDocumento("123456789")'),0);assert.equal(run('buscarPagoPorReferencia("QA-12345")'),null);assert.equal(elements.get('dialogAnularPago').open,false);
 assert.match(elements.get('tablaPagos').innerHTML,/Anulado/);assert.match(elements.get('tablaPagos').innerHTML,/250/);assert.match(elements.get('tablaPagos').innerHTML,/Registro duplicado/);assert.doesNotMatch(elements.get('tablaPagos').innerHTML,/onclick="editarPago/);
 console.log('Pestañas, rechazo sin modificar saldo y anulación confirmada con auditoría: correctos');
 assert.equal(run('fusionarPagosConComprobantes([{IdPago:"VIEJO",ReferenciaPago:"MISMA",EstadoPago:"Anulado",ValorAbono:0,ValorAbonoOriginal:250000},{IdPago:"NUEVO",ReferenciaPago:"MISMA",ValorAbono:250000}], [{IdPago:"VIEJO",ReferenciaPago:"MISMA",EstadoPago:"Anulado",ValorAbono:0}]).length'),2);
 await run('cargar()');assert.equal(elements.get('nombreLabel').innerText,'Sin participante seleccionado');assert.equal(elements.get('metricSaldo').innerText,'—');
 ctx.offline=true;await run('cargar()');assert.equal(elements.get('conexionPagos').dataset.state,'error');assert.equal(elements.get('btnActualizarBase').disabled,false);
 ctx.offline=false;ctx.httpError=true;await run('cargar()');assert.equal(elements.get('conexionPagos').dataset.state,'error');
 ctx.httpError=false;await run('cargar()');assert.equal(elements.get('conexionPagos').dataset.state,'ready');console.log('Actualización, error de red, error HTTP y recuperación: correctos');
 const guest=context(false);guest.ctx.location.search='?buscar=123456789';guest.run(scripts[0]);assert.equal(guest.ctx.location.redirect,'cpanel.html#pagos');assert.equal(guest.ctx.sessionStorage.getItem('ujeca_pago_busqueda'),'123456789');console.log('Redirección a cPanel conserva la búsqueda: correcto');
 const direct=context(true);direct.ctx.top=direct.ctx;direct.ctx.location.search='?buscar=123456789';direct.run(scripts[0]);assert.equal(direct.ctx.location.redirect,'cpanel.html#pagos');assert.equal(direct.ctx.sessionStorage.getItem('ujeca_pago_busqueda'),'123456789');console.log('Un enlace directo antiguo vuelve al panel aun teniendo sesión');
})().catch(error=>{console.error(error);process.exitCode=1});
