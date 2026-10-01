#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const P = require('./lib/parsers');
const { generarHtml, MESES } = require('./lib/report');

const USO = `Uso: node index.js <carpeta-con-csvs> [opciones]

  --out <archivo>          HTML de salida (default: ../reportes/reporte_<mes>_<año>.html)
  --prev-ventas <monto>    ventas del mes anterior (comparativo, sparklines y gráfico)
  --prev-cxc <monto>       CxC del mes anterior
  --prev-cxp <monto>       CxP del mes anterior
  --prev-label <texto>     nombre del mes anterior (default: "mes anterior")

Los --prev-* se pueden repetir: el primero es el mes anterior y el segundo el anterior
a ese (hasta 2). Ej: --prev-ventas 10712817 --prev-ventas 38451546 --prev-label julio --prev-label junio

La carpeta necesita 7 CSV de Infocor (ventas, cobros, CxC, CxP, subdiario cyb,
asiento resumen, ranking de clientes). El tipo se detecta por header y nombre.
Si hay un notas.txt, se muestra como contexto del mes.`;

const REQUERIDOS = {
  ventas: 'ventas (VTAS)', cobros: 'cobros (COBROS)', cxc: 'CxC (VTOS CLIENTES)', cxp: 'CxP (VTOS A COBRAR/PAGAR)',
  subdiario: 'subdiario cyb', asiento: 'asiento resumen', ranking: 'ranking de clientes',
};

function fallar(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

function parseArgs(argv) {
  const pos = [], opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) (opts[argv[i].slice(2)] ||= []).push(argv[++i]);
    else pos.push(argv[i]);
  }
  return { carpeta: pos[0], opts };
}

// Acepta "10712817", "10712817.5" o formato argentino "10.712.817,22"
function montos(nombre, vs = []) {
  return vs.slice(0, 2).map(v => {
    const s = String(v).trim();
    const n = /,/.test(s) || /^\d{1,3}(\.\d{3})+$/.test(s) ? P.parseNum(s) : parseFloat(s);
    if (!Number.isFinite(n)) fallar(`--${nombre}: "${v}" no es un número`);
    return n;
  });
}

function mesDominante(items) {
  const cuenta = {};
  for (const it of items) {
    const f = P.parseFecha(it.fecha);
    if (f) { const k = `${f.getUTCFullYear()}-${f.getUTCMonth()}`; cuenta[k] = (cuenta[k] || 0) + 1; }
  }
  const k = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
  if (!k) fallar('No pude determinar el mes: el CSV de ventas no tiene fechas válidas.');
  const [anio, mes] = k[0].split('-').map(Number);
  return { anio, mes };
}

function main() {
  const { carpeta, opts } = parseArgs(process.argv.slice(2));
  if (!carpeta || opts.help || carpeta === '--help') { console.log(USO); process.exit(carpeta ? 0 : 1); }
  if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) fallar(`No existe la carpeta: ${carpeta}`);

  // --- detectar archivos ---
  const archivos = {};
  for (const f of fs.readdirSync(carpeta).filter(f => /\.csv$/i.test(f))) {
    const tipo = P.detectType(path.join(carpeta, f));
    if (!tipo) { console.log(`  · ignorado: ${f}`); continue; }
    if (archivos[tipo]) fallar(`Hay dos archivos de tipo "${tipo}": "${archivos[tipo]}" y "${f}". Dejá uno solo por carpeta.`);
    archivos[tipo] = f;
    console.log(`  ✓ ${tipo.padEnd(9)} ← ${f}`);
  }
  const faltan = Object.keys(REQUERIDOS).filter(t => !archivos[t]);
  if (faltan.length) fallar(`Faltan CSV en ${carpeta}: ${faltan.map(t => REQUERIDOS[t]).join(', ')}`);
  const ruta = t => path.join(carpeta, archivos[t]);

  // --- parsear ---
  const ventas = P.parseVentas(ruta('ventas'));
  const { anio, mes } = mesDominante(ventas.items);
  const corte = new Date(Date.UTC(anio, mes + 1, 0)); // último día del mes
  const cobros = P.parseCobros(ruta('cobros'));
  const cxc = P.parseCxC(ruta('cxc'), { corte });
  const cxp = P.parseCxP(ruta('cxp'));
  const caja = P.parseSubdiario(ruta('subdiario'));
  const asiento = P.parseAsiento(ruta('asiento'));
  const ranking = P.parseRanking(ruta('ranking'));

  // --- verificaciones: suma calculada vs subtotal del CSV ---
  const checks = [ventas.check, cobros.check, cxc.check, cxp.check, asiento.check, ranking.check];
  console.log('\nVerificación de subtotales:');
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.label}: ${c.calculado.toFixed(2)} vs ${c.subtotal.toFixed(2)}`);
  }
  for (const n of [...cxc.descuadrados, ...cxp.descuadrados]) console.log(`  ⚠ "${n}" no cierra contra su Total`);
  if (Math.abs(caja.egreso - asiento.totalEgresos) > 1) {
    console.log(`  ⚠ Egreso de caja (subdiario ${caja.egreso.toFixed(2)}) ≠ egresos del asiento (${asiento.totalEgresos.toFixed(2)})`);
  }
  if (checks.some(c => !c.ok)) console.log('  ⚠ Hay subtotales que no cierran: revisá los CSV antes de usar el reporte.');

  // --- notas y comparativos ---
  const notasPath = path.join(carpeta, 'notas.txt');
  const notas = fs.existsSync(notasPath) ? fs.readFileSync(notasPath, 'utf8').replace(/^﻿/, '').trim() : '';
  const hist = {
    ventas: montos('prev-ventas', opts['prev-ventas']),
    cxc: montos('prev-cxc', opts['prev-cxc']),
    cxp: montos('prev-cxp', opts['prev-cxp']),
  };
  const prev = { ventas: hist.ventas[0] ?? null, cxc: hist.cxc[0] ?? null, cxp: hist.cxp[0] ?? null };
  const labels = opts['prev-label'] || [];
  const prevLabels = [labels[0] || 'mes anterior', labels[1] || 'hace 2 meses'];

  // Serie para sparklines y gráfico: del mes más viejo al actual
  const nPrev = Math.max(hist.ventas.length, hist.cxc.length, hist.cxp.length);
  const serie = { meses: [], ventas: [], cxc: [], cxp: [] };
  for (let i = nPrev - 1; i >= 0; i--) {
    serie.meses.push(prevLabels[i]);
    for (const k of ['ventas', 'cxc', 'cxp']) serie[k].push(hist[k][i] ?? null);
  }
  serie.meses.push(MESES[mes].toLowerCase());
  serie.ventas.push(ventas.total); serie.cxc.push(cxc.total); serie.cxp.push(cxp.total);

  const mesNombre = MESES[mes];
  const ultimoDia = corte.getUTCDate();
  const hoy = new Date();
  const html = generarHtml({
    mesNombre, mesIdx: mes, anio, ventas, cobros, cxc, cxp, caja, asiento, ranking, notas, prev, checks,
    prevLabels, serie,
    periodo: `1 al ${ultimoDia} de ${mesNombre.toLowerCase()} de ${anio}`,
    generado: `${MESES[hoy.getMonth()].toLowerCase()} ${hoy.getFullYear()}`,
  });

  const salida = (opts.out && opts.out[0])
    || path.join(__dirname, '..', 'reportes', `reporte_${mesNombre.toLowerCase()}_${anio}.html`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, html, 'utf8');
  console.log(`\n✓ Reporte generado: ${path.resolve(salida)}`);
}

main();
