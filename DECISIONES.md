# Decisiones

Formato: decisión · alternativas descartadas · motivo. Lo que decide el CPO va marcado (CPO).

## 2026-10-23

### Producto (CPO)
- **Proyecto propio de Álvaro**, no de Laguinda.
- **Reuniones presenciales; usa la app solo el organizador**, desde el portátil.
- **El diferencial es el detector de vueltas en directo.** «Dar vueltas» = repetir argumentos ya dichos sin dato nuevo ni decisión durante **1 minuto**. Al detectarlo: preaviso en pantalla, **5 s para cancelar**, y si no se cancela, **alarma audible** para la sala.
- **Emociones: solo el clima de la conversación a partir del texto, sin atribuir emociones a personas y sin analizar el tono de voz.** Descartado: emociones por persona (zona gris) y por tono de voz. Motivo: el art. 5 del Reglamento de IA prohíbe deducir emociones a partir de datos biométricos (la voz lo es) en el trabajo, con excepciones solo médicas o de seguridad. Según las directrices de la Comisión (feb-2025), deducirlas de un texto queda fuera. Jurídico ha dado el visto bueno (según CPO, 23-oct).
- **Consentimiento:** lo recoge el organizador al empezar. **Las conversaciones no se conservan** después del informe.
- **El informe lo comparte el usuario** desde su equipo; la app no envía correos ni guarda direcciones.
- **Métrica de éxito:** las reuniones duran el tiempo marcado (real frente a previsto).
- **Fases:** V1, prueba de concepto del detector → V2, producto mínimo (orden del día, temporizador, captura, informe con IA) → V3 (plantillas, continuidad, fotos desde el móvil, email de seguimiento).

### Técnicas
- **Repositorio GitHub `alvaroconde-sys/asistente-reuniones`** · carpeta local, prototipo en claude.ai · historial y continuidad entre chats (CPO).
- **Prioridad: código mínimo y legible; rendimiento y coste solo donde se mida un problema** (CPO).
- **Web en Chrome + servidor Node local sin dependencias de ejecución, escuchando solo en 127.0.0.1** · app nativa, alojamiento en la nube · para una prueba en un portátil es lo más barato y no expone las claves a la red.
- **Voz a texto: Soniox `stt-rt-v5`, en español.** Descartados: Deepgram y OpenAI en tiempo real. Motivos:
  - Precio en tiempo real: 0,12 $/h (web de Soniox, 23-oct).
  - Admite español y tiene región UE (requiere aprobación).
  - Según su documentación, no guarda el audio de tiempo real ni entrena con los datos.
  - Usa claves temporales: el navegador conecta directo y el servidor no hace de puente de audio.
- **SDK `@soniox/client` 2.4.0 cargado desde jsDelivr** · código propio de captura y WebSocket · nos ahorra la captura del micrófono, la autenticación y la reconexión. Riesgo: depende del CDN.
- **Detector: Claude Haiku 5.5, consulta cada 30 s** con el último minuto frente a todo lo anterior. Precio: 0,10 $ / 0,50 $ por millón de tokens de entrada / salida (documentación de Anthropic, 23-oct). Sin caché de prompt hasta medir el coste real.
- **Datos en la API de Claude:** no hay residencia UE (solo «us» o «global») y por defecto no conserva el contenido (documentación de Anthropic, 23-oct). Retención cero: bajo petición a ventas.
- **Verificación:**
  - Prueba de extremo a extremo con Playwright, simulando Soniox y Claude.
  - 20 casos escritos a mano (`casos.json`) para medir el detector real. Los casos codifican la definición de «vueltas»: los revisa el CPO.

## 2026-10-24

### Producto (CPO)
- **Aviso de cambio de tema.** Salta si durante **1 minuto** se habla de otro punto del orden del día o de algo que no está en él. Usa el mismo aviso que las vueltas: preaviso de 5 s y alarma.
- **«Ir al punto X»** cuando el salto es a otro punto del orden del día: cambia el punto activo sin alarma.
- **El punto activo lo deduce la IA.** Descartado: que lo marque el organizador.
  - Regla de IT para que seguir la conversación no anule el aviso: la IA solo cambia de punto sin avisar si el punto activo quedó **cerrado** (se decidió, se acordó dejarlo para luego o alguien propuso pasar a otro). Si se salta sin cerrarlo, avisa.
  - El organizador puede corregir el punto activo con un clic.
  - Pendiente de validar con la medición.
- **Botón «No ha avisado»** para contar lo que se escapa en reuniones reales.
- **Umbrales para dar la V1 por buena:**
  - En la prueba de casos: al menos 8 de cada 10 detectados en cada tipo de aviso, y como mucho 1 de cada 10 falsas alarmas.
  - En reunión real: como mucho 1 alarma falsa que llegue a sonar por hora.

### Técnicas
- **Una sola consulta cada 30 s** devuelve punto, cerrado, vueltas y tema. Descartado: dos consultas separadas. Motivo: la mitad de llamadas. Si la medición muestra que una detección empeora la otra, se separan.
- **La decisión de qué hacer (avisar, cambiar de punto o nada) vive en `detector.mjs`**, no en la página. Motivo: la página y la medición usan la misma lógica, sin duplicarla.
- **Si la IA responde un punto que no existe, no se hace nada.** Descartado: avisar. Motivo: ante la duda, no molestar.
- **Registro de avisos en pantalla** (hora, tipo, tema y resultado). Sirve para revisar qué avisos eran falsos. No se guarda: desaparece al cerrar la pestaña. La transcripción se sigue borrando al terminar.
- **35 casos de prueba sobre 7 órdenes del día inventados:** 10 de vueltas, 5 de otro punto, 5 fuera del orden del día, 5 cambios legítimos y 10 sin aviso. Los 20 casos anteriores se mantienen, con orden del día y punto activo añadidos.

### Corrección tras la primera medición real (24-oct, 12:01)
- **Resultado** (medición del CPO, 24-oct): vueltas 0/10, otro punto 0/5, fuera 0/5. Tokens de salida: 3418 en 35 consultas.
- **Causa:** Haiku 5.5 piensa por defecto y ese razonamiento cuenta dentro de `max_tokens` (documentación de Claude, 24-oct). Con el límite en 100, la respuesta salía cortada. Además, el código tomaba una respuesta no válida por «nada», así que el fallo pasó por un acierto: los resultados «nada 10/10» y «0 falsas alarmas» de esa medición no valen.
- **Arreglo:**
  - `max_tokens` a 2000. Es un límite, no un gasto.
  - Salida estructurada con esquema JSON (`output_config.format`), que la API garantiza y que admite Haiku 5.5.
  - Una respuesta cortada, rechazada o que no es JSON se cuenta como error, no como «nada».
- **El razonamiento se decide midiendo.** `npm run eval` compara 4 configuraciones y la página usa `POR_DEFECTO` (de momento, Haiku pensando poco) hasta tener datos. Criterio: la más barata y rápida que cumpla los umbrales.

### Segunda medición (24-oct, 12:16; 35 casos)
- **Haiku, en sus 3 configuraciones:** vueltas 10/10, sin aviso 10/10, cambio de punto 5/5, fuera 5/5, **otro punto 3/5**, falsas alarmas 0/15, 0 errores.
  - Fallan distintos casos según la configuración: d01, d02, d03 y d05.
  - Pensar no mejora el acierto. Sin pensar es la más barata: 1462 tokens de salida, frente a 1712 pensando poco y 4999 pensando normal.
- **Sonnet sin pensar:** todo correcto. Tarda 2,4 s de media por consulta, frente a 1,5–1,8 s de Haiku.
- **Coste de la medición completa:** unos 0,11 $. Sale de los tokens medidos por los precios de Anthropic: Haiku 0,10 $ / 0,50 $ y Sonnet 2 $ / 10 $ por millón de tokens de entrada / salida. Por consulta, Sonnet cuesta unas 20 veces lo que Haiku.
- **Patrón del fallo:** el salto de tema se lee como si alguien hubiera propuesto pasar a otro punto, y lo toma por cierre del punto activo. Es un error silencioso: cambia de punto sin avisar.
- **Cambio:** la definición de «cerrado» exige un cierre expreso. Empezar a hablar de otro asunto, aunque enlace con lo anterior, no cierra el punto. Se redacta sin copiar las frases de los casos, para no inflar la medición.
- **Más casos:** 5 nuevos de otro punto y 5 de cambio legítimo, con otras frases, para tener 10 por tipo y vigilar que la regla más estricta no convierta cambios legítimos en avisos falsos. Total: 45.
### Tercera medición y elección de modelo (24-oct, 12:28; 45 casos)
- **Resultados:**

  | Configuración | Vueltas | Otro punto | Fuera | Falsas alarmas | Cambio legítimo |
  |---|---|---|---|---|---|
  | Haiku sin pensar | 10/10 | 9/10 | 5/5 | 0/20 | 5/10 |
  | Haiku pensando poco | 10/10 | 9/10 | 5/5 | 0/20 | 6/10 |
  | Haiku pensando normal | 10/10 | 9/10 | 5/5 | 0/20 | 8/10 |
  | Sonnet sin pensar | 10/10 | 10/10 | 5/5 | 0/20 | 10/10 |

  Errores: 0 en las cuatro.
- **Lectura:**
  - La regla estricta de «cerrado» arregla los saltos a otro punto.
  - En Haiku retrasa el reconocimiento de cambios legítimos: responde «nada» y se queda en el punto anterior, nunca da un aviso.
  - Hipótesis no comprobada: lo corrige en la consulta siguiente. La medición mira cada caso por separado, no en secuencia.
- **Coste por consulta** (tokens medidos × precios de Anthropic): Haiku normal ~0,00016 $; Sonnet ~0,0027 $. Esta medición costó ~0,14 $.
- **Modelo para la prueba real: Sonnet sin pensar** (CPO). Descartado: Haiku pensando normal. Motivo: es la única configuración sin fallos. En el piloto el coste absoluto es pequeño, y así un fallo en la reunión real se podrá atribuir a la idea y no al modelo. Haiku queda como vía para abaratar cuando la idea esté validada.
- **Riesgo abierto:** en los casos, «lo anterior» es corto. En una reunión real crece con cada minuto, y con él el coste de cada consulta. Se mide en la primera reunión real (la página muestra los tokens). Si hace falta, se aplica caché de prompt.

### Prueba en solitario y tiempos (24-oct, 12:47)
- **Dato** (prueba del CPO, 2,7 min): 2 consultas, 2753 tokens de entrada y 79 de salida. Registro: cambio de punto automático a las 12:45 y alarma por asunto fuera del orden del día a las 12:46. Coste: ~0,0063 $, unos 0,0031 $ por consulta (precios de Sonnet).
- **Problema** (CPO): tarda demasiado en avisar. Pide reducir los tiempos al menos a la mitad.
- **Causa:** se sumaban la ventana de 60 s, la consulta cada 30 s, el preaviso de 5 s y el reinicio de la ventana tras cada cambio de punto automático. Peor caso desde que empieza el problema hasta la alarma: 60 + 30 + ~2,5 (respuesta de Sonnet en la medición) + 5 = ~97,5 s. Tras un cambio automático, hasta 60 s más; es lo que pasó en la prueba.
- **Cambios:**
  - **Ventana de 30 s** (CPO, «reducir a la mitad»): «dar vueltas» o «salirse del punto» durante 30 s.
  - **Consulta cada 10 s.** Descartado: cada 15 s, unos 5 s más lento de media.
  - **Sin espera tras un cambio de punto.** Solo se espera una ventana tras un aviso, para no repetir la alarma por lo mismo.
  - Peor caso nuevo: 30 + 10 + ~2,5 + 5 = **~47,5 s**.
  - **Al detector solo llega lo hablado en el punto activo.** El punto empieza al inicio de la ventana en la que se detectó. Las vueltas se miden dentro del punto, y el coste por consulta deja de crecer con toda la reunión: crece con la duración del punto.
  - El texto para el modelo dice «último tramo» en lugar de «último minuto». Se vuelve a medir con `npm run eval -- "sonnet sin pensar"`.
  - Del orden del día se quitan los guiones y la numeración que escriba el usuario.
- **Coste:** hasta 360 consultas por hora. Al coste por consulta de la prueba, ~1,1 $/h; con consulta cada 15 s serían ~0,76 $/h. Pendiente de medir en una reunión real.
- **Validez de los casos con ventana de 30 s:** el último tramo de los casos tiene 38–66 palabras (mediana 53). A 120–150 palabras/min de habla normal (Loperete 1984, citado en *Estudios de Fonética Experimental*, UB) son ~15–33 s. Es decir, los casos ya eran tramos de unos 30 s o menos.
- **Nueva medición con «último tramo»** (CPO, 24-oct, 13:00; Sonnet sin pensar): 45/45 aciertos, 0/20 falsas alarmas y 0 errores. Respuesta media en 2,0 s, así que el peor caso queda en ~47 s. Tokens: 52149 de entrada y 1660 de salida, unos 0,12 $.

### Segunda prueba en solitario (24-oct, 13:04–13:06; 2,5 min)
- **Dato** (CPO): 4 eventos.
  - Cambio de punto automático.
  - Fuera del orden del día: sonó.
  - Otro punto: «Ir al punto».
  - Vueltas: sonó.
  
  Todos son los que el CPO provocó. Las alarmas sonaron unos 30 s después de provocar el problema, según el CPO; el cálculo del peor caso daba ~47 s. 6 consultas: 7225 tokens de entrada y 213 de salida, ~0,017 $ (~0,0028 $ por consulta).
- **Lectura** (hipótesis): avisa antes del peor caso porque basta con que la mayor parte de los últimos 30 s trate del problema.
- **Coste por hora:** con 6 consultas por minuto y el coste por consulta de esta prueba, ~1 $/h si no hay avisos; cada aviso pausa las consultas 30 s. Crece con la duración de cada punto: falta medirlo en una reunión larga.
- **Pendiente para cerrar la V1:**
  - 60 min seguidos sin cortes de transcripción.
  - Coste real por hora.
  - Falsas alarmas que suenan por hora en una reunión real (umbral: ≤1).
  - Lo que se escapa («No ha avisado»).

## 2026-10-25

### Producto (CPO)
- **Configuración de la reunión:** cada punto del orden del día tiene un tipo que fija su tiempo: *Small decisions* 15 min, *Big decisions* 30 min y *Save the world* 60 min.
- **Avisos por tiempo, con voz:**
  - A falta de 5 min: «Quedan 5 minutos para finalizar el tiempo de este punto del orden del día, por favor, vayan sacando conclusiones para cerrarlo».
  - Al acabar: «Se ha acabado el tiempo para este punto, por favor, pasen al siguiente». **Se repite cada 5 min** mientras sigan en el punto.
  - **Sin preaviso**, porque son exactos.
- **Avisos de la IA, con voz tras el preaviso de 5 s:**
  - Divagar: «Se está divagando, por favor, céntrense en el punto del orden del día».
  - Vueltas: «Están dando vueltas, por favor, cambien el enfoque para poder seguir avanzando».
  - Salto a otro punto sin cerrar (propuesta de IT aceptada): «Han cambiado de punto sin cerrar el actual, por favor, ciérrenlo antes de seguir».
  - Se corrige «centrensen» por «céntrense», que es la forma correcta.
- **Traspaso de tiempo:** al cerrar un punto, lo que le sobra pasa al siguiente **y lo que se ha pasado se le resta** (CPO). Motivo: la reunión dura lo previsto, que es la métrica de éxito.

### Técnicas
- **Voz del navegador (`speechSynthesis`, es-ES).** Descartado: un servicio de voz. Motivo: es gratis, no añade dependencias y las frases son fijas. Si la voz de macOS suena mal, se graban las frases una vez. Chrome exige que la página haya recibido un clic antes de hablar (Chrome 71); lo da «Empezar reunión».
- **Mientras habla, la app deja de escuchar** (`pause()`/`resume()` del SDK de Soniox) y no consulta al detector. Motivo: si no, se transcribiría a sí misma, y «pasen al siguiente» cerraría el punto. Se reanuda cuando `speechSynthesis.speaking` pasa a falso, comprobado cada segundo, en lugar de con `onend`, que no siempre se dispara.
- **El traspaso solo ocurre cuando el punto se cierra** (cambio automático con cierre). Con «Ir al punto» o con un clic de corrección, el punto conserva su tiempo por si se vuelve a él.
- **El tiempo de un punto empieza al inicio de la ventana en la que se detectó**, igual que lo que se manda al detector.
- **Si un punto empieza con 5 min o menos,** no se dice «quedan 5 minutos». Si empieza con el tiempo agotado, se dice «se ha acabado el tiempo» al momento.
- **Al terminar se muestra el tiempo previsto (suma de los tipos) frente al real.**
- **Se quita el pitido** (`AudioContext`); la pantalla roja se mantiene.
- **Verificación:** prueba de extremo a extremo con voz simulada y una segunda reunión con reloj simulado. Comprueba:
  - el aviso de 5 min;
  - el de fin de tiempo y su repetición;
  - que se resta el exceso al cerrar;
  - que no hay traspaso con «Ir al punto»;
  - la pausa de la escucha mientras habla;
  - el tiempo previsto frente al real.
  
  Ha pasado 3 de 3 veces. No comprobado: la voz real en macOS.

## 2026-10-26

### Prueba en solitario con voz (CPO, 10:57; 2,0 min)
- **Dato:** la voz «ha ido perfectamente» (CPO). Eventos: cambio de punto automático y «fuera del orden del día» (charla informal) con voz. 7 consultas: 7525 tokens de entrada y 227 de salida, ~0,017 $ (~0,0025 $ por consulta). Previsto 15 min, real 2,0 min.
- **Pendiente para cerrar la V1:**
  - Reunión real de ~60 min: estabilidad, coste por hora, falsas alarmas que suenan por hora y lo que se escapa.
  - Ver en vivo los avisos de tiempo (5 minutos y fin).
- **La voz no aparece en la transcripción** (CPO, 26-oct): la pausa de la escucha mientras habla funciona.
- **Sin margen al inicio** (CPO). Descartado: no avisar de divagar en los primeros minutos. Motivo: el organizador pulsa «Empezar reunión» cuando ya ha terminado la charla informal.

### Primera reunión real (CPO, 26-oct, 12:45–13:09; 24,4 min)
- **Dato:**
  - Eventos: 2 cambios de punto automáticos, 1 aviso de «quedan 5 minutos», 6 de vueltas, 1 de fuera del orden del día y 3 pulsaciones de «No ha avisado».
  - 123 consultas sin errores: 381.769 tokens de entrada y 3.841 de salida.
  - Previsto 30 min, real 24,4 min.
- **El CPO informa** de avisos de divagar y de vueltas que no correspondían. Como mínimo hay 2 falsos en 24,4 min, unos 4,9 por hora: **no cumple el umbral** de 1 alarma falsa que suene por hora. Falta saber cuáles de los 7 eran falsos.
- **Coste real:** ~0,80 $, es decir, ~1,97 $/h y ~0,0065 $ por consulta, con 3.104 tokens de entrada de media por consulta. Es el doble de la estimación de ~1 $/h, que salía de pruebas de 2 min y se dio como suelo: lo que se manda como «lo anterior» crece mientras dura el punto.
- **Lectura** (hipótesis):
  - Los casos de prueba (45/45) no representan una reunión real. Son textos limpios escritos por IT, ya señalado como riesgo el 24-oct. En una conversación real se vuelve sobre lo dicho para matizarlo, y eso se lee como vueltas.
  - La ventana de 30 s lo agrava: en 30 s de habla es normal repetir lo que se acaba de decir.
  - Divagar se juzga contra el texto literal del punto, y no contra el propósito de la reunión.
- **Corrección** (CPO, 26-oct): las 3 pulsaciones de «No ha avisado» de las 13:04 eran para marcar como erróneo el aviso que acababa de saltar, no avisos que faltaron. El texto no dejó de aparecer en ningún momento: transcripción estable durante los 24,4 min.

### Cambios tras la primera reunión real (26-oct)
- **Botón «Este aviso es erróneo»** (CPO). Marca el último aviso de la IA; si sigue en preaviso, además lo cancela. En el registro sale «· erróneo».
- **Vueltas con confirmación** (CPO, opción A). Solo se avisa si la detectan dos consultas cuyas ventanas no se solapan, con la segunda entre 30 y 50 s después de la primera. Hacen falta unos 60 s de vueltas, así que el aviso llega unos 30 s más tarde. Descartado: endurecer solo la definición. Se aplica solo a vueltas; si divagar sigue dando falsos, se le puede aplicar lo mismo.
- **Modo prueba** (CPO, opción B):
  - Es una casilla en la configuración, desmarcada por defecto, para usar solo con el consentimiento de los asistentes.
  - Al terminar, descarga en el portátil un JSON con lo que vio la IA en cada aviso (orden del día, punto activo, lo anterior, último tramo y respuesta) y con la ventana de cada «No ha avisado».
  - Tras descargarlo, esos textos se borran de la página.
  - Excepción consciente a «no se conservan las conversaciones», para obtener casos de prueba reales.
- **Definiciones del detector** (IT; hipótesis, se valida con el modo prueba):
  - Divagar: 0 solo si el asunto es ajeno a la reunión (personal, de otro proyecto o sin relación con el orden del día). Una tangente relacionada con el punto activo o con el tema de la reunión cuenta como el punto activo.
  - Vueltas: matizar, precisar, dar una cifra, un ejemplo, una condición, una objeción o una consecuencia es avanzar.
- **Uso en reuniones de Laguinda:** jurídico lo ha autorizado (CPO, 26-oct).
- **La caché de prompt se aplaza** hasta que la detección cumpla los umbrales. Motivo: no añadir complejidad para abaratar algo que aún no funciona. Coste actual: ~2 $/h.
- **Medición tras los cambios** (CPO, 26-oct, 19:30; Sonnet sin pensar): 45/45 aciertos, 0/20 falsas alarmas y 0 errores. Tokens: 58.044 de entrada y 1.635 de salida (~0,13 $).
- **Criterio de divagar** (CPO): los casos f02 (tarjeta regalo de la competencia) y f05 (factura mal hecha de la agencia) **son divagar**. Divagar se permite, pero con un límite de tiempo.
- **Corrección:** se deshace la definición de divagar de esta tarde, la que hacía que las tangentes relacionadas contaran como parte del punto. Era una hipótesis de IT y el criterio del CPO la contradice. Vuelve la definición anterior: asunto que no está en el orden del día.
- **Margen para divagar: 1 minuto seguido** (CPO). Descartados: 2 y 3 minutos.
  - Se cuenta desde la mitad de la primera ventana en la que se detecta y se reinicia en cuanto vuelven al orden del día.
  - Avisa más o menos entre 65 y 85 s después de empezar a divagar, contando la detección, la consulta cada 10 s y el preaviso de 5 s. Es una estimación sobre los parámetros, no medida.
  - Vueltas sigue con su confirmación a los 30 s. El salto a otro punto avisa sin margen.

### Revisión de código externa (otro agente, 26-oct, sobre 58ab6ec)
14 hallazgos. IT los ha comprobado uno a uno en el código antes de decidir. Las líneas que el informe cita en `eval.mjs` y `detector.mjs` no corresponden con los ficheros (eval.mjs tiene 36 líneas y cita la 140), pero el código al que se refiere existe.

**Aceptados y arreglados.** Cada uno tiene una prueba en `test/e2e.mjs`. Las de 1, 2, 3, 4 y 7 se han visto fallar con el código anterior.
1. **Respuesta caducada tras un clic de corrección:** avisaba de «punto 2 sin cerrar el punto 2». Si el punto activo cambió mientras se esperaba la respuesta, ahora se descarta.
2. **Respuesta en vuelo al pulsar «Terminar»:** se aplicaba a la reunión siguiente. Ahora se descarta si la grabación ya no es la misma.
3. **Los contadores no se reiniciaban entre reuniones.** Ahora empiezan de cero en cada una. Efecto acotado en la reunión del 26-oct: la única prueba previa de ese día fue la de las 10:57, con 7 consultas y 7.525 tokens (~2 % de los 381.769). Si fue en la misma pestaña, las cifras de la reunión los incluyen.
4. **Un clic en el punto ya activo recortaba «lo anterior» a 30 s.** Ahora no hace nada.
6. **El SDK se rendía tras 3 reintentos, unos 7 s** (comprobado en su código: líneas 2102 y 2413-2431). Ahora hace 6 reintentos (63 s) y, si se rinde, se ve en grande «Se ha perdido la transcripción: pulsa Terminar». «Terminar» completa el borrado aunque `stop()` falle. Sin prueba de reconexión.
7. **El blob del modo prueba se quedaba en memoria.** Se libera 1 s después de iniciar la descarga.
8. **Otra web abierta en el navegador podía hacer POST al servidor local.** Ahora se rechaza todo POST que no lleve `Sec-Fetch-Site: same-origin`, con un 403.
9. **Un error de JavaScript en la página no hacía fallar `npm test`.** Ahora sí.
10. **La medición no comprobaba a qué punto se cambiaba.** Los 20 casos de cambio y salto llevan ahora el punto esperado, y se compara. Pendiente de medir con el detector real.
13. **Mantenimiento:** una configuración desconocida en `eval` dice cuáles existen. Se quita una envoltura sobrante en `e2e`.

**No aceptados o aplazados:**
- **5. Si la voz habla mientras el SDK reconecta, la pausa no actúa.** Leído en el SDK, no reproducido. El arreglo propuesto, descartar el texto mientras habla la voz, también borraría las últimas palabras antes de cada aviso, porque `pause()` pide al servidor cerrar lo pendiente y esas palabras llegan con la voz ya hablando. Queda como riesgo conocido, poco probable.
- **11. Consultas con el mismo texto que la anterior.** Sin medir con qué frecuencia pasan, y la regla es optimizar solo donde se mida un problema. Aplazado.
- **12. Caché de prompt.** Sigue aplazada (CPO). El revisor estima un ahorro del 75-80 %, sin medir; los campos de caché de `usage` habría que sumarlos al panel cuando se active.
- **14. JSON mal formado en el registro del servidor.** La página nunca lo envía. Sin cambio.

**Riesgos de producto que señala el revisor** (decide el CPO):
- Un «cerrado» mal detectado regala el sobrante al siguiente punto y no se puede deshacer.
- Restar el exceso puede hacer que un punto empiece agotado y suene «fin de tiempo» nada más entrar.
- Las vueltas se miden contra todo el punto: cuanto más largo el punto, más coste.
- Al volver a un punto, el detector no recuerda lo que se dijo antes en él.

### Riesgos de producto: decisiones (CPO, 26-oct, 21:07)
- **Botón «Deshacer el cambio a «X»»** tras cada cambio de punto automático.
  - Lo deja todo como si el cambio no hubiera ocurrido: el punto activo, el tiempo de cada punto, el sobrante traspasado y lo que se manda al detector.
  - El tiempo pasado desde el cambio cuenta para el punto en el que realmente se seguía.
  - Tras deshacer, se espera una ventana (30 s) antes de volver a consultar.
  - El botón desaparece con cualquier otro cambio de punto.
  - En modo prueba, los cambios automáticos guardan también lo que vio la IA, para revisar los cierres erróneos.
- **El exceso ya no se resta: solo se suma el sobrante.** Revierte la decisión del 25-oct. Consecuencia: la reunión puede durar más de lo previsto; lo mostrará «Previsto / Real».
- **Las vueltas se miden contra todo el punto:** se mantiene y se confirma el miércoles.
- **Al volver a un punto, el detector recuerda lo que se dijo en él.** Cada punto guarda sus tramos de tiempo, y «lo anterior» incluye todas sus visitas, sin lo de otros puntos. Coste: más texto por consulta al volver a un punto largo.
- **Medición con punto esperado** (CPO, 26-oct, 21:21; Sonnet sin pensar): 44/45.
  - Vueltas 10/10, sin aviso 10/10, cambio de punto 10/10 (con el punto correcto), fuera 5/5, otro punto 9/10. Falsas alarmas 0/20, 0 errores. Tokens: 54.714 de entrada y 1.634 de salida (~0,13 $).
  - Único fallo: d09 («¿qué entregáis exactamente y en cuánto tiempo?», con el punto activo «Calendario de entrevistas»). Se esperaba el punto 3, «Próximos pasos», y detectó el 1, «Alcance del proyecto». Detecta bien el salto, pero «Ir al punto» señalaría el punto 1.
  - Lectura de IT: el caso es ambiguo, porque los entregables también son alcance. Etiqueta pendiente del criterio del CPO.
- **Criterio del CPO sobre d09:** preguntar qué se entrega y en cuánto tiempo es «Alcance del proyecto». La etiqueta pasa a punto 1 y el caso se renombra a `d09-otro-punto-entregables`. Con ella, las respuestas de la medición de las 21:21 darían 45/45; no se ha repetido.

### Segunda revisión externa (otro agente, 26-oct, sobre el diff 58ab6ec..c0b2205)
9 hallazgos. IT los ha comprobado en el código y, los del SDK, en su código fuente.

**Arreglados.** Las pruebas de 1, 4 y 8 se han visto fallar sin el arreglo.
1. **Deshacer con un preaviso abierto:** la voz avisaba de un salto ya deshecho. Ahora, deshacer o cualquier cambio de punto cancelan el preaviso abierto. `activar()` ignora el punto que ya está activo, también desde «Ir al punto».
2. **«Terminar» durante una reconexión esperaba el retardo del reintento, hasta 32 s.** Confirmado en el SDK: `stop()` sin sesión espera, mientras que `cancel()` cierra al momento (líneas 2192-2214). Ahora se usa `cancel()`. Sin prueba de reconexión.
4. **El primer punto empieza al pulsar «Empezar reunión»** (CPO). Antes, lo dicho antes de que la IA lo detectara no pertenecía a ningún punto. Efecto: ese rato cuenta en el tiempo del punto 1.
5. **«Quedan 5 minutos» no volvía a avisar si el punto ganaba sobrante después de haber avisado.** Ahora se rearma al activar el punto. Sin prueba.
7. **Un error de red de una consulta en vuelo tras «Terminar» sumaba errores en la reunión siguiente.** Ahora no.
8. **Dos clics durante una consulta en vuelo** (a otro punto y de vuelta) dejaban pasar la respuesta caducada. Ahora el descarte usa un contador de cambios de punto (`version`), no el número de punto.
9. **El estado «grave» seguía visible tras «Terminar».** Se limpia.

**No cambiados:**
- **3. Clic erróneo corregido en menos de 30 s:** hasta 30 s de texto quedan atribuidos al punto equivocado. El CPO decide dejarlo así: caso raro y efecto pequeño. Se revisa si aparece en una reunión.
- **6. El aviso de transcripción perdida cubre la caída de red, no la red intermitente.** El SDK pone el contador de reintentos a cero en cada reconexión que se abre (líneas 2503 y 2523), así que con una conexión que abre y se cae puede reintentar sin fin sin mostrar el aviso. Riesgo conocido.
- **Servidor:** Chrome solo envía `Sec-Fetch-Site` a orígenes fiables. La app debe abrirse en 127.0.0.1 o localhost; desde otra IP, todos los POST darían 403. Anotado en `server.js`.

**Riesgos de producto que señala:**
- Deshacer no caduca: un cambio se puede deshacer 20 minutos después y reasigna ese tiempo y ese texto.
- Deshacer está junto a otros botones y no pide confirmación.
- Tras deshacer, el punto real puede oír «quedan 5 minutos» con menos de 5, o «fin de tiempo» al momento.

### «Deshacer»: decisiones del CPO sobre los riesgos de la segunda revisión (26-oct)
- **Confirmación** (opción C): «Deshacer» pide un segundo clic en 5 s; pasado ese plazo, vuelve a pedirlo. No se usa la ventana de confirmación del navegador (`confirm()`), porque deja la página parada mientras está abierta. Descartada la caducidad a los 2 minutos (era la recomendación de IT).
- **«Ir al punto» deshace** el cambio automático cuando propone volver al punto que estaba activo antes de ese cambio: devuelve el tiempo y el sobrante. Riesgo que encontró IT leyendo el código: antes, ese botón movía de punto sin devolver el sobrante y hacía desaparecer «Deshacer». Basta un clic, porque el preaviso ya da el contexto.
- **Avisos de tiempo tras deshacer:** se quedan como están. El punto recupera su estado de avisos, así que puede sonar «quedan 5 minutos» con menos de 5 o «fin de tiempo» al momento. Ese mensaje empuja a cerrar, que es la métrica.
- Pruebas: las tres nuevas (clic suelto, caducidad de la confirmación, «Ir al punto») fallan si se quita su arreglo.
