const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
// Hojas en memoria: estas pruebas nunca llaman Google ni modifican datos reales.
function sheet(rows){return {rows:rows.map(row=>row.slice()),getLastRow(){return this.rows.length},getLastColumn(){return Math.max(...this.rows.map(r=>r.length))},setFrozenRows(){},getDataRange(){return this.getRange(1,1,this.getLastRow(),this.getLastColumn())},getRange(row,col,height=1,width=1){const target=this;return {getValues(){return Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>target.rows[row+r-1]?.[col+c-1] ?? ''))},setValues(values){assert.equal(values.length,height);values.forEach((line,r)=>{assert.equal(line.length,width);target.rows[row+r-1]??=[];line.forEach((v,c)=>target.rows[row+r-1][col+c-1]=v)});return this}}}}}
const payments=sheet([['IdPago','Documento','ValorAbono','ReferenciaPago','ColumnaPersonalizada'],['P1','123',250000,'REF1','Conservar'],['P2','456',500000,'REF2','Otra']]);
const receipts=sheet([['IdPago','IdComprobante','ValorAbono','EstadoComprobante'],['P1','C1',250000,'Abono registrado'],['P2','C2',500000,'Pago completo'],['P1','C3',250000,'Abono registrado']]);
const ctx={console,Date};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../AppsScript_UJECA.gs'),'utf8'),ctx);
ctx.obtenerHojaPagos_=()=>payments;ctx.obtenerHojaComprobantes_=()=>receipts;
const data={IdPago:'P1',MotivoAnulacion:'Pago asignado por error',AnuladoPor:'Tesorería'};
assert.equal(ctx.anularPago_({...data,MotivoAnulacion:'a'}).resultado,'error');assert.equal(payments.rows.length,3);
assert.equal(ctx.anularPago_({...data,IdPago:'NO-EXISTE'}).resultado,'error');
const first=ctx.anularPago_(data);assert.equal(first.resultado,'ok');assert.equal(first.pago.ValorAbono,0);assert.equal(first.pago.ValorAbonoOriginal,250000);assert.equal(first.pago.EstadoPago,'Anulado');assert.equal(first.pago.ColumnaPersonalizada,'Conservar');
const objects=s=>{const [headers,...rows]=s.rows;return rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]])))};
assert.equal(objects(payments)[1].ValorAbono,500000);assert.equal(objects(payments).reduce((sum,p)=>sum+Number(p.ValorAbono),0),500000);
for(const r of objects(receipts).filter(r=>r.IdPago==='P1')){assert.equal(r.ValorAbono,0);assert.equal(r.ValorAbonoOriginal,250000);assert.equal(r.EstadoComprobante,'Anulado');assert.equal(r.AnuladoPor,'Tesorería')}
assert.equal(objects(receipts).find(r=>r.IdPago==='P2').ValorAbono,500000);
const second=ctx.anularPago_({...data,AnuladoPor:'Otro',MotivoAnulacion:'Reintento distinto'});assert.equal(second.pago.AnuladoPor,'Tesorería');assert.equal(second.pago.FechaAnulacion,first.pago.FechaAnulacion);assert.equal(second.pago.ValorAbonoOriginal,250000);assert.equal(payments.rows.length,3);
assert.equal(ctx.actualizarPago_({IdPago:'P1',ValorAbono:500000}).resultado,'error');
const normalized=ctx.normalizarDatosComprobantePago_(ctx.normalizarDatosPago_(first.pago,'P1'));assert.equal(normalized.EstadoComprobante,'Anulado');assert.equal(normalized.ValorAbonoOriginal,250000);
console.log('Apps Script: valida motivo e ID, conserva auditoría y columnas, anula todos los comprobantes, mantiene otros pagos, reintenta sin duplicar y bloquea edición');
