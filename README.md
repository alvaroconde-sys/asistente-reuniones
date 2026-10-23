# Asistente de reuniones

Asistente para guiar reuniones presenciales. Fase actual: **V1, prueba de concepto del detector de vueltas**. Escucha la reunión desde el portátil y, si durante un minuto se repite lo ya dicho sin dato nuevo ni decisión, avisa al organizador. Si no lo cancela en 5 s, suena una alarma.

Decisiones y motivos: [DECISIONES.md](DECISIONES.md).

## Arrancar en el portátil

1. Instala Node.js 22 o posterior (nodejs.org).
2. Descarga este repositorio (`git clone` o «Download ZIP» en GitHub).
3. En la carpeta del proyecto, crea un fichero `.env` con tus claves (nunca se sube a GitHub):
   ```
   SONIOX_API_KEY=tu_clave_de_soniox
   ANTHROPIC_API_KEY=tu_clave_de_claude
   # SONIOX_REGION=eu    ← quita la almohadilla cuando Soniox apruebe la región UE
   ```
4. En un terminal, dentro de la carpeta: `npm start`.
5. Abre `http://127.0.0.1:3000` en Chrome y permite el micrófono.

No hace falta `npm install` para usarlo: la página carga el SDK de Soniox desde jsDelivr.

## Medir el detector

`npm run eval` pasa los 20 casos de `casos.json` (10 con vueltas y 10 sin vueltas) por el detector real y muestra los aciertos y las falsas alarmas.

## Pruebas (desarrollo)

`npm install && npm test`: prueba de extremo a extremo en Chromium con micrófono falso, con Soniox y Claude simulados. No usa claves ni consume saldo.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `index.html` | Página: captura, consultas cada 30 s, preaviso, alarma, borrado al terminar |
| `server.js` | Servidor local (solo 127.0.0.1): claves temporales de Soniox y consultas al detector |
| `detector.mjs` | Pregunta a Claude si el último minuto son vueltas |
| `casos.json`, `eval.mjs` | Casos de prueba del detector y su medición |
| `test/e2e.mjs` | Prueba de extremo a extremo con APIs simuladas |
