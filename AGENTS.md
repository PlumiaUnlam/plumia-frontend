<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Principios de implementación del frontend

## Reglas

- Antes de cambiar código, entiende el propósito, los contratos y el comportamiento esperado; conserva lo que ya funciona.
- Da a cada unidad una responsabilidad clara y mantén los flujos fáciles de seguir.
- Separa la presentación, las decisiones de interacción y el acceso a datos cuando eso aclare sus responsabilidades.
- Valida entradas y respuestas externas; comunica errores de forma clara y útil.
- Representa los estados relevantes del flujo, como espera, vacío, éxito, error y acción no disponible.
- Define el comportamiento ante acciones repetidas, respuestas lentas, fallos y resultados obsoletos; evita efectos duplicados.
- Mantén solo el estado necesario y deriva los valores que puedan calcularse a partir de él.
- Haz que cada acción tenga un propósito y resultado perceptibles, y que pueda operarse de forma accesible.
- Prioriza código claro, simple y mantenible; evita complejidad y duplicación innecesarias.
- Corrige los problemas de análisis estático en su causa; evita ocultar advertencias sin justificación.
- Sigue las convenciones del proyecto y revisa los flujos afectados con las comprobaciones disponibles.

## Interfaz consistente

- Reutiliza los componentes compartidos antes de crear piezas nuevas; si falta uno, créalo como común y no como variante aislada de una pantalla.
- Centraliza colores, tamaños, espaciados y puntos de corte como valores compartidos, y documenta las convenciones visuales en un único lugar.
- Diseña para cualquier pantalla y zoom, sin anchos mínimos fijos, y verifica móvil, tablet y escritorio.
- Verifica los modos claro y oscuro, y distingue visualmente títulos, ayudas y errores.
- Cada comportamiento de interfaz nuevo o modificado lleva su prueba automatizada: acción principal, cancelación, errores y espera.
