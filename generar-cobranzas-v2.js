const fs = require('fs');
const path = require('path');

const EXCLUIR = ['GARAY ADRIAN', 'CUENCA NELSON', 'VULCANO'];
const FECHA_REF = new Date();

function parseArgs() {
  const args = process.argv.slice(2);
  let deudas = null, clientes = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--deudas' && args[i + 1]) deudas = args[++i];
    if (args[i] === '--clientes' && args[i + 1]) clientes = args[++i];
  }
  if (!deudas) {
    const candidatos = ['vtos_a_cobrar.csv', 'vtos_a_cobrar_30-6.csv', 'vtos_a_cobrar_30-7.csv'];
    for (const c of candidatos) { if (fs.existsSync(c)) { deudas = c; break; } }
  }
  if (!clientes) {
    const dir = fs.readdirSync('.');
    const match = dir.find(f => f.startsWith('listado') && f.endsWith('.csv'));
    if (match) clientes = match;
  }
  return { deudas, clientes };
}

function leerCSV(archivo) {
  const raw = fs.readFileSync(archivo, 'latin1');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const header = lines[0].split(';').map(h => h.trim().replace(/^\uFEFF/, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const obj = {};
    header.forEach((h, idx) => obj[h] = (cols[idx] || '').trim());
    rows.push(obj);
  }
  return { header, rows };
}

function parsearDeudas(archivo) {
  const raw = fs.readFileSync(archivo, 'latin1');
  const lines = raw.split(/\r?\n/);
  const clientes = [];
  let clienteActual = null;
  for (const line of lines) {
    const cols = line.split(';').map(c => c.trim());
    if (!cols[0] && cols[1] && !cols[1].startsWith('Total') && cols[1].match(/^\d+\s/)) {
      const match = cols[1].match(/^(\d+)\s+(.+)$/);
      if (match) {
        clienteActual = { codigo: parseInt(match[1]), nombre: match[2].trim(), deudas: [], total: 0 };
      }
    } else if (cols[1] && cols[1].startsWith('Total del Cliente') && clienteActual) {
      const monto = parseFloat((cols[3] || '0').replace(/\./g, '').replace(',', '.'));
      clienteActual.total = monto;
      const excluido = EXCLUIR.some(ex => clienteActual.nombre.toUpperCase().includes(ex.toUpperCase()));
      if (!excluido && monto > 0) clientes.push(clienteActual);
      clienteActual = null;
    } else if (cols[0] && cols[0].match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && clienteActual) {
      const p = cols[0].split('/');
      const fechaVenc = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      const monto = parseFloat((cols[3] || '0').replace(/\./g, '').replace(',', '.'));
      clienteActual.deudas.push({ vencimiento: cols[0], fechaVenc, detalle: cols[1] || '', monto, condicion: cols[4] || '' });
    }
  }
  return clientes;
}

function normalizarTelefono(tel) {
  if (!tel) return '';
  let limpio = tel.replace(/[^\d+]/g, '');
  if (limpio.startsWith('0')) limpio = '54' + limpio.substring(1);
  if (!limpio.startsWith('54') && !limpio.startsWith('+54')) limpio = '54' + limpio;
  limpio = limpio.replace(/^\+/, '');
  if (limpio.startsWith('54') && !limpio.startsWith('549')) limpio = '54' + '9' + limpio.substring(2);
  limpio = limpio.replace(/^(549\d{3,4})15/, '$1');
  return limpio;
}

function parsearClientes(archivo) {
  const { rows } = leerCSV(archivo);
  const mapa = {};
  const colCodigo = Object.keys(rows[0]).find(k => k.toLowerCase().includes('digo') || k.toLowerCase() === 'codigo');
  const colTel = Object.keys(rows[0]).find(k => k.toLowerCase().includes('fono') || k.toLowerCase().includes('telef'));
  const colNombre = Object.keys(rows[0]).find(k => k.toLowerCase().includes('nombre'));
  for (const row of rows) {
    const codigo = parseInt(row[colCodigo]);
    const tel = (row[colTel] || '').trim();
    if (codigo && !isNaN(codigo)) {
      mapa[codigo] = { telefono: normalizarTelefono(tel), telefonoRaw: tel, nombre: (row[colNombre] || '').trim() };
    }
  }
  return mapa;
}

function calcularAntiguedad(deudas) {
  if (!deudas.length) return 'Sin datos';
  const masVieja = deudas.reduce((min, d) => d.fechaVenc < min.fechaVenc ? d : min);
  const year = masVieja.fechaVenc.getFullYear();
  if (year <= 2023) return 'Historico';
  return String(year);
}

function diasAtraso(deudas) {
  if (!deudas.length) return 0;
  const masVieja = deudas.reduce((min, d) => d.fechaVenc < min.fechaVenc ? d : min);
  return Math.max(0, Math.floor((FECHA_REF - masVieja.fechaVenc) / (1000 * 60 * 60 * 24)));
}

function formatMoney(n) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function main() {
  console.log('\n  Pintureria Adrian - Generador de Cobranzas v2');
  console.log('  Con cruce de telefonos para WhatsApp masivo\n');
  const { deudas, clientes } = parseArgs();
  if (!deudas) { console.error('No se encontro CSV de deudas.'); process.exit(1); }
  console.log('CSV deudas: ' + deudas);
  const deudores = parsearDeudas(deudas);
  console.log(deudores.length + ' deudores encontrados');
  const totalDeuda = deudores.reduce((s, d) => s + d.total, 0);
  console.log('Deuda total: ' + formatMoney(totalDeuda));

  let mapaClientes = {};
  let conTelefono = 0;
  if (clientes && fs.existsSync(clientes)) {
    console.log('CSV clientes: ' + clientes);
    mapaClientes = parsearClientes(clientes);
    console.log(Object.keys(mapaClientes).length + ' clientes en directorio');
    for (const d of deudores) {
      if (mapaClientes[d.codigo] && mapaClientes[d.codigo].telefono) conTelefono++;
    }
    console.log('Con telefono: ' + conTelefono + ' de ' + deudores.length);
  } else {
    console.log('Sin CSV de clientes - telefonos vacios');
  }

  const datos = deudores.map(d => {
    const info = mapaClientes[d.codigo] || {};
    return {
      id: d.codigo, nombre: d.nombre, antiguedad: calcularAntiguedad(d.deudas),
      telefono: info.telefono || '', monto: d.total, estado: 'Sin Activar',
      notas: '', diasAtraso: diasAtraso(d.deudas),
      deudas: d.deudas.map(dd => ({ vencimiento: dd.vencimiento, monto: dd.monto, detalle: dd.detalle }))
    };
  }).sort((a, b) => b.monto - a.monto);

  console.log('\nTop 10 deudores:');
  datos.slice(0, 10).forEach((d, i) => {
    const tel = d.telefono ? 'Tel: ' + d.telefono : 'sin tel';
    console.log('  ' + (i+1) + '. ' + d.nombre + ': ' + formatMoney(d.monto) + ' - ' + tel);
  });

  const tableroPath = path.join('reportes', 'tablero-cobranzas.html');
  if (fs.existsSync(tableroPath)) {
    let html = fs.readFileSync(tableroPath, 'utf8');
    const jsonStr = JSON.stringify(datos, null, 2);
    const regex = /const\s+CLIENTES_INICIALES\s*=\s*\[[\s\S]*?\];/;
    if (html.match(regex)) {
      html = html.replace(regex, 'const CLIENTES_INICIALES = ' + jsonStr + ';');
    }
    fs.writeFileSync(tableroPath, html, 'utf8');
    console.log('\nTablero actualizado: ' + tableroPath);
  } else {
    fs.writeFileSync('cobranzas-data.json', JSON.stringify(datos, null, 2), 'utf8');
    console.log('\nTablero no encontrado. Datos en: cobranzas-data.json');
  }

  console.log('\nRESUMEN: ' + datos.length + ' deudores | ' + formatMoney(totalDeuda) + ' | ' + conTelefono + ' con tel | ' + (datos.length - conTelefono) + ' sin tel\n');
}

main();
