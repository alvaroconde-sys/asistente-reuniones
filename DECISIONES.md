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

### Pendiente
- Umbrales para dar la V1 por buena: aciertos mínimos y falsas alarmas máximas (CPO).
