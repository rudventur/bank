// ===== Peoples Bank • Twin Edition — "Pro Investments" =====
// Features: Cash Flow Calendars, Maturity tracking, Reinvestment toggles, Projections.

function renderInvestments() {
    const container = document.getElementById('investments-list');
    if (!container) return;
    container.innerHTML = '';

    const investments = state.records.filter(r => r.isInvestment);

    if (investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <h3>No Active Investments</h3>
                <p style="color:var(--muted);">Investments track interest, dividends, and maturity dates over time.</p>
                <button class="btn-primary" onclick="showAddModal()">Create First Investment</button>
            </div>`;
        return;
    }

    // Separate: My Money Out (I invested) vs My Money In (Invested in me)
    const myInvestments = investments.filter(r => r.type === 'lender');
    const theirInvestments = investments.filter(r => r.type === 'borrower');

    const renderGroup = (list, title, color) => {
        if (list.length === 0) return;
        const heading = document.createElement('div');
        heading.style.cssText = `display:flex; align-items:center; gap:10px; margin: 30px 0 15px 0; border-bottom:2px solid ${color}; padding-bottom:5px;`;
        heading.innerHTML = `<h3 style="margin:0; color:${color};">${title}</h3> <span class="r-badge" style="background:${color}20; color:${color}">${list.length}</span>`;
        container.appendChild(heading);
        list.forEach(r => container.appendChild(buildInvestmentProCard(r)));
    };

    renderGroup(myInvestments, 'My Portfolio (Assets)', 'var(--invest)');
    renderGroup(theirInvestments, 'Liabilities (Invested in Me)', 'var(--primary)');
}

// --- The "Pro" Investment Card ---

function buildInvestmentProCard(r) {
    const isAsset = r.type === 'lender';
    const themeColor = isAsset ? 'var(--invest)' : 'var(--primary)';
    
    // Defaults for "Real World" simulation
    // In a real app, these might be saved in r.settings. Here we default them for the demo.
    const settings = r.investmentSettings || { 
        frequency: 'monthly', 
        reinvest: false, // If true, DRIP (Dividend Reinvestment Plan)
        maturityDate: null // When principal returns
    };

    const card = document.createElement('div');
    card.className = 'record-item investment';
    card.id = `invest-card-${r.id}`;

    // Basic Header
    const currentVal = r.amount + calculateInterest(r);
    
    card.innerHTML = `
        <div class="invest-header" onclick="toggleInvestmentStudio(${r.id})">
            <div style="flex:1; cursor:pointer;">
                <h4 style="margin:0;">
                    ${esc(r.person)} 
                    <span class="r-badge" style="background:${themeColor}20; color:${themeColor};">${isAsset ? 'Asset' : 'Liability'}</span>
                    ${r.importance ? getImportanceBadge(r.importance) : ''}
                </h4>
                <div style="font-size:0.85rem; color:var(--muted);">
                    ${r.date} &bull; ${r.interestRate || 0}% ${r.interestType} &bull; ${esc(r.reason)}
                </div>
            </div>
            <div style="text-align:right; cursor:pointer;">
                <div class="r-amount" style="color:${themeColor}">${currentVal.toFixed(2)} ${esc(r.currency)}</div>
                <div style="font-size:0.75rem; color:var(--muted);">Current Value</div>
                <button class="btn-sm btn-outline" style="margin-top:5px;">Show Analysis &darr;</button>
            </div>
        </div>

        <!-- THE STUDIO (Hidden by default) -->
        <div id="invest-studio-${r.id}" style="display:none; margin-top:20px; border-top:1px solid var(--border); padding-top:15px;">
            
            <!-- Studio Controls -->
            <div class="studio-controls" style="background:var(--bg); padding:10px; border-radius:8px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <div>
                    <label style="font-size:0.75rem; font-weight:bold;">Payout Freq</label>
                    <select id="inv-freq-${r.id}" onchange="updateInvestmentProjection(${r.id})">
                        <option value="monthly" ${settings.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="quarterly" ${settings.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                        <option value="annually" ${settings.frequency === 'annually' ? 'selected' : ''}>Annually</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:bold;">Maturity Date</label>
                    <input type="date" id="inv-mat-${r.id}" value="${settings.maturityDate || ''}" onchange="updateInvestmentProjection(${r.id})" placeholder="No end date">
                </div>
                <div style="display:flex; align-items:center; gap:5px; margin-top:15px;">
                    <input type="checkbox" id="inv-reinvest-${r.id}" ${settings.reinvest ? 'checked' : ''} onchange="updateInvestmentProjection(${r.id})">
                    <label for="inv-reinvest-${r.id}" style="cursor:pointer; font-size:0.85rem;">Reinvest Interest (DRIP)</label>
                </div>
                <div style="margin-left:auto; text-align:right;">
                    <div style="font-size:0.75rem; color:var(--muted);">Projected Total Return</div>
                    <div id="proj-total-${r.id}" style="font-weight:bold; color:${themeColor};">...</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:15px;">
                <!-- Left: Projection Table -->
                <div class="grid-container" style="max-height:300px; overflow-y:auto;">
                    <div class="grid-header">
                        <div style="width:80px">Date</div>
                        <div style="width:80px; text-align:right">Interest</div>
                        <div style="flex:1; text-align:right">Balance</div>
                    </div>
                    <div id="inv-grid-${r.id}">
                        <!-- Rows go here -->
                    </div>
                </div>

                <!-- Right: Calendar -->
                <div class="calendar-sidebar" style="height:300px; overflow-y:auto;">
                    <h4 style="margin:0 0 10px 0; font-size:0.9rem;">Cash Flow Calendar</h4>
                    <div id="inv-cal-${r.id}"></div>
                </div>
            </div>
        </div>
    `;
    return card;
}

// --- Investment Logic Engine ---

function toggleInvestmentStudio(id) {
    const studio = document.getElementById(`invest-studio-${id}`);
    const isVisible = studio.style.display !== 'none';
    
    // Close all others (optional, for neatness)
    document.querySelectorAll('[id^="invest-studio-"]').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        studio.style.display = 'block';
        updateInvestmentProjection(id); // Generate data on open
    }
}

function updateInvestmentProjection(id) {
    const r = state.records.find(rec => rec.id === id);
    if (!r) return;

    const freq = document.getElementById(`inv-freq-${id}`).value;
    const maturityDateVal = document.getElementById(`inv-mat-${id}`).value;
    const reinvest = document.getElementById(`inv-reinvest-${id}`).checked;

    const maturityDate = maturityDateVal ? new Date(maturityDateVal) : null;
    const startDate = new Date(r.date);
    
    // Stop if start date is invalid
    if (isNaN(startDate.getTime())) return;

    const grid = document.getElementById(`inv-grid-${id}`);
    const cal = document.getElementById(`inv-cal-${id}`);
    grid.innerHTML = '';
    cal.innerHTML = '';

    let currentDate = new Date(startDate);
    let currentBalance = r.amount;
    let totalInterestEarned = 0;
    let payoutDates = [];

    // Limit projection to 10 years or maturity, whichever comes first, to prevent infinite loops
    const maxDate = maturityDate || new Date(startDate.getFullYear() + 10, startDate.getMonth(), startDate.getDate());
    
    let iterationCount = 0;
    
    while (currentDate <= maxDate && iterationCount < 120) {
        // 1. Calculate Interest for this period
        // Simple daily interest approximation based on days in period
        // (This is a simplification. Real finance uses Day Count Conventions like 30/360)
        
        let daysInPeriod = 30; // default
        if (freq === 'monthly') daysInPeriod = 30;
        if (freq === 'quarterly') daysInPeriod = 91;
        if (freq === 'annually') daysInPeriod = 365;

        const rate = (r.interestRate || 0) / 100;
        const interest = currentBalance * rate * (daysInPeriod / 365);
        
        // 2. Update Balance
        let payout = 0;
        if (reinvest) {
            currentBalance += interest;
        } else {
            payout = interest; // Paid out to wallet
            totalInterestEarned += interest;
        }

        // 3. Check for Maturity (Return Principal)
        let isMaturity = false;
        if (maturityDate && (currentDate.getMonth() === maturityDate.getMonth() && currentDate.getFullYear() === maturityDate.getFullYear())) {
            if (!reinvest) {
                // If not reinvesting, we pay out the principal balance at maturity
                payout += currentBalance;
                isMaturity = true;
            }
            // Break after maturity? Usually yes.
            // We break after rendering this row.
        }

        // 4. Render Row
        const row = document.createElement('div');
        row.className = 'grid-row';
        
        const dateString = currentDate.toISOString().split('T')[0];
        payoutDates.push(new Date(currentDate));

        row.innerHTML = `
            <div style="width:80px; font-size:0.8rem; padding:8px;">${dateString}</div>
            <div style="width:80px; text-align:right; padding:8px; font-family:monospace;">
                <input type="text" value="${interest.toFixed(2)}" class="input-calc" style="width:60px; border:none;" onblur="recalcInvestmentRow(this, ${id})">
            </div>
            <div style="flex:1; text-align:right; padding:8px; font-weight:bold;">${currentBalance.toFixed(2)}</div>
        `;
        grid.appendChild(row);

        // 5. Advance Date
        if (freq === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
        else if (freq === 'quarterly') currentDate.setMonth(currentDate.getMonth() + 3);
        else currentDate.setFullYear(currentDate.getFullYear() + 1);

        if (isMaturity) break;
        iterationCount++;
    }

    // Update Totals
    const totalProjected = currentBalance + totalInterestEarned;
    document.getElementById(`proj-total-${id}`).innerText = totalProjected.toFixed(2) + ' ' + r.currency;

    // Render Mini Calendars
    renderMiniCalendarsGeneric(cal, payoutDates);
}

// Re-calculate if user manually edits a projected interest amount ("What If")
function recalcInvestmentRow(input, id) {
    // This is a visual "What If" update. 
    // In a full app, this would adjust the subsequent rows.
    // For this snippet, we just parse the math for the cell.
    resolveMath(input);
}

// --- Generic Calendar Renderer (Reused) ---
function renderMiniCalendarsGeneric(container, dates) {
    container.innerHTML = '';
    if (dates.length === 0) return;

    const startDate = dates[0];
    // Show next 3 months
    for (let m = 0; m < 3; m++) {
        const calDate = new Date(startDate);
        calDate.setMonth(calDate.getMonth() + m);
        
        const monthDiv = document.createElement('div');
        monthDiv.className = 'mini-calendar';
        
        const monthName = calDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthDiv.innerHTML = `<div class="cal-header">${monthName}</div>`;
        
        const daysGrid = document.createElement('div');
        daysGrid.className = 'cal-days';
        
        const firstDayOfMonth = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
        for(let i=0; i<firstDayOfMonth; i++) daysGrid.appendChild(document.createElement('div'));

        const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dayCell = document.createElement('div');
            dayCell.innerText = d;
            
            const hasEvent = dates.some(pd => 
                pd.getDate() === d && 
                pd.getMonth() === calDate.getMonth() && 
                pd.getFullYear() === calDate.getFullYear()
            );

            dayCell.className = 'cal-day' + (hasEvent ? ' has-payment' : '');
            daysGrid.appendChild(dayCell);
        }
        
        monthDiv.appendChild(daysGrid);
        container.appendChild(monthDiv);
    }
}

// --- Helpers (From previous code) ---
function calculateInterest(record) {
    if (!record.interestRate || record.interestType === 'none') return 0;
    const startDate = new Date(record.date);
    const now = new Date();
    const yearsElapsed = (now - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsElapsed <= 0) return 0;
    const rate = record.interestRate / 100;
    if (record.interestType === 'simple') return record.amount * rate * yearsElapsed;
    else if (record.interestType === 'compound') return record.amount * (Math.pow(1 + rate, yearsElapsed) - 1);
    return 0;
}

const IMPORTANCE_LEVELS = {
    low:      { label: 'Low',      color: '#888',    bg: 'rgba(136,136,136,0.12)' },
    normal:   { label: 'Normal',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    high:     { label: 'High',     color: '#ffa500', bg: 'rgba(255,165,0,0.12)' },
    critical: { label: 'Critical', color: '#ff4757', bg: 'rgba(255,71,87,0.15)' }
};
function getImportanceBadge(level) {
    const imp = IMPORTANCE_LEVELS[level] || IMPORTANCE_LEVELS.normal;
    return `<span class="r-badge" style="background:${imp.bg}; color:${imp.color}; font-size:0.7rem;">${imp.label}</span>`;
}
