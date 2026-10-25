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
- Sigue las convenciones del proyecto y verifica los flujos afectados con las comprobaciones disponibles.

## Lineamientos de calidad de código

- Prioriza código claro, simple y mantenible; evita complejidad y duplicación innecesarias.
- Usa patrones idiomáticos del stack y maneja explícitamente errores, límites y datos externos.
- Mantén la accesibilidad y la semántica de la interfaz en cualquier interacción.
- Corrige los problemas de análisis estático en su causa; evita ocultar advertencias sin justificación.
- Revisa los cambios con las herramientas de calidad disponibles antes de terminarlos.
