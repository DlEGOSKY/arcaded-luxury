import { CONFIG } from './config.js';

export class ShopSystem {
    constructor() {
        this.inventory = ['t_default', 'p_circle', 'cc_default']; 
        this.equipped = {
            theme: 't_default',
            particle: 'p_circle',
            avatar: null,
            callcard: 'default'
        };
        this.container = document.getElementById('shop-grid');
    }

    load(data) {
        if (data.inventory) this.inventory = data.inventory;
        if (data.equipped) this.equipped = data.equipped;
    }

    init() {
        this.container = document.getElementById('shop-grid');
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        // --- SUPPLY CRATE — primer elemento del scroll ---
        const crate = document.createElement('div');
        crate.className = 'supply-crate';
        crate.id = 'supply-crate-wrap';
        crate.innerHTML = `
            <div class="sc-left">
                <div class="sc-icon-wrap">
                    <i class="fa-solid fa-box-open sc-icon"></i>
                </div>
                <div class="sc-info">
                    <div class="sc-name">CAJA DE SUMINISTROS</div>
                    <div class="sc-desc">Drop aleatorio de créditos · 1–10,000 CR</div>
                    <div class="sc-odds">
                        <span class="sc-odd common">30% ×0.2</span>
                        <span class="sc-odd rare">40% ×1</span>
                        <span class="sc-odd epic">20% ×2</span>
                        <span class="sc-odd legendary">9% ×10</span>
                        <span class="sc-odd jackpot">1% JACKPOT</span>
                    </div>
                </div>
            </div>
            <button class="sc-btn" id="btn-buy-lootbox">
                <i class="fa-solid fa-lock-open"></i>
                <span>ABRIR</span>
                <span class="sc-cost">500 CR</span>
            </button>`;
        this.container.appendChild(crate);
        // Re-bind del botón lootbox (estaba en el HTML estático, ahora es dinámico)
        const lootBtn = crate.querySelector('#btn-buy-lootbox');
        if(lootBtn) lootBtn.onclick = () => window.app.buyLootBox();

        const categories = {
            'THEME':     { label: 'INTERFAZ VISUAL',       icon: 'fa-desktop'         },
            'CALLCARD':  { label: 'TARJETA DE RESULTADO',  icon: 'fa-id-badge'        },
            'LOOTBOX':   { label: 'CAJAS PREMIUM',         icon: 'fa-boxes-stacked'   },
            'PARTICLE':  { label: 'EFECTOS FX',            icon: 'fa-sparkles'        },
            'AVATAR':    { label: 'IDENTIDAD',              icon: 'fa-user-astronaut'  },
            'HARDWARE':  { label: 'MEJORAS DE SISTEMA',    icon: 'fa-microchip'       },
            'CONSUMABLE':{ label: 'CONSUMIBLES',           icon: 'fa-flask'           }
        };

        for (const [type, meta] of Object.entries(categories)) {
            const items = CONFIG.SHOP.filter(i => i.type === type);
            if (items.length === 0) continue;

            // Título de sección
            const header = document.createElement('div');
            header.className = 'vault-section-title';
            header.innerHTML = `<i class="fa-solid ${meta.icon}"></i> ${meta.label}`;
            this.container.appendChild(header);

            // Grid
            const grid = document.createElement('div');
            grid.className = `vault-category-grid layout-${type.toLowerCase()}`;

            items.forEach(item => {
                const isOwned    = this.inventory.includes(item.id) || item.price === 0;
                const isEquipped =
                    (type === 'THEME'    && this.equipped.theme    === item.id) ||
                    (type === 'PARTICLE' && this.equipped.particle === item.id) ||
                    (type === 'CALLCARD' && this.equipped.callcard === item.val) ||
                    (type === 'AVATAR'   && window.app.stats.avatar === item.val && isOwned);

                // Color de acento
                let ic = '#3b82f6';
                if      (type === 'THEME'    && item.val?.primary) ic = item.val.primary;
                else if (type === 'PARTICLE') {
                    const pMap = { star:'#fbbf24', code:'#22c55e', square:'#f472b6',
                                   bio:'#84cc16', money:'#22c55e', heart:'#ec4899',
                                   pizza:'#f97316', note:'#a855f7', bubble:'#38bdf8' };
                    const key = Object.keys(pMap).find(k => item.id.includes(k));
                    if(key) ic = pMap[key];
                }
                else if (type === 'CALLCARD') {
                    const ccMap = {
                        default:'#3b82f6', bsod:'#0078d7', matrix:'#00ff41',
                        fallout:'#95b800', vcity:'#ff6ec7', doom:'#ef4444',
                        minecraft:'#4aab2a', tron:'#00f5ff', discord:'#5865f2',
                        hacker:'#00ff88', retro:'#ff00ff', gold:'#ffd700'
                    };
                    ic = ccMap[item.val] || '#3b82f6';
                }
                else if (type === 'LOOTBOX') {
                    const lbRarityColors = { rare:'#3b82f6', epic:'#a855f7', legendary:'#fbbf24' };
                    ic = lbRarityColors[item.rarity] || '#3b82f6';
                }
                else if (type === 'AVATAR')    ic = item.price >= 5000 ? '#ef4444' : item.price >= 2500 ? '#a855f7' : '#3b82f6';
                else if (type === 'CONSUMABLE') ic = '#f59e0b';
                else if (type === 'HARDWARE')   ic = '#06b6d4';

                // Acción
                let actionHTML = '';
                if (isEquipped) {
                    actionHTML = `<div class="scv2-equipped-badge"><i class="fa-solid fa-check"></i> EQUIPADO</div>`;
                } else if (isOwned) {
                    if (type === 'CONSUMABLE' || type === 'LOOTBOX') {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.buy('${item.id}')">
                            <i class="fa-solid fa-plus"></i> COMPRAR MÁS ($${item.price})
                        </button>`;
                    } else {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.equip('${item.id}')">
                            <i class="fa-solid fa-check-double"></i> EQUIPAR
                        </button>`;
                    }
                } else {
                    if (type === 'THEME') {
                        actionHTML = `
                            <button class="scv2-btn" onclick="window.app.shop.buy('${item.id}')">
                                <i class="fa-solid fa-lock-open"></i> $${item.price.toLocaleString()}
                            </button>
                            <button class="scv2-preview-btn" onclick="window.app.shop.preview('${item.id}')">
                                <i class="fa-solid fa-eye"></i> PREVIEW 5s
                            </button>`;
                    } else if (type === 'LOOTBOX') {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.buyAndOpen('${item.id}')">
                            <i class="fa-solid fa-box-open"></i> ABRIR $${item.price.toLocaleString()}
                        </button>`;
                    } else {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.buy('${item.id}')">
                            <i class="fa-solid fa-lock-open"></i> $${item.price.toLocaleString()}
                        </button>`;
                    }
                }

                const card = document.createElement('div');
                card.className = `shop-card-v2 ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;
                card.style.setProperty('--ic', ic);

                card.innerHTML = `
                    <div class="scv2-icon" style="color:${ic};">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="scv2-name">${item.name}</div>
                    <div class="scv2-desc">${item.desc}</div>
                    ${item.lore ? '<div style="font-size:0.52rem;color:#1e293b;font-family:monospace;margin:2px 0 4px;font-style:italic;">' + item.lore + '</div>' : ''}
                    <div class="scv2-action">${actionHTML}</div>`;

                grid.appendChild(card);
            });

            this.container.appendChild(grid);
        }
    }

    buy(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if (!item) return;

        if (this.inventory.includes(itemId) && item.type !== 'CONSUMABLE') return;

        if (window.app.credits >= item.price) {
            window.app.credits -= item.price;
            
            if (!this.inventory.includes(itemId)) {
                this.inventory.push(itemId);
            }
            
            window.app.audio.playBuy();
            window.app.showToast("COMPRA EXITOSA", `Has adquirido: ${item.name}`, "success");
            
            if (item.type !== 'CONSUMABLE') {
                this.equip(itemId);
            } else {
                this.saveAndRefresh();
            }
        } else {
            window.app.audio.playLose();
            window.app.showToast("ERROR DE FONDOS", "Créditos insuficientes", "danger");
        }
    }

    // Previsualiza un tema durante 5 segundos sin comprarlo
    preview(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if(!item || item.type !== 'THEME') return;
        window.app.audio.playClick();

        const previousTheme = this.equipped.theme;
        const isOwned = this.inventory.includes(itemId);

        // Crear modal de preview
        const existing = document.getElementById('theme-preview-modal');
        if(existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'theme-preview-modal';
        modal.style.cssText = [
            'position:fixed','inset:0','z-index:99995',
            'background:rgba(0,0,0,0.85)','backdrop-filter:blur(6px)',
            'display:flex','align-items:center','justify-content:center',
            'animation:wFadeIn 0.2s ease',
        ].join(';');

        // Aplicar tema inmediatamente para el preview
        window.app.applyTheme(itemId);

        const color = window.getComputedStyle(document.documentElement)
            .getPropertyValue('--primary').trim() || '#3b82f6';

        modal.innerHTML = '<div style="width:min(480px,92vw);background:var(--bg-dark,#040810);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">' +
            // Header
            '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;">' +
            '<div><div style="font-family:var(--font-display);font-size:0.85rem;color:white;letter-spacing:3px;">' + item.name.toUpperCase() + '</div>' +
            (item.lore ? '<div style="font-size:0.58rem;color:#475569;font-family:monospace;margin-top:2px;font-style:italic;">' + item.lore + '</div>' : '') +
            '</div>' +
            '<button id="tpm-close" style="background:none;border:none;color:#475569;cursor:pointer;font-size:1rem;padding:4px 8px;">✕</button>' +
            '</div>' +
            // Mini lobby preview
            '<div style="padding:12px 14px;background:var(--bg-dark,#040810);">' +
            '<div style="font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:2px;margin-bottom:8px;">VISTA PREVIA</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">' +
            ['fa-bolt','fa-brain','fa-globe','fa-palette'].map((icon,i) =>
                '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:10px 6px;text-align:center;transition:all 0.15s;" ' +
                'onmouseenter="this.style.borderColor=\'var(--primary)\';this.style.boxShadow=\'0 0 12px rgba(var(--primary-rgb,59,130,246),0.3)\'" ' +
                'onmouseleave="this.style.borderColor=\'rgba(255,255,255,0.07)\';this.style.boxShadow=\'\'">' +
                '<i class="fa-solid ' + icon + '" style="font-size:1.1rem;color:var(--primary);"></i>' +
                '<div style="font-size:0.5rem;color:#334155;font-family:monospace;margin-top:4px;">JUEGO ' + (i+1) + '</div>' +
                '</div>'
            ).join('') +
            '</div>' +
            '<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;">' +
            '<div style="width:28px;height:28px;border-radius:50%;border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:0.7rem;"><i class="fa-solid fa-user-astronaut"></i></div>' +
            '<div><div style="font-family:var(--font-display);font-size:0.62rem;color:white;letter-spacing:2px;">AGENTE</div>' +
            '<div style="font-size:0.5rem;color:#334155;font-family:monospace;">RANGO · LVL ' + (window.app.stats.level||1) + '</div></div>' +
            '<div style="margin-left:auto;font-family:var(--font-display);font-size:0.7rem;color:var(--primary);">' + (window.app.credits||0).toLocaleString() + ' CR</div>' +
            '</div></div>' +
            // Acciones
            '<div style="padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;">' +
            '<button id="tpm-cancel" style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#64748b;border-radius:8px;padding:10px;font-family:var(--font-display);font-size:0.65rem;letter-spacing:2px;cursor:pointer;">CANCELAR</button>' +
            (isOwned
                ? '<button id="tpm-equip" style="flex:1;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.4);color:#60a5fa;border-radius:8px;padding:10px;font-family:var(--font-display);font-size:0.65rem;letter-spacing:2px;cursor:pointer;">EQUIPAR</button>'
                : '<button id="tpm-buy" style="flex:1;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);color:#fbbf24;border-radius:8px;padding:10px;font-family:var(--font-display);font-size:0.65rem;letter-spacing:2px;cursor:pointer;"><i class=\\"fa-solid fa-coins\\"></i> ' + (item.price||0).toLocaleString() + ' CR</button>'
            ) +
            '</div></div>';

        document.body.appendChild(modal);

        const close = () => {
            modal.remove();
            window.app.applyTheme(previousTheme);
        };

        modal.querySelector('#tpm-close').onclick = close;
        modal.querySelector('#tpm-cancel').onclick = close;
        modal.onclick = (e) => { if(e.target === modal) close(); };

        if(isOwned) {
            modal.querySelector('#tpm-equip').onclick = () => {
                this.equipped.theme = itemId;
                window.app.save();
                modal.remove();
                window.app.showToast('TEMA EQUIPADO', item.name, 'success');
                this.init();
            };
        } else {
            modal.querySelector('#tpm-buy').onclick = () => {
                modal.remove();
                window.app.applyTheme(previousTheme);
                this.buy(itemId);
            };
        }
    }

    buyAndOpen(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if(!item || item.type !== 'LOOTBOX') return;
        if(window.app.credits < item.price){
            window.app.audio.playLose();
            window.app.showToast("FONDOS INSUFICIENTES", `Necesitas ${item.price} CR`, "danger");
            return;
        }
        window.app.credits -= item.price;
        window.app.audio.playBuy();
        // Usar la tabla de drops de la caja premium
        const boxCfg = CONFIG.PREMIUM_BOXES[itemId];
        if(!boxCfg){ this.saveAndRefresh(); return; }
        // Llamar a buyLootBox con drops custom
        window.app.openPremiumBox(boxCfg);
        this.saveAndRefresh();
    }

    equip(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if (!item) return;

        if (item.type === 'THEME') {
            this.equipped.theme = itemId;
            window.app.applyTheme(item.id);
        } 
        else if (item.type === 'PARTICLE') {
            this.equipped.particle = itemId;
        }
        else if (item.type === 'CALLCARD') {
            this.equipped.callcard = item.val;
            window.app.showToast('TARJETA EQUIPADA', item.name, 'success');
        }
        else if (item.type === 'AVATAR') {
            window.app.stats.avatar = item.val;
        }

        window.app.audio.playClick();
        this.saveAndRefresh();
    }

    saveAndRefresh() {
        window.app.save();
        window.app.updateUI();
        const shopCr = document.getElementById('shop-credits');
        if(shopCr) shopCr.innerText = window.app.credits.toLocaleString();
        this.render();
    }
}