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

function buildInvestmentCard(r) {
    const interest = calculateInterest(r);
    const totalValue = r.amount + interest;
    const div = document.createElement('div');
    div.className = 'record-item investment';

    const interestLabel = r.interestType === 'none'
        ? 'No interest'
        : `${r.interestRate}% ${r.interestType === 'compound' ? 'compound' : 'simple'} / year`;

    div.innerHTML = `
        <div class="r-info" style="flex:1;">
            <h4>
                ${esc(r.person)}
                <span class="r-badge badge-invest">Investment</span>
            </h4>
            <div class="r-meta">
                <span>${r.date}</span> &bull;
                <span>${esc(r.reason) || 'No reason'}</span>
            </div>
            <div class="interest-tag">${interestLabel}</div>
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
            <button class="btn-del" onclick="deleteRecord(${r.id})" style="margin-top:8px;">Remove</button>
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
