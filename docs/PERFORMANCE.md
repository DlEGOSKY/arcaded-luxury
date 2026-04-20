# PERFORMANCE.md — ARCADED LUXURY

## Síntomas probables
- rendimiento irregular
- UI pesada
- repaints costosos
- bugs visuales difíciles de aislar

## Señales fuertes
- `assets/js/main.js` muy grande
- `assets/css/style.css` muy grande
- muchos `box-shadow`, `blur`, `backdrop-filter`, `glow`
- bastante UI simultánea sobre fondo canvas
- muchas pantallas y overlays dentro del mismo shell

## Reglas
- menos efectos idle
- menos blur concurrente
- menos glow simultáneo
- degradación visual en equipos modestos
- motion fuerte solo donde importa

## Primeras mejoras
- desactivar efectos pesados fuera de pantalla activa
- reducir layers decorativas permanentes
- separar render y lógica del shell
- revisar listeners duplicados y re-render manual innecesario
