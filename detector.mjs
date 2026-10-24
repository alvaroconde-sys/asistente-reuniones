// Detector: pregunta a Claude de qué punto del orden del día se habla en el último minuto
// y si se está dando vueltas, y decide qué tiene que hacer la página.
const MODELO = 'claude-haiku-5-5';

const INSTRUCCIONES = `Eres el detector de una reunión presencial en español.
Recibes el ORDEN DEL DÍA numerado, el PUNTO ACTIVO, la transcripción ANTERIOR y el ÚLTIMO MINUTO. Devuelve:
- "punto": número del punto del orden del día del que trata la mayor parte del último minuto, o 0 si trata de un asunto que no está en el orden del día. Una mención breve o una frase suelta sobre otro asunto no cuenta.
- "cerrado": true si, antes de pasar a ese punto, el punto activo quedó cerrado: se tomó una decisión, se acordó dejarlo para más tarde o alguien propuso pasar a otro punto. false en otro caso.
- "vueltas": true si en el último minuto se repiten argumentos, propuestas o preguntas que ya aparecen antes (o dentro del propio minuto) sin aportar ningún dato nuevo, sin avanzar hacia una decisión y sin tomarla. No son vueltas: la presentación inicial de un tema, un dato nuevo, una pregunta nueva, una opción nueva ni un resumen que acaba en una decisión o en un reparto de tareas. Ante la duda, false.
- "tema": si "punto" es 0, el asunto ajeno al orden del día; si hay vueltas, lo que se repite; 8 palabras como máximo, o vacío.
Analiza solo el contenido; no juzgues a las personas ni sus emociones.
Responde únicamente con JSON: {"punto": número, "cerrado": true o false, "vueltas": true o false, "tema": "texto"}`;

export async function analizar({ orden, activo, antes, ultimo }) {
  const contenido = [
    `ORDEN DEL DÍA:\n${orden.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
    `PUNTO ACTIVO: ${activo || 'ninguno todavía'}`,
    `ANTERIOR:\n${antes || '(nada)'}`,
    `ÚLTIMO MINUTO:\n${ultimo}`,
  ].join('\n\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODELO, max_tokens: 100, system: INSTRUCCIONES, messages: [{ role: 'user', content: contenido }] }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const datos = await res.json();
  const r = JSON.parse(datos.content.map((b) => b.text ?? '').join('').match(/\{[\s\S]*\}/)?.[0] ?? '{}');

  // Un punto inexistente es una respuesta inválida: ante la duda, no se molesta a nadie.
  const valido = Number.isInteger(r.punto) && r.punto >= 0 && r.punto <= orden.length;
  const accion =
    !valido ? 'nada'
    : r.punto === 0 ? 'fuera del orden del día'
    : r.punto !== activo ? (r.cerrado === true || !activo ? 'cambio de punto' : 'otro punto')
    : r.vueltas === true ? 'vueltas'
    : 'nada';
  const tema = accion === 'cambio de punto' || accion === 'otro punto' ? orden[r.punto - 1] : String(r.tema ?? '');
  return { accion, punto: valido ? r.punto : activo, tema, uso: datos.usage };
}
