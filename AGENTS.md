# Principios de implementación

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

## Calidad de código

- Prioriza código claro, simple y mantenible; evita complejidad y duplicación innecesarias.
- Corrige los problemas de análisis estático en su causa; evita ocultar advertencias sin justificación.
- Revisa los cambios con las herramientas de calidad disponibles antes de terminarlos.

## Interfaz consistente

- Reutiliza los componentes compartidos antes de crear piezas nuevas; si falta uno, créalo como componente común y no como variante aislada de una pantalla.
- Centraliza colores, tamaños, espaciados y puntos de corte como valores de diseño compartidos; no los repitas sueltos en cada pantalla.
- Diseña para cualquier tamaño de pantalla y nivel de zoom, sin anchos mínimos fijos, y verifica móvil, tablet y escritorio.
- Verifica los modos claro y oscuro: textos, bordes y controles deben distinguirse del fondo en ambos.
- Distingue visualmente títulos, descripciones de ayuda y errores.
- Cada comportamiento de interfaz nuevo o modificado lleva su prueba automatizada: acción principal, cancelación, errores y estados de espera.
- Documenta las convenciones visuales en un único lugar y mantenlas al día.
