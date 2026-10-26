function descargarFichaInscrito(key){
  const row=filas.find(r=>r.key === key);
  if(!row) return;
  const p=row.raw;
  const grupos=[
    ["Datos personales", [["Codigo", "Código"], ["FechaRegistro", "Fecha de inscripción"], ["Nombre", "Nombre completo"], ["Documento", "Documento"], ["Edad", "Edad"], ["Sexo", "Sexo"], ["Telefono", "Teléfono"], ["Correo", "Correo"]]],
    ["Procedencia y congregación", [["Pais", "País"], ["Departamento", "Departamento"], ["Municipio", "Municipio"], ["Iglesia", "Iglesia"], ["Pastor", "Pastor"], ["TipoZona", "Tipo de zona"], ["ZonaAsignada", "Zona asignada"], ["LiderAsignado", "Líder asignado"], ["tipo", "Tipo de inscripción"]]],
    ["Emergencia y observaciones", [["Emergencia_nombre", "Contacto de emergencia"], ["Emergencia_telefono", "Teléfono de emergencia"], ["Alergias", "Alergias"], ["Observaciones", "Observaciones"], ["Puesto", "Puesto"]]],
    ["Camiseta", [["DeseaCamisa", "Desea camiseta"], ["TipoCamiseta", "Tipo de camiseta"], ["TallaCamisa", "Talla"], ["ColorCamisa", "Color"]]]
  ];

  const bytes=crearPdfFichaUJECA(row, grupos);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const enlace=document.createElement('a');
  enlace.href=url;
  enlace.download='ficha-inscripcion-'+String(row.codigo || row.documento || 'campista').replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  notificar('Ficha PDF descargada.');
}

// A4, fuentes incorporadas al visor y texto seleccionable; no requiere conexión.
function crearPdfFichaUJECA(row, grupos){
  const literal=valor=>Array.from(String(valor).normalize('NFC')).map(c=>{
    let n=c.codePointAt(0);
    if(n===0x20ac)n=128;
    if(n>255)n=63;
    return '\\'+n.toString(8).padStart(3,'0');
  }).join('');
  const paginas=[];
  const tinta='0.12 0.15 0.20', vino='0.36 0.025 0.06', gris='0.40 0.44 0.49';
  let comandos='',y=0;
  const texto=(valor,x,base,tam=10,bold=false,color=tinta)=>{
    comandos+=`BT /${bold?'F2':'F1'} ${tam} Tf ${color} rg 1 0 0 1 ${x} ${base} Tm (${literal(valor)}) Tj ET\n`;
  };
  const caja=(x,base,ancho,alto,color)=>{comandos+=`${color} rg ${x} ${base} ${ancho} ${alto} re f\n`;};
  // Límite conservador por carácter para evitar desbordes con textos anchos.
  const envolver=(valor,ancho,tam)=>{
    const limite=Math.max(1,Math.floor(ancho/(tam*.68)));
    const resultado=[];
    String(valor ?? '').trim().split(/\r?\n/).forEach(parte=>{
      while(parte.length>limite){
        let corte=parte.lastIndexOf(' ',limite);
        if(corte<limite/2)corte=limite;
        resultado.push(parte.slice(0,corte));
        parte=parte.slice(corte).trimStart();
      }
      resultado.push(parte || 'Sin registrar');
    });
    return resultado;
  };
  const nuevaPagina=()=>{
    if(comandos)paginas.push(comandos);
    comandos='';
    caja(0,744,595,98,vino);
    caja(36,765,3,49,'0.92 0.68 0.38');
    texto('UJECA / TRASCENDENTALES 2026',50,811,9,true,'0.96 0.83 0.75');
    texto('Ficha de inscripción',50,781,25,true,'1 1 1');
    texto('REGISTRO INDIVIDUAL',50,760,8,false,'0.96 0.83 0.75');
    y=721;
    envolver(row.nombre,510,14).forEach(linea=>{texto(linea,36,y,14,true);y-=18;});
    envolver('Código: '+(row.codigo || '-')+'   /   Documento: '+(row.documento || '-'),510,9).forEach(linea=>{texto(linea,36,y,9,false,gris);y-=13;});
    y-=12;
  };
  const espacio=alto=>{if(y-alto<62)nuevaPagina();};
  nuevaPagina();
  grupos.forEach(([titulo,campos],indice)=>{
    const valores=campos.map(([campo,etiqueta])=>{
      let valor=row.raw[campo];
      if(campo==='FechaRegistro' && valor){
        const fecha=new Date(valor);
        if(Number.isFinite(fecha.getTime()))valor=fecha.toLocaleDateString('es-CO',{timeZone:'America/Bogota'});
      }
      return {etiqueta,lineas:envolver(valor,236,10)};
    });
    const encabezado=()=>{
      caja(36,y-8,523,23,'0.96 0.94 0.93');
      texto(String(indice+1).padStart(2,'0'),45,y,9,true,vino);
      texto(titulo,70,y,11,true,vino);
      y-=26;
    };
    espacio(70);encabezado();
    for(let i=0;i<valores.length;i+=2){
      const par=valores.slice(i,i+2);
      const alto=15+Math.max(...par.map(v=>v.lineas.length))*13;
      // Los campos excepcionalmente largos continúan sin perder texto.
      if(y-Math.min(alto,70)<62){nuevaPagina();encabezado();}
      let offset=0;
      const total=Math.max(...par.map(v=>v.lineas.length));
      while(offset<total){
        const capacidad=Math.max(1,Math.floor((y-78)/13));
        const cantidad=Math.min(total-offset,capacidad);
        par.forEach((v,col)=>{
          const x=36+col*270;
          texto(v.etiqueta+(offset?' (continuación)':''),x,y,8,true,gris);
          v.lineas.slice(offset,offset+cantidad).forEach((linea,j)=>texto(linea,x,y-13-j*13,10));
        });
        y-=13+cantidad*13+4;
        offset+=cantidad;
        if(offset<total){nuevaPagina();encabezado();}
      }
    }
    y-=3;
  });
  espacio(76);
  texto('Resumen de pagos',36,y,12,true,vino);y-=16;
  [['VALOR TOTAL',row.total],['ABONADO',row.abonado],['SALDO PENDIENTE',row.saldo]].forEach(([etiqueta,valor],i)=>{
    const x=36+i*178;
    caja(x,y-47,167,47,i===2?vino:'0.96 0.94 0.93');
    texto(etiqueta,x+12,y-16,8,true,i===2?'0.96 0.83 0.75':gris);
    texto(money(valor),x+12,y-36,16,true,i===2?'1 1 1':tinta);
  });
  paginas.push(comandos);
  const fecha=new Date().toLocaleDateString('es-CO',{timeZone:'America/Bogota'});
  const objetos=['<< /Type /Catalog /Pages 2 0 R >>','',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  const hijos=[];
  paginas.forEach((contenido,i)=>{
    const id=objetos.length+1;
    hijos.push(id+' 0 R');
    comandos=contenido;
    caja(36,43,523,0.6,'0.86 0.86 0.86');
    texto('Datos guardados al '+fecha+' / Congreso Trascendentales',36,28,8,false,gris);
    texto('Página '+(i+1)+' de '+paginas.length,487,28,8,false,gris);
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);
    objetos.push('<< /Length '+comandos.length+' >>\nstream\n'+comandos+'endstream');
  });
  objetos[1]='<< /Type /Pages /Kids ['+hijos.join(' ')+'] /Count '+paginas.length+' >>';
  let pdf='%PDF-1.4\n';
  const offsets=[0];
  objetos.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
  const xref=pdf.length;
  pdf+='xref\n0 '+(objetos.length+1)+'\n0000000000 65535 f \n';
  offsets.slice(1).forEach(n=>pdf+=String(n).padStart(10,'0')+' 00000 n \n');
  pdf+='trailer\n<< /Size '+(objetos.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return Uint8Array.from(pdf,c=>c.charCodeAt(0));
}

