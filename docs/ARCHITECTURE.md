# ARCHITECTURE.md — ARCADED LUXURY

## Hallazgo crítico (resuelto)
Antes habia dos rutas de codigo. Se confirmo que `index.html` solo
apunta a `assets/css/style.css` y `assets/js/main.js`, y se elimino
la ruta paralela (`css/`, `js/`, `sw.js`, `manifest.json`,
`DEPLOYMENT.md`, `icons/`, `.well-known/`, `utils (vacio)/`) que
pertenecia a otro proyecto (Splitr) contaminando este repo.

Base activa unica: **`assets/`**.

## Núcleo real del producto
- shell / lobby
- daily / weekly
- pass
- shop
- profile / settings
- minijuegos
- progreso / créditos / saves

## Problema
La app creció como producto-hub.
Eso hace que:
- el archivo principal ya cargue demasiadas responsabilidades
- el CSS global ya contenga demasiadas variantes
- los bugs visuales y de estado sean más difíciles de aislar

## Dirección
Separar por capas:
- shell del hub
- sistemas de progreso/save
- sistemas de tienda/pase/misiones
- motor de cada minijuego
- utilidades visuales y audio
