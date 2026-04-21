// systems/icons.js
// Pack de SVG inline custom. Todos dibujados a mano con viewBox 24x24.
// Usar `fill="currentColor"` o `stroke="currentColor"` para heredar color
// del contenedor. Ningun icono depende de Font Awesome.
//
// Uso:
//   import { icon } from '../systems/icons.js';
//   el.innerHTML = icon('chevronUp', { size: 20, color: '#22c55e' });
//
// O directo en un template:
//   `<div>${icon('heart')}</div>`

const SVG_LIB = {
    // =========== PALOS (suits) — mas elaborados que Unicode ===========
    heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

    diamond: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L21 12 L12 22 L3 12 Z"/></svg>`,

    club: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-2.2 0-4 1.8-4 4 0 0.3 0 0.6 0.1 0.9-0.4-0.1-0.7-0.1-1.1-0.1-2.2 0-4 1.8-4 4s1.8 4 4 4c0.6 0 1.2-0.1 1.8-0.4L7 22h10l-1.8-6.6c0.6 0.3 1.2 0.4 1.8 0.4 2.2 0 4-1.8 4-4s-1.8-4-4-4c-0.4 0-0.7 0-1.1 0.1 0.1-0.3 0.1-0.6 0.1-0.9 0-2.2-1.8-4-4-4z"/></svg>`,

    spade: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 6 3 10 3 15c0 2.8 2.2 5 5 5 1.3 0 2.5-0.5 3.4-1.3L10 22h4l-1.4-3.3c0.9 0.8 2.1 1.3 3.4 1.3 2.8 0 5-2.2 5-5 0-5-5-9-9-13z"/></svg>`,

    // =========== NAVEGACION ===========
    chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,15 12,8 19,15"/></svg>`,

    chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,9 12,16 19,9"/></svg>`,

    arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15,6 9,12 15,18"/></svg>`,

    arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,6 15,12 9,18"/></svg>`,

    // =========== ESTADOS ===========
    // Llama estilizada con curva interna para detalle
    fire: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C12 2, 14.5 5.5, 14.5 9 C14.5 10.8, 13.6 12, 12.5 12 C12.5 11, 11.8 10, 11 10 C8 10, 5 13, 5 17 C5 20.3, 7.5 22, 11 22 C15.5 22, 19 19, 19 14.5 C19 10, 15.5 6.5, 12 2 Z M10 18 C10 16, 11 14.5, 12 14 C12 15, 13 16, 13 17.5 C13 19, 11.5 19.5, 10 18 Z"/></svg>`,

    // Escudo con doble borde (detail luxury)
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 L4 5 L4 12 C4 17, 7 20.5, 12 22 C17 20.5, 20 17, 20 12 L20 5 Z"/><path d="M12 5 L7 7 L7 12 C7 15, 9 17, 12 18 C15 17, 17 15, 17 12 L17 7 Z" stroke-width="1" opacity="0.5"/></svg>`,

    shieldFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L4 5 L4 12 C4 17, 7 20.5, 12 22 C17 20.5, 20 17, 20 12 L20 5 Z"/></svg>`,

    // =========== SKILLS ===========
    // Reroll / shuffle — dos flechas cruzadas con curva
    shuffle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16,3 21,3 21,8"/><path d="M4 20 L21 3"/><polyline points="21,16 21,21 16,21"/><path d="M15 15 L21 21"/><path d="M4 4 L9 9"/></svg>`,

    // Ojo con pupila circular y detalles
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12 C3 7, 7 4, 12 4 C17 4, 21 7, 23 12 C21 17, 17 20, 12 20 C7 20, 3 17, 1 12 Z"/><circle cx="12" cy="12" r="3.5"/><circle cx="13" cy="11" r="1" fill="currentColor"/></svg>`,

    // =========== CARTAS ESPECIALES ===========
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11 V7 C8 4.2, 9.8 2, 12 2 C14.2 2, 16 4.2, 16 7 V11"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>`,

    bug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="8" height="12" rx="4"/><line x1="12" y1="8" x2="12" y2="20"/><line x1="8" y1="14" x2="4" y2="14"/><line x1="16" y1="14" x2="20" y2="14"/><line x1="9" y1="9" x2="7" y2="5"/><line x1="15" y1="9" x2="17" y2="5"/><line x1="9" y1="19" x2="7" y2="22"/><line x1="15" y1="19" x2="17" y2="22"/></svg>`,

    database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5 V19 C3 20.6, 7 22, 12 22 C17 22, 21 20.6, 21 19 V5"/><path d="M3 12 C3 13.6, 7 15, 12 15 C17 15, 21 13.6, 21 12"/></svg>`,

    // Biohazard simplificado — tres lobulos mas claros
    biohazard: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2.5"/><path d="M12 2 C10.5 4.5, 10 7, 11 10 L13 10 C14 7, 13.5 4.5, 12 2 Z"/><path d="M3 17 C5.5 18.5, 8 18.5, 11 17 L10 15 C7.5 14, 5 14.5, 3 17 Z"/><path d="M21 17 C18.5 18.5, 16 18.5, 13 17 L14 15 C16.5 14, 19 14.5, 21 17 Z"/></svg>`,

    // Interrogacion estilizada
    question: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M9 9 C9 6.5, 10.5 5.5, 12 5.5 C14 5.5, 15 7, 15 8.5 C15 10.5, 12 11.5, 12 13.5"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>`,

    // Rayo angular
    bolt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 L3 14 L10 14 L8 22 L21 10 L14 10 Z"/></svg>`,

    // =========== MODOS / CATEGORIAS ===========
    // Pila de cartas para modo estandar
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 L22 7 L12 12 L2 7 Z"/><path d="M2 12 L12 17 L22 12" stroke-opacity="0.6"/><path d="M2 17 L12 22 L22 17" stroke-opacity="0.35"/></svg>`,

    // Craneo para modo letal
    skull: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C7 2, 3 6, 3 11 C3 14, 4.5 16, 6 17 L6 20 C6 21, 7 22, 8 22 L9 22 L9 19 L11 19 L11 22 L13 22 L13 19 L15 19 L15 22 L16 22 C17 22, 18 21, 18 20 L18 17 C19.5 16, 21 14, 21 11 C21 6, 17 2, 12 2 Z M9 10 C10.1 10, 11 11, 11 12 C11 13, 10.1 14, 9 14 C7.9 14, 7 13, 7 12 C7 11, 7.9 10, 9 10 Z M15 10 C16.1 10, 17 11, 17 12 C17 13, 16.1 14, 15 14 C13.9 14, 13 13, 13 12 C13 11, 13.9 10, 15 10 Z"/></svg>`,

    // =========== UI ===========
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,

    play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>`,

    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`,

    // =========== NUMEROS / SIMBOLOS ===========
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,12 10,18 20,6"/></svg>`,
    checkDouble: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,12 7,17 14,7"/><polyline points="10,17 17,7 22,12"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    infinity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M7 8 C4 8, 2 10, 2 12 C2 14, 4 16, 7 16 C9 16, 12 14, 12 12 C12 10, 15 8, 17 8 C20 8, 22 10, 22 12 C22 14, 20 16, 17 16 C15 16, 12 14, 12 12"/></svg>`,
    hashtag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="17" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor"/></svg>`,
    triangleWarning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3 L22 20 L2 20 Z"/><line x1="12" y1="10" x2="12" y2="15"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`,

    // =========== USUARIO / PERSONAS ===========
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21 C4 17, 7 14, 12 14 C17 14, 20 17, 20 21"/></svg>`,
    userAstronaut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="3" opacity="0.4"/><path d="M6 10 H3 M18 10 H21" stroke-linecap="round"/><path d="M6 21 C6 18, 9 16, 12 16 C15 16, 18 18, 18 21" stroke-linecap="round"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20 C2 16.5, 5 14, 9 14 C13 14, 16 16.5, 16 20"/><path d="M15 14 C18 14, 22 16, 22 20"/></svg>`,
    personMilitary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7 L17 7 L17 10 L12 12 L7 10 Z"/><circle cx="12" cy="15" r="2"/><path d="M6 22 L6 19 C6 18, 7 17, 9 17 L15 17 C17 17, 18 18, 18 19 L18 22"/></svg>`,

    // =========== TROFEOS / PREMIOS ===========
    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 4 L16 4 L16 10 C16 13, 14 15, 12 15 C10 15, 8 13, 8 10 Z"/><path d="M5 6 L8 6 L8 10 C6 10, 5 8, 5 6 Z" fill="currentColor" fill-opacity="0.3"/><path d="M19 6 L16 6 L16 10 C18 10, 19 8, 19 6 Z" fill="currentColor" fill-opacity="0.3"/><line x1="12" y1="15" x2="12" y2="19" stroke-linecap="round"/><line x1="8" y1="20" x2="16" y2="20" stroke-linecap="round"/></svg>`,
    crown: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20 L21 20 L20 8 L16 12 L12 4 L8 12 L4 8 Z"/><circle cx="20" cy="8" r="1.5" fill-opacity="0.7"/><circle cx="4"  cy="8" r="1.5" fill-opacity="0.7"/><circle cx="12" cy="4" r="1.5" fill-opacity="0.7"/></svg>`,
    medal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 2 L16 2 L14 9 L10 9 Z"/><circle cx="12" cy="15" r="6"/><polygon points="12,11 13.2,13.8 16,14 14,16 14.5,19 12,17.5 9.5,19 10,16 8,14 10.8,13.8" fill="currentColor" stroke="none"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 14.8,8.5 22,9.3 16.5,14 18,21 12,17.5 6,21 7.5,14 2,9.3 9.2,8.5"/></svg>`,
    gem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3 L18 3 L22 9 L12 22 L2 9 Z"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="10" y1="3" x2="6" y2="9"/><line x1="14" y1="3" x2="18" y2="9"/><line x1="12" y1="22" x2="6" y2="9"/><line x1="12" y1="22" x2="18" y2="9"/></svg>`,
    coins: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="9" cy="8" rx="6" ry="2.5"/><path d="M3 8 V12 C3 13.4, 5.7 14.5, 9 14.5 C12.3 14.5, 15 13.4, 15 12 V8"/><path d="M3 12 V16 C3 17.4, 5.7 18.5, 9 18.5 C12.3 18.5, 15 17.4, 15 16 V12"/><ellipse cx="15" cy="15" rx="6" ry="2.5"/><path d="M9 15 V17 C9 18.4, 11.7 19.5, 15 19.5 C18.3 19.5, 21 18.4, 21 17 V15"/></svg>`,
    gift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="9" width="18" height="12" rx="1"/><rect x="2" y="6" width="20" height="4" rx="1"/><line x1="12" y1="6" x2="12" y2="21"/><path d="M12 6 C10 3, 7 3, 7 5 C7 6, 9 6, 12 6 Z"/><path d="M12 6 C14 3, 17 3, 17 5 C17 6, 15 6, 12 6 Z"/></svg>`,

    // =========== CIENCIA / TECH ===========
    brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3 C10 3, 8 5, 8 7 C6 7, 4 9, 4 11 C4 13, 5 14, 6 14 C5 15, 5 17, 7 18 C8 20, 10 21, 12 20 L12 3 Z"/><path d="M12 3 C14 3, 16 5, 16 7 C18 7, 20 9, 20 11 C20 13, 19 14, 18 14 C19 15, 19 17, 17 18 C16 20, 14 21, 12 20 L12 3 Z"/><path d="M8 10 C9 11, 10 11, 10 10" stroke-width="1.2"/><path d="M14 10 C15 11, 16 11, 16 10" stroke-width="1.2"/></svg>`,
    atom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)"/></svg>`,
    dna: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3 C6 8, 18 8, 18 13 C18 18, 6 18, 6 23"/><path d="M18 3 C18 8, 6 8, 6 13 C6 18, 18 18, 18 23"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
    flask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 3 L15 3 M10 3 L10 10 L5 19 C4 21, 5 22, 7 22 L17 22 C19 22, 20 21, 19 19 L14 10 L14 3"/><path d="M7 17 L17 17" opacity="0.5"/></svg>`,
    microchip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" fill-opacity="0.2"/><line x1="6" y1="10" x2="3" y2="10"/><line x1="6" y1="14" x2="3" y2="14"/><line x1="18" y1="10" x2="21" y2="10"/><line x1="18" y1="14" x2="21" y2="14"/><line x1="10" y1="6" x2="10" y2="3"/><line x1="14" y1="6" x2="14" y2="3"/><line x1="10" y1="18" x2="10" y2="21"/><line x1="14" y1="18" x2="14" y2="21"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,7 3,12 8,17"/><polyline points="16,7 21,12 16,17"/><line x1="14" y1="5" x2="10" y2="19"/></svg>`,
    terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="6,10 10,13 6,16"/><line x1="12" y1="17" x2="18" y2="17"/></svg>`,
    keyboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6.5" y2="10" stroke-linecap="round" stroke-width="2.5"/><line x1="10" y1="10" x2="10.5" y2="10" stroke-linecap="round" stroke-width="2.5"/><line x1="14" y1="10" x2="14.5" y2="10" stroke-linecap="round" stroke-width="2.5"/><line x1="18" y1="10" x2="18.5" y2="10" stroke-linecap="round" stroke-width="2.5"/><line x1="8" y1="14.5" x2="16" y2="14.5" stroke-linecap="round"/></svg>`,
    networkWired: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="9" y="2" width="6" height="5" rx="0.5"/><rect x="2" y="17" width="6" height="5" rx="0.5"/><rect x="16" y="17" width="6" height="5" rx="0.5"/><line x1="12" y1="7" x2="12" y2="13" stroke-linecap="round"/><path d="M5 17 L5 13 L19 13 L19 17" stroke-linecap="round"/></svg>`,
    wifiSlash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8 C6 5, 9 4, 12 4" opacity="0.5"/><path d="M5 12 C7 10, 9 9, 11 9"/><path d="M8 16 C9 15, 10 15, 11 15"/><circle cx="12" cy="20" r="1" fill="currentColor"/><line x1="3" y1="3" x2="21" y2="21" stroke-width="2.5"/></svg>`,
    signal: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2"  y="16" width="3" height="4" rx="0.5"/><rect x="7"  y="12" width="3" height="8" rx="0.5"/><rect x="12" y="8"  width="3" height="12" rx="0.5"/><rect x="17" y="4"  width="3" height="16" rx="0.5"/></svg>`,
    circleNodes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="4"  r="2" fill="currentColor"/><circle cx="4"  cy="20" r="2" fill="currentColor"/><circle cx="20" cy="20" r="2" fill="currentColor"/><circle cx="12" cy="13" r="2.5"/><line x1="12" y1="6" x2="12" y2="10.5"/><line x1="6" y1="19" x2="10" y2="14.5"/><line x1="18" y1="19" x2="14" y2="14.5"/></svg>`,
    satellite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1" transform="rotate(45 12 12)"/><rect x="10" y="10" width="4" height="4" fill="currentColor"/><line x1="3" y1="18" x2="8" y2="13" stroke-linecap="round"/><line x1="21" y1="6" x2="16" y2="11" stroke-linecap="round"/><path d="M15 3 C18 3, 21 6, 21 9" stroke-linecap="round"/></svg>`,
    rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2 C14 4, 17 8, 17 13 L17 17 L7 17 L7 13 C7 8, 10 4, 12 2 Z"/><circle cx="12" cy="10" r="2"/><path d="M7 17 L4 22 L6 20 M17 17 L20 22 L18 20"/><path d="M10 20 L12 22 L14 20"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
    mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 C7.6 2, 4 5.6, 4 10 C4 15.5, 12 22, 12 22 C12 22, 20 15.5, 20 10 C20 5.6, 16.4 2, 12 2 Z"/><circle cx="12" cy="10" r="3" fill="currentColor" fill-opacity="0.3"/></svg>`,

    // =========== JUEGOS / MODOS ===========
    gamepad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 8 L18 8 C20 8, 22 10, 22 13 C22 16, 20 18, 18 18 C16 18, 15 16, 14 16 L10 16 C9 16, 8 18, 6 18 C4 18, 2 16, 2 13 C2 10, 4 8, 6 8 Z"/><line x1="7" y1="12" x2="9" y2="12"/><line x1="8" y1="11" x2="8" y2="13"/><circle cx="16" cy="12" r="0.8" fill="currentColor"/><circle cx="18" cy="14" r="0.8" fill="currentColor"/></svg>`,
    puzzlePiece: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M10 3 L10 6 C10 7, 9 8, 7 8 C5 8, 4 9, 4 11 L4 14 C4 15, 5 16, 6 16 C7 16, 8 17, 8 19 L8 21 L14 21 L14 19 C14 17, 15 16, 16 16 C17 16, 18 15, 18 14 L18 11 C18 9, 17 8, 15 8 C13 8, 14 7, 14 6 L14 3 Z"/></svg>`,
    snake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 4 L16 4 L16 10 L8 10 L8 16 L4 16 L4 20"/><circle cx="20" cy="4" r="1.5" fill="currentColor"/></svg>`,
    tableTennis: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="16" cy="8" r="6" fill="currentColor" fill-opacity="0.2"/><line x1="4" y1="20" x2="12" y2="12" stroke-linecap="round" stroke-width="2.5"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>`,
    bullseye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>`,
    crosshairs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><line x1="12" y1="1" x2="12" y2="6" stroke-linecap="round"/><line x1="12" y1="18" x2="12" y2="23" stroke-linecap="round"/><line x1="1" y1="12" x2="6" y2="12" stroke-linecap="round"/><line x1="18" y1="12" x2="23" y2="12" stroke-linecap="round"/></svg>`,
    tornado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4 L21 4"/><path d="M5 8 L19 8"/><path d="M7 12 L17 12"/><path d="M9 16 L15 16"/><path d="M11 20 L13 20"/></svg>`,
    ghost: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C7 2, 4 6, 4 11 L4 22 L7 20 L10 22 L12 20 L14 22 L17 20 L20 22 L20 11 C20 6, 17 2, 12 2 Z M9 10 A1 1 0 0 1 9 12 A1 1 0 0 1 9 10 Z M15 10 A1 1 0 0 1 15 12 A1 1 0 0 1 15 10 Z"/></svg>`,
    dungeon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 22 L3 8 L6 8 L6 5 L9 5 L9 8 L12 8 L12 3 L15 3 L15 8 L18 8 L18 5 L21 5 L21 22 L14 22 L14 15 L10 15 L10 22 Z"/></svg>`,

    // =========== ACCIONES ===========
    circlePlay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>`,
    forward: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="3,4 14,12 3,20"/><rect x="16" y="4" width="4" height="16" rx="0.5"/></svg>`,
    forwardFast: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="2,4 11,12 2,20"/><polygon points="12,4 21,12 12,20"/></svg>`,
    rotateLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 C3 7, 7 3, 12 3 C17 3, 21 7, 21 12 C21 17, 17 21, 12 21"/><polyline points="3,5 3,12 10,12"/></svg>`,
    rotateRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12 C21 7, 17 3, 12 3 C7 3, 3 7, 3 12 C3 17, 7 21, 12 21"/><polyline points="21,5 21,12 14,12"/></svg>`,
    leftRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,5 3,10 8,15"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="16,9 21,14 16,19"/><line x1="21" y1="14" x2="3" y2="14"/></svg>`,
    deleteLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 5 L8 5 L2 12 L8 19 L22 19 Z"/><line x1="18" y1="9" x2="12" y2="15" stroke-linecap="round"/><line x1="12" y1="9" x2="18" y2="15" stroke-linecap="round"/></svg>`,
    arrowUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>`,
    arrowRightToBracket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5 L3 19"/><polyline points="10,8 14,12 10,16"/><line x1="14" y1="12" x2="22" y2="12"/></svg>`,
    magnifyingGlass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4 L21 4 L14 13 L14 21 L10 19 L10 13 Z"/></svg>`,
    clone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="1"/><path d="M4 16 L4 5 C4 4, 5 3, 6 3 L15 3" stroke-linecap="round"/></svg>`,
    save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4 L16 4 L20 8 L20 20 L4 20 Z"/><rect x="7" y="14" width="10" height="6"/><rect x="8" y="4" width="8" height="5"/></svg>`,
    eraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M18 13 L13 18 C12 19, 10 19, 9 18 L6 15 C5 14, 5 12, 6 11 L14 3 C15 2, 17 2, 18 3 L21 6 C22 7, 22 9, 21 10 Z"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`,
    penToSquare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M11 4 L4 4 C3 4, 2 5, 2 6 L2 20 C2 21, 3 22, 4 22 L18 22 C19 22, 20 21, 20 20 L20 13"/><path d="M18 2 L22 6 L12 16 L8 16 L8 12 Z"/></svg>`,
    penRuler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 6 L18 2 L22 6 L18 10 Z"/><line x1="18" y1="10" x2="10" y2="18"/><path d="M2 22 L2 14 L6 14 L6 16 L8 16 L8 18 L10 18 L10 20 L12 20 L12 22 Z"/></svg>`,
    paintbrush: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M17 2 L22 7 L14 15 L9 10 Z"/><path d="M9 10 L4 15 C3 16, 3 18, 4 19 L5 20 C6 21, 8 21, 9 20 L14 15"/></svg>`,
    palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22 C6.5 22, 2 17.5, 2 12 C2 6.5, 6.5 2, 12 2 C17.5 2, 22 6, 22 11 C22 13, 20 14, 18 14 L15 14 C14 14, 13 15, 13 16 C13 16.5, 13.5 17, 13.5 18 C13.5 20, 13 22, 12 22 Z"/><circle cx="7" cy="11" r="1.2" fill="currentColor"/><circle cx="11" cy="7" r="1.2" fill="currentColor"/><circle cx="17" cy="9" r="1.2" fill="currentColor"/></svg>`,
    screwdriverWrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 21 L11 13"/><path d="M15 4 L18 1 L22 5 L19 8 Z"/><path d="M15 4 L8 11 L6 9 L13 2 Z"/><path d="M15 15 L21 21" stroke-width="2.5"/><circle cx="18" cy="18" r="1.5"/></svg>`,
    hammer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3 L21 10 L18 13 L15 10 L10 15 L12 17 L7 22 L2 17 L7 12 L9 14 L14 9 L11 6 Z"/></svg>`,
    expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,9 4,4 9,4"/><polyline points="20,9 20,4 15,4"/><polyline points="4,15 4,20 9,20"/><polyline points="20,15 20,20 15,20"/></svg>`,
    compress: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,4 10,9 5,9"/><polyline points="14,4 14,9 19,9"/><polyline points="10,20 10,15 5,15"/><polyline points="14,20 14,15 19,15"/></svg>`,
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M10 14 C9 13, 9 11, 10 10 L13 7 C15 5, 18 5, 20 7 C22 9, 22 12, 20 14 L17 17"/><path d="M14 10 C15 11, 15 13, 14 14 L11 17 C9 19, 6 19, 4 17 C2 15, 2 12, 4 10 L7 7"/></svg>`,

    // =========== OBJETOS ===========
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 8 L12 3 L22 8 L22 17 L12 22 L2 17 Z"/><line x1="2" y1="8" x2="12" y2="13"/><line x1="22" y1="8" x2="12" y2="13"/><line x1="12" y1="13" x2="12" y2="22"/></svg>`,
    boxOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8 L12 3 L20 8 L20 11 L16 13 L12 11 L8 13 L4 11 Z"/><path d="M4 11 L4 20 L12 22 L20 20 L20 11"/><line x1="8" y1="13" x2="12" y2="15"/><line x1="12" y1="15" x2="16" y2="13"/><line x1="12" y1="15" x2="12" y2="22"/></svg>`,
    cube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 L22 7 L22 17 L12 22 L2 17 L2 7 Z"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="7" x2="12" y2="12"/><line x1="22" y1="7" x2="12" y2="12"/></svg>`,
    key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle cx="8" cy="12" r="5"/><line x1="13" y1="12" x2="22" y2="12"/><line x1="20" y1="12" x2="20" y2="15"/><line x1="17" y1="12" x2="17" y2="16"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11 V7 C8 4.2, 9.8 2, 12 2 C13.8 2, 15 3, 15.5 4.5"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>`,
    droplet: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C12 2, 5 10, 5 15 C5 19, 8 22, 12 22 C16 22, 19 19, 19 15 C19 10, 12 2, 12 2 Z"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 16 L18 16 C18 16, 17 14, 17 11 C17 7, 15 4, 12 4 C9 4, 7 7, 7 11 C7 14, 6 16, 6 16 Z"/><path d="M10 19 C10 20, 11 21, 12 21 C13 21, 14 20, 14 19"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,7 12,12 16,14"/></svg>`,
    stopwatch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><circle cx="12" cy="14" r="8"/><line x1="9" y1="2" x2="15" y2="2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="14" x2="15" y2="11"/></svg>`,
    calendarDays: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="1.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7" stroke-linecap="round"/><line x1="16" y1="3" x2="16" y2="7" stroke-linecap="round"/><circle cx="8" cy="15" r="0.8" fill="currentColor"/><circle cx="12" cy="15" r="0.8" fill="currentColor"/><circle cx="16" cy="15" r="0.8" fill="currentColor"/></svg>`,
    calendarCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="1.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><polyline points="8,15 11,18 16,13"/></svg>`,
    calendarWeek: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="1.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7" stroke-linecap="round"/><line x1="16" y1="3" x2="16" y2="7" stroke-linecap="round"/><rect x="7" y="13" width="10" height="5" fill="currentColor" fill-opacity="0.3"/></svg>`,
    chartBar: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3"  y="12" width="4" height="9" rx="0.5"/><rect x="10" y="7"  width="4" height="14" rx="0.5"/><rect x="17" y="3"  width="4" height="18" rx="0.5"/></svg>`,
    chartLine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><polyline points="3,16 9,10 14,14 21,5"/><polyline points="3,21 21,21"/><circle cx="21" cy="5" r="1.5" fill="currentColor"/></svg>`,
    buildingColumns: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 10 L12 3 L21 10 L3 10 Z"/><line x1="5" y1="10" x2="5" y2="19"/><line x1="10" y1="10" x2="10" y2="19"/><line x1="14" y1="10" x2="14" y2="19"/><line x1="19" y1="10" x2="19" y2="19"/><line x1="2" y1="19" x2="22" y2="19"/><line x1="2" y1="21" x2="22" y2="21"/></svg>`,
    calculator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><rect x="7" y="5" width="10" height="4" rx="0.5" fill="currentColor" fill-opacity="0.2"/><circle cx="8" cy="13" r="0.8" fill="currentColor"/><circle cx="12" cy="13" r="0.8" fill="currentColor"/><circle cx="16" cy="13" r="0.8" fill="currentColor"/><circle cx="8" cy="17" r="0.8" fill="currentColor"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/><circle cx="16" cy="17" r="0.8" fill="currentColor"/></svg>`,
    gradCap: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,3 22,8 12,13 2,8"/><path d="M6 10 L6 16 C6 17.5, 8.5 19, 12 19 C15.5 19, 18 17.5, 18 16 L18 10 L12 13 Z"/><line x1="22" y1="8" x2="22" y2="14" stroke="currentColor" stroke-width="1.5"/></svg>`,
    scaleBalanced: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L12 21"/><line x1="6" y1="21" x2="18" y2="21"/><line x1="4" y1="7" x2="20" y2="7"/><path d="M4 7 L1 14 C1 15.5, 2.5 16, 4 16 C5.5 16, 7 15.5, 7 14 Z"/><path d="M20 7 L23 14 C23 15.5, 21.5 16, 20 16 C18.5 16, 17 15.5, 17 14 Z"/></svg>`,
    heartCrack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 21 C4 15, 2 11, 2 7.5 C2 4.5, 4.5 2, 7.5 2 C9.5 2, 11 3, 12 4.5 C13 3, 14.5 2, 16.5 2 C19.5 2, 22 4.5, 22 7.5 C22 11, 20 15, 12 21 Z"/><polyline points="10,7 13,10 10,13 14,16" fill="none"/></svg>`,

    // =========== UI ELEMENTOS ===========
    circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
    circleDot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
    circleFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`,
    gridAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>`,
    gripHorizontal: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="9" r="1.5"/><circle cx="12" cy="9" r="1.5"/><circle cx="18" cy="9" r="1.5"/><circle cx="6" cy="15" r="1.5"/><circle cx="12" cy="15" r="1.5"/><circle cx="18" cy="15" r="1.5"/></svg>`,
    spellCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 4 L7 14 L11 4 M4 11 L10 11"/><path d="M14 4 L14 14 L19 14"/><path d="M21 14 L16 19 L13 16" stroke-width="2.5"/></svg>`,

    // =========== LUXURY ORNAMENTS ===========
    // Para decorar esquinas y centros de cartas
    cornerOrnament: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M2 2 L2 14 M2 2 L14 2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><path d="M4 10 L10 4" stroke-width="0.5"/></svg>`,

    diamondSmall: `<svg viewBox="0 0 10 10" fill="currentColor"><path d="M5 0 L10 5 L5 10 L0 5 Z"/></svg>`,

    // Monograma tipo playing card real — ornamento central
    fleuron: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="4" fill="currentColor" opacity="0.15"/><path d="M20 8 C22 12, 22 16, 20 20 C18 16, 18 12, 20 8 Z"/><path d="M20 32 C22 28, 22 24, 20 20 C18 24, 18 28, 20 32 Z"/><path d="M8 20 C12 22, 16 22, 20 20 C16 18, 12 18, 8 20 Z"/><path d="M32 20 C28 22, 24 22, 20 20 C24 18, 28 18, 32 20 Z"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>`,
};

// =============================================================
// icon(name, opts) → string SVG listo para innerHTML
// =============================================================
export function icon(name, opts = {}) {
    const svg = SVG_LIB[name];
    if(!svg) {
        console.warn(`[icons] Icono no encontrado: ${name}`);
        return '';
    }
    // Dimensiones por defecto 1em×1em (igual al polyfill FA) para que el
    // SVG herede el font-size del contenedor y no explote al tamaño default
    // del browser (300×150 o bloque sin dimensión).
    const sizeStr = opts.size
        ? (typeof opts.size === 'number' ? `${opts.size}px` : opts.size)
        : '1em';
    const attrs = [`width="${sizeStr}"`, `height="${sizeStr}"`, 'aria-hidden="true"'];
    const styles = ['vertical-align:-0.125em'];
    if(opts.color) styles.push(`color:${opts.color}`);
    if(opts.filter) styles.push(`filter:${opts.filter}`);
    if(opts.style) styles.push(opts.style);
    attrs.push(`style="${styles.join(';')}"`);
    if(opts.class) attrs.push(`class="${opts.class}"`);
    if(opts.title) attrs.push(`aria-label="${opts.title}"`);

    return svg.replace('<svg ', `<svg ${attrs.join(' ')} `);
}

// =============================================================
// Helper: retornar un elemento DOM en vez de string
// =============================================================
export function iconEl(name, opts = {}) {
    const wrap = document.createElement('span');
    wrap.className = 'icon-wrap';
    wrap.style.display = 'inline-flex';
    wrap.innerHTML = icon(name, opts);
    return wrap.firstElementChild;
}

// Export de la libreria completa por si se necesita inspeccionar
export const ICONS = SVG_LIB;

// =============================================================
// POLYFILL FA → SVG
// Reemplaza <i class="fa-solid fa-X"> por <span><svg>...</svg></span>
// en todo el DOM. Esto permite migrar gradualmente sin tocar 520 lugares.
// =============================================================

// Tabla de alias: nombres FA → keys del SVG_LIB
// Solo hacen falta los que NO coinciden 1:1 con camelCase
const FA_ALIAS = {
    // Palos
    'clover': 'club',
    // Variantes
    'shield-halved': 'shield',
    'xmark': 'close',
    'magnifying-glass': 'magnifyingGlass',
    'triangle-exclamation': 'triangleWarning',
    'bolt-lightning': 'bolt',
    'zap': 'bolt',
    'skull-crossbones': 'skull',
    'circle-play': 'circlePlay',
    'forward-fast': 'forwardFast',
    'rotate-left': 'rotateLeft',
    'rotate-right': 'rotateRight',
    'left-right': 'leftRight',
    'delete-left': 'deleteLeft',
    'arrow-up': 'arrowUp',
    'arrow-left': 'arrowLeft',
    'arrow-right-to-bracket': 'arrowRightToBracket',
    'chevron-up': 'chevronUp',
    'chevron-down': 'chevronDown',
    'check-double': 'checkDouble',
    'heart-crack': 'heartCrack',
    'circle-dot': 'circleDot',
    'circle-nodes': 'circleNodes',
    'grip-horizontal': 'gripHorizontal',
    'graduation-cap': 'gradCap',
    'scale-balanced': 'scaleBalanced',
    'building-columns': 'buildingColumns',
    'calendar-days': 'calendarDays',
    'calendar-check': 'calendarCheck',
    'calendar-week': 'calendarWeek',
    'chart-bar': 'chartBar',
    'chart-line': 'chartLine',
    'map-location-dot': 'mapPin',
    'earth-americas': 'globe',
    'user-astronaut': 'userAstronaut',
    'person-military-to-person': 'personMilitary',
    'pen-to-square': 'penToSquare',
    'pen-ruler': 'penRuler',
    'screwdriver-wrench': 'screwdriverWrench',
    'network-wired': 'networkWired',
    'wifi-slash': 'wifiSlash',
    'box-open': 'boxOpen',
    'table-tennis-paddle-ball': 'tableTennis',
    'puzzle-piece': 'puzzlePiece',
    'layer-group': 'layers',
    'border-all': 'gridAll',
    'th': 'gridAll',
    'spell-check': 'spellCheck',
    'heart-pulse': 'heart',
    'layer': 'layers',
    // Aliases directos (fa-name con guión que coincide a camelCase)
    'grid': 'gridAll',
    // ghost, snake, bell, clock, star, crown, medal, gift, brain, atom, dna, flask,
    // microchip, code, terminal, keyboard, rocket, globe, gamepad, bullseye, crosshairs,
    // tornado, lock, unlock, key, droplet, shield, heart, diamond, spade, bug, database,
    // biohazard, bolt, layers, skull, filter, clone, save, eraser, paintbrush, palette,
    // hammer, expand, compress, link, box, cube, coins, info, minus, plus, check, hashtag,
    // infinity, signal, satellite, forward, play, pause, close, circle, dungeon, gem, fire, eye,
    // shuffle, bell, trophy, user, users, stopwatch, calculator — coinciden por nombre.
};

// Convierte un nombre con guiones (fa-name) a camelCase
function toCamel(s) {
    return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// Resolver: fa-SOMETHING → svg key o null
function resolveFaName(faName) {
    // Strip prefix si viene con fa-
    const clean = faName.replace(/^fa-/, '');
    if(FA_ALIAS[clean]) return FA_ALIAS[clean];
    // camelCase directo
    const camel = toCamel(clean);
    if(SVG_LIB[camel]) return camel;
    // directo
    if(SVG_LIB[clean]) return clean;
    return null;
}

// Extrae el nombre del icono de una lista de clases FA
// Input: "fa-solid fa-heart" → "heart"
// Input: "fa-user-astronaut fa-spin" → "user-astronaut"
function extractFaIconName(classList) {
    for(const cls of classList) {
        if(cls === 'fa-solid' || cls === 'fa-regular' || cls === 'fa-brands' ||
           cls === 'fa-light' || cls === 'fa-thin' || cls === 'fa-duotone' ||
           cls === 'fa-spin' || cls === 'fa-pulse' || cls === 'fa-beat' ||
           cls === 'fa-fade' || cls === 'fa-bounce' || cls === 'fa-shake') continue;
        if(cls.startsWith('fa-')) return cls.substring(3);
    }
    return null;
}

/**
 * Reemplaza todos los <i class="fa-...*"> dentro del root por SVG custom.
 * Preserva estilos inline, font-size (se convierte en width/height via em),
 * color, y cualquier class adicional no-fa.
 *
 * Idempotente: los <i> ya procesados se marcan con data-fa-replaced="1".
 */
export function replaceFaIcons(root = document.body) {
    if(!root || !root.querySelectorAll) return 0;
    const icons = root.querySelectorAll('i[class*="fa-"]:not([data-fa-replaced])');
    let count = 0;
    icons.forEach(el => {
        const classes = Array.from(el.classList);
        const faName = extractFaIconName(classes);
        if(!faName) return;
        const svgKey = resolveFaName(faName);
        if(!svgKey) {
            // Marcar para no reintentar infinitamente; deja el FA render como fallback
            el.setAttribute('data-fa-replaced', 'missing');
            return;
        }
        // Mantener tag <i> para compatibilidad con selectores CSS existentes
        // (.btn i, .hud-cell i, etc.)
        const newEl = document.createElement('i');
        const nonFa = classes.filter(c => !c.startsWith('fa-'));
        newEl.className = ['icon-svg', ...nonFa].join(' ').trim();
        // Preservar atributos
        if(el.style.cssText) newEl.style.cssText = el.style.cssText;
        if(el.title) newEl.title = el.title;
        if(el.getAttribute('aria-hidden')) newEl.setAttribute('aria-hidden', el.getAttribute('aria-hidden'));
        if(el.getAttribute('aria-label')) newEl.setAttribute('aria-label', el.getAttribute('aria-label'));
        // Inyectar el SVG con 1em para que herede font-size del contenedor
        const svgStr = SVG_LIB[svgKey].replace(
            '<svg ',
            '<svg width="1em" height="1em" aria-hidden="true" '
        );
        newEl.innerHTML = svgStr;
        newEl.setAttribute('data-fa-replaced', '1');
        newEl.setAttribute('data-svg-icon', svgKey);
        el.replaceWith(newEl);
        count++;
    });
    return count;
}

/**
 * Arranca un MutationObserver global que reemplaza automaticamente
 * cualquier <i fa-*> añadido al DOM en el futuro.
 */
let _observer = null;
export function startFaAutoReplace() {
    if(_observer) return; // ya activo

    // Scan inicial
    try { replaceFaIcons(document.body); } catch(e) { console.warn('[icons] initial replace failed', e); }

    _observer = new MutationObserver((mutations) => {
        let hasNew = false;
        for(const m of mutations) {
            if(m.type === 'childList' && m.addedNodes.length) {
                for(const n of m.addedNodes) {
                    if(n.nodeType === 1) { // element
                        hasNew = true;
                        break;
                    }
                }
            }
            if(hasNew) break;
        }
        if(hasNew) {
            // Usar rAF para batch multiples mutaciones en un solo pase
            if(_observer._raf) return;
            _observer._raf = requestAnimationFrame(() => {
                _observer._raf = null;
                try { replaceFaIcons(document.body); } catch(e) {}
            });
        }
    });

    _observer.observe(document.body, { childList: true, subtree: true });
    console.log('[icons] FA → SVG auto-replace activo');
}

export function stopFaAutoReplace() {
    if(_observer) { _observer.disconnect(); _observer = null; }
}
