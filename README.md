# Asistente de reuniones

Asistente para guiar reuniones presenciales. Fase actual: **V1, prueba de concepto del detector**. El organizador escribe el orden del día y la app escucha la reunión desde el portátil. La IA deduce de qué punto se está hablando y avisa si, durante un minuto:
- se dan vueltas: se repite lo ya dicho sin dato nuevo ni decisión;
- se salta a otro punto sin cerrar el actual (ofrece «Ir al punto X»);
- se habla de algo que no está en el orden del día.

Si el organizador no cancela el aviso en 5 s, suena una alarma. Al terminar, la transcripción se borra; en pantalla queda el registro de avisos para revisar cuáles eran falsos.

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

`npm run eval` pasa por el detector real los 35 casos de `casos.json`:
- 10 de vueltas;
- 5 de salto a otro punto;
- 5 de asuntos fuera del orden del día;
- 5 de cambios de punto legítimos;
- 10 en los que no debe pasar nada.

Muestra los aciertos por tipo y las falsas alarmas (avisos en casos donde no tocaba avisar). Cada caso indica su orden del día (de los 7 inventados al principio del fichero), el punto activo, lo dicho antes, el último minuto y la acción esperada.

## Pruebas (desarrollo)

`npm install && npm test`: prueba de extremo a extremo en Chromium con micrófono falso, con Soniox y Claude simulados. No usa claves ni consume saldo.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `index.html` | Página: orden del día, captura, consultas cada 30 s, avisos, alarma, registro y borrado al terminar |
| `server.js` | Servidor local (solo 127.0.0.1): claves temporales de Soniox y consultas al detector |
| `detector.mjs` | Pregunta a Claude de qué punto se habla y si hay vueltas, y decide la acción |
| `casos.json`, `eval.mjs` | Casos de prueba del detector y su medición |
| `test/e2e.mjs` | Prueba de extremo a extremo con APIs simuladas |
