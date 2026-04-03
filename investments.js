// ===== Peoples Bank • Twin Edition — Investments Module =====
// Investments are loans where the lender cannot demand repayment.
// Instead, the lender earns interest based on the contract terms.

function renderInvestments() {
    const container = document.getElementById('investments-list');
    if (!container) return;
    container.innerHTML = '';

    const investments = state.records.filter(r => r.isInvestment);

    if (investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                No investments recorded yet.<br>
                <span style="font-size:0.85rem; color:var(--muted);">
                    Toggle "This is an Investment" when recording a loan to create one.
                </span>
            </div>`;
        return;
    }

    // Separate by type: lender investments (I invested) vs borrower investments (someone invested in me)
    const myInvestments = investments.filter(r => r.type === 'lender');
    const theirInvestments = investments.filter(r => r.type === 'borrower');

    if (myInvestments.length > 0) {
        const heading = document.createElement('h3');
        heading.style.cssText = 'color: var(--invest); margin: 0 0 15px 0; font-size: 1.1rem;';
        heading.textContent = 'My Investments (I Invested)';
        container.appendChild(heading);
        myInvestments.forEach(r => container.appendChild(buildInvestmentCard(r)));
    }

    if (theirInvestments.length > 0) {
        const heading = document.createElement('h3');
        heading.style.cssText = 'color: var(--primary); margin: 20px 0 15px 0; font-size: 1.1rem;';
        heading.textContent = 'Received Investments (Invested In Me)';
        container.appendChild(heading);
        theirInvestments.forEach(r => container.appendChild(buildInvestmentCard(r)));
    }
}

// Importance levels with badge colours
const IMPORTANCE_LEVELS = {
    low:      { label: 'Low',      color: '#888',    bg: 'rgba(136,136,136,0.12)' },
    normal:   { label: 'Normal',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    high:     { label: 'High',     color: '#ffa500', bg: 'rgba(255,165,0,0.12)' },
    critical: { label: 'Critical', color: '#ff4757', bg: 'rgba(255,71,87,0.15)' }
};

function getImportanceBadge(level) {
    const imp = IMPORTANCE_LEVELS[level] || IMPORTANCE_LEVELS.normal;
    return `<span class="r-badge" style="background:${imp.bg}; color:${imp.color};">${imp.label}</span>`;
}

function buildInvestmentCard(r) {
    const interest = calculateInterest(r);
    const totalValue = r.amount + interest;
    const div = document.createElement('div');
    div.className = 'record-item investment';

    const imp = r.importance || 'normal';
    const impStyle = IMPORTANCE_LEVELS[imp] || IMPORTANCE_LEVELS.normal;

    // Colour the left border by importance
    div.style.borderLeftColor = impStyle.color;

    const interestLabel = r.interestType === 'none'
        ? 'No interest'
        : `${r.interestRate}% ${r.interestType === 'compound' ? 'compound' : 'simple'} / year`;

    const contactBits = [
        r.contactPhone ? `Tel: ${esc(r.contactPhone)}` : '',
        r.contactEmail ? `${esc(r.contactEmail)}` : '',
        r.accountDetails ? `Acc: ${esc(r.accountDetails)}` : ''
    ].filter(Boolean).join(' &bull; ');

    div.innerHTML = `
        <div class="r-info" style="flex:1;">
            <h4>
                ${esc(r.person)}
                <span class="r-badge badge-invest">Investment</span>
                ${getImportanceBadge(imp)}
            </h4>
            <div class="r-meta">
                <span>${r.date}</span> &bull;
                <span>${esc(r.reason) || 'No reason'}</span>
            </div>
            <div class="interest-tag">${interestLabel}</div>
            ${contactBits ? `<div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">${contactBits}</div>` : ''}
            ${r.contractNote ? `<div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">📝 ${esc(r.contractNote)}</div>` : ''}
            ${r.proof ? '<div style="font-size:0.75rem; color:var(--invest); margin-top:5px;">📎 Proof attached</div>' : ''}
            ${interest > 0 ? `
                <div style="margin-top:8px; font-size:0.85rem;">
                    <span style="color:var(--muted);">Principal:</span> ${r.amount.toFixed(2)} ${esc(r.currency)}
                    &nbsp;&bull;&nbsp;
                    <span style="color:var(--invest);">Interest earned:</span> +${interest.toFixed(2)} ${esc(r.currency)}
                </div>
            ` : ''}
        </div>
        <div style="text-align:right; min-width: 120px;">
            <div class="r-amount invest-amount">${totalValue.toFixed(2)} ${esc(r.currency)}</div>
            <div style="font-size:0.75rem; color:var(--muted);">total value</div>
            <button class="btn-sm" onclick="exportRecord(${r.id})" style="margin-top:5px;">Export</button>
            <button class="btn-del" onclick="deleteRecord(${r.id})" style="margin-top:4px;">Remove</button>
        </div>
    `;
    return div;
}

// --- Interest Calculation ---
function calculateInterest(record) {
    if (!record.interestRate || record.interestType === 'none') return 0;

    const startDate = new Date(record.date);
    const now = new Date();
    const yearsElapsed = (now - startDate) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsElapsed <= 0) return 0;

    const rate = record.interestRate / 100;

    if (record.interestType === 'simple') {
        // Simple interest: P * r * t
        return record.amount * rate * yearsElapsed;
    } else if (record.interestType === 'compound') {
        // Compound interest (annual): P * ((1 + r)^t - 1)
        return record.amount * (Math.pow(1 + rate, yearsElapsed) - 1);
    }

    return 0;
}

// --- Investment Summary Stats ---
function getInvestmentSummary() {
    const investments = state.records.filter(r => r.isInvestment);
    let totalPrincipal = 0;
    let totalInterest = 0;

    investments.forEach(r => {
        if (r.type === 'lender') {
            totalPrincipal += r.amount;
            totalInterest += calculateInterest(r);
        }
    });

    return {
        count: investments.length,
        totalPrincipal,
        totalInterest,
        totalValue: totalPrincipal + totalInterest
    };
}
