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
