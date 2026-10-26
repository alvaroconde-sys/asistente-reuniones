# Asistente de reuniones

Asistente para guiar reuniones presenciales. Fase actual: **V1, prueba de concepto del detector**. El organizador configura la reunión: escribe los puntos del orden del día y asigna a cada uno un tipo, que fija su tiempo (Small decisions, 15 min; Big decisions, 30 min; Save the world, 60 min). La app escucha la reunión desde el portátil y avisa por voz cuando quedan 5 minutos de un punto y cuando se acaba su tiempo. Al cerrar un punto, el tiempo que le sobra (o el que se pasó) se suma (o se resta) al siguiente. La IA deduce de qué punto se está hablando y avisa si, durante 30 segundos:
- se dan vueltas: se repite lo ya dicho sin dato nuevo ni decisión;
- se salta a otro punto sin cerrar el actual (ofrece «Ir al punto X»);
- se habla de algo que no está en el orden del día.

Los avisos de la IA tienen un preaviso de 5 s en pantalla para cancelarlos; si nadie cancela, habla la voz. El de vueltas necesita confirmarse en dos consultas separadas 30 s. Mientras habla, la app deja de escuchar. Durante la reunión, «Este aviso es erróneo» marca el último aviso de la IA y «No ha avisado» apunta lo que se escapó. Con el **modo prueba** marcado (solo con el consentimiento de los asistentes), al terminar se descarga en el portátil un JSON con lo que vio la IA en cada aviso, para convertirlo en casos de prueba. Al terminar, la transcripción se borra; en pantalla queda el registro de avisos para revisar cuáles eran falsos.

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

`npm run eval` pasa por el detector real los 45 casos de `casos.json`:
- 10 de vueltas;
- 10 de salto a otro punto;
- 5 de asuntos fuera del orden del día;
- 10 de cambios de punto legítimos;
- 10 en los que no debe pasar nada.

Lo hace en las 4 configuraciones de `detector.mjs` (Haiku sin pensar, Haiku pensando poco, Haiku pensando normal y Sonnet sin pensar). De cada una muestra:
- los casos que falla;
- los aciertos por tipo;
- las falsas alarmas (avisos en casos donde no tocaba avisar);
- los errores (respuestas cortadas o no válidas);
- los tokens y el tiempo medio por consulta.

Cada caso indica su orden del día (de los 7 inventados al principio del fichero), el punto activo, lo dicho antes, el último tramo y la acción esperada. Para medir una sola configuración: `npm run eval -- "sonnet sin pensar"`.

## Pruebas (desarrollo)

`npm install && npm test`: prueba de extremo a extremo en Chromium con micrófono falso, con Soniox y Claude simulados. No usa claves ni consume saldo.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `index.html` | Página: configuración, captura, tiempos por punto, consultas cada 10 s, avisos con voz, registro y borrado al terminar |
| `server.js` | Servidor local (solo 127.0.0.1): claves temporales de Soniox y consultas al detector |
| `detector.mjs` | Pregunta a Claude de qué punto se habla y si hay vueltas, y decide la acción |
| `casos.json`, `eval.mjs` | Casos de prueba del detector y su medición |
| `test/e2e.mjs` | Prueba de extremo a extremo con APIs simuladas |
