// ===== Peoples Bank • Twin Edition — Investments Module =====
// Investments are loans where the lender cannot demand repayment.
// Lender earns interest based on the contract terms.
// Early payouts reduce the outstanding principal — interest stops
// accruing on the paid-out portion from that date onwards.

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

function renderInvestments() {
    const container = document.getElementById('investments-list');
    if (!container) return;
    container.innerHTML = '';

    // --- Live Calculator (always at top) ---
    container.appendChild(buildCalculatorPanel());

    const investments = state.records.filter(r => r.isInvestment);

    if (investments.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <div class="empty-icon">💰</div>
            No investments recorded yet.<br>
            <span style="font-size:0.85rem; color:var(--muted);">
                Toggle "Investment" when recording a deal to create one.
            </span>`;
        container.appendChild(empty);
        return;
    }

    const myInvestments = investments.filter(r => r.type === 'lender');
    const theirInvestments = investments.filter(r => r.type === 'borrower');

    if (myInvestments.length > 0) {
        const heading = document.createElement('h3');
        heading.style.cssText = 'color: var(--invest); margin: 20px 0 15px 0; font-size: 1.1rem;';
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

// --- Live Investment Calculator ---
function buildCalculatorPanel() {
    const div = document.createElement('div');
    div.className = 'panel calc-panel';
    div.innerHTML = `
        <h2 style="font-size:1rem; margin-bottom:12px;">
            🧮 Investment Calculator
            <small style="font-size:0.75rem; font-weight:normal; color:var(--muted);">Live preview</small>
        </h2>
        <div class="form-grid-3">
            <div>
                <label class="field-label" style="color:var(--invest);">Principal</label>
                <input type="number" id="calc-principal" value="1000" step="0.01" oninput="updateCalc()">
            </div>
            <div>
                <label class="field-label" style="color:var(--invest);">Rate (%)</label>
                <input type="number" id="calc-rate" value="4.7" step="0.1" oninput="updateCalc()">
            </div>
            <div>
                <label class="field-label" style="color:var(--invest);">Years</label>
                <input type="number" id="calc-years" value="1" step="0.5" min="0" oninput="updateCalc()">
            </div>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:10px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--muted); cursor:pointer;">
                <input type="radio" name="calc-type" value="simple" onchange="updateCalc()"> Simple
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--muted); cursor:pointer;">
                <input type="radio" name="calc-type" value="compound" checked onchange="updateCalc()"> Compound
            </label>
        </div>
        <div id="calc-result" class="calc-result"></div>
    `;

    // Populate on next tick
    setTimeout(updateCalc, 50);
    return div;
}

function updateCalc() {
    const principal = parseFloat(document.getElementById('calc-principal').value) || 0;
    const rate = parseFloat(document.getElementById('calc-rate').value) || 0;
    const years = parseFloat(document.getElementById('calc-years').value) || 0;
    const type = document.querySelector('input[name="calc-type"]:checked')?.value || 'compound';

    const r = rate / 100;
    let interest = 0;
    if (type === 'simple') {
        interest = principal * r * years;
    } else {
        interest = principal * (Math.pow(1 + r, years) - 1);
    }
    const total = principal + interest;
    const perMonth = years > 0 ? interest / (years * 12) : 0;
    const perDay = years > 0 ? interest / (years * 365.25) : 0;

    const resultEl = document.getElementById('calc-result');
    if (!resultEl) return;

    resultEl.innerHTML = `
        <div class="calc-grid">
            <div class="calc-stat">
                <div class="calc-label">PRINCIPAL</div>
                <div class="calc-val">${principal.toFixed(2)}</div>
            </div>
            <div class="calc-stat">
                <div class="calc-label">INTEREST</div>
                <div class="calc-val" style="color:var(--invest);">+${interest.toFixed(2)}</div>
            </div>
            <div class="calc-stat">
                <div class="calc-label">TOTAL DUE</div>
                <div class="calc-val" style="color:var(--invest);">${total.toFixed(2)}</div>
            </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--muted); margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
            <span>Per day: <strong style="color:var(--invest);">+${perDay.toFixed(4)}</strong></span>
            <span>Per month: <strong style="color:var(--invest);">+${perMonth.toFixed(2)}</strong></span>
        </div>
    `;
}

// --- Build Investment Card ---
function buildInvestmentCard(r) {
    const calc = calculateInvestmentState(r);
    const div = document.createElement('div');
    div.className = 'record-item investment';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';

    const imp = r.importance || 'normal';
    const impStyle = IMPORTANCE_LEVELS[imp] || IMPORTANCE_LEVELS.normal;
    div.style.borderLeftColor = impStyle.color;

    const interestLabel = r.interestType === 'none'
        ? 'No interest'
        : `${r.interestRate}% ${r.interestType === 'compound' ? 'compound' : 'simple'} / year`;

    const contactBits = [
        r.contactPhone ? `Tel: ${esc(r.contactPhone)}` : '',
        r.contactEmail ? `${esc(r.contactEmail)}` : '',
        r.accountDetails ? `Acc: ${esc(r.accountDetails)}` : ''
    ].filter(Boolean).join(' &bull; ');

    const payouts = r.payouts || [];
    const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
    const isSettled = calc.remainingTotal <= 0.01;

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
            <div class="r-info" style="flex:1;">
                <h4>
                    ${esc(r.person)}
                    <span class="r-badge badge-invest">Investment</span>
                    ${getImportanceBadge(imp)}
                    ${isSettled ? '<span class="r-badge badge-paid">Settled</span>' : ''}
                </h4>
                <div class="r-meta">
                    <span>Started ${r.date}</span> &bull;
                    <span>${esc(r.reason) || 'No reason'}</span>
                </div>
                <div class="interest-tag">${interestLabel}</div>
                ${contactBits ? `<div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">${contactBits}</div>` : ''}
                ${r.contractNote ? `<div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">📝 ${esc(r.contractNote)}</div>` : ''}
                ${r.proof ? '<div style="font-size:0.75rem; color:var(--invest); margin-top:5px;">📎 Proof attached</div>' : ''}
            </div>
            <div style="text-align:right; min-width: 130px;">
                <div class="r-amount invest-amount">${calc.remainingTotal.toFixed(2)} ${esc(r.currency)}</div>
                <div style="font-size:0.7rem; color:var(--muted);">outstanding</div>
            </div>
        </div>

        <!-- Live breakdown -->
        <div class="invest-breakdown">
            <div class="ib-row">
                <span class="ib-label">Principal</span>
                <span class="ib-val">${r.amount.toFixed(2)} ${esc(r.currency)}</span>
            </div>
            <div class="ib-row">
                <span class="ib-label">Interest earned</span>
                <span class="ib-val" style="color:var(--invest);">+${calc.totalInterest.toFixed(2)} ${esc(r.currency)}</span>
            </div>
            ${totalPayouts > 0 ? `
                <div class="ib-row">
                    <span class="ib-label">Early payouts</span>
                    <span class="ib-val" style="color:var(--primary);">-${totalPayouts.toFixed(2)} ${esc(r.currency)}</span>
                </div>
            ` : ''}
            <div class="ib-row ib-total">
                <span class="ib-label">Current value</span>
                <span class="ib-val" style="color:var(--invest);">${calc.remainingTotal.toFixed(2)} ${esc(r.currency)}</span>
            </div>
            ${calc.dailyAccrual > 0 && !isSettled ? `
                <div style="font-size:0.7rem; color:var(--muted); text-align:right; margin-top:4px;">
                    Growing at +${calc.dailyAccrual.toFixed(4)} ${esc(r.currency)} / day
                </div>
            ` : ''}
        </div>

        ${payouts.length > 0 ? `
            <div class="payout-history">
                <div class="ph-label">PAYOUT HISTORY</div>
                ${payouts.map(p => `
                    <div class="ph-row">
                        <span>${p.date}</span>
                        <span style="color:var(--primary);">-${p.amount.toFixed(2)} ${esc(r.currency)}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;">
            ${!isSettled ? `<button class="btn-sm" onclick="promptEarlyPayout(${r.id})" style="border-color:var(--primary); color:var(--primary);">+ Record Payout</button>` : ''}
            <button class="btn-sm" onclick="exportRecord(${r.id})">Export</button>
            <button class="btn-del" onclick="deleteRecord(${r.id})">Remove</button>
        </div>
    `;
    return div;
}

// --- Early Payout Flow ---
function promptEarlyPayout(recordId) {
    const record = state.records.find(r => r.id === recordId);
    if (!record) return;

    const calc = calculateInvestmentState(record);
    const amountStr = prompt(
        `Record early payout for ${record.person}\n\nOutstanding: ${calc.remainingTotal.toFixed(2)} ${record.currency}\n\nHow much is being paid?`,
        calc.remainingTotal.toFixed(2)
    );

    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return showToast('Invalid amount', 'error');
    if (amount > calc.remainingTotal + 0.01) return showToast('Amount exceeds outstanding value', 'error');

    if (!record.payouts) record.payouts = [];
    record.payouts.push({
        id: Date.now(),
        amount: amount,
        date: new Date().toISOString().split('T')[0]
    });

    // Update totalPaid too so it shows consistent across views
    record.totalPaid = (record.totalPaid || 0) + amount;

    // Mark as settled if effectively cleared
    const newCalc = calculateInvestmentState(record);
    if (newCalc.remainingTotal <= 0.01) {
        record.status = 'paid';
    }

    save();
    renderInvestments();
    render();
    showToast(`Payout of ${amount.toFixed(2)} recorded`);
}

// --- Segmented Interest Calculation ---
// Interest accrues on the remaining principal between payouts.
// Returns { totalInterest, remainingPrincipal, remainingTotal, dailyAccrual }
function calculateInvestmentState(record) {
    const result = {
        totalInterest: 0,
        remainingPrincipal: record.amount,
        remainingTotal: record.amount,
        dailyAccrual: 0
    };

    if (!record.interestRate || record.interestType === 'none') {
        // No interest — simple payout tracking
        const payouts = record.payouts || [];
        const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
        result.remainingTotal = Math.max(0, record.amount - totalPayouts);
        result.remainingPrincipal = result.remainingTotal;
        return result;
    }

    const startDate = new Date(record.date);
    const now = new Date();
    if (now <= startDate) return result;

    const rate = record.interestRate / 100;
    const isCompound = record.interestType === 'compound';

    // Build timeline of events: start -> payouts -> now
    const payouts = (record.payouts || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentPrincipal = record.amount;
    let totalInterestEarned = 0;
    let lastDate = startDate;

    // Iterate each segment
    for (const payout of payouts) {
        const payoutDate = new Date(payout.date);
        if (payoutDate <= lastDate) {
            // Payout on or before start — just reduce principal
            currentPrincipal -= payout.amount;
            if (currentPrincipal < 0) currentPrincipal = 0;
            continue;
        }

        const segYears = (payoutDate - lastDate) / (1000 * 60 * 60 * 24 * 365.25);
        const segInterest = isCompound
            ? currentPrincipal * (Math.pow(1 + rate, segYears) - 1)
            : currentPrincipal * rate * segYears;

        totalInterestEarned += segInterest;

        // Apply payout — reduces principal + accumulated interest
        // Payout first eats accumulated interest, then principal
        const totalValueBeforePayout = currentPrincipal + segInterest;
        const afterPayout = Math.max(0, totalValueBeforePayout - payout.amount);

        // For simplicity in compound tracking, treat the remaining value as new principal
        currentPrincipal = afterPayout;
        totalInterestEarned = 0; // reset — baked into new principal for compound
        // But keep a cumulative interest record for display
        // We track separately below.

        lastDate = payoutDate;
    }

    // Final segment: last event -> now
    const finalSegYears = (now - lastDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (finalSegYears > 0 && currentPrincipal > 0) {
        const finalInterest = isCompound
            ? currentPrincipal * (Math.pow(1 + rate, finalSegYears) - 1)
            : currentPrincipal * rate * finalSegYears;
        totalInterestEarned += finalInterest;
    }

    // Recompute display values from original principal + payouts for clarity
    const totalPayouts = (record.payouts || []).reduce((s, p) => s + p.amount, 0);
    const hypotheticalWithoutPayouts = calculateRawInterest(record.amount, rate, isCompound,
        (now - startDate) / (1000 * 60 * 60 * 24 * 365.25));

    // For display: show actual interest accrued (segmented) and remaining total
    result.totalInterest = Math.max(0, totalInterestEarned + (currentPrincipal - record.amount + totalPayouts));
    // simpler: interest = what's left + payouts - original principal
    const displayInterest = (currentPrincipal + totalInterestEarned) + totalPayouts - record.amount;
    result.totalInterest = Math.max(0, displayInterest);

    result.remainingPrincipal = currentPrincipal;
    result.remainingTotal = Math.max(0, currentPrincipal + totalInterestEarned);

    // Daily accrual on current remaining
    if (currentPrincipal > 0) {
        const dailyRate = isCompound
            ? (Math.pow(1 + rate, 1 / 365.25) - 1)
            : (rate / 365.25);
        result.dailyAccrual = (currentPrincipal + totalInterestEarned) * dailyRate;
    }

    return result;
}

function calculateRawInterest(principal, rate, isCompound, years) {
    if (years <= 0) return 0;
    return isCompound
        ? principal * (Math.pow(1 + rate, years) - 1)
        : principal * rate * years;
}

// --- Legacy alias for code that calls calculateInterest(record) ---
function calculateInterest(record) {
    return calculateInvestmentState(record).totalInterest;
}

// --- Summary stats ---
function getInvestmentSummary() {
    const investments = state.records.filter(r => r.isInvestment);
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalValue = 0;

    investments.forEach(r => {
        if (r.type === 'lender') {
            const calc = calculateInvestmentState(r);
            totalPrincipal += r.amount;
            totalInterest += calc.totalInterest;
            totalValue += calc.remainingTotal;
        }
    });

    return { count: investments.length, totalPrincipal, totalInterest, totalValue };
}
