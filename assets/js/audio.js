import { CONFIG } from './config.js';

export class AudioController {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        
        // Volúmenes iniciales (0.0 a 1.0)
        this.vol = { master: 0.5, sfx: 1.0, music: 0.5 };
        
        this.oscillators = [];
        this.ambienceOsc = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Cadena de Audio: Fuente -> Music/SFX Gain -> Master Gain -> Salida
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.vol.master;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.vol.sfx;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.vol.music;
        this.musicGain.connect(this.masterGain);

        this.initialized = true;
        this.playBootSound();
    }

    setVolume(type, value) {
        if (!this.initialized) return;
        // value entra de 0 a 100, lo pasamos a 0.0 - 1.0
        const norm = Math.max(0, Math.min(1, value / 100));
        this.vol[type] = norm;

        if(type === 'master') this.masterGain.gain.setTargetAtTime(norm, this.ctx.currentTime, 0.1);
        if(type === 'sfx') this.sfxGain.gain.setTargetAtTime(norm, this.ctx.currentTime, 0.1);
        if(type === 'music') this.musicGain.gain.setTargetAtTime(norm, this.ctx.currentTime, 0.1);
    }

    // --- GENERADORES DE SONIDO (SINTETIZADOR) ---

    playTone(freq, type = 'sine', duration = 0.1, vol = 0.5) {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain); // Conectar al bus de SFX
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() { this.playTone(800, 'triangle', 0.05, 0.2); }
    playHover() { this.playTone(400, 'sine', 0.05, 0.1); }
    
    playWin(intensity = 1) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        // Acorde mayor ascendente
        [0, 0.1, 0.2].forEach((delay, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(440 + (i * 110), now + delay);
            gain.gain.setValueAtTime(0.1 * intensity, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.5);
        });
    }

    playLose() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playBuy() {
        this.playTone(1200, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(1800, 'square', 0.1, 0.3), 100);
    }

    playBootSound(theme) {
        const BOOT_SOUNDS = {
            't_gameby':  () => { this.playTone(523,'square',0.1,0.2); setTimeout(()=>this.playTone(659,'square',0.1,0.2),120); setTimeout(()=>this.playTone(784,'square',0.15,0.2),240); },
            't_hack':    () => { for(let i=0;i<3;i++) setTimeout(()=>this.playTone(200+Math.random()*400,'square',0.06,0.15),i*80); },
            't_matrix':  () => { for(let i=0;i<3;i++) setTimeout(()=>this.playTone(200+Math.random()*400,'square',0.06,0.15),i*80); },
            't_diablo':  () => { this.playTone(80,'sawtooth',0.5,0.2); setTimeout(()=>this.playTone(55,'sawtooth',0.3,0.15),400); },
        };
        const fn = BOOT_SOUNDS[theme];
        if(fn) fn();
        else this.playTone(220, 'sine', 1.0, 0.1);
    }

    // --- MÚSICA GENERATIVA DE LOBBY ---
    setAmbience(theme) {
        if(!this.initialized) return;
        this.stopAmbience();

        // Configuración musical por tema
        const THEME_MUSIC = {
            't_hack':      { root:55,  scale:[0,3,7,10,14],  bpm:120, wave:'square',  pad:'sawtooth' },
            't_matrix':    { root:55,  scale:[0,3,7,10,14],  bpm:120, wave:'square',  pad:'sawtooth' },
            't_gameby':    { root:262, scale:[0,2,4,7,9],    bpm:160, wave:'square',  pad:'square'   },
            't_retro':     { root:220, scale:[0,2,4,7,9],    bpm:140, wave:'square',  pad:'square'   },
            't_starcraft': { root:65,  scale:[0,5,7,10,12],  bpm:90,  wave:'sine',    pad:'sine'     },
            't_diablo':    { root:55,  scale:[0,2,3,7,8],    bpm:70,  wave:'sawtooth',pad:'sawtooth' },
            't_outrun':    { root:82,  scale:[0,4,7,11,14],  bpm:130, wave:'sawtooth',pad:'sine'     },
            't_vhs':       { root:73,  scale:[0,3,7,10,14],  bpm:100, wave:'sawtooth',pad:'sine'     },
            't_gold':      { root:65,  scale:[0,4,7,11,14],  bpm:110, wave:'sine',    pad:'sine'     },
            't_xperror':   { root:110, scale:[0,1,6,7,11],   bpm:60,  wave:'square',  pad:'square'   },
        };

        const cfg = THEME_MUSIC[theme] || { root:55, scale:[0,3,7,10,12], bpm:100, wave:'sine', pad:'sine' };
        const now = this.ctx.currentTime;

        // Pad armónico — acorde de fondo sostenido
        this._ambienceNodes = [];
        const padGain = this.ctx.createGain();
        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.04, now + 2);
        padGain.connect(this.musicGain);

        cfg.scale.slice(0,3).forEach((interval, i) => {
            const freq = cfg.root * Math.pow(2, interval/12);
            const osc = this.ctx.createOscillator();
            osc.type = cfg.pad;
            osc.frequency.value = freq;
            // Pequeño detune para riqueza
            const detune = this.ctx.createGain();
            osc.detune.value = (i - 1) * 4;
            osc.connect(padGain);
            osc.start(now);
            this._ambienceNodes.push(osc);
        });

        // Arpeggio rítmico
        const stepSec = 60 / cfg.bpm / 2;
        let step = 0;
        const arpeggioGain = this.ctx.createGain();
        arpeggioGain.gain.value = 0.025;
        arpeggioGain.connect(this.musicGain);

        const playArpNote = () => {
            if(!this._arpeggioActive) return;
            const interval = cfg.scale[step % cfg.scale.length];
            const octave   = step % cfg.scale.length < 2 ? 2 : 1;
            const freq     = cfg.root * octave * Math.pow(2, interval/12);
            const t        = this.ctx.currentTime;

            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = cfg.wave;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepSec * 0.8);
            osc.connect(gain);
            gain.connect(arpeggioGain);
            osc.start(t);
            osc.stop(t + stepSec);

            step++;
            this._arpeggioTimer = setTimeout(playArpNote, stepSec * 1000);
        };

        this._arpeggioActive = true;
        this._arpeggioTimer  = setTimeout(playArpNote, 1500); // delay inicial
        this._ambienceNodes.push(arpeggioGain);
        this.ambienceOsc = this._ambienceNodes[0]; // compatibilidad
    }

    stopAmbience() {
        this._arpeggioActive = false;
        clearTimeout(this._arpeggioTimer);
        if(this._ambienceNodes) {
            this._ambienceNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch(e) {} });
            this._ambienceNodes = [];
        }
        if(this.ambienceOsc) { try { this.ambienceOsc.stop(); } catch(e) {} this.ambienceOsc = null; }
    }

    setTension(active) {
        if(!this.initialized) return;
        this._tensionActive = active;
        if(active) {
            // Añadir drone de tensión — oscilador pulsante
            if(this._tensionOsc) return;
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lfo  = this.ctx.createOscillator();
            const lfoG = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 55;
            lfo.type = 'sine';
            lfo.frequency.value = 4; // Vibrato rápido
            lfoG.gain.value = 8;
            lfo.connect(lfoG); lfoG.connect(osc.frequency);
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.5);
            osc.connect(gain); gain.connect(this.musicGain);
            osc.start(); lfo.start();
            this._tensionOsc  = osc;
            this._tensionGain = gain;
            this._tensionLfo  = lfo;
        } else {
            // Apagar tensión
            if(this._tensionGain) {
                this._tensionGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
                const t = this._tensionOsc;
                const l = this._tensionLfo;
                setTimeout(() => { try{t.stop();l.stop();}catch(e){} }, 900);
            }
            this._tensionOsc = null; this._tensionGain = null; this._tensionLfo = null;
        }
    }
}