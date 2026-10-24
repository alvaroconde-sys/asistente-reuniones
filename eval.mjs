// Mide el detector con los casos escritos a mano de casos.json. Uso: npm run eval
import datos from './casos.json' with { type: 'json' };
import { analizar } from './detector.mjs';

const ALERTAS = ['vueltas', 'otro punto', 'fuera del orden del día'];
const tipos = {};
let falsas = 0, entrada = 0, salida = 0;
for (const c of datos.casos) {
  const r = await analizar({ ...c, orden: datos.ordenes[c.orden] });
  entrada += r.uso.input_tokens;
  salida += r.uso.output_tokens;
  const t = (tipos[c.accion] ??= { bien: 0, total: 0 });
  t.total++;
  if (r.accion === c.accion) t.bien++;
  if (ALERTAS.includes(r.accion) && !ALERTAS.includes(c.accion)) falsas++;
  console.log(`${r.accion === c.accion ? 'OK ' : 'MAL'} ${c.id} · esperado: ${c.accion} · detectado: ${r.accion} ${r.tema}`);
}
const sinAlerta = datos.casos.filter((c) => !ALERTAS.includes(c.accion)).length;
console.log(`\nAciertos por tipo: ${Object.entries(tipos).map(([k, v]) => `${k} ${v.bien}/${v.total}`).join(' · ')}`);
console.log(`Falsas alarmas: ${falsas}/${sinAlerta} · Tokens: ${entrada} de entrada, ${salida} de salida`);
