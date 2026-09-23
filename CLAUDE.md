# Pinturería Adrián — administración

Sitio de administración de Pinturería Adrián (Ramona, Santa Fe).
Producción: https://pintureria-adrian-admin-np9p.vercel.app. Se publica con cada git push a main.

## Qué hay
- Reportes ejecutivos mensuales.
- reportes/arqueo-caja.html: reemplaza la planilla de arqueos. Datos en localStorage "arqueos_pintureria_v2", backup JSON y export CSV. Es fundamental conservar el saldo sistema de cada arqueo anterior.
- tablero-cobranzas.html: mensaje unificado de cobranza por WhatsApp, importación y exportación CSV, filtro por antigüedad.
- Matcher de contactos para asociar deudores con teléfonos.
- Agente Luis: pedidos de FAI a Luis de Pinturería Ariel (OCR a WhatsApp).

## Infocor GV6
- Unos 2.350 artículos. Base MySQL en la nube.
- CSV exportados: delimitador punto y coma, codificación latin-1, coma decimal. Excluir siempre la fila final de subtotal (si no, duplica los totales).
- Las importaciones matchean solo por Línea/Rubro/Artículo, sin coincidencias aproximadas.
- Los precios se importan en Mercado 1, no en Mercado 0.
- Si el código de barras viene vacío, poner 0 en la columna G o falla la importación.
- Proveedor principal: Pinturería Ariel (línea 148). Pendiente: limpieza de Vulcano (línea 500).

## Estilo visual
Oscuro y sutil: fondo #06070a con campo de estrellas, acento rojo #e11d2e, títulos en Chakra Petch. Sin logos, personajes ni nombres de sagas.

## Forma de trabajo
- Windows y PowerShell. Las carpetas de usuario están en F:\Users\Usuario, no en C:.
- Hablar en español rioplatense, informal.
- Los análisis financieros nuevos van en USD.
- Nunca escribir directo en la base de Infocor. Preparar archivos de importación para que los revise Santi.
- Probar antes de proponer el push y pedir confirmación antes de cualquier git push.