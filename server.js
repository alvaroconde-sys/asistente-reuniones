// Servidor mínimo: sirve la página, crea claves temporales de Soniox y consulta el detector.
// No guarda ni registra el contenido de las reuniones.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { detectarVueltas } from './detector.mjs';

const { SONIOX_API_KEY, ANTHROPIC_API_KEY, SONIOX_REGION = '', PORT = 3000 } = process.env;
if (!SONIOX_API_KEY || !ANTHROPIC_API_KEY) throw new Error('Faltan SONIOX_API_KEY o ANTHROPIC_API_KEY en .env');
const SONIOX_API = `https://api.${SONIOX_REGION ? `${SONIOX_REGION}.` : ''}soniox.com`;

const json = (objeto) => [200, 'application/json', JSON.stringify(objeto)];
const leer = async (req) => { let s = ''; for await (const trozo of req) s += trozo; return s; };

const rutas = {
  'GET /': async () => [200, 'text/html; charset=utf-8', await readFile(new URL('index.html', import.meta.url))],

  // La clave real nunca sale del servidor; el navegador recibe una temporal de 60 s para abrir la conexión.
  'POST /api/soniox-key': async () => {
    const r = await fetch(`${SONIOX_API}/v1/auth/temporary-api-key`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SONIOX_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ usage_type: 'transcribe_websocket', expires_in_seconds: 60 }),
    });
    if (!r.ok) throw new Error(`Soniox ${r.status}`);
    const { api_key } = await r.json();
    return json({ api_key, region: SONIOX_REGION || undefined });
  },

  'POST /api/vueltas': async (req) => {
    const { antes, ultimo } = JSON.parse(await leer(req));
    return json(await detectarVueltas(antes, ultimo));
  },
};

createServer(async (req, res) => {
  const ruta = rutas[`${req.method} ${req.url}`];
  try {
    const [estado, tipo, cuerpo] = ruta ? await ruta(req) : [404, 'text/plain', 'No encontrado'];
    res.writeHead(estado, { 'content-type': tipo }).end(cuerpo);
  } catch (e) {
    console.error(e.message); // solo el error, nunca el contenido de la reunión
    res.writeHead(502, { 'content-type': 'text/plain' }).end(e.message);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Abre http://127.0.0.1:${PORT} en Chrome`));
