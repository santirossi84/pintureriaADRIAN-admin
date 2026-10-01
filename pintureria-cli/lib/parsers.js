const fs = require('fs');

// Reglas de los CSV de Infocor GV6: separador ";", números argentinos (1.234,56),
// y la ÚLTIMA fila es un subtotal sin nombre que nunca entra en el cálculo.

const EXCLUIR_CXC = ['GARAY ADRIAN', 'CUENCA NELSON', 'VULCANO'];

// ---------- utilidades ----------

// Infocor exporta en latin-1 según el sistema, pero los CSV de agosto vinieron en UTF-8.
// Se prueba UTF-8 estricto y, si falla, latin-1.
function decode(buf) {
  let txt;
  try {
    txt = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    txt = buf.toString('latin1');
  }
  return txt.replace(/^﻿/, '');
}

function parseNum(s) {
  if (s === undefined || s === null) return 0;
  const t = String(s).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function parseFecha(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
}

// Devuelve { header, rows, ultima }: filas con datos, sin la fila final de subtotal.
function readCsv(path) {
  const lines = decode(fs.readFileSync(path)).split(/\r?\n/);
  const filas = lines.map(l => l.split(';')).filter(r => r.some(c => c.trim() !== ''));
  const header = filas.shift() || [];
  const ultima = filas.pop() || [];
  return { header, rows: filas, ultima };
}

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function verificar(label, calculado, subtotal) {
  return { label, calculado, subtotal, ok: Math.abs(calculado - subtotal) <= 1 };
}

// ---------- detección de tipo ----------

function detectType(path) {
  const nombre = norm(path.split(/[\\/]/).pop());
  const head = norm(decode(fs.readFileSync(path)).split(/\r?\n/)[0]);
  const cols = head.split(';').map(c => c.trim());
  const tiene = c => cols.some(x => x.startsWith(c));

  if (tiene('cuenta') && tiene('cod.estructurado')) {
    // "subdiarios unificados" tiene el mismo header: solo vale el "asiento resumen"
    return /asiento/.test(nombre) ? 'asiento' : null;
  }
  if (tiene('cuenta') && tiene('detalle') && tiene('debe')) return 'subdiario';
  if (tiene('cod cliente') && tiene('importe')) return 'ranking';
  if (tiene('vence') && tiene('fecha cpte')) return 'cxc';
  if (tiene('fecha vencimiento') && tiene('detalle')) return 'cxp';
  if (tiene('fecha') && tiene('comprobante') && tiene('cv')) return 'ventas';
  if (tiene('fecha') && tiene('comprobante') && tiene('total')) return 'cobros';
  return null;
}

// ---------- parsers ----------

function parseVentas(path) {
  const { rows, ultima } = readCsv(path);
  const items = rows.map(r => ({
    fecha: r[0], comprobante: r[1], cliente: r[4], total: parseNum(r[5]),
  }));
  const total = items.reduce((a, r) => a + r.total, 0);
  return {
    items, total, facturas: items.length,
    ticket: items.length ? total / items.length : 0,
    check: verificar('Ventas', total, parseNum(ultima[5])),
  };
}

function parseCobros(path) {
  const { rows, ultima } = readCsv(path);
  const items = rows.map(r => ({ fecha: r[0], comprobante: r[1], cliente: r[3], total: parseNum(r[4]) }));
  const total = items.reduce((a, r) => a + r.total, 0);
  return { items, total, check: verificar('Cobros', total, parseNum(ultima[4])) };
}

// Bloques por cliente: ";695 NOMBRE;;;" → ítems → ";Total del Cliente;;monto;"
// La última fila ("Total de todos los Clientes") es el subtotal.
function parseBloques(rows, { colMonto, colVence }) {
  const clientes = [];
  let actual = null;
  for (const r of rows) {
    const c1 = (r[1] || '').trim();
    if (!r[0].trim() && /^\d+\s+\S/.test(c1) && !r[colMonto].trim()) {
      actual = { nro: c1.match(/^\d+/)[0], nombre: c1.replace(/^\d+\s+/, ''), items: [], total: 0 };
      clientes.push(actual);
    } else if (/^total/i.test(c1) && actual) {
      actual.total = parseNum(r[colMonto]);
    } else if (actual && r[colMonto].trim()) {
      actual.items.push({ vence: parseFecha(r[colVence]), importe: parseNum(r[colMonto]) });
    }
  }
  return clientes;
}

function chequearBloques(clientes) {
  // cada cliente debe cerrar contra su propio "Total del Cliente"
  return clientes.filter(c => Math.abs(c.items.reduce((a, i) => a + i.importe, 0) - c.total) > 1)
    .map(c => c.nombre);
}

function parseCxC(path, { corte, excluir = EXCLUIR_CXC } = {}) {
  const { rows, ultima } = readCsv(path);
  const clientes = parseBloques(rows, { colMonto: 3, colVence: 0 });
  const totalBruto = clientes.reduce((a, c) => a + c.total, 0);

  const excluye = c => excluir.some(x => c.nombre.toUpperCase().includes(x.toUpperCase()));
  const excluidos = clientes.filter(excluye);
  const giro = clientes.filter(c => !excluye(c) && c.total > 0);

  const tramos = { '0-30': 0, '31-60': 0, '61-90': 0, '+90': 0 };
  for (const c of giro) {
    for (const it of c.items) {
      const dias = it.vence && corte ? Math.floor((corte - it.vence) / 86400000) : 999;
      const t = dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : '+90';
      tramos[t] += it.importe;
    }
  }
  const total = giro.reduce((a, c) => a + c.total, 0);
  return {
    total, deudores: giro.length,
    ranking: [...giro].sort((a, b) => b.total - a.total),
    tramos,
    excluidos: excluidos.map(c => ({ nombre: c.nombre, total: c.total })),
    totalExcluido: excluidos.reduce((a, c) => a + c.total, 0),
    check: verificar('CxC (todos los clientes)', totalBruto, parseNum(ultima[3])),
    descuadrados: chequearBloques(clientes),
  };
}

function parseCxP(path) {
  const { rows, ultima } = readCsv(path);
  const prov = parseBloques(rows, { colMonto: 2, colVence: 0 });
  const total = prov.reduce((a, p) => a + p.total, 0);
  return {
    total,
    proveedores: prov.filter(p => p.total !== 0).sort((a, b) => b.total - a.total)
      .map(p => ({ nombre: p.nombre, total: p.total })),
    check: verificar('CxP', total, parseNum(ultima[2])),
    descuadrados: chequearBloques(prov),
  };
}

// Caja = cuenta 1004. La última fila es "Totales Generales" (no es una cuenta).
function parseSubdiario(path) {
  const { rows } = readCsv(path);
  let ingreso = 0, egreso = 0;
  for (const r of rows) {
    if ((r[0] || '').trim() === '1004') {
      ingreso += parseNum(r[2]);
      egreso += parseNum(r[3]);
    }
  }
  return { ingreso, egreso, saldo: ingreso - egreso };
}

// Egresos = cuentas al Debe distintas de caja (la caja al Debe son los ingresos).
function parseAsiento(path) {
  const { rows, ultima } = readCsv(path);
  const items = rows.map(r => ({
    cuenta: r[0].trim(), nombre: r[2].trim(), debe: parseNum(r[3]), haber: parseNum(r[4]),
  }));
  const egresos = items.filter(i => i.debe > 0 && i.cuenta !== '1004')
    .sort((a, b) => b.debe - a.debe).map(i => ({ nombre: i.nombre, monto: i.debe }));
  const debe = items.reduce((a, i) => a + i.debe, 0);
  return {
    egresos, totalEgresos: egresos.reduce((a, e) => a + e.monto, 0),
    check: verificar('Asiento resumen (Debe)', debe, parseNum(ultima[3])),
  };
}

function parseRanking(path) {
  const { rows, ultima } = readCsv(path);
  const items = rows.map(r => ({ cod: r[0], nombre: r[1].trim(), importe: parseNum(r[2]) }))
    .sort((a, b) => b.importe - a.importe);
  const total = items.reduce((a, r) => a + r.importe, 0);
  return { items, total, check: verificar('Ranking clientes', total, parseNum(ultima[2])) };
}

module.exports = {
  EXCLUIR_CXC, parseNum, parseFecha, detectType,
  parseVentas, parseCobros, parseCxC, parseCxP, parseSubdiario, parseAsiento, parseRanking,
};
