// Mide el detector con los casos escritos a mano de casos.json en cada configuración. Uso: npm run eval
import datos from './casos.json' with { type: 'json' };
import { analizar, CONFIGS } from './detector.mjs';

const ALERTAS = ['vueltas', 'otro punto', 'fuera del orden del día'];
const sinAlerta = datos.casos.filter((c) => !ALERTAS.includes(c.accion)).length;

for (const config of Object.keys(CONFIGS)) {
  console.log(`\n== ${config}`);
  const tipos = {};
  let falsas = 0, errores = 0, primerError = '', entrada = 0, salida = 0, ms = 0;
  for (const c of datos.casos) {
    const t = (tipos[c.accion] ??= { bien: 0, total: 0 });
    t.total++;
    const inicio = performance.now();
    let r;
    try {
      r = await analizar({ ...c, orden: datos.ordenes[c.orden] }, config);
    } catch (e) {
      errores++;
      primerError ||= e.message.slice(0, 300);
      continue;
    } finally {
      ms += performance.now() - inicio;
    }
    entrada += r.uso.input_tokens;
    salida += r.uso.output_tokens;
    if (r.accion === c.accion) t.bien++;
    else console.log(`MAL ${c.id} · esperado: ${c.accion} · detectado: ${r.accion}`);
    if (ALERTAS.includes(r.accion) && !ALERTAS.includes(c.accion)) falsas++;
  }
  console.log(`Aciertos: ${Object.entries(tipos).map(([k, v]) => `${k} ${v.bien}/${v.total}`).join(' · ')}`);
  console.log(`Falsas alarmas: ${falsas}/${sinAlerta} · Errores: ${errores}${primerError ? ` (${primerError})` : ''}`);
  console.log(`Tokens: ${entrada} de entrada, ${salida} de salida · Tiempo medio: ${(ms / datos.casos.length / 1000).toFixed(1)} s`);
}
