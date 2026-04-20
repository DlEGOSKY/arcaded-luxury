// systems/invest.js
// Mini-sistema de inversion diaria ("Mercado Negro"): riesgo vs recompensa
// que se resuelve al dia siguiente. Extraido de main.js.
//
// Contrato: recibe la instancia `app` con:
//   app.invest (date, amount, risk, resolved, result, history)
//   app.credits
//   app.stats (investCount, investHighStake, investProfit)
//   app.audio (playClick vive en showToast path, no se usa aqui)
//   app.save(), app.updateUI()
//   app.showToast(title, msg, type)
//   app.renderDailyScreen()  (refresh de la daily screen tras invertir)
//
// BUG FIX aplicado: en la version anterior, el push al history usaba
// `inv.date / inv.amount / inv.risk` pero la variable `inv` no estaba
// declarada — lanzaba ReferenceError la primera vez que se resolvia
// una inversion pendiente. Ahora se lee correctamente `app.invest.date`
// etc. ANTES de mutar `app.invest` (sino no tendriamos la data).

const RISKS = {
    LOW:    { min: -0.05, max: 0.15 },
    MEDIUM: { min: -0.20, max: 0.40 },
    HIGH:   { min: -0.50, max: 1.00 },
};

const RISK_RANGES = {
    LOW:    '-5%/+15%',
    MEDIUM: '-20%/+40%',
    HIGH:   '-50%/+100%',
};

const INVEST_OPTIONS = [
    { risk: 'LOW',    label: 'Bajo',  pct: '-5%/+15%',   color: '#10b981', amounts: [100, 500, 1000] },
    { risk: 'MEDIUM', label: 'Medio', pct: '-20%/+40%',  color: '#f59e0b', amounts: [500, 2000, 5000] },
    { risk: 'HIGH',   label: 'Alto',  pct: '-50%/+100%', color: '#ef4444', amounts: [1000, 5000, 10000] },
];

// -------------------------------------------------------------
// CHECK: resuelve una inversion de ayer si corresponde
// -------------------------------------------------------------
export function check(app) {
    if(!app.invest || !app.invest.date || !app.invest.amount) return;
    const today = new Date().toDateString();
    if(app.invest.date === today || app.invest.resolved) return;

    const range  = RISKS[app.invest.risk] || RISKS.LOW;
    const pct    = range.min + Math.random() * (range.max - range.min);
    const result = Math.round(app.invest.amount * pct);

    // Historial ANTES de mutar: aqui esta el fix del bug (inv no declarada).
    if(!app.invest.history) app.invest.history = [];
    app.invest.history.unshift({
        date:   app.invest.date,
        amount: app.invest.amount,
        risk:   app.invest.risk,
        result,
    });
    if(app.invest.history.length > 10) app.invest.history.pop();

    app.invest.result   = result;
    app.invest.resolved = true;
    app.credits        += result;

    if(result > 0) {
        app.stats.investProfit = (app.stats.investProfit || 0) + result;
    }

    const sign = result >= 0 ? '+' : '';
    setTimeout(() => app.showToast(
        result >= 0 ? 'INVERSIÓN RENTABLE' : 'PÉRDIDA DE CAPITAL',
        `${sign}${result.toLocaleString()} CR sobre ${app.invest.amount.toLocaleString()} CR`,
        result >= 0 ? 'gold' : 'danger',
    ), 1200);

    app.save();
}

// -------------------------------------------------------------
// MAKE: registra una nueva inversion para hoy
// -------------------------------------------------------------
export function make(app, amount, risk) {
    if(app.credits < amount) {
        app.showToast('FONDOS INSUFICIENTES', `Necesitas ${amount.toLocaleString()} CR`, 'danger');
        return;
    }

    const today = new Date().toDateString();
    if(app.invest && app.invest.date === today && app.invest.amount > 0 && !app.invest.resolved) {
        app.showToast('YA INVERTISTE HOY', 'Espera el resultado de mañana', 'danger');
        return;
    }

    app.credits -= amount;
    app.stats.investCount = (app.stats.investCount || 0) + 1;
    if(risk === 'HIGH') {
        app.stats.investHighStake = (app.stats.investHighStake || 0) + amount;
    }

    app.invest = {
        date:     today,
        amount,
        risk,
        resolved: false,
        result:   0,
        history:  (app.invest && app.invest.history) || [],
    };

    app.save();
    app.updateUI();
    app.renderDailyScreen();
    app.showToast('INVERSIÓN REGISTRADA', `${amount.toLocaleString()} CR · ${risk}`, 'purple');
}

// -------------------------------------------------------------
// RENDER PANEL (devuelve HTML string, se inserta en la daily screen)
// -------------------------------------------------------------
export function renderPanel(app) {
    const inv       = app.invest || {};
    const today     = new Date().toDateString();
    const hasActive = inv.date === today && inv.amount > 0 && !inv.resolved;
    const hasResult = inv.resolved && inv.date && inv.date !== today;
    const history   = inv.history || [];

    const histHTML = renderHistory(history);

    if(hasActive) return renderActivePanel(inv, histHTML);
    if(hasResult) return renderResultPanel(app, inv, histHTML);
    return renderNewInvestmentPanel(histHTML);
}

function renderHistory(history) {
    if(history.length === 0) return '';
    let html = '<div style="margin-top:7px;border-top:1px solid rgba(255,255,255,0.05);padding-top:5px;">';
    html += '<div style="font-size:0.5rem;color:#1e293b;font-family:monospace;letter-spacing:2px;margin-bottom:3px;">HISTORIAL</div>';
    history.slice(0, 3).forEach(h => {
        const col  = h.result >= 0 ? '#10b981' : '#ef4444';
        const sign = h.result >= 0 ? '+' : '';
        html += `<div style="display:flex;justify-content:space-between;font-size:0.55rem;font-family:monospace;color:#334155;padding:1px 0;">` +
            `<span>${(h.date || '').slice(0, 6)} ${h.risk}</span>` +
            `<span style="color:${col};">${sign}${(h.result || 0).toLocaleString()} CR</span>` +
            `</div>`;
    });
    html += '</div>';
    return html;
}

function renderActivePanel(inv, histHTML) {
    return '<div style="margin:0 0 6px;padding:12px 14px;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.25);border-radius:10px;">' +
        `<div style="font-size:0.6rem;color:#a855f7;font-family:monospace;"><i class="fa-solid fa-clock"></i> INVERSIÓN ACTIVA &middot; ${inv.amount.toLocaleString()} CR &middot; ${inv.risk} &middot; ${RISK_RANGES[inv.risk] || ''}</div>` +
        `<div style="font-size:0.55rem;color:#475569;font-family:monospace;margin-top:3px;">Resultado mañana</div>` +
        histHTML + '</div>';
}

function renderResultPanel(app, inv, histHTML) {
    const col  = inv.result >= 0 ? '#10b981' : '#ef4444';
    const sign = inv.result >= 0 ? '+' : '';
    const pct  = inv.amount > 0 ? Math.round((inv.result / inv.amount) * 100) : 0;

    let reinvestBtns = '';
    if(inv.amount <= app.credits) {
        reinvestBtns = '<div style="display:flex;gap:6px;margin-top:8px;">' +
            '<div style="font-size:0.5rem;color:#334155;font-family:monospace;letter-spacing:1px;align-self:center;">REINVERTIR:</div>' +
            `<button onclick="window.app.makeInvestment(${inv.amount},'${inv.risk}')" ` +
            `style="background:${col}15;border:1px solid ${col}30;border-radius:5px;padding:3px 8px;font-size:0.55rem;color:${col};font-family:monospace;cursor:pointer;">` +
            `${inv.amount.toLocaleString()} CR · ${inv.risk}</button>` +
            '</div>';
    }

    return `<div style="margin:0 0 6px;padding:12px 14px;background:${col}0a;border:1px solid ${col}30;border-radius:10px;">` +
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
        `<div style="font-size:0.58rem;color:${col};font-family:monospace;"><i class="fa-solid fa-chart-line"></i> RESULTADO DE AYER</div>` +
        `<div style="font-size:0.58rem;color:${col};font-family:monospace;">${sign}${pct}%</div></div>` +
        `<div style="font-family:var(--font-display);font-size:0.95rem;color:${col};">${sign}${inv.result.toLocaleString()} CR</div>` +
        `<div style="font-size:0.52rem;color:#334155;font-family:monospace;">sobre ${inv.amount.toLocaleString()} CR invertidos</div>` +
        reinvestBtns + histHTML + '</div>';
}

function renderNewInvestmentPanel(histHTML) {
    let html = '<div style="margin:0 0 6px;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;">';
    html += '<div style="font-size:0.55rem;color:#334155;font-family:monospace;letter-spacing:2px;margin-bottom:8px;"><i class="fa-solid fa-chart-bar"></i> MERCADO NEGRO</div>';
    html += '<div style="display:flex;gap:6px;">';

    INVEST_OPTIONS.forEach(o => {
        html += `<div style="flex:1;background:rgba(255,255,255,0.02);border:1px solid ${o.color}20;border-radius:7px;padding:7px 8px;">`;
        html += `<div style="font-size:0.58rem;color:${o.color};font-family:var(--font-display);letter-spacing:1px;">${o.label}</div>`;
        html += `<div style="font-size:0.52rem;color:#475569;font-family:monospace;margin-bottom:5px;">${o.pct}</div>`;
        html += '<div style="display:flex;gap:3px;flex-wrap:wrap;">';
        o.amounts.forEach(a => {
            const lbl = a >= 1000 ? `${a / 1000}k` : String(a);
            html += `<button onclick="window.app.makeInvestment(${a},'${o.risk}')" ` +
                `style="background:${o.color}15;border:1px solid ${o.color}25;border-radius:4px;` +
                `padding:2px 5px;font-size:0.52rem;color:${o.color};font-family:monospace;cursor:pointer;">` +
                `${lbl}</button>`;
        });
        html += '</div></div>';
    });

    html += '</div>' + histHTML + '</div>';
    return html;
}
