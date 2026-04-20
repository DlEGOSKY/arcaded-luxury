# ARCADED LUXURY

Hub de minijuegos con identidad neón/cyberpunk, progreso, tienda, pase, diarias y semanales.

## Estado actual
La base ya existe y ya tiene personalidad.
El siguiente paso no es meter más features.
El siguiente paso es:
- modularizar
- corregir bugs
- bajar costo visual
- endurecer rendimiento
- aclarar qué código es fuente real

## Hallazgos clave
- `index.html` consume `assets/css/style.css` y `assets/js/main.js`
- la base activa es unica: todo vive bajo `assets/`
- `assets/js/main.js` ya es demasiado grande
- `assets/css/style.css` ya es demasiado grande

## Limpieza aplicada
- eliminados fosiles de otro proyecto (Splitr) que contaminaban el repo:
  `js/`, `css/`, `icons/`, `sw.js`, `manifest.json`, `DEPLOYMENT.md`,
  `.well-known/`, `utils (vacio)/`, imagen suelta en `assets/js/`
- consolidadas 3 copias de `.scanlines` y 2 de `.vignette` en un solo
  bloque canonico en `assets/css/style.css`
- corregido stack de z-index: `#flash-layer` queda sobre los overlays
- anadido `@media (prefers-reduced-motion: reduce)` para apagar
  animaciones idle en equipos/SO que lo piden

## Regla madre
No agregar más complejidad antes de resolver:
- arquitectura real
- rendimiento
- bugs visuales
- deuda técnica
