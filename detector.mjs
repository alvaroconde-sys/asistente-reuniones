// Detector de vueltas: pregunta a Claude si el último minuto solo repite lo ya dicho.
const MODELO = 'claude-haiku-5-5';

const INSTRUCCIONES = `Eres el detector de vueltas de una reunión presencial en español.
Recibes la transcripción ANTERIOR y el ÚLTIMO MINUTO.
Hay vueltas solo si en el último minuto se repiten argumentos, propuestas o preguntas que ya aparecen antes (o dentro del propio minuto) sin aportar ningún dato nuevo, sin avanzar hacia una decisión y sin tomarla.
No son vueltas: la presentación inicial de un tema, un dato nuevo, una pregunta nueva, una opción nueva, un cambio de tema, ni un resumen que acaba en una decisión o en un reparto de tareas.
Ante la duda, no hay vueltas.
Analiza solo el contenido; no juzgues a las personas ni sus emociones.
Responde únicamente con JSON: {"vueltas": true o false, "tema": "tema repetido en 8 palabras como máximo, o vacío"}`;

export async function detectarVueltas(antes, ultimo) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 100,
      system: INSTRUCCIONES,
      messages: [{ role: 'user', content: `ANTERIOR:\n${antes || '(nada)'}\n\nÚLTIMO MINUTO:\n${ultimo}` }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const datos = await res.json();
  const texto = datos.content.map((b) => b.text ?? '').join('');
  const json = JSON.parse(texto.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
  return { vueltas: json.vueltas === true, tema: String(json.tema ?? ''), uso: datos.usage };
}
