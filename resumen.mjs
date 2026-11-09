// Resumen de la reunión: una sola consulta a Claude, al terminar, con la transcripción entera.
import { CONFIGS, POR_DEFECTO, claude, ordenDelDia } from './detector.mjs';

const INSTRUCCIONES = `Redactas el resumen de una reunión presencial en español a partir de su transcripción automática.
Recibes el ORDEN DEL DÍA numerado y la TRANSCRIPCIÓN completa. La transcripción no indica quién habla y puede tener errores.
Escribe en texto plano, sin Markdown, con esta estructura:

RESUMEN
De dos a cuatro frases con lo esencial de la reunión.

Después, un bloque por cada punto del orden del día, en su orden:
N. Nombre del punto
Decisiones:
- una línea por decisión
Tareas:
- qué hay que hacer · responsable · plazo
Sin cerrar:
- lo que quedó abierto o aplazado

Si se trató algún asunto que no está en el orden del día y dejó una decisión o una tarea, añade al final un bloque «Fuera del orden del día» con los mismos apartados.

Reglas:
- Usa solo lo que consta en la transcripción. No completes ni supongas nada.
- Es una decisión solo lo que se acordó de forma expresa. Una propuesta que nadie aceptó, o que quedó en el aire, va en «Sin cerrar».
- Pon responsable y plazo solo si se dijeron; si no, escribe «sin responsable» o «sin plazo».
- Si un apartado no tiene contenido, escribe «- Nada». Si un punto no se trató, escribe «No se trató» en lugar de sus apartados.
- Si un nombre, una cifra o una fecha no se entiende bien en la transcripción, añade «(dudoso)».
- No juzgues a las personas ni describas sus emociones.`;

export const resumir = ({ orden, transcripcion }) => claude({
  ...CONFIGS[POR_DEFECTO],
  max_tokens: 8000, // es un límite, no un gasto: una respuesta cortada sería un error
  system: INSTRUCCIONES,
  messages: [{ role: 'user', content: `${ordenDelDia(orden)}\n\nTRANSCRIPCIÓN:\n${transcripcion}` }],
});
