// Prueba de extremo a extremo sin claves: simula Soniox y Claude y comprueba el orden del día,
// el cambio de punto automático, los tres avisos (cancelar, ir al punto, alarma), la corrección
// manual, «No ha avisado» y el borrado al terminar. Uso: npm test
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

Object.assign(process.env, { SONIOX_API_KEY: 'prueba', ANTHROPIC_API_KEY: 'prueba', PORT: '3999' });
const peticionesClaude = [];
const respuestas = []; // lo que «contesta» Claude en cada consulta
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, opciones) => {
  if (String(url).startsWith('https://api.soniox.com/')) return Response.json({ api_key: 'temp:prueba' });
  if (String(url).startsWith('https://api.anthropic.com/')) {
    peticionesClaude.push(JSON.parse(opciones.body));
    return Response.json({ content: [{ type: 'text', text: JSON.stringify(respuestas.shift()) }], usage: { input_tokens: 10, output_tokens: 5 } });
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
const visible = (id) => pagina.locator(`#${id}`).isVisible();
const activo = () => pagina.textContent('#puntos li.activo');
const eventos = async () => (await pagina.locator('#eventos li').allTextContents()).map((e) => e.replace(/^\S+ · /, ''));

// Habla y avanza el reloj de 30 en 30 s hasta que la página consulta al detector, que contesta `respuesta`.
async function consultar(respuesta) {
  respuestas.push(respuesta);
  const n = peticionesClaude.length;
  for (let i = 0; i < 8 && peticionesClaude.length === n; i++) {
    decir(`Seguimos hablando (${i}). `);
    await pagina.clock.runFor(30_000);
    await pagina.waitForTimeout(500);
  }
  assert.equal(peticionesClaude.length, n + 1, 'debería consultar al detector');
}

await pagina.clock.install();
await pagina.goto('http://127.0.0.1:3999');

// 1. Sin orden del día no empieza; las líneas vacías no cuentan como punto.
await pagina.click('#empezar');
assert.equal(await pagina.textContent('#estado'), 'Escribe el orden del día');
await pagina.fill('#orden', 'Presupuesto\nCalendario\n\nResponsables');
await pagina.click('#empezar');
for (let i = 0; !configSoniox && i < 50; i++) await pagina.waitForTimeout(100);
assert.equal(configSoniox?.model, 'stt-rt-v5');
assert.deepEqual(configSoniox.language_hints, ['es']);
assert.deepEqual(await pagina.locator('#puntos li').allTextContents(), ['Presupuesto', 'Calendario', 'Responsables']);

// 2. Antes de un minuto no se consulta.
decir('Buenos días, empezamos. ');
await pagina.clock.runFor(31_000);
await pagina.waitForTimeout(500);
assert.equal(peticionesClaude.length, 0, 'no debe consultar antes de un minuto');

// 3. Primer punto detectado: se activa solo, sin aviso.
await consultar({ punto: 1, cerrado: false, vueltas: false, tema: '' });
assert.equal(await activo(), 'Presupuesto');
assert.equal(await visible('aviso'), false);

// 4. Vueltas: preaviso sin «Ir al punto»; cancelar evita la alarma.
await consultar({ punto: 1, cerrado: false, vueltas: true, tema: 'el reparto' });
assert.equal(await pagina.textContent('#mensaje'), 'Estáis dando vueltas a el reparto');
assert.equal(await visible('irPunto'), false);
await pagina.click('#cancelar');
assert.equal(await visible('aviso'), false);

// 5. Salto a otro punto sin cerrar: «Ir al punto 2» lo activa sin alarma.
await consultar({ punto: 2, cerrado: false, vueltas: false, tema: '' });
assert.equal(await pagina.textContent('#mensaje'), 'Os habéis ido al punto 2 (Calendario) sin cerrar el punto 1');
await pagina.click('#irPunto');
assert.equal(await activo(), 'Calendario');

// 6. Fuera del orden del día: si nadie cancela, a los 5 s suena la alarma.
await consultar({ punto: 0, cerrado: false, vueltas: false, tema: 'la cena de Navidad' });
assert.equal(await pagina.textContent('#mensaje'), 'Os habéis salido del orden del día: la cena de Navidad');
await pagina.clock.runFor(5_000);
assert.equal(await visible('aviso'), false);
assert.match(await pagina.getAttribute('body', 'class'), /alarma/);

// 7. Punto cerrado: cambio automático. Una respuesta inválida (punto inexistente) no hace nada.
await consultar({ punto: 3, cerrado: true, vueltas: false, tema: '' });
assert.equal(await activo(), 'Responsables');
await consultar({ punto: 9 });
assert.equal(await visible('aviso'), false);
assert.equal(await activo(), 'Responsables');

// 8. La petición lleva el modelo, el orden del día, el punto activo, lo anterior y el último minuto.
const ultima = peticionesClaude.at(-1);
assert.equal(ultima.model, 'claude-haiku-5-5');
assert.match(ultima.messages[0].content, /^ORDEN DEL DÍA:\n1\. Presupuesto\n2\. Calendario\n3\. Responsables\n\nPUNTO ACTIVO: 3\n\nANTERIOR:\nBuenos días[\s\S]*\n\nÚLTIMO MINUTO:\nSeguimos hablando/);

// 9. Corrección manual del punto activo y «No ha avisado».
await pagina.click('#puntos li >> nth=0');
assert.equal(await activo(), 'Presupuesto');
await pagina.click('#noAviso');
assert.deepEqual(await eventos(), [
  'cambio de punto: Presupuesto → automático',
  'vueltas: el reparto → cancelado',
  'otro punto: Calendario → ir al punto',
  'fuera del orden del día: la cena de Navidad → sonó',
  'cambio de punto: Responsables → automático',
  'no ha avisado',
]);

// 10. Al terminar se borra la transcripción y no queda nada guardado; el registro de avisos sigue en pantalla.
await pagina.click('#terminar');
await pagina.waitForSelector('#empezar:not([hidden])');
assert.equal(await pagina.textContent('#texto'), '');
assert.match(await pagina.textContent('#resumen'), /Transcripción borrada/);
const almacenado = await pagina.evaluate(async () => localStorage.length + sessionStorage.length + (await indexedDB.databases()).length);
assert.equal(almacenado, 0);
assert.equal((await eventos()).length, 6);

console.log(`Prueba superada: ${peticionesClaude.length} consultas al detector; orden del día, cambio automático, 3 avisos, corrección manual y borrado comprobados.`);
await navegador.close();
process.exit(0);
