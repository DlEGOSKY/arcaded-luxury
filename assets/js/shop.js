import { CONFIG } from './config.js';

export class ShopSystem {
    constructor() {
        this.inventory = ['t_default', 'p_circle']; 
        this.equipped = {
            theme: 't_default',
            particle: 'p_circle',
            avatar: null 
        };
        this.container = document.getElementById('shop-grid');
    }

    load(data) {
        if (data.inventory) this.inventory = data.inventory;
        if (data.equipped) this.equipped = data.equipped;
    }

    init() {
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const categories = {
            'THEME': 'INTERFAZ VISUAL',
            'PARTICLE': 'EFECTOS FX',
            'AVATAR': 'IDENTIDAD',
            'HARDWARE': 'MEJORAS DE SISTEMA', // <--- NUEVO
            'CONSUMABLE': 'CONSUMIBLES'
        };

        for (const [type, title] of Object.entries(categories)) {
            const items = CONFIG.SHOP.filter(i => i.type === type);
            if (items.length === 0) continue;

            // Título de Sección
            const header = document.createElement('div');
            header.className = 'shop-section-title';
            header.innerHTML = `<span>// ${title}</span><div class="line"></div>`;
            this.container.appendChild(header);

            // Grid
            const grid = document.createElement('div');
            // Añadimos una clase extra según el tipo (ej: 'layout-theme', 'layout-avatar')
            grid.className = `shop-category-grid layout-${type.toLowerCase()}`;
            
            items.forEach(item => {
                const isOwned = this.inventory.includes(item.id) || item.price === 0;
                
                let isEquipped = false;
                if (type === 'THEME' && this.equipped.theme === item.id) isEquipped = true;
                if (type === 'PARTICLE' && this.equipped.particle === item.id) isEquipped = true;
                if (type === 'AVATAR' && window.app.stats.avatar === item.val && isOwned) isEquipped = true;

                // --- LÓGICA DE COLOR (VINCULADA A CONFIG) ---
                let accentColor = '#3b82f6'; // Azul por defecto
                
                if (type === 'THEME' && item.val && item.val.primary) {
                    accentColor = item.val.primary;
                }
                else if (type === 'PARTICLE') {
                    if(item.id.includes('star')) accentColor = '#fbbf24'; // Oro
                    if(item.id.includes('code')) accentColor = '#22c55e'; // Verde
                    if(item.id.includes('square')) accentColor = '#f472b6'; // Rosa
                }
                else if (type === 'AVATAR') {
                    // Colores por rareza/precio
                    if(item.price >= 5000) accentColor = '#ef4444'; // Rojo Legendario
                    else if(item.price >= 2500) accentColor = '#a855f7'; // Morado Epico
                    else if(item.price >= 1500) accentColor = '#3b82f6'; // Azul Raro
                    else accentColor = '#10b981'; // Verde Común
                }
                
                else if (type === 'CONSUMABLE') accentColor = '#f59e0b';
                else if (type === 'HARDWARE') accentColor = '#06b6d4'; // Cyan Tecnológico para Hardware

                // Crear Tarjeta
                const card = document.createElement('div');
                card.className = `shop-card ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;
                
                // Aplicar estilos dinámicos (Borde y Brillo del color del item)
                card.style.setProperty('--item-color', accentColor);
                
                let actionHtml = '';
                
                if (isEquipped) {
                    actionHtml = `
                        <div class="shop-badge equipped-badge">
                            <i class="fa-solid fa-check"></i> EQUIPADO
                        </div>`;
                } else if (isOwned) {
                    if (type === 'CONSUMABLE') {
                         actionHtml = `<button class="btn btn-shop" onclick="window.app.shop.buy('${item.id}')">COMPRAR MÁS ($${item.price})</button>`;
                    } else {
                        actionHtml = `<button class="btn btn-shop" style="border-color:${accentColor}; color:${accentColor}" onclick="window.app.shop.equip('${item.id}')">EQUIPAR</button>`;
                    }
                } else {
                    actionHtml = `<button class="btn btn-shop" style="background:${accentColor}; border-color:${accentColor}; color:${type==='THEME' && item.id==='t_gold' ? 'black' : 'white'}" onclick="window.app.shop.buy('${item.id}')">COMPRAR $${item.price}</button>`;
                }

                card.innerHTML = `
                    <div class="shop-icon" style="color: ${accentColor}; text-shadow: 0 0 15px ${accentColor}40;">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="shop-info">
                        <h3 style="color:${isOwned ? 'white' : '#94a3b8'}">${item.name}</h3>
                        <p>${item.desc}</p>
                    </div>
                    <div class="shop-action">${actionHtml}</div>
                `;
                
                // Efecto visual especial para "Abismo"
                if(item.id === 't_void') {
                    card.style.background = 'radial-gradient(circle, #1e1b4b 0%, #000000 100%)';
                }
                // Efecto visual para "Luxury"
                if(item.id === 't_gold') {
                    card.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(0,0,0,0) 100%)';
                }

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
        else if (item.type === 'AVATAR') {
            window.app.stats.avatar = item.val;
            window.app.audio.playClick();
        }

        window.app.audio.playClick();
        this.saveAndRefresh();
    }

    saveAndRefresh() {
        window.app.save();
        window.app.updateUI(); 
        document.getElementById('shop-credits').innerText = window.app.credits;
        this.render(); 
    }
}