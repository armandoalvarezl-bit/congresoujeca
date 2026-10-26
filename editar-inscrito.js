/* Editor compartido por el panel y el listado de inscritos. */
window.editarInscritoUJECA = function(registro, alGuardar) {
  const campos = [...new Set([
    ...window.UJECA_COLUMNAS_INSCRITOS, "Pais", "Emergencia_nombre",
    "Emergencia_telefono", "Alergias", "Observaciones", "Puesto", "ValorTotal"
  ])];
  const etiquetas = {Pais:"País", Emergencia_nombre:"Contacto de emergencia",
    Emergencia_telefono:"Teléfono de emergencia", Alergias:"Alergias",
    Observaciones:"Observaciones", Puesto:"Puesto", ValorTotal:"Valor total"};
  const dialog = document.createElement("dialog");
  dialog.style.cssText = "width:min(760px,92vw);max-height:88vh;overflow:auto;border:0;border-radius:12px;padding:24px;box-sizing:border-box";
  const escape = window.escaparHtmlUJECA;
  dialog.innerHTML = `<form><h2>Editar datos del campista</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
    ${campos.map(campo => `<label style="display:grid;gap:5px">${escape(etiquetas[campo] || obtenerEtiquetaInscritoUJECA(campo))}
      <input class="ui-input" style="width:100%;box-sizing:border-box" name="${escape(campo)}" value="${escape(registro[campo] ?? '')}" ${['Nombre','Documento','Codigo'].includes(campo) ? 'required' : ''}
      type="${campo === 'Correo' ? 'email' : ['Edad','ValorTotal'].includes(campo) ? 'number' : 'text'}" ${['Edad','ValorTotal'].includes(campo) ? 'min="0"' : ''}></label>`).join('')}
    </div><p role="status" style="color:#a21b30"></p>
    <div style="display:flex;gap:12px;margin-top:20px"><button type="button" class="ui-btn soft">Cancelar</button><button type="submit" class="ui-btn primary">Guardar cambios</button></div></form>`;
  document.body.appendChild(dialog);
  const cerrar = () => { dialog.close(); dialog.remove(); };
  dialog.querySelector('[type="button"]').onclick = cerrar;
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    const boton = dialog.querySelector('[type="submit"]');
    boton.disabled = true;
    const estado = dialog.querySelector('[role="status"]');
    estado.textContent = 'Guardando...';
    const cambios = Object.fromEntries(new FormData(event.target));
    try {
      const response = await fetch(window.UJECA_API.registro, {
        method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({accion:'actualizarInscripcion', DocumentoOriginal:registro.Documento,
          CodigoOriginal:registro.Codigo, cambios})
      });
      const resultado = await response.json();
      if (resultado.resultado !== 'ok') throw new Error(resultado.error || 'No se pudo guardar. Actualiza la implementación de Apps Script.');
      await alGuardar(resultado.registro || {...registro, ...cambios});
      cerrar();
    } catch(error) {
      estado.textContent = error.message || 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.';
      boton.disabled = false;
    }
  };
  dialog.showModal();
};
