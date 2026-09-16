const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ctx = vm.createContext({console});
vm.runInContext(fs.readFileSync(__dirname + '/AppsScript_UJECA.gs', 'utf8'), ctx);
vm.runInContext(`
const assert = (ok, message) => { if (!ok) throw new Error(message); };
assert(serializarValorHoja_(new Date(NaN)) === '', 'invalid date serialized without exception');
assert(parseDateValor(new Date(NaN)) === null, 'invalid Date rejected for date fallback');
assert(parseDateValor('fecha incorrecta') === null, 'invalid text date rejected');
assert(serializarValorHoja_(new Date('2026-01-01T00:00:00Z')) === '2026-01-01T00:00:00.000Z', 'valid date preserved');
assert(serializarValorHoja_(30000) === 30000, 'amount preserved');
assert(serializarValorHoja_('texto') === 'texto', 'text preserved');
const headers = COLUMNAS_INSCRIPCIONES;
const registrosTest = Array.from({length: 82}, (_, i) => ({
  Documento: String(i + 1), Codigo: 'C' + i, Correo: 'p' + i + '@example.com',
  DeseaCamisa: i === 0 ? 'Si' : 'No', TallaCamisa: 'XXL'
}));
const pagosTest = registrosTest.slice(0, 81).map((p, i) => ({
  IdPago: 'P' + i, Documento: p.Documento, ValorAbono: i === 0 ? 545000 : 10000,
  FechaRegistro: new Date(2026, 0, 1, 0, i).toISOString(), ValorTotal: i === 0 ? 545000 : 500000
}));
pagosTest.push({IdPago:'extra', Documento:'2', ValorAbono:20000});
let properties = {}, sent = 0, quota = 0, receiptUpdates = 0;
pagosTest[0].ComprobanteData = 'x'.repeat(60000);
const sheet = {getDataRange: () => ({getValues: () => [headers, ...registrosTest.map(p => headers.map(h => p[h] || ''))]})};
obtenerHoja_ = () => sheet;
obtenerEncabezadosActualesInscripciones_ = () => headers;
const paymentSheet = {};
obtenerHojaPagos_ = () => paymentSheet;
obtenerHojaComprobantes_ = () => ({});
leerFilasComoObjetos_ = () => [];
obtenerEncabezadosActuales_ = () => COLUMNAS_PAGOS;
listarPagos_ = () => pagosTest;
buscarFilaPagoPorIdPago_ = (_, id) => pagosTest.findIndex(p => p.IdPago === id) + 2;
actualizarComprobantePago_ = () => { receiptUpdates++; };
escribirCeldaPorEncabezado_ = (target, __, row, col, val) => {
  if (target === paymentSheet) {
    assert(['DescuentoAplicado','ValorTotal','SaldoPosterior'].includes(col), 'only financial cells written');
    pagosTest[row - 2][col] = val;
  } else registrosTest[row - 2][col] = val;
};
PropertiesService = {getScriptProperties: () => ({getProperty: k => properties[k], setProperty: (k, v) => properties[k] = v})};
SpreadsheetApp = {flush: () => {}};
MailApp = {getRemainingDailyQuota: () => quota};
enviarCorreoEstadoCuenta_ = () => { sent++; return true; };
sincronizarDescuento80_();
assert(registrosTest.filter(p => p.CupoDescuento80).length === 80, 'exactly 80 people');
assert(!registrosTest[80].CupoDescuento80 && !registrosTest[81].CupoDescuento80, '81st and unpaid excluded');
assert(registrosTest[0].ValorTotal === 515000, 'large shirt preserved');
assert(registrosTest[1].ValorTotal === 470000, 'partial payment qualifies');
assert(calcularEstadoCuentaParticipante_(registrosTest[0]).estado.includes('30.000'), 'overpayment credit');
assert(calcularEstadoCuentaParticipante_(registrosTest[1]).abonado === 30000, 'all installments preserved');
sincronizarDescuento80_();
assert(registrosTest[1].ValorTotal === 470000, 'idempotent discount');
assert(pagosTest[0].ComprobanteData.length === 60000, 'large attachment preserved without rewriting');
assert(receiptUpdates > 81, 'missing receipts repaired even when payment already updated');
enviarPendientesDescuento80_();
assert(sent === 0, 'quota respected');
quota = 100;
for (let i = 0; i < 9; i++) enviarPendientesDescuento80_();
assert(sent === 80, 'one notification per beneficiary');
assert(!coincideParticipante80_({}, {}), 'empty identifiers do not match');
assert(coincideParticipante80_({Codigo:'ABC'}, {Codigo:'abc'}), 'code matching');
`, ctx);
assert.ok(true);
const readContext = vm.createContext({console});
vm.runInContext(fs.readFileSync(__dirname + '/AppsScript_UJECA.gs', 'utf8'), readContext);
vm.runInContext(`
ejecutarConDescuento80_ = () => { throw new Error('Listado intento ejecutar migracion o correo'); };
atenderGet_ = () => 'listado disponible';
for (const accion of ['listado', 'listadoConfirmado', 'pagos', 'comprobantes']) {
  if (doGet({parameter: {accion}}) !== 'listado disponible') throw new Error('Consulta fallida');
}
if (doGet() !== 'listado disponible') throw new Error('Consulta predeterminada fallida');
`, readContext);
console.log('OK: 80 cupos, abonos, camisetas, saldo a favor, idempotencia y correos.');
