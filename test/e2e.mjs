// Prueba de extremo a extremo sin claves: simula Soniox, Claude y la voz del navegador.
// Reunión A: configuración, avisos de la IA, voz con la escucha en pausa, corrección manual y borrado.
// Reunión B: tiempos por punto (5 minutos, fin de tiempo y su repetición, traspaso al cerrar). Uso: npm test
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

Object.assign(process.env, { SONIOX_API_KEY: 'prueba', ANTHROPIC_API_KEY: 'prueba', PORT: '3999' });
const peticionesClaude = [];
const respuestas = []; // lo que «contesta» Claude; sin respuesta preparada, sigue en el punto activo sin aviso
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, opciones) => {
  if (String(url).startsWith('https://api.soniox.com/')) return Response.json({ api_key: 'temp:prueba' });
  if (String(url).startsWith('https://api.anthropic.com/')) {
    const cuerpo = JSON.parse(opciones.body);
    peticionesClaude.push(cuerpo);
    const activo = Number(cuerpo.messages[0].content.match(/PUNTO ACTIVO: (\d+)/)?.[1] ?? 0);
    const r = respuestas.shift() ?? { punto: activo, cerrado: false, vueltas: false, tema: '' };
    return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(r) }], usage: { input_tokens: 10, output_tokens: 5 } });
  }
  return fetchReal(url, opciones);
};
await import('../server.js');
const { FRASES } = { FRASES: {
  fuera: 'Se está divagando, por favor, céntrense en el punto del orden del día',
  cinco: 'Quedan 5 minutos para finalizar el tiempo de este punto del orden del día, por favor, vayan sacando conclusiones para cerrarlo',
  fin: 'Se ha acabado el tiempo para este punto, por favor, pasen al siguiente',
} };

const navegador = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const pagina = await navegador.newPage();
pagina.on('pageerror', (e) => console.error('Error en la página:', e.message));
const sdk = await readFile(new URL('../node_modules/@soniox/client/dist/index.mjs', import.meta.url), 'utf8');
await pagina.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ contentType: 'text/javascript', body: sdk }));
// Voz simulada: apunta lo que se dice y «habla» durante 2 s.
await pagina.addInitScript(() => {
  window.dicho = [];
  let hasta = 0;
  speechSynthesis.speak = (u) => { window.dicho.push(u.text); hasta = Date.now() + 2000; };
  Object.defineProperty(speechSynthesis, 'speaking', { get: () => Date.now() < hasta });
});

let soniox, configSoniox;
await pagina.routeWebSocket(/soniox\.com/, (ws) => {
  soniox = ws;
  ws.onMessage((m) => {
    if (typeof m === 'string' && m.startsWith('{"model"')) configSoniox ??= JSON.parse(m);
    if (m === '') ws.send(JSON.stringify({ tokens: [], final_audio_proc_ms: 0, total_audio_proc_ms: 0, finished: true }));
  });
});
const decir = (texto) => soniox.send(JSON.stringify({ tokens: [{ text: texto, is_final: true, start_ms: 0, end_ms: 0, confidence: 1 }], final_audio_proc_ms: 0, total_audio_proc_ms: 0 }));
const visible = (id) => pagina.locator(`#${id}`).isVisible();
const puntos = () => pagina.locator('#puntos li').allTextContents();
const activo = async () => (await pagina.textContent('#puntos li.activo')).split(' · ')[0];
const eventos = async () => (await pagina.locator('#eventos li').allTextContents()).map((e) => e.replace(/^\S+ · /, ''));
const dicho = () => pagina.evaluate(() => window.dicho);
const avanzar = async (ms) => { await pagina.clock.runFor(ms); await pagina.waitForTimeout(300); };

// Habla (una frase cada 10 s) y avanza el reloj de segundo en segundo hasta que la página consulta al
// detector, que contesta `respuesta`. Devuelve en qué tramo de 10 s llegó la consulta.
async function consultar(respuesta) {
  respuestas.push(respuesta);
  const n = peticionesClaude.length;
  let s = 0;
  while (peticionesClaude.length === n && s < 120) {
    if (s % 10 === 0) decir(`Seguimos hablando (${s / 10}). `);
    await pagina.clock.runFor(1000);
    await pagina.waitForTimeout(30);
    s++;
  }
  await pagina.waitForTimeout(300); // deja llegar la respuesta del detector
  assert.equal(peticionesClaude.length, n + 1, 'debería consultar al detector');
  return Math.ceil(s / 10);
}

async function configurar(filas) {
  while ((await pagina.locator('.fila').count()) < filas.length) await pagina.click('#anadir');
  for (const [i, [nombre, tipo]] of filas.entries()) {
    await pagina.locator('.fila').nth(i).locator('input').fill(nombre);
    await pagina.locator('.fila').nth(i).locator('select').selectOption(tipo);
  }
}

async function empezar() {
  configSoniox = undefined;
  await pagina.click('#empezar');
  for (let i = 0; !configSoniox && i < 50; i++) await pagina.waitForTimeout(100);
  assert.equal(configSoniox?.model, 'stt-rt-v5');
  assert.deepEqual(configSoniox.language_hints, ['es']);
}

await pagina.clock.install();
await pagina.goto('http://127.0.0.1:3999');

// ===== Reunión A =====

// 1. Configuración: sin puntos no empieza; se pueden añadir y quitar filas.
assert.equal(await pagina.locator('.fila').count(), 3);
await pagina.click('#empezar');
assert.equal(await pagina.textContent('#estado'), 'Escribe el orden del día');
await pagina.click('#anadir');
assert.equal(await pagina.locator('.fila').count(), 4);
await pagina.locator('.fila').nth(3).locator('button').click();
assert.equal(await pagina.locator('.fila').count(), 3);
await configurar([['Presupuesto', 'Small decisions'], ['Calendario', 'Big decisions'], ['Responsables', 'Save the world']]);
await empezar();
assert.deepEqual(await puntos(), [
  'Presupuesto · Small decisions · quedan 15:00',
  'Calendario · Big decisions · quedan 30:00',
  'Responsables · Save the world · quedan 60:00',
]);

// 2. Antes de una ventana completa (30 s) no se consulta.
decir('Buenos días, empezamos. ');
await avanzar(21_000);
assert.equal(peticionesClaude.length, 0, 'no debe consultar antes de 30 s');

// 3. Primer punto detectado: se activa solo, sin aviso, y empieza su cuenta atrás.
await consultar({ punto: 1, cerrado: false, vueltas: false, tema: '' });
assert.equal(await activo(), 'Presupuesto');
assert.equal(await visible('aviso'), false);
assert.match((await puntos())[0], /quedan 14:/);

// 4. Tras un cambio automático se consulta en el siguiente salto. Vueltas: preaviso sin «Ir al punto»;
// cancelar evita la voz.
assert.equal(await consultar({ punto: 1, cerrado: false, vueltas: true, tema: 'el reparto' }), 1);
assert.match(peticionesClaude.at(-1).messages[0].content, /ANTERIOR:\nBuenos días/, 'lo anterior del mismo punto sí se manda');
assert.equal(await pagina.textContent('#mensaje'), 'Estáis dando vueltas a el reparto');
assert.equal(await visible('irPunto'), false);
await pagina.click('#cancelar');
assert.equal(await visible('aviso'), false);
assert.deepEqual(await dicho(), []);

// 5. Tras un aviso se espera al menos una ventana. Salto a otro punto sin cerrar: «Ir al punto 2» sin voz.
assert.ok(await consultar({ punto: 2, cerrado: false, vueltas: false, tema: '' }) >= 3, 'tras un aviso debe esperar 30 s');
assert.equal(await pagina.textContent('#mensaje'), 'Os habéis ido al punto 2 (Calendario) sin cerrar el punto 1');
await pagina.click('#irPunto');
assert.equal(await activo(), 'Calendario');
assert.deepEqual(await dicho(), []);

// 6. Fuera del orden del día: si nadie cancela, a los 5 s habla la voz y la escucha se pausa mientras habla.
await consultar({ punto: 0, cerrado: false, vueltas: false, tema: 'la cena de Navidad' });
assert.equal(await pagina.textContent('#mensaje'), 'Os habéis salido del orden del día: la cena de Navidad');
await avanzar(5_000);
assert.equal(await visible('aviso'), false);
assert.match(await pagina.getAttribute('body', 'class'), /alarma/);
assert.deepEqual(await dicho(), [FRASES.fuera]);
assert.equal(await pagina.textContent('#estado'), 'paused', 'mientras habla no escucha');
await avanzar(3_000);
assert.equal(await pagina.textContent('#estado'), 'recording', 'al terminar de hablar vuelve a escuchar');

// 7. Punto cerrado: cambio automático. Una respuesta inválida (punto inexistente) no hace nada.
await consultar({ punto: 3, cerrado: true, vueltas: false, tema: '' });
assert.equal(await activo(), 'Responsables');
assert.equal(await consultar({ punto: 9 }), 1);
assert.equal(await visible('aviso'), false);
assert.equal(await activo(), 'Responsables');

// 8. La petición lleva el modelo, el orden del día, el punto activo y solo lo hablado en ese punto.
const ultima = peticionesClaude.at(-1);
assert.equal(ultima.model, 'claude-sonnet-5-5');
assert.equal(ultima.thinking.type, 'between_tools');
assert.equal(ultima.output_config.effort, 'low');
assert.equal(ultima.output_config.format.type, 'json_schema');
assert.match(ultima.messages[0].content, /^ORDEN DEL DÍA:\n1\. Presupuesto\n2\. Calendario\n3\. Responsables\n\nPUNTO ACTIVO: 3\n\nANTERIOR:\n[\s\S]*\n\nÚLTIMO TRAMO:\nSeguimos hablando/);
assert.doesNotMatch(ultima.messages[0].content, /Buenos días/, 'lo hablado en puntos anteriores no se manda');

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

// 10. Al terminar: previsto frente a real, transcripción borrada, nada guardado; el registro sigue en pantalla.
await pagina.click('#terminar');
await pagina.waitForSelector('#empezar:not([hidden])');
assert.equal(await pagina.textContent('#texto'), '');
assert.match(await pagina.textContent('#resumen'), /^Reunión terminada\. Previsto: 105 min · Real: \d+\.\d min\. Transcripción borrada\.$/);
const almacenado = await pagina.evaluate(async () => localStorage.length + sessionStorage.length + (await indexedDB.databases()).length);
assert.equal(almacenado, 0);
assert.equal((await eventos()).length, 6);

// ===== Reunión B: tiempos =====
await configurar([['Uno', 'Small decisions'], ['Dos', 'Small decisions'], ['Tres', 'Small decisions']]);
await empezar();
await pagina.evaluate(() => (window.dicho = []));
await consultar({ punto: 1, cerrado: false, vueltas: false, tema: '' });
assert.equal(await activo(), 'Uno');

// 11. A los 10 minutos del punto (quedan 5) avisa una vez; a los 15, fin de tiempo; a los 20, lo repite.
await avanzar(10 * 60_000);
assert.deepEqual(await dicho(), [FRASES.cinco]);
await avanzar(5 * 60_000);
assert.deepEqual(await dicho(), [FRASES.cinco, FRASES.fin]);
assert.match((await puntos())[0], /^Uno · Small decisions · 0:\d\d de más$/);
await avanzar(5 * 60_000);
assert.deepEqual(await dicho(), [FRASES.cinco, FRASES.fin, FRASES.fin]);

// 12. Al cerrar el punto, su exceso (~5 min) se resta del siguiente: «Dos» empieza con ~10 min, no 15.
await consultar({ punto: 2, cerrado: true, vueltas: false, tema: '' });
assert.equal(await activo(), 'Dos');
const [uno, dos] = await puntos();
assert.equal(uno, 'Uno · Small decisions · quedan 0:00');
assert.match(dos, /^Dos · Small decisions · quedan 9:/);

// 13. Un salto sin cerrar («Ir al punto») no traspasa tiempo: «Dos» conserva el suyo y «Tres» tiene sus 15 min.
await consultar({ punto: 3, cerrado: false, vueltas: false, tema: '' });
await pagina.click('#irPunto');
assert.equal(await activo(), 'Tres');
const [, dos2, tres] = await puntos();
assert.match(dos2, /quedan 9:/);
assert.match(tres, /quedan 14:/);

await pagina.click('#terminar');
await pagina.waitForSelector('#empezar:not([hidden])');
assert.match(await pagina.textContent('#resumen'), /Previsto: 45 min/);

console.log(`Prueba superada: ${peticionesClaude.length} consultas; configuración, avisos de la IA, voz con escucha en pausa, tiempos por punto, traspaso al cerrar y borrado comprobados.`);
await navegador.close();
process.exit(0);
