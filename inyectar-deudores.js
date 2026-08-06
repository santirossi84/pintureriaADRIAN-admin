const fs = require("fs");
const path = require("path");

function pm(s) {
  if (!s) return 0;
  return parseFloat(s.replace(".", "").replace(",", "."));
}

function inyectarDeudoresEnTablero() {
  const csvPath = "deudores_telefonos_final.csv";
  if (!fs.existsSync(csvPath)) {
    console.error("No se encontr: " + csvPath);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf-8");
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  const clientes = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length >= 3) {
      clientes.push({
        id: i,
        nombre: cols[0].trim(),
        nroCliente: "",
        antiguedad: "2026",
        telefono: cols[1].trim(),
        monto: pm(cols[2]),
        estado: "sin-activar",
        notas: ""
      });
    }
  }

  console.log("Deudores cargados: " + clientes.length);

  // Inyectar en tablero
  const tableroPath = path.join("reportes", "tablero-cobranzas.html");
  let html = fs.readFileSync(tableroPath, "utf-8");

  const jsonStr = JSON.stringify(clientes, null, 2);
  const inyeccion = "const DEUDORES_INICIALES = " + jsonStr + ";\nlet clientes = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || DEUDORES_INICIALES || [];";
  
  const regex = /let clientes = JSON\.parse\(localStorage\.getItem\(STORAGE_KEY\) \|\| 'null'\) \|\| \[\];/;

  if (html.match(regex)) {
    html = html.replace(regex, inyeccion);
    fs.writeFileSync(tableroPath, html, "utf-8");
    console.log("Tablero actualizado.");
  } else {
    console.error("No se encontr la lnea de clientes");
  }
}

inyectarDeudoresEnTablero();
