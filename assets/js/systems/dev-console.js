// systems/dev-console.js
// Mini consola de debug accesible desde el shell: comandos `rich`, `god`,
// `lvl N`, `card <id>`, `reset`, `help`, `clear`.
// Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.credits, app.stats
//   app.updateUI(), app.save()
//   app.shop.inventory (opcional — el comando `card` lo valida)

export function toggle() {
    const c = document.getElementById('debug-console');
    if(!c) return;
    if(c.classList.contains('hidden')) {
        c.classList.remove('hidden');
        document.getElementById('console-input')?.focus();
    } else {
        c.classList.add('hidden');
    }
}

export function log(msg, type = '') {
    const out = document.getElementById('console-output');
    if(!out) return;
    out.innerHTML += `<div class="console-msg ${type}">${msg}</div>`;
    out.scrollTop = out.scrollHeight;
}

export function exec(app, cmd) {
    log(`> ${cmd}`);

    const input = document.getElementById('console-input');
    if(input) input.value = '';

    const parts = cmd.toLowerCase().trim().split(' ');
    const verb  = parts[0];

    switch(verb) {
        case 'rich': {
            app.credits += 10000;
            app.updateUI();
            app.save();
            log('+10,000 CR INJECTED', 'sys');
            break;
        }
        case 'god': {
            app.credits    += 99999;
            app.stats.level = 50;
            app.stats.xp    = 0;
            app.updateUI();
            app.save();
            log('GOD MODE — 99,999 CR + LVL 50', 'sys');
            break;
        }
        case 'lvl': {
            const n = parseInt(parts[1]) || 10;
            app.stats.level = n;
            app.stats.xp    = 0;
            app.updateUI();
            app.save();
            log(`LEVEL SET TO ${n}`, 'sys');
            break;
        }
        case 'card': {
            const id = parts[1];
            if(id && app.shop) {
                app.shop.inventory.push(id);
                app.save();
                log(`ITEM UNLOCKED: ${id}`, 'sys');
            }
            break;
        }
        case 'reset': {
            localStorage.removeItem('arcade_save');
            location.reload();
            break;
        }
        case 'help': {
            log('COMMANDS: rich | god | lvl N | card [item_id] | reset | clear', 'sys');
            break;
        }
        case 'clear': {
            const out = document.getElementById('console-output');
            if(out) out.innerHTML = '';
            break;
        }
        default: /* no-op */ break;
    }
}

// -------------------------------------------------------------
// showFloatingText — flotador central para UI feedback
// (vivia junto a la consola en main.js; mismo archivo utilitario)
// -------------------------------------------------------------
export function showFloatingText(text, color) {
    const el = document.createElement('div');
    el.className = 'popup-score';
    el.innerText = text;
    el.style.color     = color || 'white';
    el.style.left      = '50%';
    el.style.top       = '35%';
    el.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}
