const SPREADSHEET_ID = "1cyrexQcgmskJm6RFCzWfsRcjrBVPj3RCjoU-cAkGTjM";
const HOJA_INSCRIPCIONES = "Inscripciones2026";
const HOJA_PAGOS = "PagosIndividuales2026_CORRECTO";
const HOJA_COMPROBANTES = "ComprobantesPago2026_CORRECTO";
const PRECIO_INSCRIPCION = 250000;
// Números confirmados por la organización. QR oficial de Nequi: agregar su URL cuando se suministre.
const CUENTAS_NEQUI_POR_LIDER = [
  { clave: "katherine bermudez", titular: "Katherine Bermudez", numero: "3194480759", qrOficial: "" },
  { clave: "melania angulo", titular: "Melania Angulo", numero: "3216818450", qrOficial: "" },
  { clave: "edinson banquet", titular: "Edinson Banquet", numero: "3114285949", qrOficial: "" },
  { clave: "camila urango", titular: "Camila Urango", numero: "3126344615", qrOficial: "" },
  { clave: "andres miranda", titular: "Andres Miranda", numero: "", qrOficial: "" }
];

function crearOrdenPagoInscripcion_(datos, codigo) {
  const lider = String(datos.LiderAsignado || "");
  const clave = lider.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const cuenta = CUENTAS_NEQUI_POR_LIDER.find(item => clave.includes(item.clave));
  const total = obtenerValorTotalParticipante_(datos);
  return {
    codigo: String(codigo), nombre: String(datos.Nombre || ""), documento: String(datos.Documento || ""),
    zona: String(datos.ZonaAsignada || "Zona general"), lider: lider,
    fecha: new Date().toISOString(), valorInscripcion: PRECIO_INSCRIPCION,
    valorCamisa: total - PRECIO_INSCRIPCION, total: total, estado: "Pendiente de pago",
    nequi: cuenta ? { titular: cuenta.titular, numero: cuenta.numero, qrOficial: cuenta.qrOficial } : null,
    permisoMenor: Number(datos.Edad) > 0 && Number(datos.Edad) < 18
  };
}

function coincideParticipante_(persona, pago) {
  const doc = String(persona.Documento || "").trim();
  const codigo = String(persona.Codigo || "").trim().toLowerCase();
  return Boolean((doc && doc === String(pago.Documento || "").trim()) ||
    (codigo && codigo === String(pago.Codigo || "").trim().toLowerCase()));
}

function ejecutarConBloqueo_(accion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return accion();
  } finally {
    lock.releaseLock();
  }
}

const COLUMNAS_INSCRIPCIONES = [
  "FechaRegistro",
  "Codigo",
  "Nombre",
  "Documento",
  "Edad",
  "Sexo",
  "Telefono",
  "Correo",
  "Pais",
  "Departamento",
  "Municipio",
  "TipoZona",
  "ZonaAsignada",
  "LiderAsignado",
  "Iglesia",
  "Pastor",
  "tipo",
  "Emergencia_nombre",
  "Emergencia_telefono",
  "Alergias",
  "DeseaCamisa",
  "TipoCamiseta",
  "TallaCamisa",
  "ColorCamisa",
  "Observaciones",
  "Puesto",
  "EstadoRegistro",
  "SeguimientoNota",
  "SeguimientoFecha",
  "SeguimientoActualizado",
  "ValorTotal",
  "PermisoDescargado",
  "TienePermiso"
];

const COLUMNAS_PAGOS = [
  "IdPago",
  "FechaRegistro",
  "CampistaKey",
  "Documento",
  "Codigo",
  "Nombre",
  "Iglesia",
  "Municipio",
  "ZonaAsignada",
  "LiderAsignado",
  "Organizador",
  "MedioPago",
  "ValorCongreso",
  "DeseaCamisa",
  "TipoCamiseta",
  "TallaCamisa",
  "ColorCamisa",
  "ValorCamisa",
  "ValorTotal",
  "ValorAbono",
  "FechaPago",
  "ReferenciaPago",
  "ObservacionPago",
  "ComprobanteNombre",
  "ComprobanteTipo",
  "ComprobanteData",
  "ComprobanteURL",
  "SaldoPosterior",
  "EstadoPago", "ValorAbonoOriginal", "MotivoAnulacion", "AnuladoPor", "FechaAnulacion"
];

const COLUMNAS_COMPROBANTES = [
  "IdComprobante",
  "IdPago",
  "FechaEmision",
  "FechaPago",
  "Documento",
  "Codigo",
  "Nombre",
  "Iglesia",
  "Municipio",
  "ZonaAsignada",
  "LiderAsignado",
  "Organizador",
  "MedioPago",
  "ValorTotal",
  "ValorAbono",
  "SaldoPosterior",
  "ReferenciaPago",
  "EstadoComprobante",
  "ArchivoSugerido",
  "EstadoPago", "ValorAbonoOriginal", "MotivoAnulacion", "AnuladoPor", "FechaAnulacion"
];

function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || "listado";
  // Las consultas no deben esperar el bloqueo de pagos ni ejecutar correos/migraciones.
  if (["listado", "listadoConfirmado", "pagos", "comprobantes"].indexOf(accion) >= 0) {
    return atenderGet_(e);
  }
  return ejecutarConBloqueo_(() => atenderGet_(e));
}

function atenderGet_(e) {
  e = e || {};
  const params = e.parameter || {};
  const accion = params.accion || "listado";

  if (accion === "listado") {
    return responderJson_(listarInscripciones_(params.hoja), params.callback);
  }

  if (accion === "listadoConfirmado") {
    return responderJson_(listarInscripcionesConPago_(params.hoja), params.callback);
  }

  if (accion === "pagos") {
    return responderJson_(listarPagos_(HOJA_PAGOS), params.callback);
  }

  if (accion === "comprobantes") {
    return responderJson_(listarComprobantesPago_(HOJA_COMPROBANTES), params.callback);
  }

  if (accion === "enviarEstadoCuenta") {
    return responderJson_(enviarEstadoCuenta_(params), params.callback);
  }

  if (accion === "actualizarEstadoRegistro") {
    return responderJson_(actualizarEstadoRegistro_(params), params.callback);
  }

  return responderJson_({ resultado: "error", error: "Accion no soportada" }, params.callback);
}

function doPost(e) {
  return ejecutarConBloqueo_(() => atenderPost_(e));
}

function atenderPost_(e) {
  e = e || {};
  const datos = leerBody_(e);
  const accion = datos.accion || "registrar";

  if (accion === "registrar") {
    return responderJson_(registrarInscripcion_(datos));
  }

  if (accion === "registrarPago") {
    return responderJson_(registrarPago_(datos));
  }

  if (accion === "actualizarPago") {
    return responderJson_(actualizarPago_(datos));
  }

  if (accion === "anularPago") {
    return responderJson_(anularPago_(datos));
  }

  if (accion === "actualizarInscripcion") {
    return responderJson_(actualizarInscripcion_(datos));
  }

  if (accion === "reenviarCorreoInscripcion") {
    return responderJson_(reenviarCorreoInscripcion_(datos));
  }

  if (accion === "enviarEstadoCuenta") {
    return responderJson_(enviarEstadoCuenta_(datos));
  }

  if (accion === "eliminar") {
    return responderJson_(eliminarInscripcion_(datos));
  }

  if (accion === "actualizarEstadoRegistro") {
    return responderJson_(actualizarEstadoRegistro_(datos));
  }

  return responderJson_({ resultado: "error", error: "Accion no soportada" });
}

function registrarInscripcion_(datos) {
  const edad = Number(datos.Edad);
  if (!Number.isInteger(edad) || edad < 1 || edad > 120) {
    return { resultado: "error", error: "Indica una edad valida entre 1 y 120 años" };
  }
  if (edad > 0 && edad < 18 && (datos.PermisoDescargado !== "Si" || datos.TienePermiso !== "Si")) {
    return { resultado: "error", error: "Para inscribir un menor debes descargar el permiso y confirmar que lo presentaras firmado por su representante" };
  }
  const hoja = obtenerHoja_(datos.hoja || datos.HojaDestino || HOJA_INSCRIPCIONES);
  datos.ValorTotal = obtenerValorTotalParticipante_(Object.assign({}, datos, { ValorTotal: 0 }));
  const codigo = datos.Codigo || crearCodigo_(hoja.getLastRow());
  const fila = obtenerEncabezadosActualesInscripciones_(hoja).map((columna) => {
    if (columna === "Codigo") return codigo;
    if (columna === "EstadoRegistro") return datos[columna] || "Preinscrito pendiente de pago";
    return datos[columna] || "";
  });

  hoja.appendRow(fila);
  const correoEnviado = enviarCorreoInscripcion_(datos, codigo);
  return { resultado: "ok", codigo: codigo, correoEnviado: correoEnviado, ordenPago: crearOrdenPagoInscripcion_(datos, codigo) };
}

function enviarCorreoInscripcion_(datos, codigo) {
  const correo = String(datos.Correo || datos.correo || "").trim();
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return false;

  const nombre = datos.Nombre || "campista";
  const lider = datos.LiderAsignado || "Coordinacion General Zona 6";
  const zona = datos.ZonaAsignada || "Zona general";
  const valorTotal = obtenerValorTotalParticipante_(datos);
  const valorCamisa = valorTotal - PRECIO_INSCRIPCION;
  const orden = crearOrdenPagoInscripcion_(datos, codigo);
  const instruccionesNequi = orden.nequi && orden.nequi.numero
    ? `Nequi del líder asignado: ${orden.nequi.numero}. Responsable: ${orden.nequi.titular}. Usa el código ${codigo} como referencia y envía el soporte a tu líder.`
    : `Coordina el pago con tu líder asignado. Su cuenta Nequi todavía no está configurada.`;
  const asunto = "Preinscripcion recibida - Congreso Trascendentales 2026";
  const resumenPago = "$" + valorTotal.toLocaleString("es-CO");
  const camisetaTexto = valorCamisa ? "Incluye camiseta seleccionada" : "No incluye camiseta";
  const html = `
    <div style="margin:0;padding:0;background:#f6f1ee;color:#201516;font-family:Arial,Helvetica,sans-serif">
      <div style="padding:34px 14px">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #eaded9;box-shadow:0 18px 46px rgba(70,0,0,.14)">
          <div style="background:linear-gradient(135deg,#4b0003 0%,#220000 64%,#090000 100%);padding:34px 34px 30px;color:#ffffff">
            <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#ffb6b9">Congreso Juvenil 2026</div>
            <h1 style="margin:12px 0 0;font-size:34px;line-height:1.05;font-weight:900">Preinscripcion recibida</h1>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:rgba(255,255,255,.84)">Tu registro para Trascendentales fue recibido correctamente y queda pendiente de pago.</p>
          </div>

          <div style="padding:30px 34px 8px">
            <p style="margin:0;font-size:17px;line-height:1.62">Hola <strong>${escaparHtmlCorreo_(nombre)}</strong>, recibimos tu preinscripcion. Tu cupo queda confirmado como inscrito cuando tu lider de zona registre el pago en el portal autorizado.</p>
          </div>

          <div style="padding:20px 34px">
            <div style="background:#fff8f5;border:1px solid #f0dfd8;border-radius:18px;padding:22px">
              <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8d3539;font-weight:800">Codigo de registro</div>
              <div style="margin-top:8px;font-size:30px;line-height:1;font-weight:900;color:#9d0208">${escaparHtmlCorreo_(codigo)}</div>
            </div>
          </div>

          <div style="padding:0 34px 10px">
            <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 10px">
              <tr>
                <td style="width:42%;padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Documento</td>
                <td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${escaparHtmlCorreo_(datos.Documento || "")}</td>
              </tr>
              <tr>
                <td style="width:42%;padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Zona asignada</td>
                <td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${escaparHtmlCorreo_(zona)}</td>
              </tr>
              <tr>
                <td style="width:42%;padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Lider para pago</td>
                <td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${escaparHtmlCorreo_(lider)}</td>
              </tr>
              <tr>
                <td style="width:42%;padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Camiseta</td>
                <td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${escaparHtmlCorreo_(camisetaTexto)}</td>
              </tr>
            </table>
          </div>

          <div style="padding:12px 34px 30px">
            <div style="border-radius:18px;background:linear-gradient(90deg,#4b0003,#220000);padding:22px;color:white">
              <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:800">Valor a pagar</div>
              <div style="margin-top:8px;font-size:32px;line-height:1;font-weight:900">${resumenPago}</div>
              <p style="margin:12px 0 0;color:rgba(255,255,255,.82);font-size:14px;line-height:1.45">${escaparHtmlCorreo_(instruccionesNequi)}</p>
              <p style="margin:12px 0 0;color:rgba(255,255,255,.82);font-size:13px;line-height:1.45">Orden de pago pendiente. Este documento no acredita un pago realizado. Tu líder confirmará la recepción del dinero.</p>
            </div>
          </div>

          <div style="padding:0 34px 34px">
            <div style="border-top:1px solid #eee1dc;padding-top:20px;color:#76615d;font-size:13px;line-height:1.55">
              Este correo fue generado automaticamente por el sistema oficial del Congreso Trascendentales 2026.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const cuerpoTexto = `Hola ${nombre},

Su preinscripcion para el Congreso Trascendentales 2026 ha sido recibida correctamente y queda pendiente de pago.

Código de registro: ${codigo}
Documento: ${datos.Documento || ""}
Zona asignada: ${zona}
Líder de pago: ${lider}
${camisetaTexto}
Valor total a pagar: ${resumenPago}
${instruccionesNequi}
Orden de pago pendiente. Este documento no acredita un pago realizado.

Guarde este correo como soporte de preinscripcion. Su cupo queda confirmado como inscrito cuando su lider de zona registre el pago en el portal autorizado. Si tiene alguna pregunta, puede responder a este mensaje o comunicarse con la organizacion.

Atentamente,
Equipo organizador del Congreso Trascendentales 2026`;

  try {
    MailApp.sendEmail({
      to: correo,
      subject: asunto,
      body: cuerpoTexto,
      htmlBody: html,
      replyTo: "infocircuito@gmail.com",
      name: "Congreso Trascendentales 2026"
    });
    return true;
  } catch (error) {
    return false;
  }
}

function escaparHtmlCorreo_(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listarInscripciones_(nombreHoja) {
  const hoja = obtenerHoja_(nombreHoja || HOJA_INSCRIPCIONES);
  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaFila < 2 || ultimaColumna < 1) {
    return [];
  }

  const valores = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues();
  const encabezados = valores.shift();

  return valores
    .filter((fila) => fila.some((valor) => String(valor).trim() !== ""))
    .map((fila) => {
      const registro = {};
      encabezados.forEach((encabezado, index) => {
        registro[encabezado] = serializarValorHoja_(fila[index]);
      });
      return registro;
    });
}

function listarInscripcionesConPago_(nombreHoja) {
  const registros = listarInscripciones_(nombreHoja || HOJA_INSCRIPCIONES);
  const pagos = listarPagos_(HOJA_PAGOS);
  const documentosConPago = {};
  const codigosConPago = {};

  pagos.forEach((pago) => {
    const valor = Number(pago.ValorAbono || 0);
    if (!(valor > 0)) return;

    const documento = String(pago.Documento || "").trim();
    const codigo = String(pago.Codigo || "").trim().toLowerCase();
    if (documento) documentosConPago[documento] = true;
    if (codigo) codigosConPago[codigo] = true;
  });

  return registros.filter((registro) => {
    const documento = String(registro.Documento || "").trim();
    const codigo = String(registro.Codigo || "").trim().toLowerCase();
    return (documento && documentosConPago[documento]) || (codigo && codigosConPago[codigo]);
  });
}

function registrarPago_(datos) {
  const hoja = obtenerHojaPagos_(HOJA_PAGOS);
  const idPago = datos.IdPago || crearIdPago_();
  const existente = listarPagos_(HOJA_PAGOS).find(p => String(p.IdPago) === String(idPago));
  if (existente) return { resultado: "ok", IdPago: idPago, pago: existente, correoEnviado: false };
  const encabezados = obtenerEncabezadosActuales_(hoja, COLUMNAS_PAGOS);
  const datosPago = normalizarDatosPago_(datos, idPago);
  const fila = encabezados.map((columna) => datosPago[columna] || "");

  hoja.appendRow(fila);
  registrarComprobantePago_(datosPago);
  const correoEnviado = enviarCorreoEstadoCuentaPorPago_(datosPago);
  return { resultado: "ok", IdPago: idPago, correoEnviado: correoEnviado,
    pago: listarPagos_(HOJA_PAGOS).find(p => p.IdPago === idPago) };
}

function actualizarPago_(datos) {
  const hoja = obtenerHojaPagos_(HOJA_PAGOS);
  const idPago = String(datos.IdPago || datos.idPago || "").trim();
  if (!idPago) {
    return { resultado: "error", error: "IdPago requerido para actualizar el pago" };
  }

  const filaIndex = buscarFilaPagoPorIdPago_(hoja, idPago);
  if (filaIndex < 0) {
    return { resultado: "error", error: "No se encontro el pago para actualizar" };
  }

  const existente = listarPagos_(HOJA_PAGOS).find(p => String(p.IdPago) === idPago);
  if (existente && existente.EstadoPago === "Anulado") {
    return { resultado: "error", error: "Un pago anulado no se puede editar" };
  }

  const encabezados = obtenerEncabezadosActuales_(hoja, COLUMNAS_PAGOS);
  const datosPago = normalizarDatosPago_(datos, idPago);
  const fila = encabezados.map((columna) => datosPago[columna] || "");

  hoja.getRange(filaIndex, 1, 1, fila.length).setValues([fila]);
  actualizarComprobantePago_(datosPago);
  const correoEnviado = enviarCorreoEstadoCuentaPorPago_(datosPago);
  return { resultado: "ok", IdPago: idPago, correoEnviado: correoEnviado,
    pago: listarPagos_(HOJA_PAGOS).find(p => p.IdPago === idPago) };
}

// doPost ejecuta esta operación bajo el bloqueo común de pagos.
function anularPago_(datos) {
  const id = String(datos.IdPago || "").trim();
  const motivo = String(datos.MotivoAnulacion || "").trim();
  const responsable = String(datos.AnuladoPor || "").trim();
  if (!id || motivo.length < 5 || !responsable) {
    return { resultado: "error", error: "Indica el pago, un motivo de al menos 5 caracteres y el responsable" };
  }
  const hoja = obtenerHojaPagos_(HOJA_PAGOS);
  const filaIndex = buscarFilaPagoPorIdPago_(hoja, id);
  if (filaIndex < 0) return { resultado: "error", error: "Pago no encontrado" };
  const encabezados = obtenerEncabezadosActuales_(hoja, COLUMNAS_PAGOS);
  const fila = hoja.getRange(filaIndex, 1, 1, encabezados.length).getValues()[0];
  const pago = {};
  encabezados.forEach((columna, i) => pago[columna] = fila[i]);
  // Un reintento conserva el importe, fecha y responsable originales.
  const auditoria = pago.EstadoPago === "Anulado" ? {
    EstadoPago: "Anulado", ValorAbono: 0, ValorAbonoOriginal: pago.ValorAbonoOriginal,
    MotivoAnulacion: pago.MotivoAnulacion, AnuladoPor: pago.AnuladoPor, FechaAnulacion: pago.FechaAnulacion
  } : {
    EstadoPago: "Anulado", ValorAbono: 0, ValorAbonoOriginal: Number(pago.ValorAbono || 0),
    MotivoAnulacion: motivo, AnuladoPor: responsable, FechaAnulacion: new Date()
  };
  Object.assign(pago, auditoria);
  hoja.getRange(filaIndex, 1, 1, encabezados.length).setValues([encabezados.map(columna => pago[columna] ?? "")]);
  const comprobantes = obtenerHojaComprobantes_(HOJA_COMPROBANTES);
  const columnasComp = obtenerEncabezadosActuales_(comprobantes, COLUMNAS_COMPROBANTES);
  const filasComp = comprobantes.getDataRange().getValues();
  const indiceId = columnasComp.indexOf("IdPago");
  const indiceComp = columnasComp.indexOf("IdComprobante");
  for (let i = 1; i < filasComp.length; i++) {
    if (String(filasComp[i][indiceId] || "").trim() !== id && String(filasComp[i][indiceComp] || "").trim() !== id) continue;
    const valores = filasComp[i];
    Object.entries({...auditoria, EstadoComprobante: "Anulado"}).forEach(([columna, valor]) => {
      const index = columnasComp.indexOf(columna);
      if (index >= 0) valores[index] = valor;
    });
    comprobantes.getRange(i + 1, 1, 1, columnasComp.length).setValues([valores]);
  }
  const respuesta = {};
  Object.keys(pago).forEach(columna => respuesta[columna] = serializarValorHoja_(pago[columna]));
  return { resultado: "ok", IdPago: id, pago: respuesta };
}

function buscarFilaPagoPorIdPago_(hoja, idPago) {
  const valores = hoja.getDataRange().getValues();
  if (valores.length < 2) return -1;

  const encabezados = valores[0].map((valor) => String(valor || "").trim());
  const indiceIdPago = encabezados.indexOf("IdPago");
  if (indiceIdPago < 0) return -1;

  const busqueda = String(idPago || "").trim();
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][indiceIdPago] || "").trim() === busqueda) {
      return i + 1;
    }
  }

  return -1;
}

function buscarFilaComprobantePorIdPago_(hoja, idPago) {
  const valores = hoja.getDataRange().getValues();
  if (valores.length < 2) return -1;

  const encabezados = valores[0].map((valor) => String(valor || "").trim());
  const indiceIdPago = encabezados.indexOf("IdPago");
  const indiceIdComprobante = encabezados.indexOf("IdComprobante");
  const busqueda = String(idPago || "").trim();

  for (let i = 1; i < valores.length; i++) {
    const fila = valores[i];
    const coincideIdPago = indiceIdPago >= 0 && String(fila[indiceIdPago] || "").trim() === busqueda;
    const coincideIdComprobante = indiceIdComprobante >= 0 && String(fila[indiceIdComprobante] || "").trim() === busqueda;
    if (coincideIdPago || coincideIdComprobante) {
      return i + 1;
    }
  }

  return -1;
}

function actualizarComprobantePago_(datosPago) {
  const hoja = obtenerHojaComprobantes_(HOJA_COMPROBANTES);
  const encabezados = obtenerEncabezadosActuales_(hoja, COLUMNAS_COMPROBANTES);
  const comprobante = normalizarDatosComprobantePago_(datosPago);
  const fila = encabezados.map((columna) => comprobante[columna] || "");
  const filaIndex = buscarFilaComprobantePorIdPago_(hoja, datosPago.IdPago);

  if (filaIndex > 0) {
    const filaExistente = hoja.getRange(filaIndex, 1, 1, encabezados.length).getValues()[0];
    const indiceFechaEmision = encabezados.indexOf("FechaEmision");
    if (indiceFechaEmision >= 0 && filaExistente[indiceFechaEmision]) {
      fila[indiceFechaEmision] = filaExistente[indiceFechaEmision];
    }
    hoja.getRange(filaIndex, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
}

function reenviarCorreoInscripcion_(datos) {
  const participante = buscarInscripcionPorDocumentoOCodigo_(datos);
  if (!participante) {
    return { resultado: "error", error: "No se encontro una inscripcion con ese documento o codigo" };
  }

  const codigo = participante.Codigo || datos.Codigo || "";
  const enviado = enviarCorreoInscripcion_(participante, codigo);
  return {
    resultado: enviado ? "ok" : "error",
    correoEnviado: enviado,
    correo: participante.Correo || "",
    error: enviado ? "" : "No se pudo enviar el correo de inscripcion"
  };
}

function enviarEstadoCuenta_(datos) {
  const participante = buscarInscripcionPorDocumentoOCodigo_(datos);
  if (!participante) {
    return { resultado: "error", error: "No se encontro una inscripcion con ese documento o codigo" };
  }

  const resumen = calcularEstadoCuentaParticipante_(participante);
  const enviado = enviarCorreoEstadoCuenta_(participante, resumen, datos.Motivo || "Actualizacion de estado de cuenta");
  return {
    resultado: enviado ? "ok" : "error",
    correoEnviado: enviado,
    correo: participante.Correo || "",
    saldo: resumen.saldo,
    error: enviado ? "" : "No se pudo enviar el estado de cuenta"
  };
}

function enviarCorreoEstadoCuentaPorPago_(datosPago) {
  const participante = buscarInscripcionPorDocumentoOCodigo_({
    Documento: datosPago.Documento,
    Codigo: datosPago.Codigo
  });
  if (!participante) return false;

  const resumen = calcularEstadoCuentaParticipante_(participante);
  return enviarCorreoEstadoCuenta_(participante, resumen, "Pago registrado");
}

function buscarInscripcionPorDocumentoOCodigo_(datos) {
  const documento = String(datos.Documento || datos.documento || "").trim();
  const codigo = String(datos.Codigo || datos.codigo || "").trim().toLowerCase();
  const correo = String(datos.Correo || datos.correo || "").trim().toLowerCase();
  const registros = listarInscripciones_(HOJA_INSCRIPCIONES);

  return registros.find((item) => {
    const docItem = String(item.Documento || "").trim();
    const codigoItem = String(item.Codigo || "").trim().toLowerCase();
    const correoItem = String(item.Correo || "").trim().toLowerCase();
    return (documento && docItem === documento) ||
      (codigo && codigoItem === codigo) ||
      (correo && correoItem === correo);
  }) || null;
}

function calcularEstadoCuentaParticipante_(participante) {
  const pagos = listarPagos_(HOJA_PAGOS).filter((pago) =>
    coincideParticipante_(participante, pago)
  );
  const total = obtenerValorTotalParticipante_(participante);
  const abonado = pagos.reduce((suma, pago) => suma + Number(pago.ValorAbono || 0), 0);
  const saldo = Math.max(total - abonado, 0);
  return {
    total: total,
    abonado: abonado,
    saldo: saldo,
    pagos: pagos,
    estado: abonado > total ? "Saldo a favor: " + formatearMonedaCorreo_(abonado - total) : (saldo === 0 && abonado > 0 ? "Pago completo" : "Saldo pendiente")
  };
}

function obtenerValorTotalParticipante_(participante) {
  const deseaCamisa = String(participante.DeseaCamisa || "").toLowerCase() === "si";
  const talla = String(participante.TallaCamisa || "").trim().toUpperCase().replace(/\s+/g, "");
  const valorCamisa = deseaCamisa
    ? (["XXL", "2XL", "3XL", "XXXL", "4XL", "5XL"].indexOf(talla) >= 0 ? 45000 : 35000)
    : 0;
  return Math.max(PRECIO_INSCRIPCION + valorCamisa, 0);
}

function enviarCorreoEstadoCuenta_(participante, resumen, motivo) {
  const correo = String(participante.Correo || participante.correo || "").trim();
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return false;

  const nombre = participante.Nombre || "campista";
  const codigo = participante.Codigo || "";
  const asunto = "Estado de cuenta - Congreso Trascendentales 2026";
  const totalTexto = formatearMonedaCorreo_(resumen.total);
  const abonadoTexto = formatearMonedaCorreo_(resumen.abonado);
  const saldoTexto = formatearMonedaCorreo_(resumen.saldo);
  const ultimosPagos = (resumen.pagos || []).slice(-5).reverse();
  const pagosHtml = ultimosPagos.length
    ? ultimosPagos.map((pago) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #f0dfd8">${escaparHtmlCorreo_(pago.FechaPago || "")}</td>
        <td style="padding:12px;border-bottom:1px solid #f0dfd8;font-weight:800">${formatearMonedaCorreo_(pago.ValorAbono)}</td>
        <td style="padding:12px;border-bottom:1px solid #f0dfd8">${escaparHtmlCorreo_(pago.MedioPago || "")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="3" style="padding:12px;color:#76615d">Aun no hay pagos registrados.</td></tr>`;

  const html = `
    <div style="margin:0;padding:0;background:#f6f1ee;color:#201516;font-family:Arial,Helvetica,sans-serif">
      <div style="padding:34px 14px">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #eaded9;box-shadow:0 18px 46px rgba(70,0,0,.14)">
          <div style="background:linear-gradient(135deg,#4b0003 0%,#220000 64%,#090000 100%);padding:34px;color:#ffffff">
            <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:#ffb6b9">Congreso Juvenil 2026</div>
            <h1 style="margin:12px 0 0;font-size:34px;line-height:1.05;font-weight:900">Estado de cuenta</h1>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:rgba(255,255,255,.84)">${escaparHtmlCorreo_(motivo || "Actualizacion")}</p>
          </div>
          <div style="padding:30px 34px 8px">
            <p style="margin:0;font-size:17px;line-height:1.62">Hola <strong>${escaparHtmlCorreo_(nombre)}</strong>, compartimos el estado actualizado de tu cuenta para el Congreso Trascendentales 2026.</p>
          </div>
          <div style="padding:20px 34px">
            <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 10px">
              <tr><td style="padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Codigo</td><td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${escaparHtmlCorreo_(codigo)}</td></tr>
              <tr><td style="padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Valor total</td><td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${totalTexto}</td></tr>
              <tr><td style="padding:14px 16px;background:#fbf7f4;border-radius:14px 0 0 14px;color:#7a6662;font-size:13px;font-weight:800;text-transform:uppercase">Abonado</td><td style="padding:14px 16px;background:#fbf7f4;border-radius:0 14px 14px 0;font-size:15px;font-weight:700">${abonadoTexto}</td></tr>
            </table>
            <div style="border-radius:18px;background:linear-gradient(90deg,#4b0003,#220000);padding:22px;color:white">
              <div style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.72);font-weight:800">${escaparHtmlCorreo_(resumen.estado)}</div>
              <div style="margin-top:8px;font-size:32px;line-height:1;font-weight:900">Saldo: ${saldoTexto}</div>
            </div>
          </div>
          <div style="padding:0 34px 26px">
            <h2 style="margin:0 0 12px;color:#4b0003;font-size:20px">Ultimos movimientos</h2>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff8f5;border:1px solid #f0dfd8;border-radius:16px;overflow:hidden">
              <thead><tr><th style="padding:12px;text-align:left;color:#8d3539">Fecha</th><th style="padding:12px;text-align:left;color:#8d3539">Abono</th><th style="padding:12px;text-align:left;color:#8d3539">Medio</th></tr></thead>
              <tbody>${pagosHtml}</tbody>
            </table>
          </div>
          <div style="padding:0 34px 34px">
            <div style="border-top:1px solid #eee1dc;padding-top:20px;color:#76615d;font-size:13px;line-height:1.55">
              Este correo fue generado automaticamente por el sistema oficial del Congreso Trascendentales 2026.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const cuerpoTexto = `Hola ${nombre},

Estado de cuenta actualizado.
${motivo || ""}
Codigo: ${codigo}
Valor total: ${totalTexto}
Abonado: ${abonadoTexto}
Saldo: ${saldoTexto}
Estado: ${resumen.estado}

Equipo organizador del Congreso Trascendentales 2026`;

  try {
    MailApp.sendEmail({
      to: correo,
      subject: asunto,
      body: cuerpoTexto,
      htmlBody: html,
      replyTo: "infocircuito@gmail.com",
      name: "Congreso Trascendentales 2026"
    });
    return true;
  } catch (error) {
    return false;
  }
}

function formatearMonedaCorreo_(valor) {
  return "$" + Number(valor || 0).toLocaleString("es-CO");
}

function registrarComprobantePago_(datosPago) {
  const hoja = obtenerHojaComprobantes_(HOJA_COMPROBANTES);
  const comprobante = normalizarDatosComprobantePago_(datosPago);
  const encabezados = obtenerEncabezadosActuales_(hoja, COLUMNAS_COMPROBANTES);
  const fila = encabezados.map((columna) => comprobante[columna] || "");
  hoja.appendRow(fila);
}

function listarComprobantesPago_(nombreHoja) {
  const hoja = obtenerHojaComprobantes_(nombreHoja || HOJA_COMPROBANTES);
  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaFila < 2 || ultimaColumna < 1) {
    return [];
  }

  const valores = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues();
  const encabezados = valores.shift();

  return valores
    .filter((fila) => fila.some((valor) => String(valor).trim() !== ""))
    .map((fila) => {
      const comprobante = {};
      encabezados.forEach((encabezado, index) => {
        comprobante[encabezado] = serializarValorHoja_(fila[index]);
      });
      return comprobante;
    });
}

function sincronizarComprobantesDesdePagos_() {
  const hojaComprobantes = obtenerHojaComprobantes_(HOJA_COMPROBANTES);
  const comprobantes = leerFilasComoObjetos_(hojaComprobantes);
  const idsExistentes = new Set(comprobantes.map((item) => String(item.IdPago || item.IdComprobante || "").trim()).filter(Boolean));
  const pagos = listarPagos_(HOJA_PAGOS);
  const encabezados = obtenerEncabezadosActuales_(hojaComprobantes, COLUMNAS_COMPROBANTES);
  const filasNuevas = [];

  pagos.forEach((pago) => {
    const idPago = String(pago.IdPago || "").trim();
    if (!idPago || idsExistentes.has(idPago)) return;
    const comprobante = normalizarDatosComprobantePago_(normalizarDatosPago_(pago, idPago));
    filasNuevas.push(encabezados.map((columna) => comprobante[columna] || ""));
    idsExistentes.add(idPago);
  });

  if (filasNuevas.length) {
    hojaComprobantes
      .getRange(hojaComprobantes.getLastRow() + 1, 1, filasNuevas.length, encabezados.length)
      .setValues(filasNuevas);
  }
}

function leerFilasComoObjetos_(hoja) {
  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();
  if (ultimaFila < 2 || ultimaColumna < 1) return [];

  const valores = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues();
  const encabezados = valores.shift();
  return valores
    .filter((fila) => fila.some((valor) => String(valor).trim() !== ""))
    .map((fila) => {
      const item = {};
      encabezados.forEach((encabezado, index) => {
        item[encabezado] = serializarValorHoja_(fila[index]);
      });
      return item;
    });
}

function listarPagos_(nombreHoja) {
  const hoja = obtenerHojaPagos_(nombreHoja || HOJA_PAGOS);
  const ultimaFila = hoja.getLastRow();
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaFila < 2 || ultimaColumna < 1) {
    return [];
  }

  const valores = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues();
  const encabezados = valores.shift();

  return valores
    .filter((fila) => fila.some((valor) => String(valor).trim() !== ""))
    .map((fila) => {
      const pago = {};
      encabezados.forEach((encabezado, index) => {
        pago[encabezado] = serializarValorHoja_(fila[index]);
      });
      return pago;
    });
}

function eliminarInscripcion_(datos) {
  const hoja = obtenerHoja_(datos.hoja || datos.HojaDestino || HOJA_INSCRIPCIONES);
  const documento = String(datos.Documento || datos.documento || "").trim();
  const codigo = String(datos.Codigo || datos.codigo || "").trim().toLowerCase();

  if (documento || codigo) {
    const valores = hoja.getDataRange().getValues();
    const encabezados = valores.shift().map((encabezado) => String(encabezado || "").trim());
    const indiceDocumento = encabezados.indexOf("Documento");
    const indiceCodigo = encabezados.indexOf("Codigo");

    for (let i = 0; i < valores.length; i++) {
      const filaDocumento = indiceDocumento >= 0 ? String(valores[i][indiceDocumento] || "").trim() : "";
      const filaCodigo = indiceCodigo >= 0 ? String(valores[i][indiceCodigo] || "").trim().toLowerCase() : "";
      const coincideDocumento = documento && filaDocumento === documento;
      const coincideCodigo = codigo && filaCodigo === codigo;
      if (coincideDocumento || coincideCodigo) {
        hoja.deleteRow(i + 2);
        return { resultado: "ok" };
      }
    }

    return { resultado: "error", error: "No se encontro el registro para eliminar" };
  }

  const index = Number(datos.index);
  const fila = index + 2;

  if (!Number.isFinite(index) || fila > hoja.getLastRow()) {
    return { resultado: "error", error: "Indice no valido" };
  }

  hoja.deleteRow(fila);
  return { resultado: "ok" };
}

function actualizarInscripcion_(datos) {
  const hoja = obtenerHoja_(HOJA_INSCRIPCIONES);
  const encabezados = obtenerEncabezadosActualesInscripciones_(hoja);
  const filas = hoja.getDataRange().getValues();
  const cambios = datos.cambios || {};
  const doc = String(datos.DocumentoOriginal || "").trim();
  const codigo = String(datos.CodigoOriginal || "").trim().toLowerCase();
  const di = encabezados.indexOf("Documento");
  const ci = encabezados.indexOf("Codigo");
  const coincide = (fila) => codigo
    ? String(fila[ci] || "").trim().toLowerCase() === codigo && (!doc || String(fila[di] || "").trim() === doc)
    : doc && String(fila[di] || "").trim() === doc;
  const indices = filas.map((fila, i) => i > 0 && coincide(fila) ? i : -1).filter(i => i >= 0);
  if (indices.length !== 1) return { resultado: "error", error: "No se encontro un registro unico. Recarga el listado." };
  const indice = indices[0];
  const registro = {};
  encabezados.forEach((columna, i) => registro[columna] = filas[indice][i]);
  COLUMNAS_INSCRIPCIONES.forEach(columna => {
    if (Object.prototype.hasOwnProperty.call(cambios, columna)) registro[columna] = String(cambios[columna]).trim();
  });
  if (!registro.Nombre || !registro.Documento || !registro.Codigo) return { resultado: "error", error: "Nombre, documento y codigo son obligatorios" };
  if (filas.some((fila, i) => i > 0 && i !== indice &&
    (String(fila[di] || "").trim() === registro.Documento || String(fila[ci] || "").trim().toLowerCase() === registro.Codigo.toLowerCase()))) {
    return { resultado: "error", error: "El documento o codigo ya pertenece a otro campista" };
  }
  // Mantener las referencias de pagos y comprobantes al corregir la identidad.
  [HOJA_PAGOS, HOJA_COMPROBANTES].forEach(nombre => {
    const relacionada = obtenerHoja_(nombre);
    const valores = relacionada.getDataRange().getValues();
    const columnas = valores[0];
    for (let i = 1; i < valores.length; i++) {
      const persona = {};
      columnas.forEach((columna, j) => persona[columna] = valores[i][j]);
      if (!coincideParticipante_({ Documento: doc, Codigo: codigo }, persona)) continue;
      ["Documento", "Codigo", "Nombre"].forEach(columna => escribirCeldaPorEncabezado_(relacionada, columnas, i + 1, columna, registro[columna]));
      if (columnas.indexOf("CampistaKey") >= 0 && [doc, codigo].indexOf(String(persona.CampistaKey || "").trim().toLowerCase()) >= 0) {
        escribirCeldaPorEncabezado_(relacionada, columnas, i + 1, "CampistaKey", registro.Documento);
      }
    }
  });
  COLUMNAS_INSCRIPCIONES.forEach(columna => {
    if (Object.prototype.hasOwnProperty.call(cambios, columna)) escribirCeldaPorEncabezado_(hoja, encabezados, indice + 1, columna, registro[columna]);
  });
  return { resultado: "ok", registro: registro };
}

function actualizarEstadoRegistro_(datos) {
  const hoja = obtenerHoja_(datos.hoja || datos.HojaDestino || HOJA_INSCRIPCIONES);
  const documento = String(datos.Documento || datos.documento || "").trim();
  const codigo = String(datos.Codigo || datos.codigo || "").trim().toLowerCase();

  if (!documento && !codigo) {
    return { resultado: "error", error: "Documento o codigo requerido" };
  }

  const encabezados = obtenerEncabezadosActualesInscripciones_(hoja);
  const indiceDocumento = encabezados.indexOf("Documento");
  const indiceCodigo = encabezados.indexOf("Codigo");
  const valores = hoja.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    const fila = valores[i];
    const filaDocumento = indiceDocumento >= 0 ? String(fila[indiceDocumento] || "").trim() : "";
    const filaCodigo = indiceCodigo >= 0 ? String(fila[indiceCodigo] || "").trim().toLowerCase() : "";
    const coincideDocumento = documento && filaDocumento === documento;
    const coincideCodigo = codigo && filaCodigo === codigo;

    if (coincideDocumento || coincideCodigo) {
      escribirCeldaPorEncabezado_(hoja, encabezados, i + 1, "EstadoRegistro", datos.EstadoRegistro || "");
      escribirCeldaPorEncabezado_(hoja, encabezados, i + 1, "SeguimientoNota", datos.SeguimientoNota || "");
      escribirCeldaPorEncabezado_(hoja, encabezados, i + 1, "SeguimientoFecha", parseDateValor(datos.SeguimientoFecha) || datos.SeguimientoFecha || "");
      escribirCeldaPorEncabezado_(hoja, encabezados, i + 1, "SeguimientoActualizado", new Date());
      return { resultado: "ok" };
    }
  }

  return { resultado: "error", error: "No se encontro el registro para actualizar" };
}

function obtenerEncabezadosActualesInscripciones_(hoja) {
  asegurarEncabezados_(hoja);
  const ultimaColumna = Math.max(hoja.getLastColumn(), COLUMNAS_INSCRIPCIONES.length);
  return hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0]
    .map((valor) => String(valor || "").trim());
}

function escribirCeldaPorEncabezado_(hoja, encabezados, fila, columna, valor) {
  const indice = encabezados.indexOf(columna);
  if (indice >= 0) {
    hoja.getRange(fila, indice + 1).setValue(valor);
  }
}

function obtenerHoja_(nombreHoja) {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = libro.insertSheet(nombreHoja);
  }

  asegurarEncabezados_(hoja);
  return hoja;
}

function obtenerHojaPagos_(nombreHoja) {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = libro.insertSheet(nombreHoja);
  }

  asegurarEncabezadosExactos_(hoja, COLUMNAS_PAGOS);
  return hoja;
}

function obtenerHojaComprobantes_(nombreHoja) {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = libro.insertSheet(nombreHoja);
  }

  asegurarEncabezadosExactos_(hoja, COLUMNAS_COMPROBANTES);
  return hoja;
}

function asegurarEncabezados_(hoja) {
  asegurarEncabezadosPersonalizados_(hoja, COLUMNAS_INSCRIPCIONES);
}

function asegurarEncabezadosPersonalizados_(hoja, columnas) {
  const ancho = Math.max(hoja.getLastColumn(), columnas.length);
  const encabezadosActuales = hoja.getRange(1, 1, 1, ancho).getValues()[0];
  const tieneEncabezados = encabezadosActuales.some((valor) => String(valor).trim() !== "");

  if (!tieneEncabezados) {
    hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]);
    hoja.setFrozenRows(1);
    return;
  }

  const faltantes = columnas.filter((columna) => !encabezadosActuales.includes(columna));
  if (faltantes.length) {
    hoja.getRange(1, hoja.getLastColumn() + 1, 1, faltantes.length).setValues([faltantes]);
  }
}

function asegurarEncabezadosExactos_(hoja, columnas) {
  // Conservar orden y columnas existentes, incluidos fragmentos de adjuntos.
  asegurarEncabezadosPersonalizados_(hoja, columnas);
  hoja.setFrozenRows(1);
}

function obtenerEncabezadosActuales_(hoja, columnasBase) {
  asegurarEncabezadosExactos_(hoja, columnasBase);
  const ultimaColumna = Math.max(hoja.getLastColumn(), columnasBase.length);
  return hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0]
    .map((valor) => String(valor || "").trim());
}

function serializarValorHoja_(valor) {
  if (!(valor instanceof Date)) return valor;
  // Una fecha invalida no debe impedir consultar todos los registros.
  return Number.isFinite(valor.getTime()) ? valor.toISOString() : "";
}

function parseDateValor(valor) {
  if (valor instanceof Date) return Number.isFinite(valor.getTime()) ? valor : null;
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function normalizarDatosPago_(datos, idPago) {
  const comprobanteData = datos.ComprobanteData || datos.ComprobanteURL || "";
  return {
    IdPago: idPago,
    FechaRegistro: parseDateValor(datos.FechaRegistro) || new Date(),
    CampistaKey: datos.CampistaKey || datos.Documento || datos.Codigo || "",
    Documento: datos.Documento || "",
    Codigo: datos.Codigo || "",
    Nombre: datos.Nombre || "",
    Iglesia: datos.Iglesia || "",
    Municipio: datos.Municipio || datos.Ciudad || "",
    ZonaAsignada: datos.ZonaAsignada || "",
    LiderAsignado: datos.LiderAsignado || "",
    Organizador: datos.Organizador || "",
    MedioPago: datos.MedioPago || "",
    ValorCongreso: datos.ValorCongreso || "",
    DeseaCamisa: datos.DeseaCamisa || "",
    TipoCamiseta: datos.TipoCamiseta || "",
    TallaCamisa: datos.TallaCamisa || "",
    ColorCamisa: datos.ColorCamisa || "",
    ValorCamisa: datos.ValorCamisa || "",
    ValorTotal: datos.ValorTotal || "",
    ValorAbono: datos.ValorAbono || "",
    FechaPago: parseDateValor(datos.FechaPago) || datos.FechaPago || "",
    ReferenciaPago: datos.ReferenciaPago || "",
    ObservacionPago: datos.ObservacionPago || "",
    ObservacionPag: datos.ObservacionPago || datos.ObservacionPag || "",
    ComprobanteNombre: datos.ComprobanteNombre || "",
    ComprobanteTipo: datos.ComprobanteTipo || "",
    ComprobanteData: comprobanteData,
    ComprobanteURL: comprobanteData,
    SaldoPosterior: datos.SaldoPosterior || "",
    EstadoPago: datos.EstadoPago || "Activo",
    ValorAbonoOriginal: datos.ValorAbonoOriginal ?? "",
    MotivoAnulacion: datos.MotivoAnulacion || "",
    AnuladoPor: datos.AnuladoPor || "",
    FechaAnulacion: datos.FechaAnulacion || ""
  };
}

function normalizarDatosComprobantePago_(datosPago) {
  const idComprobante = datosPago.IdPago || crearIdPago_();
  const saldo = Number(datosPago.SaldoPosterior || 0);
  const estado = datosPago.EstadoPago === "Anulado" ? "Anulado" : saldo === 0 ? "Pago completo" : "Abono registrado";
  return {
    IdComprobante: idComprobante,
    IdPago: datosPago.IdPago || "",
    FechaEmision: new Date(),
    FechaPago: parseDateValor(datosPago.FechaPago) || datosPago.FechaPago || "",
    Documento: datosPago.Documento || "",
    Codigo: datosPago.Codigo || "",
    Nombre: datosPago.Nombre || "",
    Iglesia: datosPago.Iglesia || "",
    Municipio: datosPago.Municipio || "",
    ZonaAsignada: datosPago.ZonaAsignada || "",
    LiderAsignado: datosPago.LiderAsignado || "",
    Organizador: datosPago.Organizador || "",
    MedioPago: datosPago.MedioPago || "",
    ValorTotal: datosPago.ValorTotal || "",
    ValorAbono: datosPago.ValorAbono || "",
    SaldoPosterior: datosPago.SaldoPosterior || "",
    ReferenciaPago: datosPago.ReferenciaPago || "",
    EstadoComprobante: estado,
    ArchivoSugerido: "comprobante-" + idComprobante + "-" + (datosPago.Documento || "pago") + ".png",
    EstadoPago: datosPago.EstadoPago || "Activo",
    ValorAbonoOriginal: datosPago.ValorAbonoOriginal ?? "",
    MotivoAnulacion: datosPago.MotivoAnulacion || "",
    AnuladoPor: datosPago.AnuladoPor || "",
    FechaAnulacion: datosPago.FechaAnulacion || ""
  };
}

function leerBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function responderJson_(datos, callback) {
  const texto = JSON.stringify(datos);

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + texto + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(texto)
    .setMimeType(ContentService.MimeType.JSON);
}

function crearCodigo_(cantidadActual) {
  return "UJECA-" + Utilities.formatString("%04d", Math.max(cantidadActual, 1));
}

function crearIdPago_() {
  return "PAGO-" + Utilities.getUuid().slice(0, 8).toUpperCase();
}
