const fs = require("fs");
const path = require("path");

function pm(s) {
  if (!s) return 0;
  return parseFloat(s.replace(".", "").replace(",", "."));
}

function inyectarDeudoresEnTablero() {
  // Leer CSV de deudores
  const csvPath = "deudores_telefonos_final.csv";
  if (!fs.existsSync(csvPath)) {
    console.error("❌ No se encontró: " + csvPath);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf-8");
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  const clientes = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length >= 3) {
      const nombre = cols[0].trim();
      const telefono = cols[1].trim();
      const monto = pm(cols[2]);
      
      clientes.push({
        id: i,
        nombre: nombre,
        antiguedad: "2026",
        telefono: telefono,
        monto: monto,
        estado: "Sin Activar",
        notas: "",
        diasAtraso: 0,
        deudas: [{ vencimiento: "31/7/2026", monto: monto, detalle: "Deuda julio" }]
      });
    }
  }

  console.log("✅ Deudores cargados: " + clientes.length);

  // Inyectar en tablero
  const tableroPath = path.join("reportes", "tablero-cobranzas.html");
  let html = fs.readFileSync(tableroPath, "utf-8");

  const jsonStr = JSON.stringify(clientes, null, 2);
  const regex = /const\s+CLIENTES_INICIALES\s*=\s*\[[\s\S]*?\];/;

  if (html.match(regex)) {
    html = html.replace(regex, "const CLIENTES_INICIALES = " + jsonStr + ";");
    fs.writeFileSync(tableroPath, html, "utf-8");
    console.log("✅ Tablero actualizado con " + clientes.length + " deudores");
  } else {
    console.error("❌ No se encontró array CLIENTES_INICIALES en tablero");
  }
}

inyectarDeudoresEnTablero();
