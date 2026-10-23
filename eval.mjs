// Mide el detector con los casos escritos a mano de casos.json. Uso: npm run eval
import casos from './casos.json' with { type: 'json' };
import { detectarVueltas } from './detector.mjs';

let aciertos = 0, falsas = 0, entrada = 0, salida = 0;
for (const c of casos) {
  const r = await detectarVueltas(c.antes, c.ultimo);
  entrada += r.uso.input_tokens;
  salida += r.uso.output_tokens;
  if (r.vueltas && c.vueltas) aciertos++;
  if (r.vueltas && !c.vueltas) falsas++;
  console.log(`${r.vueltas === c.vueltas ? 'OK ' : 'MAL'} ${c.id} · esperado ${c.vueltas} · detectado ${r.vueltas} ${r.tema}`);
}
const positivos = casos.filter((c) => c.vueltas).length;
console.log(`\nVueltas detectadas: ${aciertos}/${positivos} · Falsas alarmas: ${falsas}/${casos.length - positivos} · Tokens: ${entrada} de entrada, ${salida} de salida`);
