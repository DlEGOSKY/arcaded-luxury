// --- CONFIGURACIÓN PRINCIPAL ---
export const CONFIG = {
    STATES: { WELCOME: 'welcome', MENU: 'menu', GAME: 'game', SHOP: 'shop', DAILY: 'daily' },
    
    API: { 
        DECK: 'https://deckofcardsapi.com/api/deck',
        BIO: 'https://dog.ceo/api',
        TRIVIA_LOCAL: true 
    },

    COLORS: {
        DEFAULT: '#0f172a',
        STREAK_3: '#1e3a8a', STREAK_6: '#581c87', STREAK_9: '#7f1d1d',
        GOLD: '#fbbf24', PURPLE: '#a855f7', CYAN: '#06b6d4', BIO: '#84cc16', GEO: '#f59e0b', REFLEX: '#ec4899',
        SUCCESS: '#10b981', ACCENT: '#f43f5e',
        SPAM: '#ff5722', SNIPER: '#ef4444', ORBIT: '#8b5cf6', MEMORY: '#22d3ee',
        VAULT: '#10b981', PHASE: '#ec4899', MATH: '#3b82f6', STROOP: '#facc15',
        MATCH: '#6366f1', VOID: '#e11d48', GLITCH: '#84cc16', DAILY: '#f97316',
        TRACKER: '#22d3ee', PONG: '#00ff00'
    },

    // --- CAJA DE SUMINISTROS ---
    LOOT_BOX: {
        COST: 500,
        DROPS: [
            { type: 'CREDITS', val: 100,  prob: 30, name: 'Reintegro', icon: 'fa-coins', color: '#94a3b8' },
            { type: 'CREDITS', val: 500,  prob: 40, name: 'Bolsa de Créditos', icon: 'fa-sack-dollar', color: '#3b82f6' },
            { type: 'CREDITS', val: 1000, prob: 20, name: 'Maletín Ejecutivo', icon: 'fa-briefcase', color: '#a855f7' },
            { type: 'CREDITS', val: 5000, prob: 9,  name: 'Lingote de Oro', icon: 'fa-gem', color: '#eab308' },
            { type: 'JACKPOT', val: 10000, prob: 1, name: 'JACKPOT', icon: 'fa-trophy', color: '#ef4444' }
        ]
    },

    GAMES_LIST: [
        { id: 'higher-lower', name: 'High / Low', icon: 'fa-solid fa-arrows-up-down', color: 'DEFAULT', desc: 'Predicción de Cartas' },
        { id: 'guess-card', name: 'The Oracle', icon: 'fa-solid fa-eye', color: 'PURPLE', desc: 'Adivinación Cuántica' },
        { id: 'trivia', name: 'Neural Trivia', icon: 'fa-solid fa-brain', color: 'CYAN', desc: 'Conocimiento General' },
        { id: 'bio-scan', name: 'Bio-Scan', icon: 'fa-solid fa-dna', color: 'BIO', desc: 'Identificación Biológica' },
        { id: 'geo-net', name: 'Geo-Net', icon: 'fa-solid fa-earth-americas', color: 'GEO', desc: 'Datos Geopolíticos' },
        { id: 'hyper-reflex', name: 'Hyper Reflex', icon: 'fa-solid fa-bolt', color: 'REFLEX', desc: 'Velocidad de Reacción' },
        { id: 'spam-click', name: 'Spam Click', icon: 'fa-solid fa-computer-mouse', color: 'SPAM', desc: 'Resistencia Física' },
        { id: 'neon-sniper', name: 'Neon Sniper', icon: 'fa-solid fa-crosshairs', color: 'SNIPER', desc: 'Precisión de Impacto' },
        { id: 'orbit-lock', name: 'Orbit Lock', icon: 'fa-solid fa-circle-notch', color: 'ORBIT', desc: 'Sincronización Rítmica' },
        { id: 'memory-flash', name: 'Cyber Pattern', icon: 'fa-solid fa-microchip', color: 'MEMORY', desc: 'Retención Visual' },
        { id: 'vault-cracker', name: 'Vault Cracker', icon: 'fa-solid fa-lock-open', color: 'VAULT', desc: 'Criptografía Lógica' },
        { id: 'phase-shifter', name: 'Phase Shifter', icon: 'fa-solid fa-wave-square', color: 'PHASE', desc: 'Alineación Lineal' },
        { id: 'math-rush', name: 'Math Rush', icon: 'fa-solid fa-calculator', color: 'MATH', desc: 'Cálculo de Emergencia' },
        { id: 'color-trap', name: 'Color Trap', icon: 'fa-solid fa-palette', color: 'STROOP', desc: 'Conflicto Cognitivo' },
        { id: 'holo-match', name: 'Holo Match', icon: 'fa-solid fa-clone', color: 'MATCH', desc: 'Escaneo de Pares' },
        { id: 'void-dodger', name: 'Void Dodger', icon: 'fa-solid fa-shuttle-space', color: 'VOID', desc: 'Evasión de Amenazas' },
        { id: 'glitch-hunt', name: 'Glitch Hunt', icon: 'fa-solid fa-bug', color: 'GLITCH', desc: 'Agudeza Visual' },
        { id: 'orbit-tracker', name: 'Orbit Tracker', icon: 'fa-solid fa-satellite-dish', color: 'TRACKER', desc: 'Seguimiento Orbital' },
        { id: 'cyber-typer', name: 'CYBER TYPER', icon: 'fa-solid fa-keyboard', color: 'GLITCH', desc: 'DEFENSA DEL SISTEMA' },
        
        // --- JUEGO SECRETO ---
        { id: 'cyber-pong', name: 'CYBER PONG', icon: 'fa-solid fa-table-tennis-paddle-ball', color: 'PONG', desc: 'Duelo IA [CLASSIC]', unlockReq: 'pass_lvl_5' }
    ],

    GAME_INFO: {
        'higher-lower': { desc: "Algoritmo de probabilidad simple.", mech: "Predice si la carta será MAYOR o MENOR.", obj: "Acumula aciertos.", diff: "Azar." },
        'guess-card': { desc: "Sistema de predicción.", mech: "Adivina Palo o Color.", obj: "Palo 4x, Color 2x.", diff: "Suerte." },
        'trivia': { desc: "Evaluación de datos.", mech: "Preguntas contrarreloj.", obj: "Responde correctamente.", diff: "Tiempo." },
        'bio-scan': { desc: "Reconocimiento biológico.", mech: "Identifica la raza.", obj: "Acierta para ganar.", diff: "Zoología." },
        'geo-net': { desc: "Identificación de naciones.", mech: "Identifica la bandera.", obj: "Demuestra conocimiento.", diff: "Geografía." },
        'hyper-reflex': { desc: "Test de latencia.", mech: "Click en verde.", obj: "< 250ms.", diff: "Velocidad." },
        'spam-click': { desc: "Estrés mecánico.", mech: "Click rápido.", obj: "> 60 clicks.", diff: "Resistencia." },
        'neon-sniper': { desc: "Puntería de precisión.", mech: "Dispara objetivos.", obj: "No falles.", diff: "Velocidad." },
        'orbit-lock': { desc: "Sincronización.", mech: "Pulsa en zona segura.", obj: "Acierta giros.", diff: "Ritmo." },
        'memory-flash': { desc: "Memoria secuencial.", mech: "Repite luces.", obj: "Secuencia larga.", diff: "Memoria." },
        'vault-cracker': { desc: "Decodificación.", mech: "Adivina número (0-99).", obj: "6 intentos.", diff: "Lógica." },
        'phase-shifter': { desc: "Alineación de fase.", mech: "Detén en centro.", obj: "Precisión.", diff: "Timing." },
        'math-rush': { desc: "Cálculo rápido.", mech: "Verdad o Falso.", obj: "Antes de caer.", diff: "Estrés." },
        'color-trap': { desc: "Efecto Stroop.", mech: "Color de tinta.", obj: "Ignora texto.", diff: "Confusión." },
        'holo-match': { desc: "Patrones visuales.", mech: "Encuentra pares.", obj: "Despeja todo.", diff: "Memoria." },
        'void-dodger': { desc: "Evasión.", mech: "Esquiva todo.", obj: "Sobrevive.", diff: "Caos." },
        'glitch-hunt': { desc: "Depuración visual.", mech: "Encuentra el diferente.", obj: "Rápido.", diff: "Agudeza." },
        'orbit-tracker': { desc: "Seguimiento.", mech: "Sigue el orbe.", obj: "Mantén señal.", diff: "Pulso." },
        'cyber-typer': { desc: 'Intercepta el código malicioso.', mech: 'Escribe las palabras.', obj: 'Evita la brecha.' },
        'cyber-pong': { desc: 'Simulación de tenis virtual.', mech: 'Devuelve la bola y vence a la IA.', obj: 'Anota goles.', diff: 'Clásico.' }
    },

    DAILY_TARGETS: {
        'higher-lower': 50, 'guess-card': 20, 'trivia': 60, 'bio-scan': 60, 'geo-net': 80,
        'hyper-reflex': 400, 'spam-click': 30, 'neon-sniper': 50, 'orbit-lock': 40, 'memory-flash': 45,
        'vault-cracker': 1, 'phase-shifter': 50, 'math-rush': 50, 'color-trap': 10, 'holo-match': 1,
        'void-dodger': 15.0, 'glitch-hunt': 5, 'orbit-tracker': 20.0, 'cyber-typer': 500, 'cyber-pong': 5
    },

    SHOP: [
        { id: 't_default', type: 'THEME', name: 'Sistema Base', icon: 'fa-solid fa-desktop', desc: 'Interfaz estándar.', price: 0, val: { primary: '#3b82f6', text: '#e2e8f0' } },
        { id: 't_matrix', type: 'THEME', name: 'Hacker', icon: 'fa-solid fa-terminal', desc: 'Lluvia de código.', price: 1000, val: { primary: '#00ff00', text: '#00dd00' } },
        { id: 't_hot', type: 'THEME', name: 'Miami Vice', icon: 'fa-solid fa-sun', desc: 'Atardecer sintético.', price: 1500, val: { primary: '#f43f5e', text: '#fda4af' } },
        { id: 't_retro', type: 'THEME', name: 'GameBoy', icon: 'fa-solid fa-gamepad', desc: 'Monocromo nostálgico.', price: 2500, val: { primary: '#8bac0f', text: '#0f380f' } },
        { id: 't_void', type: 'THEME', name: 'Abismo', icon: 'fa-solid fa-ghost', desc: 'Modo ultra oscuro.', price: 3000, val: { primary: '#6366f1', text: '#818cf8' } },
        { id: 't_gold', type: 'THEME', name: 'Magnate', icon: 'fa-solid fa-crown', desc: 'Acabado en oro 24k.', price: 5000, val: { primary: '#fbbf24', text: '#fef3c7' } },
        { id: 't_crimson', type: 'THEME', name: 'Protocolo Rojo', icon: 'fa-solid fa-triangle-exclamation', desc: 'Estado de Alerta Máxima.', price: 3500, val: { primary: '#ef4444', text: '#fee2e2' } },
        { id: 't_blueprint', type: 'THEME', name: 'Arquitecto', icon: 'fa-solid fa-compass-drafting', desc: 'Plano técnico del sistema.', price: 4000, val: { primary: '#38bdf8', text: '#f0f9ff' } },
        { id: 't_win95', type: 'THEME', name: 'System 95', icon: 'fa-brands fa-windows', desc: 'Estilo clásico de escritorio.', price: 2000, val: { primary: '#000080', text: '#c0c0c0' } },
        { id: 't_paper', type: 'THEME', name: 'Paper OS', icon: 'fa-solid fa-note-sticky', desc: 'Estilo boceto en papel.', price: 2500, val: { primary: '#000000', text: '#333333' } },
        { id: 't_waste', type: 'THEME', name: 'Wasteland', icon: 'fa-solid fa-radiation', desc: 'Terminal post-nuclear.', price: 4000, val: { primary: '#fb923c', text: '#ffedd5' } },
        { id: 't_vhs', type: 'THEME', name: 'VHS 1985', icon: 'fa-solid fa-video', desc: 'Rebobina la cinta.', price: 3000, val: { primary: '#d946ef', text: '#fae8ff' } },
        { id: 't_nokia', type: 'THEME', name: 'Indestructible', icon: 'fa-solid fa-mobile-screen-button', desc: 'Snake 3310 Style.', price: 99999, val: { primary: '#4c5c44', text: '#000000' } },
        { id: 't_discord', type: 'THEME', name: 'Chat Mode', icon: 'fa-brands fa-discord', desc: 'Para gamers nocturnos.', price: 99999, val: { primary: '#5865F2', text: '#dcddde' } },
        { id: 't_vapor', type: 'THEME', name: 'Aesthetic', icon: 'fa-solid fa-landmark', desc: 'Vaporwave vibes.', price: 99999, val: { primary: '#ff71ce', text: '#01cdfe' } },
        
        // --- TEMAS NUEVOS CORREGIDOS ---
        {
            id: 't_hazard',
            type: 'THEME',
            name: 'POLICE LINE',
            desc: 'Zona restringida.',
            price: 1500,
            icon: 'fa-solid fa-exclamation-triangle', // Icono corregido
            class: 't_hazard'
        },
        {
            id: 't_y2k',
            type: 'THEME',
            name: 'ATOMIC PURPLE',
            desc: 'Carcasa translúcida.',
            price: 2000,
            icon: 'fa-solid fa-gamepad', // Icono corregido
            class: 't_y2k'
        },
        {
            id: 't_receipt',
            type: 'THEME',
            name: 'TICKET',
            desc: 'Consumo masivo.',
            price: 800,
            icon: 'fa-solid fa-file-invoice', // Icono corregido
            class: 't_receipt'
        },

      

        { id: 'p_circle', type: 'PARTICLE', name: 'Chispas', icon: 'fa-solid fa-circle', desc: 'Efecto estándar.', price: 0, val: 'circle' },
        { id: 'p_square', type: 'PARTICLE', name: 'Vóxeles', icon: 'fa-solid fa-cube', desc: 'Cubos de datos.', price: 500, val: 'square' },
        { id: 'p_star', type: 'PARTICLE', name: 'Polvo Estelar', icon: 'fa-solid fa-star', desc: 'Brilla intensamente.', price: 1200, val: 'star' },
        { id: 'p_code', type: 'PARTICLE', name: 'Glitches', icon: 'fa-solid fa-bug', desc: 'Errores del sistema.', price: 2000, val: 'code' },
        { id: 'p_bio', type: 'PARTICLE', name: 'Tóxico', icon: 'fa-solid fa-biohazard', desc: 'Residuos peligrosos.', price: 2500, val: 'bio' },
        { id: 'p_money', type: 'PARTICLE', name: 'Lluvia de Dinero', icon: 'fa-solid fa-sack-dollar', desc: '¡Estás forrado!', price: 5000, val: 'money' },
        { id: 'p_heart', type: 'PARTICLE', name: 'Vidas', icon: 'fa-solid fa-heart', desc: 'Amor pixelado.', price: 1500, val: 'heart' },
        { id: 'p_pizza', type: 'PARTICLE', name: 'Pizza Time', icon: 'fa-solid fa-pizza-slice', desc: 'Alimenta al sistema.', price: 2000, val: 'pizza' },
        { id: 'p_note', type: 'PARTICLE', name: 'Ritmo', icon: 'fa-solid fa-music', desc: 'Siente la música.', price: 1500, val: 'note' },
        { id: 'p_bubble', type: 'PARTICLE', name: 'Burbujas', icon: 'fa-solid fa-soap', desc: 'Limpio y fresco.', price: 1000, val: 'bubble' },

        { id: 'av_hacker', type: 'AVATAR', name: 'Sombrero Negro', icon: 'fa-user-secret', desc: 'Incógnito.', price: 800, val: 'fa-user-secret' },
        { id: 'av_robot', type: 'AVATAR', name: 'Androide T-800', icon: 'fa-robot', desc: 'Sin sentimientos.', price: 1500, val: 'fa-robot' },
        { id: 'av_alien', type: 'AVATAR', name: 'Visitante', icon: 'fa-brands fa-reddit-alien', desc: 'Viene en paz.', price: 2000, val: 'fa-brands fa-reddit-alien' },
        { id: 'av_ninja', type: 'AVATAR', name: 'Cyber Ninja', icon: 'fa-user-ninja', desc: 'Silencioso y letal.', price: 2500, val: 'fa-user-ninja' },
        { id: 'av_dragon', type: 'AVATAR', name: 'Elder Dragon', icon: 'fa-dragon', desc: 'Poder ancestral.', price: 5000, val: 'fa-dragon' },

        { id: 'c_xp_boost', type: 'CONSUMABLE', name: 'Chip de XP', icon: 'fa-solid fa-angles-up', desc: 'Doble XP próxima partida.', price: 300, val: 'xp_boost' },
        { id: 'c_shield', type: 'CONSUMABLE', name: 'Escudo Firewall', icon: 'fa-solid fa-shield-halved', desc: 'Evita 1 error fatal.', price: 500, val: 'shield' },

        { id: 'up_credit', type: 'HARDWARE', name: 'Credit Miner v1', icon: 'fa-solid fa-microchip', desc: '+10% Ganancia de Créditos (Pasivo).', price: 5000, val: 'credit_boost' },
        { id: 'up_xp', type: 'HARDWARE', name: 'Neural Link', icon: 'fa-solid fa-brain', desc: '+15% Ganancia de XP (Pasivo).', price: 4000, val: 'xp_boost' },
        { id: 'up_vip', type: 'HARDWARE', name: 'VIP Pass', icon: 'fa-solid fa-id-card', desc: 'Loot Box cuesta 400 CR en vez de 500.', price: 8000, val: 'vip_discount' }
    ],

    SKILLS: {
        SWAP: { id: 'swap', cost: 35, icon: '🔄', name: 'Swap' },
        ORACLE: { id: 'oracle', cost: 75, icon: '🔮', name: 'Peek' },
        SHIELD: { id: 'shield', cost: 150, icon: '🛡️', name: 'Shield' }
    },

    ACHIEVEMENTS: [
        { id: 'rich', name: 'Magnate', desc: 'Tener $500', check: (s) => s.credits >= 500, icon: '💎' },
        { id: 'pro', name: 'Veterano', desc: '50 Juegos', check: (s) => s.gamesPlayed >= 50, icon: '🎖️' },
        { id: 'sniper', name: 'Sniper', desc: 'Reflejos < 200ms', check: (s) => s.bestReflex > 0 && s.bestReflex < 200, icon: '⚡' }
    ],

    BATTLE_PASS: [
        { lvl: 2, type: 'CREDITS', val: 500, name: 'Bolsa de Créditos', icon: 'fa-coins' },
        { lvl: 3, type: 'PARTICLE', val: 'p_heart', name: 'FX: Corazones', icon: 'fa-heart' }, 
        // CAMBIO IMPORTANTE: NIVEL 5 AHORA DESBLOQUEA CYBER PONG
        { lvl: 5, type: 'GAME_UNLOCK', val: 'cyber-pong', name: 'JUEGO: Cyber Pong', icon: 'fa-table-tennis-paddle-ball' },
        { lvl: 7, type: 'CREDITS', val: 1000, name: 'Maletín de Fondos', icon: 'fa-briefcase' },
        { lvl: 10, type: 'THEME', val: 't_nokia', name: 'TEMA: Indestructible', icon: 'fa-mobile-screen-button' }, // Movimos Nokia al 10
        { lvl: 12, type: 'AVATAR', val: 'fa-user-secret', name: 'AVATAR: Hacker', icon: 'fa-user-secret' },
        { lvl: 15, type: 'HARDWARE', val: 'up_xp', name: 'MEJORA: Neural Link', icon: 'fa-brain' },
        { lvl: 20, type: 'THEME', val: 't_vapor', name: 'TEMA: Aesthetic', icon: 'fa-landmark' },
        { lvl: 25, type: 'THEME', val: 't_discord', name: 'TEMA: Chat Mode', icon: 'fa-brands fa-discord' },
        { lvl: 30, type: 'AVATAR', val: 'fa-dragon', name: 'AVATAR: Elder Dragon', icon: 'fa-dragon' },
        { lvl: 50, type: 'CREDITS', val: 10000, name: 'JACKPOT FINAL', icon: 'fa-trophy' }
    ],

    RANKS: [
        { lv: 1, name: "Vagabundo Digital", req: 0 },
        { lv: 5, name: "Script Kiddie", req: 1000 },
        { lv: 10, name: "Netrunner", req: 5000 },
        { lv: 20, name: "Elite Hacker", req: 15000 },
        { lv: 30, name: "System Architect", req: 30000 },
        { lv: 50, name: "Cyber God", req: 100000 }
    ],

    RIVALS: [
        { name: "THE_ARCHITECT", xp: 999999, rank: "GOD", color: "#ffd700" },
        { name: "ZeroCool", xp: 50000, rank: "LEGEND", color: "#ef4444" },
        { name: "AcidBurn", xp: 25000, rank: "ELITE", color: "#a855f7" },
        { name: "NeonGhost", xp: 12000, rank: "PRO", color: "#3b82f6" },
        { name: "GlitchWitch", xp: 6000, rank: "PRO", color: "#ec4899" },
        { name: "ByteBandit", xp: 3000, rank: "USER", color: "#10b981" },
        { name: "ScriptKid_99", xp: 800, rank: "NOOB", color: "#94a3b8" }
    ],

    AVATARS: [
        'fa-user-astronaut', 
        'fa-user-secret', 
        'fa-robot', 
        'fa-user-ninja', 
        'fa-headset', 
        'fa-dragon', 
        'fa-skull', 
        'fa-ghost' 
    ]
};

// --- EXPORTACIONES INDEPENDIENTES ---
export const TRIVIA_DATA = [
    { c: "CIENCIA", q: "¿Cuál es el elemento químico más abundante en el universo?", a: "Hidrógeno", i: ["Oxígeno", "Carbono", "Helio"] },
    { c: "GEOGRAFÍA", q: "¿Cuál es el río más largo del mundo?", a: "Amazonas", i: ["Nilo", "Yangtsé", "Misisipi"] },
    { c: "HISTORIA", q: "¿En qué año llegó el hombre a la Luna?", a: "1969", i: ["1965", "1972", "1959"] },
    { c: "CINE", q: "¿Quién dirigió la película 'El Laberinto del Fauno'?", a: "Guillermo del Toro", i: ["Alfonso Cuarón", "Alejandro Iñárritu", "Pedro Almodóvar"] },
    { c: "ARTE", q: "¿Quién pintó 'La noche estrellada'?", a: "Vincent van Gogh", i: ["Pablo Picasso", "Claude Monet", "Salvador Dalí"] },
    { c: "TECNOLOGÍA", q: "¿Qué significa 'CPU' en informática?", a: "Unidad Central de Procesamiento", i: ["Control de Procesos Unificado", "Centro de Programación Universal", "Computadora Personal Unificada"] },
    { c: "ANIMALES", q: "¿Cuál es el animal terrestre más rápido?", a: "Guepardo", i: ["León", "Gacela", "Caballo"] },
    { c: "MÚSICA", q: "¿Quién es conocido como el 'Rey del Pop'?", a: "Michael Jackson", i: ["Elvis Presley", "Freddie Mercury", "Prince"] },
    { c: "DEPORTES", q: "¿En qué deporte se utiliza una raqueta y un volante?", a: "Bádminton", i: ["Tenis", "Ping Pong", "Squash"] },
    { c: "LITERATURA", q: "¿Quién escribió 'Cien años de soledad'?", a: "Gabriel García Márquez", i: ["Mario Vargas Llosa", "Jorge Luis Borges", "Julio Cortázar"] },
    { c: "VIDEOJUEGOS", q: "¿Cómo se llama el fontanero más famoso de Nintendo?", a: "Mario", i: ["Luigi", "Wario", "Link"] },
    { c: "ASTRONOMÍA", q: "¿Cuál es el planeta más grande del sistema solar?", a: "Júpiter", i: ["Saturno", "Tierra", "Neptuno"] }
];

export const FLAGS_DATA = [
    { code: "ar", name: "Argentina", capital: "Buenos Aires" },
    { code: "au", name: "Australia", capital: "Canberra" },
    { code: "br", name: "Brasil", capital: "Brasilia" },
    { code: "ca", name: "Canadá", capital: "Ottawa" },
    { code: "cn", name: "China", capital: "Pekín" },
    { code: "co", name: "Colombia", capital: "Bogotá" },
    { code: "de", name: "Alemania", capital: "Berlín" },
    { code: "es", name: "España", capital: "Madrid" },
    { code: "fr", name: "Francia", capital: "París" },
    { code: "gb", name: "Reino Unido", capital: "Londres" },
    { code: "in", name: "India", capital: "Nueva Delhi" },
    { code: "it", name: "Italia", capital: "Roma" },
    { code: "jp", name: "Japón", capital: "Tokio" },
    { code: "mx", name: "México", capital: "C. de México" },
    { code: "ru", name: "Rusia", capital: "Moscú" },
    { code: "us", name: "Estados Unidos", capital: "Washington D.C." },
    { code: "za", name: "Sudáfrica", capital: "Pretoria" },
    { code: "kr", name: "Corea del Sur", capital: "Seúl" },
    { code: "pe", name: "Perú", capital: "Lima" },
    { code: "cl", name: "Chile", capital: "Santiago" },
    { code: "ve", name: "Venezuela", capital: "Caracas" },
    { code: "eg", name: "Egipto", capital: "El Cairo" },
    { code: "gr", name: "Grecia", capital: "Atenas" },
    { code: "nl", name: "Países Bajos", capital: "Ámsterdam" },
    { code: "se", name: "Suecia", capital: "Estocolmo" },
    { code: "ch", name: "Suiza", capital: "Berna" },
    { code: "pt", name: "Portugal", capital: "Lisboa" },
    { code: "be", name: "Bélgica", capital: "Bruselas" },
    { code: "at", name: "Austria", capital: "Viena" },
    { code: "dk", name: "Dinamarca", capital: "Copenhague" }
];