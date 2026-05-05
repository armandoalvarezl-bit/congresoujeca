const SPREADSHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET";
const HOJA_INSCRIPCIONES = "Inscripciones2026";
const HOJA_PAGOS = "PagosIndividuales2026";

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
  "FechaRegistro",
  "IdPago",
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
  "SaldoPosterior"
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
  const fila = COLUMNAS_PAGOS.map((columna) => {
    if (columna === "IdPago") return idPago;
    if (columna === "FechaRegistro") return datos.FechaRegistro || new Date().toISOString();
    return datos[columna] || "";
  });

  hoja.appendRow(fila);
  return { resultado: "ok", IdPago: idPago };
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
