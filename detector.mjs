// Detector: pregunta a Claude de qué punto del orden del día se habla en el último tramo
// y si se está dando vueltas, y decide qué tiene que hacer la página.

// Configuraciones que compara `npm run eval`; la página usa POR_DEFECTO (DECISIONES.md).
export const CONFIGS = {
  'haiku sin pensar': { model: 'claude-haiku-5-5', thinking: { type: 'disabled' } },
  'haiku pensando poco': { model: 'claude-haiku-5-5', output_config: { effort: 'low' } },
  'haiku pensando normal': { model: 'claude-haiku-5-5' },
  'sonnet sin pensar': { model: 'claude-sonnet-5-5', thinking: { type: 'between_tools' }, output_config: { effort: 'low' } },
};
export const POR_DEFECTO = 'sonnet sin pensar';

const INSTRUCCIONES = `Eres el detector de una reunión presencial en español.
Recibes el ORDEN DEL DÍA numerado, el PUNTO ACTIVO, la transcripción ANTERIOR y el ÚLTIMO TRAMO. Devuelve:
- "punto": número del punto del orden del día del que trata la mayor parte del último tramo, o 0 si trata de un asunto que no está en el orden del día. Una mención breve o una frase suelta sobre otro asunto no cuenta.
- "cerrado": true solo si el punto activo terminó de forma expresa antes de pasar a otro: se tomó una decisión sobre él, se acordó dejarlo para más tarde, o alguien dijo que se daba por cerrado o que se pasaba al siguiente punto. Si simplemente se empieza a hablar de otro asunto, aunque se enlace con lo que se estaba diciendo, el punto activo no está cerrado: false.
- "vueltas": true si en el último tramo se repiten argumentos, propuestas o preguntas que ya aparecen antes (o dentro del propio tramo) sin aportar ningún dato nuevo, sin avanzar hacia una decisión y sin tomarla. No son vueltas: la presentación inicial de un tema, un dato nuevo, una pregunta nueva, una opción nueva ni un resumen que acaba en una decisión o en un reparto de tareas. Matizar, precisar, dar una cifra, un ejemplo, una condición, una objeción o una consecuencia es avanzar, aunque se hable de lo mismo. Ante la duda, false.
- "tema": si "punto" es 0, el asunto ajeno al orden del día; si hay vueltas, lo que se repite; 8 palabras como máximo, o vacío.
Analiza solo el contenido; no juzgues a las personas ni sus emociones.`;

// Salida estructurada: la API garantiza un JSON con este esquema.
const FORMATO = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: { punto: { type: 'integer' }, cerrado: { type: 'boolean' }, vueltas: { type: 'boolean' }, tema: { type: 'string' } },
    required: ['punto', 'cerrado', 'vueltas', 'tema'],
    additionalProperties: false,
  },
};

export async function analizar({ orden, activo, antes, ultimo }, config = POR_DEFECTO) {
  const { output_config, ...modelo } = CONFIGS[config];
  const contenido = [
    `ORDEN DEL DÍA:\n${orden.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
    `PUNTO ACTIVO: ${activo || 'ninguno todavía'}`,
    `ANTERIOR:\n${antes || '(nada)'}`,
    `ÚLTIMO TRAMO:\n${ultimo}`,
  ].join('\n\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ...modelo,
      max_tokens: 2000, // el razonamiento cuenta dentro de este límite: tiene que caber con la respuesta
      output_config: { ...output_config, format: FORMATO },
      system: INSTRUCCIONES,
      messages: [{ role: 'user', content: contenido }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const datos = await res.json();
  // Una respuesta cortada o rechazada es un error, no un «no pasa nada».
  if (['max_tokens', 'refusal'].includes(datos.stop_reason)) throw new Error(`Respuesta incompleta: ${datos.stop_reason}`);
  const r = JSON.parse(datos.content.find((b) => b.type === 'text').text);

  const valido = Number.isInteger(r.punto) && r.punto >= 0 && r.punto <= orden.length;
  const accion =
    !valido ? 'nada'
    : r.punto === 0 ? 'fuera del orden del día'
    : r.punto !== activo ? (r.cerrado || !activo ? 'cambio de punto' : 'otro punto')
    : r.vueltas ? 'vueltas'
    : 'nada';
  const tema = accion === 'cambio de punto' || accion === 'otro punto' ? orden[r.punto - 1] : r.tema;
  return { accion, punto: valido ? r.punto : activo, tema, uso: datos.usage };
}
