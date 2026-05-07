const SPREADSHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET";
const HOJA_INSCRIPCIONES = "Inscripciones2026";
const HOJA_PAGOS = "PagosIndividuales2026";
const HOJA_COMPROBANTES = "ComprobantesPago2026";

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
  "AplicaDescuento",
  "DescuentoPorcentaje",
  "EstadoRegistro"
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
  "DescuentoAplicado",
  "ValorTotal",
  "ValorAbono",
  "FechaPago",
  "ReferenciaPago",
  "ObservacionPago",
  "ComprobanteNombre",
  "ComprobanteTipo",
  "ComprobanteData",
  "ComprobanteURL",
  "SaldoPosterior"
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
  "ArchivoSugerido"
];

function doGet(e) {
  const params = e.parameter || {};
  const accion = params.accion || "listado";

  if (accion === "listado") {
    return responderJson_(listarInscripciones_(params.hoja), params.callback);
  }

  if (accion === "pagos") {
    return responderJson_(listarPagos_(params.hoja), params.callback);
  }

  if (accion === "comprobantes") {
    return responderJson_(listarComprobantesPago_(params.hoja), params.callback);
  }

  return responderJson_({ resultado: "error", error: "Accion no soportada" }, params.callback);
}

function doPost(e) {
  const datos = leerBody_(e);
  const accion = datos.accion || "registrar";

  if (accion === "registrar") {
    return responderJson_(registrarInscripcion_(datos));
  }

  if (accion === "registrarPago") {
    return responderJson_(registrarPago_(datos));
  }

  if (accion === "eliminar") {
    return responderJson_(eliminarInscripcion_(datos));
  }

  return responderJson_({ resultado: "error", error: "Accion no soportada" });
}

function registrarInscripcion_(datos) {
  const hoja = obtenerHoja_(datos.hoja || datos.HojaDestino || HOJA_INSCRIPCIONES);
  const codigo = datos.Codigo || crearCodigo_(hoja.getLastRow());
  const fila = COLUMNAS_INSCRIPCIONES.map((columna) => {
    if (columna === "Codigo") return codigo;
    return datos[columna] || "";
  });

  hoja.appendRow(fila);
  return { resultado: "ok", codigo: codigo };
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
        registro[encabezado] = fila[index] instanceof Date
          ? fila[index].toISOString()
          : fila[index];
      });
      return registro;
    });
}

function registrarPago_(datos) {
  const hoja = obtenerHojaPagos_(datos.hoja || HOJA_PAGOS);
  const idPago = datos.IdPago || crearIdPago_();
  const encabezados = obtenerEncabezadosActuales_(hoja, COLUMNAS_PAGOS);
  const datosPago = normalizarDatosPago_(datos, idPago);
  const fila = encabezados.map((columna) => datosPago[columna] || "");

  hoja.appendRow(fila);
  registrarComprobantePago_(datosPago);
  return { resultado: "ok", IdPago: idPago };
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
  sincronizarComprobantesDesdePagos_();
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
        comprobante[encabezado] = fila[index] instanceof Date
          ? fila[index].toISOString()
          : fila[index];
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
        item[encabezado] = fila[index] instanceof Date
          ? fila[index].toISOString()
          : fila[index];
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
        pago[encabezado] = fila[index] instanceof Date
          ? fila[index].toISOString()
          : fila[index];
      });
      return pago;
    });
}

function eliminarInscripcion_(datos) {
  const hoja = obtenerHoja_(datos.hoja || datos.HojaDestino || HOJA_INSCRIPCIONES);
  const index = Number(datos.index);
  const fila = index + 2;

  if (!Number.isFinite(index) || fila > hoja.getLastRow()) {
    return { resultado: "error", error: "Indice no valido" };
  }

  hoja.deleteRow(fila);
  return { resultado: "ok" };
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

  asegurarEncabezadosPersonalizados_(hoja, COLUMNAS_PAGOS);
  return hoja;
}

function obtenerHojaComprobantes_(nombreHoja) {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName(nombreHoja);

  if (!hoja) {
    hoja = libro.insertSheet(nombreHoja);
  }

  asegurarEncabezadosPersonalizados_(hoja, COLUMNAS_COMPROBANTES);
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

function obtenerEncabezadosActuales_(hoja, columnasBase) {
  asegurarEncabezadosPersonalizados_(hoja, columnasBase);
  const ultimaColumna = Math.max(hoja.getLastColumn(), columnasBase.length);
  return hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0]
    .map((valor) => String(valor || "").trim())
    .filter((valor) => valor !== "");
}

function normalizarDatosPago_(datos, idPago) {
  const comprobanteData = datos.ComprobanteData || datos.ComprobanteURL || "";
  return {
    IdPago: idPago,
    FechaRegistro: datos.FechaRegistro || new Date().toISOString(),
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
    DescuentoAplicado: datos.DescuentoAplicado || "",
    ValorTotal: datos.ValorTotal || "",
    ValorAbono: datos.ValorAbono || "",
    FechaPago: datos.FechaPago || "",
    ReferenciaPago: datos.ReferenciaPago || "",
    ObservacionPago: datos.ObservacionPago || "",
    ObservacionPag: datos.ObservacionPago || datos.ObservacionPag || "",
    ComprobanteNombre: datos.ComprobanteNombre || "",
    ComprobanteTipo: datos.ComprobanteTipo || "",
    ComprobanteData: comprobanteData,
    ComprobanteURL: comprobanteData,
    SaldoPosterior: datos.SaldoPosterior || ""
  };
}

function normalizarDatosComprobantePago_(datosPago) {
  const idComprobante = datosPago.IdPago || crearIdPago_();
  const saldo = Number(datosPago.SaldoPosterior || 0);
  const estado = saldo === 0 ? "Pago completo" : "Abono registrado";
  return {
    IdComprobante: idComprobante,
    IdPago: datosPago.IdPago || "",
    FechaEmision: new Date().toISOString(),
    FechaPago: datosPago.FechaPago || "",
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
    ArchivoSugerido: "comprobante-" + idComprobante + "-" + (datosPago.Documento || "pago") + ".png"
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
