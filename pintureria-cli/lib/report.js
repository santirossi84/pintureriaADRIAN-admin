// Generador de HTML — estética Raycast dark, glassmorphism, self-contained
// (solo Google Fonts y Chart.js por CDN).

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const peso = n => (n < 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('es-AR');
const corto = n => {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${Math.round(a)}`;
};
const pct = (n, d) => (d ? (n / d) * 100 : 0);
const pct1 = n => n.toFixed(1) + '%';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Formato de narrativa (SKILL.md): $13.6M, $118K, variaciones con signo
const m = n => {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
};
const signo = v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
const normNombre = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const meses = dias => Math.max(Math.round(dias / 30), 1);
const narr = (parrafos, extra = '') =>
  `<div class="card glass narr">${parrafos.map(p => `<p>${p}</p>`).join('')}${extra}</div>`;

// Variación vs mes anterior. bajaEsBuena: para CxC/CxP, que baje es positivo.
function delta(actual, prev, { bajaEsBuena = false, label = 'mes anterior' } = {}) {
  if (prev == null) return '<div class="kpi-delta neutral">sin comparativo</div>';
  const v = pct(actual - prev, prev);
  const bueno = bajaEsBuena ? v <= 0 : v >= 0;
  const cls = Math.abs(v) < 1 ? 'neutral' : bueno ? 'up' : 'down';
  return `<div class="kpi-delta ${cls}">${v >= 0 ? '+' : ''}${v.toFixed(0)}% vs ${label} (${corto(prev)})</div>`;
}

// ---------- íconos (stroke-only, 24x24) ----------
const ICONOS = {
  resumen: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  evolucion: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  flujo: '<path d="M4 8h15m0 0-4-4m4 4-4 4M20 16H5m0 0 4-4m-4 4 4 4"/>',
  cobranzas: '<path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-1"/><circle cx="16.5" cy="13.5" r="1"/>',
  cxp: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  ventas: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  retiros: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M17 11h6"/>',
  plan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  control: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
};
const icono = k => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[k]}</svg>`;

// ---------- sparkline SVG 80x24 ----------
function sparkline(valores, bajaEsBuena) {
  const pts = valores.map((v, i) => (v == null ? null : [i, v])).filter(Boolean);
  if (pts.length < 2) return '';
  const W = 80, H = 24, pad = 3;
  const min = Math.min(...pts.map(p => p[1])), max = Math.max(...pts.map(p => p[1]));
  const x = i => pad + (i / (valores.length - 1)) * (W - 2 * pad);
  const y = v => (max === min ? H / 2 : H - pad - ((v - min) / (max - min)) * (H - 2 * pad));
  const ultimo = pts[pts.length - 1][1], primero = pts[0][1];
  const bueno = bajaEsBuena ? ultimo <= primero : ultimo >= primero;
  const color = ultimo === primero ? 'var(--text3)' : bueno ? 'var(--green)' : 'var(--red)';
  const d = pts.map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const [lx, ly] = d.split(' ').pop().split(',');
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="2.5" fill="${color}"/></svg>`;
}

// Heat-map: verde (bajo) → rojo (alto), relativo al mayor % del listado
const heat = t => `hsla(${Math.round(140 * (1 - t))},70%,45%,0.22)`;

const CSS = `
:root { --bg:#0d0d0d; --bg2:#1a1a1a; --bg3:#262626; --text:#f5f5f5; --text2:#b3b3b3; --text3:#808080; --accent1:#ff6b9d; --accent2:#00d9ff; --green:#10b981; --red:#ef4444; --yellow:#f59e0b; --purple:#a78bfa; --border:#333; --glass:rgba(255,255,255,0.03); --glass-b:rgba(255,255,255,0.06); }
* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; scroll-padding-top:84px; }
body { font-family:'Inter',sans-serif; background:var(--bg); color:var(--text); line-height:1.6; }
body::before { content:''; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background:radial-gradient(600px 400px at 12% 8%,rgba(255,107,157,0.10),transparent 70%),radial-gradient(700px 500px at 88% 30%,rgba(0,217,255,0.09),transparent 70%),radial-gradient(600px 400px at 30% 95%,rgba(167,139,250,0.07),transparent 70%); }
.container { max-width:1200px; margin:0 auto; padding:0 2rem; }
header { background:rgba(13,13,13,0.8); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid var(--glass-b); position:sticky; top:0; z-index:100; padding:1rem 0; }
header .container { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; }
.logo { display:flex; align-items:center; gap:0.75rem; font-size:1.3rem; font-weight:600; color:var(--text); text-decoration:none; }
nav { display:flex; gap:1.5rem; flex-wrap:wrap; }
nav a { color:var(--text3); text-decoration:none; font-size:0.85rem; transition:color 0.2s; }
nav a:hover { color:var(--accent2); }
.hero { padding:3.5rem 0; border-bottom:1px solid var(--glass-b); text-align:center; }
.hero h1 { font-size:2.5rem; font-weight:600; letter-spacing:-1px; margin-bottom:0.5rem; background:linear-gradient(135deg,var(--text),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.hero .sub { color:var(--text2); font-size:1.1rem; font-weight:300; }
.hero .fecha { color:var(--text3); font-size:0.9rem; margin-top:0.5rem; }
.glass { background:var(--glass); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid var(--glass-b); border-radius:12px; transition:border-color 0.3s, box-shadow 0.3s, transform 0.3s; }
.glass:hover { border-color:rgba(0,217,255,0.28); box-shadow:0 0 28px rgba(0,217,255,0.10); }
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin:2rem 0; }
.kpi { padding:1.5rem; text-align:center; }
.kpi:hover { transform:translateY(-3px); }
.kpi-val { font-size:1.6rem; font-weight:600; background:linear-gradient(135deg,var(--accent1),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-variant-numeric:tabular-nums; }
.kpi-label { color:var(--text3); font-size:0.8rem; margin-top:0.25rem; }
.kpi-delta { font-size:0.75rem; margin-top:0.25rem; }
.kpi-delta.up { color:var(--green); } .kpi-delta.down { color:var(--red); } .kpi-delta.neutral { color:var(--text3); }
.section { padding:3rem 0; border-bottom:1px solid var(--glass-b); }
.section h2 { font-size:1.8rem; font-weight:600; letter-spacing:-0.5px; margin-bottom:2rem; display:flex; align-items:center; gap:0.75rem; }
.section h2 .num { color:var(--accent2); font-size:0.9rem; font-weight:500; background:rgba(0,217,255,0.1); padding:0.25rem 0.75rem; border-radius:4px; }
.ico { width:26px; height:26px; color:var(--accent2); flex:none; }
.table-wrap { overflow-x:auto; margin:1.5rem 0; }
table { width:100%; border-collapse:collapse; font-size:0.9rem; }
th { background:rgba(255,255,255,0.04); color:var(--text2); text-align:left; padding:0.75rem 1rem; font-weight:500; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:0.75rem 1rem; border-bottom:1px solid var(--glass-b); }
tr:hover td { background:rgba(255,255,255,0.02); }
.text-right { text-align:right; }
.mono { font-family:'SF Mono','Fira Code',monospace; font-size:0.85rem; }
.card { padding:1.5rem; }
.card h3 { font-size:1.1rem; font-weight:600; margin-bottom:1rem; }
.cards-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:1.5rem; }
.badge { display:inline-block; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
.badge-green { background:rgba(16,185,129,0.15); color:var(--green); }
.badge-red { background:rgba(239,68,68,0.15); color:var(--red); }
.badge-yellow { background:rgba(245,158,11,0.15); color:var(--yellow); }
.chart-container { position:relative; max-width:350px; margin:1rem auto; }
.chart-wide { position:relative; max-width:760px; margin:2rem auto 0; padding:1.25rem; }
.highlight-box, .warning-box { border-radius:12px; padding:1.5rem; margin:1.5rem 0; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
.highlight-box { background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,217,255,0.08)); border:1px solid rgba(16,185,129,0.3); }
.highlight-box h4 { color:var(--green); font-size:1rem; margin-bottom:0.5rem; }
.warning-box { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.22); }
.warning-box h4 { color:var(--red); font-size:1rem; margin-bottom:0.5rem; }
.highlight-box p, .warning-box p { color:var(--text2); font-size:0.95rem; }
.action { background:var(--glass); border:1px solid var(--glass-b); border-left:3px solid var(--accent2); padding:1rem 1.5rem; margin:1rem 0; border-radius:0 10px 10px 0; }
.action h4 { color:var(--accent2); font-size:0.95rem; margin-bottom:0.25rem; }
.action p { color:var(--text2); font-size:0.9rem; }
.progress-bar { background:rgba(255,255,255,0.06); border-radius:6px; height:8px; overflow:hidden; margin:0.5rem 0; }
.progress-fill { height:100%; width:0; border-radius:6px; transition:width 0.8s cubic-bezier(0.22,1,0.36,1); }
.spark { display:block; margin-left:auto; }
.heat { border-radius:6px; }
.narr { margin:0 0 1.5rem; }
.narr p { color:var(--text2); font-size:0.95rem; margin-bottom:0.6rem; }
.narr p:last-child { margin-bottom:0; }
.narr strong { color:var(--text); font-weight:600; }
.narr .frase { color:var(--text); font-size:1.25rem; font-weight:500; line-height:1.4; margin-bottom:1rem; }
.narr ul { margin:0 0 0 1.25rem; color:var(--text2); font-size:0.95rem; }
.narr li { margin-bottom:0.35rem; }
.narr li.urgente { color:var(--red); }
.action .monto { color:var(--text3); font-size:0.8rem; margin-top:0.35rem; }
.action .monto strong { color:var(--text); }
.note { color:var(--text3); font-size:0.85rem; margin-top:1rem; }
footer { padding:2rem 0; text-align:center; }
footer p { color:var(--text3); font-size:0.8rem; margin-bottom:0.25rem; }
.mini { display:flex; flex-wrap:wrap; justify-content:center; gap:0.5rem 1.5rem; margin-bottom:1rem; padding:0.75rem 1.25rem; border-radius:999px; font-size:0.85rem; color:var(--text2); }
.mini b { color:var(--text); font-weight:600; font-variant-numeric:tabular-nums; }
.mini span.neg b { color:var(--red); }
@media (max-width:768px) { .hero h1{font-size:1.8rem;} .container{padding:0 1rem;} .kpi-grid{grid-template-columns:repeat(2,1fr);} .mini{border-radius:12px;} }
@media (prefers-reduced-motion:reduce) { html{scroll-behavior:auto;} .progress-fill{transition:none;} }
`;

const TRAMO_COLOR = { '0-30': 'var(--yellow)', '31-60': 'var(--yellow)', '61-90': 'var(--red)', '+90': 'var(--red)' };
const TRAMO_BADGE = { '0-30': 'badge-yellow', '31-60': 'badge-yellow', '61-90': 'badge-red', '+90': 'badge-red' };

const topTabla = (filas, total, colTotal, { heatmap = false } = {}) => {
  const maxPct = Math.max(...filas.map(f => pct(f.monto, total)), 0.0001);
  const suma = filas.reduce((a, f) => a + f.monto, 0);
  return `
<div class="table-wrap"><table>
<thead><tr><th>#</th><th>Cliente</th><th class="text-right">${colTotal}</th><th class="text-right">%</th></tr></thead>
<tbody>${filas.map((f, i) => {
    const p = pct(f.monto, total);
    const bg = heatmap ? ` class="text-right mono heat" style="background:${heat(p / maxPct)};"` : ' class="text-right mono"';
    return `<tr><td>${i + 1}</td><td>${esc(f.nombre)}</td><td${bg}>${peso(f.monto)}</td><td class="text-right">${pct1(p)}</td></tr>`;
  }).join('')}</tbody>
<tfoot><tr style="border-top:2px solid var(--border);"><td colspan="2"><strong>Top ${filas.length}</strong></td><td class="text-right mono"><strong>${peso(suma)}</strong></td><td class="text-right"><strong>${pct1(pct(suma, total))}</strong></td></tr></tfoot>
</table></div>`;
};

function generarHtml(d) {
  const { mesNombre, anio, mesIdx, ventas, cobros, cxc, cxp, caja, asiento, ranking, notas, prev, checks, serie } = d;
  const titulo = `${mesNombre} ${anio}`;
  const aging = cxc.tramos;
  const viejo = pct(aging['+90'], cxc.total);
  const egTotal = asiento.totalEgresos;
  const retiros = asiento.egresos.filter(e => /RETIRO|PRESTAMO/i.test(e.nombre));
  const totRetiros = retiros.reduce((a, r) => a + r.monto, 0);
  const top10cxc = cxc.ranking.slice(0, 10).map(c => ({ nombre: c.nombre, monto: c.total }));
  const top10vta = ranking.items.slice(0, 10).map(c => ({ nombre: c.nombre, monto: c.importe }));
  const top10sum = top10vta.reduce((a, f) => a + f.monto, 0);
  const cobrosRatio = ventas.total ? cobros.total / ventas.total : 0;
  const pl = d.prevLabels[0];

  // ---------- narrativa automática (reglas de SKILL.md) ----------
  const varVentas = prev.ventas ? pct(ventas.total - prev.ventas, prev.ventas) : null;
  const topVtaPct = pct(top10vta[0].monto, ventas.total);
  const ingreso = caja.ingreso, saldo = caja.saldo;
  const ariel = cxp.proveedores.find(p => /ARIEL/i.test(p.nombre));
  const sobrante = asiento.sobranteCaja > 0 ? asiento.sobranteCaja : 0;
  const retirosPct = pct(totRetiros, egTotal);
  const cxcSube = prev.cxc == null || cxc.total >= prev.cxc;

  // Proveedores que también nos deben (match exacto de nombre, sin aproximados)
  const deudoresPorNombre = new Map(cxc.ranking.map(c => [normNombre(c.nombre), c]));
  const cruzados = cxp.proveedores.map(p => ({ p, c: deudoresPorNombre.get(normNombre(p.nombre)) })).filter(x => x.c);

  // Resumen: una oración + 3-4 bullets sin números detallados
  const adjVentas = varVentas == null ? 'normal' : varVentas > 20 ? 'muy bueno' : varVentas > 5 ? 'bueno' : varVentas < -20 ? 'flojo' : varVentas < -5 ? 'algo más flojo' : 'parejo';
  const ventasBien = varVentas != null && varVentas > 5, ventasMal = varVentas != null && varVentas < -5;
  const cajaFrase = saldo < 0 ? 'la caja cerró en negativo' : saldo < ingreso * 0.05 ? 'la caja quedó justa' : 'la caja quedó holgada';
  const cajaMal = saldo < ingreso * 0.05;
  const conector = (ventasBien && cajaMal) || (ventasMal && !cajaMal) ? 'pero' : 'y';
  const fraseResumen = `${mesNombre} fue un mes ${adjVentas} en ventas ${conector} ${cajaFrase}.`;

  const bullets = [];
  if (viejo > 40) bullets.push(['urgente', `Lo más urgente: más del 40% de lo que nos deben tiene más de 3 meses. Hay que ordenar la cobranza de esa deuda.`]);
  bullets.push([null, varVentas == null ? 'Ventas del mes sin comparativo contra el mes anterior.'
    : `Ventas ${varVentas >= 0 ? 'arriba' : 'abajo'} respecto de ${pl}${Math.abs(varVentas) > 20 ? ' — un cambio grande, vale entender la causa' : ''}.`]);
  bullets.push([null, cobrosRatio >= 1 ? 'Cobramos más de lo que vendimos: se está recuperando deuda vieja.'
    : cobrosRatio < 0.8 ? 'Cobramos bastante menos de lo que vendimos: estamos financiando a los clientes.'
    : 'Cobramos un poco menos de lo que vendimos: la deuda de clientes crece apenas.']);
  bullets.push([null, saldo < 0 ? 'La caja del mes quedó negativa: salió más plata de la que entró.' : 'La caja del mes cerró con saldo a favor.']);
  if (viejo <= 40) bullets.push([null, 'La deuda vieja de clientes está dentro de lo habitual del rubro.']);
  const resumenHtml = `<div class="card glass narr"><p class="frase">${fraseResumen}</p><ul>${bullets.slice(0, 4).map(([c, t]) => `<li${c ? ` class="${c}"` : ''}>${t}</li>`).join('')}</ul></div>`;

  // Ventas
  const narrVentas = [`Vendimos <strong>${m(ventas.total)}</strong> en ${ventas.facturas} facturas — un ticket promedio de <strong>${m(ventas.ticket)}</strong>.`];
  if (varVentas != null) {
    narrVentas.push(`Contra ${pl} (${m(prev.ventas)}) es ${signo(varVentas)}: ${Math.abs(varVentas) > 20
      ? 'un movimiento atípico, conviene revisar si lo explica un cliente grande o la estacionalidad.' : 'dentro de lo normal.'}`);
  }
  if (topVtaPct > 25) {
    narrVentas.push(`${esc(top10vta[0].nombre)} concentra el ${pct1(topVtaPct)} de las ventas${topVtaPct > 30
      ? ' — riesgo de concentración: dependemos mucho de un solo cliente.' : ' — ojo con la dependencia de este cliente.'}`);
  }

  // Cobros y CxC
  const narrCobros = [`Por cada peso que vendimos, cobramos <strong>$${cobrosRatio.toFixed(2)}</strong>. ${cobrosRatio < 1
    ? (cxcSube ? 'Estamos financiando a los clientes — la deuda crece.' : `Igual, lo que nos deben bajó respecto de ${pl}.`)
    : cobrosRatio > 1 ? 'Cobramos deuda vieja — buena señal.' : ''}${cobrosRatio < 0.8 ? ' Estamos financiando bastante: conviene vigilarlo.' : ''}`];
  narrCobros.push(`De los <strong>${m(cxc.total)}</strong> que nos deben, ${m(aging['+90'])} tienen más de 3 meses (${pct1(viejo)}) — esa es la deuda difícil. ${viejo > 40
    ? 'Pasa el 40%: es lo primero a atacar.' : 'Es una proporción normal para el rubro.'}`);
  const top10cxcSum = top10cxc.reduce((a, c) => a + c.monto, 0);
  narrCobros.push(`Los 10 que más nos deben concentran el ${pct1(pct(top10cxcSum, cxc.total))} de la deuda.`);

  // Flujo de caja
  const topEg = asiento.egresos.slice(0, 3).map(e => `${esc(e.nombre)} (${pct1(pct(e.monto, egTotal))})`).join(', ');
  const narrFlujo = [`Entró <strong>${m(caja.ingreso)}</strong>, salió <strong>${m(caja.egreso)}</strong>, ${saldo < 0 ? 'faltó' : 'quedó'} <strong>${m(Math.abs(saldo))}</strong>.`,
    `Lo que más pesó en los egresos: ${topEg}.`];
  if (saldo < 0) {
    narrFlujo.push(`El faltante se explica sobre todo por ${esc(asiento.egresos[0].nombre)} (${m(asiento.egresos[0].monto)}). No es una emergencia si hay caja acumulada de meses anteriores, pero hay que tenerlo presente.`);
  }

  // Lo que debemos
  const narrCxp = [`Le debemos <strong>${m(cxp.total)}</strong> a ${plural(cxp.proveedores.length, 'proveedor', 'proveedores')}.`];
  if (cxp.proveedores.length) narrCxp.push(`El más grande es ${esc(cxp.proveedores[0].nombre)}: ${m(cxp.proveedores[0].total)} (${pct1(pct(cxp.proveedores[0].total, cxp.total))}).`);
  for (const { p, c } of cruzados) {
    const neto = c.total - p.total;
    narrCxp.push(`${esc(p.nombre)} también figura entre quienes nos deben (${m(c.total)}): en neto ${neto >= 0 ? `nos debe ${m(neto)} a nosotros` : `le debemos ${m(-neto)}`}.`);
  }
  if (!ariel) narrCxp.push('Con Pinturería Ariel estamos al día: no figura deuda con ellos.');
  else narrCxp.push(`Con Pinturería Ariel tenemos un saldo de ${m(ariel.total)} (${pct1(pct(ariel.total, cxp.total))} de lo que debemos).`);

  // Retiros
  const narrRetiros = [`Los retiros y préstamos de socios suman <strong>${m(totRetiros)}</strong> en bruto.`];
  if (sobrante) narrRetiros.push(`Restando el sobrante de caja (${m(sobrante)}), el retiro neto de Adrián es <strong>${m(asiento.retiroAdrian - sobrante)}</strong> (bruto ${m(asiento.retiroAdrian)}).`);
  if (retirosPct > 20) narrRetiros.push(`Representan el ${pct1(retirosPct)} de los egresos del mes.`);

  // Acciones priorizadas por monto en juego (máx. 5)
  const acciones = [];
  const viejos = cxc.ranking.filter(c => c.viejo > 0).sort((a, b) => b.viejo - a.viejo).slice(0, 3);
  if (viejos.length) {
    const lista = viejos.map(c => `${esc(c.nombre)} (${m(c.viejo)}, hace ${plural(meses(c.maxDias), 'mes', 'meses')})`).join(', ');
    acciones.push({ urgente: viejo > 40, titulo: 'Cobrar la deuda vieja más grande', monto: viejos.reduce((a, c) => a + c.viejo, 0),
      texto: `Contactar a ${lista}. Son los que más pesan dentro de los ${m(aging['+90'])} con más de 3 meses${viejo > 40 ? ' (la cartera vieja pasa el 40%)' : ''}. Usar el tablero de cobranzas con WhatsApp.` });
  }
  if (cobrosRatio < 0.8) {
    acciones.push({ titulo: 'Cobrar lo reciente antes de que envejezca', monto: aging['0-30'] + aging['31-60'],
      texto: `Cobramos $${cobrosRatio.toFixed(2)} por cada peso vendido. Hacer seguimiento a lo que tiene hasta 60 días para que no pase a deuda difícil.` });
  }
  if (saldo < 0) {
    acciones.push({ titulo: 'Cubrir el faltante de caja', monto: -saldo,
      texto: `El mes cerró ${m(saldo)}. Revisar cuánta caja acumulada hay y alinear los pagos del mes que viene con lo que efectivamente se cobre.` });
  }
  if (topVtaPct > 25) {
    acciones.push({ titulo: `Cuidar a ${top10vta[0].nombre}`, monto: top10vta[0].monto,
      texto: `Explica el ${pct1(topVtaPct)} de las ventas del mes. Confirmar que sigue comprando y revisar cómo está su cuenta corriente.` });
  }
  for (const { p, c } of cruzados) {
    acciones.push({ titulo: `Compensar con ${p.nombre}`, monto: Math.min(p.total, c.total),
      texto: `Le debemos ${m(p.total)} y nos debe ${m(c.total)}: se puede cruzar y pagar solo la diferencia.` });
  }
  acciones.sort((a, b) => (b.urgente === true) - (a.urgente === true) || b.monto - a.monto); // alerta roja primero
  const topAcciones = acciones.slice(0, 5);

  const notasHtml = notas
    ? `<div class="card glass" style="margin:1.5rem 0;"><h3>Contexto del mes</h3>${notas.split(/\r?\n/).filter(l => l.trim())
      .map(l => `<p style="color:var(--text2);margin-bottom:0.5rem;">${esc(l)}</p>`).join('')}</div>`
    : '';

  // --- KPIs (data-count → countup en el cliente; el texto ya trae el valor final) ---
  const kpi = (val, fmt, label, dlt = '<div class="kpi-delta neutral">&nbsp;</div>') =>
    `<div class="kpi glass"><div class="kpi-val" data-count="${Math.round(val)}" data-fmt="${fmt}">${fmt === 'int' ? val : corto(val)}</div><div class="kpi-label">${label}</div>${dlt}</div>`;
  const kpis = [
    kpi(ventas.total, 'money', 'Ventas Netas', delta(ventas.total, prev.ventas, { label: pl })),
    kpi(ventas.facturas, 'int', 'Facturas Emitidas'),
    kpi(ventas.ticket, 'money', 'Ticket Promedio'),
    kpi(cobros.total, 'money', 'Cobros del Mes', `<div class="kpi-delta neutral">ratio ${cobrosRatio.toFixed(2)}x sobre ventas</div>`),
    kpi(cxc.total, 'money', 'Nos deben (CxC)', delta(cxc.total, prev.cxc, { bajaEsBuena: true, label: pl })),
    kpi(cxp.total, 'money', 'Debemos (CxP)', delta(cxp.total, prev.cxp, { bajaEsBuena: true, label: pl })),
  ].join('');

  const secciones = [];
  const add = (id, nav, icon, titulo, cuerpo) => secciones.push({ id, nav, icon, titulo, cuerpo });

  add('resumen', 'Resumen', 'resumen', 'Resumen del Mes', `<div class="kpi-grid">${kpis}</div>${resumenHtml}${notasHtml}`);

  // --- evolución: tabla con sparklines + gráfico de área ---
  const hayEvolucion = serie.meses.length >= 2 && ['ventas', 'cxc', 'cxp'].some(k => serie[k].filter(v => v != null).length >= 2);
  if (hayEvolucion) {
    const filasEv = [['ventas', 'Ventas netas', false], ['cxc', 'Lo que nos deben (CxC)', true], ['cxp', 'Lo que debemos (CxP)', true]]
      .filter(([k]) => serie[k].filter(v => v != null).length >= 2)
      .map(([k, nombre, baja]) => {
        const v = serie[k], last = v[v.length - 1], pr = v[v.length - 2];
        let badge = '<span class="badge">—</span>';
        if (pr != null && pr !== 0) {
          const p = pct(last - pr, pr), bueno = baja ? p <= 0 : p >= 0;
          badge = `<span class="badge ${bueno ? 'badge-green' : 'badge-red'}">${p >= 0 ? '+' : ''}${p.toFixed(0)}%</span>`;
        }
        return `<tr><td>${nombre}</td>${v.map(x => `<td class="text-right mono">${x == null ? '—' : peso(x)}</td>`).join('')}<td>${sparkline(v, baja)}</td><td class="text-right">${badge}</td></tr>`;
      }).join('');
    add('evolucion', 'Evolución', 'evolucion', `Evolución ${serie.meses.map(cap).join(' → ')}`, `
<div class="table-wrap glass"><table>
<thead><tr><th>Indicador</th>${serie.meses.map(m => `<th class="text-right">${cap(m)}</th>`).join('')}<th class="text-right">Tendencia</th><th class="text-right">Último mes</th></tr></thead>
<tbody>${filasEv}</tbody></table></div>
<div class="chart-wide glass"><canvas id="chartEvolucion"></canvas></div>`);
  }

  // --- ventas vs cobros ---
  const difVC = cobros.total - ventas.total;
  const clsVC = cobrosRatio > 1 ? 'green' : cobrosRatio < 1 ? 'yellow' : 'text2';
  const notaVC = cobrosRatio > 1 ? 'Cobramos deuda vieja'
    : cobrosRatio < 1 ? 'Vendimos más de lo que cobramos — lo que nos deben crece' : 'Cobramos lo mismo que vendimos';
  const vsCobros = `
<div class="card glass" style="margin-bottom:1.5rem;"><h3>Ventas vs Cobros</h3>
<div class="cards-grid" style="align-items:center;">
  <div><table>
    <tr><td>Ventas del mes</td><td class="text-right mono">${peso(ventas.total)}</td></tr>
    <tr><td>Cobros del mes</td><td class="text-right mono">${peso(cobros.total)}</td></tr>
    <tr><td>Diferencia (cobros − ventas)</td><td class="text-right mono" style="color:var(--${difVC >= 0 ? 'green' : 'yellow'});">${peso(difVC)}</td></tr>
    <tr style="border-top:2px solid var(--border);"><td><strong>Ratio cobros/ventas</strong></td><td class="text-right mono" style="color:var(--${clsVC});"><strong>${cobrosRatio.toFixed(2)}x</strong></td></tr>
  </table>
  <p class="note" style="color:var(--${clsVC});">${notaVC}</p></div>
  <div><canvas id="chartVC" height="140"></canvas></div>
</div></div>`;

  add('flujo', 'Flujo', 'flujo', 'Flujo de Caja', `${narr(narrFlujo)}${vsCobros}
<div class="cards-grid">
  <div class="card glass"><h3>Movimiento de Caja</h3><table>
    <tr><td>Ingreso Caja Pesos</td><td class="text-right mono" style="color:var(--green);">${peso(caja.ingreso)}</td></tr>
    <tr><td>Egreso Total</td><td class="text-right mono" style="color:var(--red);">${peso(-caja.egreso)}</td></tr>
    <tr style="border-top:2px solid var(--border);"><td><strong>Saldo en Caja</strong></td><td class="text-right mono" style="color:var(${caja.saldo < 0 ? '--red' : '--green'});"><strong>${peso(caja.saldo)}</strong></td></tr>
  </table></div>
  <div class="card glass"><h3>Distribución de Egresos</h3><div class="chart-container"><canvas id="chartEgresos"></canvas></div></div>
</div>
<div class="table-wrap glass"><table>
<thead><tr><th>Concepto</th><th class="text-right">Monto</th><th class="text-right">% del Egreso</th></tr></thead>
<tbody>${asiento.egresos.map(e => `<tr><td>${esc(e.nombre)}</td><td class="text-right mono">${peso(e.monto)}</td><td class="text-right">${pct1(pct(e.monto, egTotal))}</td></tr>`).join('')}</tbody>
</table></div>`);

  const tramosHtml = Object.entries(aging).map(([t, m]) => `
<tr><td><span class="badge ${TRAMO_BADGE[t]}">${t} días</span></td><td class="text-right mono">${peso(m)}</td><td class="text-right">${pct1(pct(m, cxc.total))}</td>
<td style="min-width:140px;"><div class="progress-bar"><div class="progress-fill" data-w="${Math.max(pct(m, cxc.total), 0.5).toFixed(1)}" style="background:${TRAMO_COLOR[t]};"></div></div></td></tr>`).join('');

  add('cobranzas', 'Nos deben', 'cobranzas', 'Lo que nos deben (CxC) y Cobranzas', `
${narr(narrCobros)}
<div class="cards-grid">
  <div class="card glass"><h3>Lo que nos deben (giro normal)</h3>
    <div style="text-align:center;margin:1rem 0;"><div style="font-size:2rem;font-weight:600;color:var(--accent2);">${peso(cxc.total)}</div>
    <div style="color:var(--text3);">${cxc.deudores} deudores activos</div></div>
    ${cxc.excluidos.length ? `<p class="note">Excluidos del giro normal: ${cxc.excluidos.map(e => esc(e.nombre)).join(', ')} (${peso(cxc.totalExcluido)}).</p>` : ''}
  </div>
  <div class="card glass"><h3>Antigüedad de lo que nos deben</h3><div class="chart-container"><canvas id="chartAging"></canvas></div></div>
</div>
<div class="table-wrap glass"><table>
<thead><tr><th>Tramo</th><th class="text-right">Monto</th><th class="text-right">%</th><th>Barra</th></tr></thead>
<tbody>${tramosHtml}</tbody></table></div>
<h3 style="margin:2rem 0 1rem;">Top 10 Deudores</h3><div class="glass">${topTabla(top10cxc, cxc.total, 'Deuda', { heatmap: true })}</div>`);

  add('cxp', 'Debemos', 'cxp', 'Lo que debemos (CxP)', `
${narr(narrCxp)}
<div class="card glass" style="max-width:600px;"><h3>Lo que debemos (total)</h3>
<div style="text-align:center;margin:1rem 0;"><div style="font-size:2rem;font-weight:600;color:var(--accent1);">${peso(cxp.total)}</div>
<div style="color:var(--text3);">${cxp.proveedores.length} proveedor${cxp.proveedores.length === 1 ? '' : 'es'}</div></div>
<table><thead><tr><th>Proveedor</th><th class="text-right">Deuda</th><th class="text-right">%</th></tr></thead>
<tbody>${cxp.proveedores.map(p => `<tr><td>${esc(p.nombre)}</td><td class="text-right mono">${peso(p.total)}</td><td class="text-right">${pct1(pct(p.total, cxp.total))}</td></tr>`).join('')}</tbody></table></div>`);

  add('ventas', 'Ventas', 'ventas', 'Ventas', `
${narr(narrVentas)}
<div class="cards-grid">
  <div class="card glass"><h3>Top 10 Clientes por Ventas</h3>${topTabla(top10vta, ventas.total, 'Importe')}
    <p class="note">Los top 10 concentran el ${pct1(pct(top10sum, ventas.total))} de las ventas.</p></div>
  <div class="card glass"><h3>Indicadores de Ventas</h3><table>
    <tr><td>Ventas totales</td><td class="text-right mono">${peso(ventas.total)}</td></tr>
    <tr><td>Facturas emitidas</td><td class="text-right mono">${ventas.facturas}</td></tr>
    <tr><td>Ticket promedio</td><td class="text-right mono">${peso(ventas.ticket)}</td></tr>
    <tr><td>Clientes que compraron</td><td class="text-right mono">${ranking.items.length}</td></tr>
    <tr><td>Top 1 concentración</td><td class="text-right mono">${pct1(pct(top10vta[0].monto, ventas.total))}</td></tr>
    <tr><td>Top 10 concentración</td><td class="text-right mono">${pct1(pct(top10sum, ventas.total))}</td></tr>
  </table></div>
</div>`);

  if (retiros.length) {
    // Retiro neto Adrián: solo cuando el asiento trae sobrante de caja
    const sobrante = asiento.sobranteCaja;
    const netoHtml = sobrante > 0 ? `
<div class="card glass" style="max-width:600px;margin-bottom:1.5rem;"><h3>Retiro neto Adrián</h3>
<div style="text-align:center;margin:1rem 0 1.5rem;"><div style="font-size:2rem;font-weight:600;color:var(--accent2);">${peso(asiento.retiroAdrian - sobrante)}</div>
<div style="color:var(--text3);font-size:0.85rem;">retiro neto real</div></div>
<table>
<tr><td>Retiro bruto Adrián</td><td class="text-right mono">${peso(asiento.retiroAdrian)}</td></tr>
<tr><td>Sobrante de caja</td><td class="text-right mono" style="color:var(--green);">-${peso(sobrante)}</td></tr>
<tr style="border-top:2px solid var(--border);"><td><strong>Retiro neto Adrián</strong></td><td class="text-right mono"><strong>${peso(asiento.retiroAdrian - sobrante)}</strong></td></tr>
</table></div>` : '';
    add('retiros', 'Retiros', 'retiros', 'Retiros de Socios y Préstamos', `${narr(narrRetiros)}${netoHtml}
<div class="card glass" style="max-width:600px;"><table>
<thead><tr><th>Concepto</th><th class="text-right">Monto</th><th class="text-right">% Egresos</th></tr></thead>
<tbody>${retiros.map(r => `<tr><td>${esc(r.nombre)}</td><td class="text-right mono">${peso(r.monto)}</td><td class="text-right">${pct1(pct(r.monto, egTotal))}</td></tr>`).join('')}</tbody>
<tfoot><tr style="border-top:2px solid var(--border);"><td><strong>Total</strong></td><td class="text-right mono"><strong>${peso(totRetiros)}</strong></td><td class="text-right"><strong>${pct1(pct(totRetiros, egTotal))}</strong></td></tr></tfoot>
</table></div>`);
  }

  // --- plan de acción: máx. 5 acciones, ordenadas por monto en juego ---
  if (topAcciones.length) {
    add('plan', 'Plan', 'plan', `Alertas y acciones — ${MESES[(mesIdx + 1) % 12]} ${mesIdx === 11 ? anio + 1 : anio}`,
      topAcciones.map((x, i) => `<div class="action"><h4>${i + 1}. ${esc(x.titulo)}</h4><p>${x.texto}</p><p class="monto">En juego: <strong>${m(x.monto)}</strong></p></div>`).join(''));
  }

  add('control', 'Control', 'control', 'Control de Datos', `
<div class="table-wrap glass"><table>
<thead><tr><th>Archivo</th><th class="text-right">Suma calculada</th><th class="text-right">Subtotal del CSV</th><th>Estado</th></tr></thead>
<tbody>${checks.map(c => `<tr><td>${esc(c.label)}</td><td class="text-right mono">${peso(c.calculado)}</td><td class="text-right mono">${peso(c.subtotal)}</td><td><span class="badge ${c.ok ? 'badge-green' : 'badge-red'}">${c.ok ? 'OK' : 'No cierra'}</span></td></tr>`).join('')}</tbody>
</table></div>`);

  const nav = secciones.map(s => `<a href="#${s.id}">${s.nav}</a>`).join('');
  const cuerpo = secciones.map((s, i) =>
    `<section class="section" id="${s.id}"><div class="container"><h2><span class="num">${String(i + 1).padStart(2, '0')}</span>${icono(s.icon)} ${s.titulo}</h2>${s.cuerpo}</div></section>`).join('\n');

  const mini = `<div class="mini glass"><span>Ventas <b>${corto(ventas.total)}</b></span><span>Cobros <b>${corto(cobros.total)}</b></span><span>CxC <b>${corto(cxc.total)}</b></span><span class="${caja.saldo < 0 ? 'neg' : ''}">Caja <b>${corto(caja.saldo)}</b></span></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte ${titulo} — Pinturería Adrián</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>${CSS}</style>
</head>
<body>
<header><div class="container"><a href="../" class="logo">Pinturería Adrián</a><nav>${nav}</nav></div></header>
<section class="hero"><div class="container">
<h1>Reporte Ejecutivo — ${titulo}</h1>
<p class="sub">Análisis financiero, cobranzas y gestión operativa</p>
<p class="fecha">Período: ${d.periodo} • Generado: ${d.generado}</p>
</div></section>
<main>${cuerpo}</main>
<footer><div class="container">${mini}<p><strong>Pinturería Adrián</strong> — Reporte Ejecutivo ${titulo}</p><p>Ramona, Santa Fe — Datos procesados desde Infocor GV6</p></div></footer>
<script>
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Countup de KPIs (requestAnimationFrame, easeOutCubic, 1.5s)
  function fmt(n, t) {
    if (t === 'int') return String(Math.round(n));
    var a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(1) + 'K';
    return s + '$' + Math.round(a);
  }
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var fin = +el.dataset.count, t = el.dataset.fmt;
    if (reduce) return;
    var t0 = null;
    el.textContent = fmt(0, t);
    (function paso(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 1500, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(fin * e, t);
      if (p < 1) requestAnimationFrame(paso); else el.textContent = fmt(fin, t);
    })(performance.now());
  });

  // 6. Barras del aging: se llenan al entrar en viewport
  var barras = document.querySelectorAll('.progress-fill[data-w]');
  function llenar(el) { el.style.width = el.dataset.w + '%'; }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { llenar(e.target.firstElementChild); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    barras.forEach(function (b) { io.observe(b.parentElement); });
  } else barras.forEach(llenar);

  // Gráficos
  if (!window.Chart) return;
  var leg = { position: 'bottom', labels: { color: '#b3b3b3', font: { family: 'Inter', size: 11 }, padding: 12 } };
  function dona(id, labels, data, colors) {
    new Chart(document.getElementById(id), {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderColor: '#14141a', borderWidth: 2 }] },
      options: { responsive: true, cutout: '60%', plugins: { legend: leg, tooltip: { callbacks: { label: function (c) {
        var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
        return c.label + ': $' + (c.raw / 1e6).toFixed(2) + 'M (' + (c.raw / t * 100).toFixed(1) + '%)'; } } } } }
    });
  }
  dona('chartEgresos', ${JSON.stringify(asiento.egresos.map(e => e.nombre))}, ${JSON.stringify(asiento.egresos.map(e => Math.round(e.monto)))},
    ['#00d9ff','#f59e0b','#a78bfa','#ff6b9d','#10b981','#ef4444','#808080','#f97316','#38bdf8','#e879f9']);
  dona('chartAging', ${JSON.stringify(Object.keys(aging).map(t => t + 'd'))}, ${JSON.stringify(Object.values(aging).map(v => Math.round(v)))},
    ['#f59e0b','#f97316','#ef4444','#dc2626']);

  // Ventas vs cobros: barras horizontales
  new Chart(document.getElementById('chartVC'), {
    type: 'bar',
    data: { labels: ['Ventas', 'Cobros'], datasets: [{ data: [${Math.round(ventas.total)}, ${Math.round(cobros.total)}],
      backgroundColor: ['rgba(0,217,255,0.75)', '${cobrosRatio > 1 ? 'rgba(16,185,129,0.75)' : cobrosRatio < 1 ? 'rgba(245,158,11,0.75)' : 'rgba(179,179,179,0.75)'}'], borderRadius: 6 }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false },
      tooltip: { callbacks: { label: function (c) { return '$' + (c.raw / 1e6).toFixed(2) + 'M'; } } } },
      scales: { x: { beginAtZero: true, ticks: { color: '#808080', callback: function (v) { return '$' + (v / 1e6).toFixed(0) + 'M'; } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#b3b3b3' }, grid: { display: false } } } }
  });

  // 3. Evolución: áreas con gradiente transparente bajo la línea
  var ev = document.getElementById('chartEvolucion');
  if (ev) {
    function area(rgb) {
      return function (ctx) {
        var a = ctx.chart.chartArea;
        if (!a) return 'rgba(' + rgb + ',0.15)';
        var g = ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
        g.addColorStop(0, 'rgba(' + rgb + ',0.38)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
        return g;
      };
    }
    function ds(label, data, rgb) {
      return { label: label, data: data, fill: true, tension: 0.4, borderWidth: 2, spanGaps: true,
        borderColor: 'rgb(' + rgb + ')', backgroundColor: area(rgb),
        pointBackgroundColor: 'rgb(' + rgb + ')', pointRadius: 4, pointHoverRadius: 6 };
    }
    var S = ${JSON.stringify({ meses: serie.meses.map(cap), ventas: serie.ventas, cxc: serie.cxc, cxp: serie.cxp })};
    var sets = [];
    if (S.ventas.some(function (v) { return v != null; })) sets.push(ds('Ventas', S.ventas, '0,217,255'));
    if (S.cxc.some(function (v) { return v != null; })) sets.push(ds('CxC', S.cxc, '255,107,157'));
    if (S.cxp.some(function (v) { return v != null; })) sets.push(ds('CxP', S.cxp, '167,139,250'));
    new Chart(ev, {
      type: 'line', data: { labels: S.meses, datasets: sets },
      options: { responsive: true, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#b3b3b3', font: { family: 'Inter' } } },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': $' + (c.raw / 1e6).toFixed(2) + 'M'; } } } },
        scales: { x: { ticks: { color: '#808080' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { beginAtZero: true, ticks: { color: '#808080', callback: function (v) { return '$' + (v / 1e6).toFixed(0) + 'M'; } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  }
})();
</script>
</body>
</html>
`;
}

module.exports = { generarHtml, MESES };
