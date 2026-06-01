const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'datos', 'VTOS A CPBRAR 9-5.csv');
const HTML_PATH = path.join(__dirname, 'reportes', 'tablero-cobranzas.html');

function titleCase(s) {
  return (s || '').toLowerCase().replace(/(^|\s|-)\S/g, t => t.toUpperCase());
}

function parsearCSV() {
  const lines = fs.readFileSync(CSV_PATH, 'latin1').split(/\r?\n/);
  const clientes = [];
  let current = null;

  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 4) continue;

    // Encabezado de cliente: ";<NUM> <NOMBRE>;;;"
    if (parts[0] === '' && parts[1] && !parts[2] && !parts[3]) {
      const trimmed = parts[1].trim();
      if (trimmed.startsWith('Total de todos')) continue;
      const m = trimmed.match(/^(\d+)\s+(.+)$/);
      if (m) {
        current = { nro: m[1], nombre: titleCase(m[2].trim()), monto: 0, años: new Set() };
      }
    }
    // Total del cliente
    else if (parts[1] && parts[1].includes('Total del Cliente') && current) {
      const montoStr = (parts[3] || '').replace(/\./g, '').replace(',', '.');
      current.monto = parseFloat(montoStr) || 0;
      if (current.monto > 0) {
        const min = current.años.size > 0 ? Math.min(...current.años) : 2026;
        const antiguedad = min <= 2023 ? 'historico' : min === 2024 ? '2024' : min === 2025 ? '2025' : '2026';
        clientes.push({ nro: current.nro, nombre: current.nombre, monto: current.monto, antiguedad });
      }
      current = null;
    }
    // Línea de detalle — extraer año de la fecha de vencimiento (col 0)
    else if (current && parts[0]) {
      const m = parts[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) current.años.add(parseInt(m[3]));
    }
  }

  clientes.sort((a, b) => b.monto - a.monto);
  return clientes;
}

function actualizarHTML(clientes, fechaCSV) {
  let html = fs.readFileSync(HTML_PATH, 'utf8');

  // Regenerar array CLIENTES_INICIALES
  const lineas = clientes.map((c, i) => {
    const nombre = c.nombre.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const comma = i < clientes.length - 1 ? ',' : '';
    return `  { nro: '${c.nro}', nombre: '${nombre}', monto: ${c.monto.toFixed(2)}, antiguedad: '${c.antiguedad}' }${comma}`;
  }).join('\n');

  const nuevoArray = `const CLIENTES_INICIALES = [\n${lineas}\n];`;
  const regexArray = /const CLIENTES_INICIALES = \[[\s\S]*?\];/;
  if (!regexArray.test(html)) throw new Error('No se encontró CLIENTES_INICIALES en el HTML');
  html = html.replace(regexArray, nuevoArray);

  // Actualizar fecha del CSV
  const regexFecha = /const FECHA_CSV = '[^']*';/;
  if (regexFecha.test(html)) {
    html = html.replace(regexFecha, `const FECHA_CSV = '${fechaCSV}';`);
  }

  fs.writeFileSync(HTML_PATH, html, 'utf8');
}

// Extraer fecha del nombre del archivo CSV (ej: "VTOS A CPBRAR 9-5.csv" → "9/5/2026")
function extraerFechaCSV() {
  const base = path.basename(CSV_PATH, '.csv');
  const m = base.match(/(\d+)-(\d+)$/);
  if (m) {
    const hoy = new Date();
    return `${m[1]}/${m[2]}/${hoy.getFullYear()}`;
  }
  const hoy = new Date();
  return `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;
}

try {
  console.log('📊 Procesando CSV...');
  const clientes = parsearCSV();
  console.log(`✓ ${clientes.length} clientes encontrados`);

  const fechaCSV = extraerFechaCSV();
  console.log(`📅 Fecha CSV: ${fechaCSV}`);

  console.log('📝 Actualizando tablero HTML...');
  actualizarHTML(clientes, fechaCSV);
  console.log(`✅ Tablero actualizado: ${HTML_PATH}`);

  const total = clientes.reduce((s, c) => s + c.monto, 0);
  console.log(`\n💰 Deuda total: $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('\nTop 5 deudores:');
  clientes.slice(0, 5).forEach(c => {
    console.log(`  ${c.nro} - ${c.nombre}: $${c.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  });
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}