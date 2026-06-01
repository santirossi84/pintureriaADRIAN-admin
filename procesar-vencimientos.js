const fs = require('fs');
const path = require('path');

// Leer el CSV
const csvPath = path.join(__dirname, 'datos', 'VTOS A CPBRAR 9-5.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');
const lines = csvData.split(/\r?\n/);

// Parsear clientes y deudas
const clientes = [];
let currentCliente = null;
let totalCliente = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(';');

  // Detectar encabezado de cliente: ";NRO NOMBRE;;;"
  if (parts[0] === '' && parts[1] && !parts[2] && !parts[3]) {
    if (currentCliente && totalCliente > 0) {
      clientes.push({ ...currentCliente, monto: totalCliente });
    }
    const match = parts[1].match(/^(\d+)\s+(.+)$/);
    if (match) {
      currentCliente = { nro: match[1], nombre: match[2].trim(), monto: 0 };
      totalCliente = 0;
    }
  }

  // Detectar "Total del Cliente"
  if (parts[1] && parts[1].includes('Total del Cliente')) {
    const montoStr = (parts[3] || '').replace(/\./g, '').replace(',', '.');
    totalCliente = parseFloat(montoStr) || 0;
  }
}

// Agregar último cliente
if (currentCliente && totalCliente > 0) {
  clientes.push({ ...currentCliente, monto: totalCliente });
}

// Ordenar por monto (mayor a menor)
clientes.sort((a, b) => b.monto - a.monto);

// Generar CSV limpio
const csvLimpio = [['N° Cliente', 'Nombre', 'Monto Adeudado']];
clientes.forEach(c => {
  csvLimpio.push([c.nro, c.nombre, c.monto.toFixed(2)]);
});

const csvOutput = csvLimpio.map(row => row.map(x => `"${x}"`).join(',')).join('\n');

// Guardar en reportes/
const reportPath = path.join(__dirname, 'reportes', 'cobranzas-procesado.csv');
if (!fs.existsSync(path.join(__dirname, 'reportes'))) {
  fs.mkdirSync(path.join(__dirname, 'reportes'));
}

fs.writeFileSync(reportPath, csvOutput, 'utf-8');

console.log(`✓ ${clientes.length} clientes procesados`);
console.log(`✓ Reporte guardado en: reportes/cobranzas-procesado.csv`);
console.log('\nTop 5 deudores:');
clientes.slice(0, 5).forEach(c => {
  console.log(`  ${c.nro} - ${c.nombre}: $${c.monto.toFixed(2)}`);
});