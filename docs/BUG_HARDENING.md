# BUG_HARDENING.md — ARCADED LUXURY

## Objetivo
Corregir bugs sin meter regresiones.

## Riesgos actuales
- código duplicado o legacy en carpetas paralelas
- estados mezclados en el archivo principal
- listeners repetidos
- estilos que se pisan entre pantallas
- modales / overlays que heredan demasiada complejidad visual

## Orden recomendado
1. confirmar código activo
2. aislar módulo con más bugs
3. corregirlo sin rediseño total
4. validar que no rompe otras pantallas
5. pasar al siguiente módulo

## Módulos candidatos
- settings
- pass
- tienda
- weekly / daily
- navegación del hub
- overlays de perfil
