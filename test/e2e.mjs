// Prueba de extremo a extremo sin claves: simula Soniox y Claude y comprueba
// preaviso, cancelación, alarma, enfriamiento y borrado al terminar. Uso: npm test
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

Object.assign(process.env, { SONIOX_API_KEY: 'prueba', ANTHROPIC_API_KEY: 'prueba', PORT: '3999' });
const peticionesClaude = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, opciones) => {
  if (String(url).startsWith('https://api.soniox.com/')) return Response.json({ api_key: 'temp:prueba' });
  if (String(url).startsWith('https://api.anthropic.com/')) {
    peticionesClaude.push(JSON.parse(opciones.body));
    return Response.json({ content: [{ type: 'text', text: '{"vueltas": true, "tema": "el presupuesto"}' }], usage: { input_tokens: 10, output_tokens: 5 } });
  }
  return fetchReal(url, opciones);
};
await import('../server.js');

const navegador = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const pagina = await navegador.newPage();
pagina.on('pageerror', (e) => console.error('Error en la página:', e.message));
const sdk = await readFile(new URL('../node_modules/@soniox/client/dist/index.mjs', import.meta.url), 'utf8');
await pagina.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ contentType: 'text/javascript', body: sdk }));

let soniox, configSoniox;
await pagina.routeWebSocket(/soniox\.com/, (ws) => {
  soniox = ws;
  ws.onMessage((m) => {
    if (typeof m === 'string' && m.startsWith('{')) configSoniox ??= JSON.parse(m);
    if (m === '') ws.send(JSON.stringify({ tokens: [], final_audio_proc_ms: 0, total_audio_proc_ms: 0, finished: true }));
  });
});
const decir = (texto) => soniox.send(JSON.stringify({ tokens: [{ text: texto, is_final: true, start_ms: 0, end_ms: 0, confidence: 1 }], final_audio_proc_ms: 0, total_audio_proc_ms: 0 }));
const aviso = () => pagina.locator('#aviso').isVisible();

// Avanza el reloj de 30 en 30 s, hablando antes de cada salto, hasta que aparezca el preaviso.
async function hablarHastaAviso() {
  for (let i = 0; i < 8 && !(await aviso()); i++) {
    decir(`Meta convierte mejor, Google es demanda real (${i}). `);
    await pagina.clock.runFor(30_000);
    await pagina.waitForTimeout(500);
  }
  assert.ok(await aviso(), 'debería aparecer el preaviso');
}

await pagina.clock.install();
await pagina.goto('http://127.0.0.1:3999');
await pagina.click('#empezar');
for (let i = 0; !soniox && i < 50; i++) await pagina.waitForTimeout(100);
assert.ok(soniox, 'debería conectarse a Soniox');
for (let i = 0; !configSoniox && i < 50; i++) await pagina.waitForTimeout(100);
assert.equal(configSoniox?.model, 'stt-rt-v5');
assert.deepEqual(configSoniox.language_hints, ['es']);

// 1. Antes de un minuto no se consulta al detector.
decir('Bueno, el siguiente punto es el presupuesto. ');
await pagina.clock.runFor(31_000);
await pagina.waitForTimeout(500);
assert.equal(peticionesClaude.length, 0, 'no debe consultar antes de un minuto');

// 2. Preaviso y cancelación: no suena la alarma.
await hablarHastaAviso();
assert.equal(await pagina.textContent('#tema'), 'el presupuesto');
await pagina.click('#cancelar');
assert.equal(await aviso(), false);
assert.match(await pagina.textContent('#contadores'), /cancelados: 1 · alarmas: 0/);

// 3. Nuevo preaviso sin cancelar: a los 5 s suena la alarma.
await hablarHastaAviso();
await pagina.clock.runFor(5_000);
assert.equal(await aviso(), false);
assert.match(await pagina.getAttribute('body', 'class'), /alarma/);
assert.match(await pagina.textContent('#contadores'), /preavisos: 2 · cancelados: 1 · alarmas: 1/);

// 4. La petición al detector lleva el modelo, las instrucciones y lo dicho.
const ultima = peticionesClaude.at(-1);
assert.equal(ultima.model, 'claude-haiku-5-5');
assert.match(ultima.system, /vueltas/);
assert.match(ultima.messages[0].content, /ANTERIOR:\n.*presupuesto[\s\S]*ÚLTIMO MINUTO:\n.*Meta convierte mejor/);

// 5. Al terminar no queda transcripción en pantalla ni en el almacenamiento del navegador.
await pagina.click('#terminar');
await pagina.waitForSelector('#empezar:not([hidden])');
assert.equal(await pagina.textContent('#texto'), '');
assert.match(await pagina.textContent('#resumen'), /Transcripción borrada/);
const almacenado = await pagina.evaluate(async () => localStorage.length + sessionStorage.length + (await indexedDB.databases()).length);
assert.equal(almacenado, 0);

console.log(`Prueba superada: ${peticionesClaude.length} consultas al detector, 2 preavisos, 1 cancelado, 1 alarma, transcripción borrada.`);
await navegador.close();
process.exit(0);
