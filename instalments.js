// ===== Peoples Bank • Twin Edition — Instalments Module =====
// Create repayment plans for records, track individual payments.
// Supports two modes:
//   - Even split: pick N payments + frequency, auto-generated
//   - Custom:     hand-pick amount + date for each payment
// Each plan also gets a mini calendar view showing due dates.

function renderInstalments() {
    const container = document.getElementById('instalments-list');
    if (!container) return;
    container.innerHTML = '';

    // Show "create plan" form for eligible records
    const eligibleRecords = state.records.filter(r => {
        const hasPlan = state.instalmentPlans.some(p => p.recordId === r.id);
        const remaining = r.amount - (r.totalPaid || 0);
        return !hasPlan && remaining > 0.01 && !r.isInvestment;
    });

    // Create Plan section
    if (eligibleRecords.length > 0) {
        const createPanel = document.createElement('div');
        createPanel.className = 'panel';
        createPanel.innerHTML = `
            <h2 style="font-size:1.1rem;">Create Instalment Plan</h2>
            <label class="field-label">Select a Record</label>
            <select id="inst-record" onchange="onInstalmentRecordSelect()">
                <option value="">-- Choose a record --</option>
                ${eligibleRecords.map(r => {
                    const remaining = (r.amount - (r.totalPaid || 0)).toFixed(2);
                    return `<option value="${r.id}">${esc(r.person)} — ${remaining} ${esc(r.currency)} (${r.type === 'lender' ? 'they owe you' : 'you owe'})</option>`;
                }).join('')}
            </select>

            <div id="inst-form-fields" style="display:none;">
                <!-- Mode toggle -->
                <div class="inst-mode-switch">
                    <button type="button" class="inst-mode-btn active" data-mode="even" onclick="setInstMode('even')">Even Split</button>
                    <button type="button" class="inst-mode-btn" data-mode="custom" onclick="setInstMode('custom')">Custom Amounts</button>
                </div>

                <!-- Even split fields -->
                <div id="inst-mode-even">
                    <div class="form-grid-3">
                        <div>
                            <label class="field-label">Number of Payments</label>
                            <input type="number" id="inst-count" min="2" max="120" value="3" placeholder="e.g. 6">
                        </div>
                        <div>
                            <label class="field-label">Frequency</label>
                            <select id="inst-freq">
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Bi-weekly</option>
                                <option value="monthly" selected>Monthly</option>
                            </select>
                        </div>
                        <div>
                            <label class="field-label">Start Date</label>
                            <input type="date" id="inst-start">
                        </div>
                    </div>
                    <div id="inst-preview" style="margin-bottom:14px;"></div>
                </div>

                <!-- Custom amounts fields -->
                <div id="inst-mode-custom" style="display:none;">
                    <div class="custom-hint">
                        Set each payment's amount and due date individually.
                        Totals must match the outstanding balance.
                    </div>
                    <div id="custom-rows"></div>
                    <button type="button" class="btn-sm" onclick="addCustomRow()" style="margin-bottom:10px;">+ Add Payment</button>
                    <div id="custom-summary" class="custom-summary"></div>
                </div>

                <button class="btn-primary" onclick="createInstalmentPlan()" style="margin-top:10px;">Create Repayment Plan</button>
            </div>
        `;
        container.appendChild(createPanel);
    }

    // Existing plans
    if (state.instalmentPlans.length === 0 && eligibleRecords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                No instalment plans yet.<br>
                <span style="font-size:0.85rem; color:var(--muted);">
                    Create a loan or debt first, then set up a repayment schedule here.
                </span>
            </div>`;
        return;
    }

    // Mark overdue payments
    markOverduePayments();

    state.instalmentPlans.forEach(plan => {
        container.appendChild(buildPlanCard(plan));
    });
}

// Current mode for the create-plan form
let _instMode = 'even';

function setInstMode(mode) {
    _instMode = mode;
    document.querySelectorAll('.inst-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.getElementById('inst-mode-even').style.display = mode === 'even' ? 'block' : 'none';
    document.getElementById('inst-mode-custom').style.display = mode === 'custom' ? 'block' : 'none';
    if (mode === 'custom') {
        const rowsEl = document.getElementById('custom-rows');
        if (rowsEl && rowsEl.children.length === 0) {
            // Seed with 3 rows
            addCustomRow();
            addCustomRow();
            addCustomRow();
        }
        updateCustomSummary();
    }
}

function onInstalmentRecordSelect() {
    const sel = document.getElementById('inst-record');
    const fields = document.getElementById('inst-form-fields');
    const startInput = document.getElementById('inst-start');

    if (sel.value) {
        fields.style.display = 'block';
        startInput.valueAsDate = new Date();
        _instMode = 'even';
        setInstMode('even');
        // Reset custom rows
        document.getElementById('custom-rows').innerHTML = '';
        previewInstalments();
    } else {
        fields.style.display = 'none';
    }
}

function previewInstalments() {
    const recordId = parseInt(document.getElementById('inst-record').value);
    const count = parseInt(document.getElementById('inst-count').value) || 3;
    const record = state.records.find(r => r.id === recordId);
    if (!record) return;

    const remaining = record.amount - (record.totalPaid || 0);
    const perPayment = remaining / count;

    const preview = document.getElementById('inst-preview');
    preview.innerHTML = `
        <div style="padding:10px; background:var(--panel); border-radius:8px; font-size:0.9rem;">
            <span style="color:var(--muted);">Each payment:</span>
            <strong style="color:var(--primary);"> ${perPayment.toFixed(2)} ${esc(record.currency)}</strong>
            <span style="color:var(--muted);"> x ${count} = ${remaining.toFixed(2)} ${esc(record.currency)}</span>
        </div>
    `;
}

// --- Custom rows management ---
function addCustomRow(amount, date) {
    const rowsEl = document.getElementById('custom-rows');
    if (!rowsEl) return;

    const idx = rowsEl.children.length;
    const row = document.createElement('div');
    row.className = 'custom-row';
    const defaultDate = date || (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + idx);
        return d.toISOString().split('T')[0];
    })();

    row.innerHTML = `
        <span class="cr-num">${idx + 1}</span>
        <input type="number" step="0.01" placeholder="Amount" class="cr-amount" value="${amount != null ? amount : ''}" oninput="updateCustomSummary()">
        <input type="date" class="cr-date" value="${defaultDate}">
        <button type="button" class="cr-del" onclick="removeCustomRow(this)" title="Remove">✕</button>
    `;
    rowsEl.appendChild(row);
    updateCustomSummary();
}

function removeCustomRow(btn) {
    const row = btn.closest('.custom-row');
    if (row) row.remove();
    // Renumber
    document.querySelectorAll('#custom-rows .custom-row .cr-num').forEach((el, i) => {
        el.textContent = i + 1;
    });
    updateCustomSummary();
}

function updateCustomSummary() {
    const recordId = parseInt(document.getElementById('inst-record').value);
    const record = state.records.find(r => r.id === recordId);
    const summary = document.getElementById('custom-summary');
    if (!record || !summary) return;

    const remaining = record.amount - (record.totalPaid || 0);
    let total = 0;
    document.querySelectorAll('#custom-rows .cr-amount').forEach(inp => {
        total += parseFloat(inp.value) || 0;
    });

    const diff = remaining - total;
    const matches = Math.abs(diff) < 0.01;

    summary.innerHTML = `
        <div class="cs-row">
            <span>Target</span>
            <strong>${remaining.toFixed(2)} ${esc(record.currency)}</strong>
        </div>
        <div class="cs-row">
            <span>Your total</span>
            <strong style="color:${matches ? 'var(--primary)' : '#ffa500'};">${total.toFixed(2)} ${esc(record.currency)}</strong>
        </div>
        <div class="cs-row">
            <span>Difference</span>
            <strong style="color:${matches ? 'var(--primary)' : '#ff4757'};">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}</strong>
        </div>
        ${!matches ? '<div class="cs-warn">⚠ Totals must match target before saving</div>' : '<div class="cs-ok">✓ Matches target — ready to save</div>'}
    `;
}

// Attach preview update listeners
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
        if (e.target.id === 'inst-count' || e.target.id === 'inst-freq') {
            previewInstalments();
        }
    });
});

function createInstalmentPlan() {
    const recordId = parseInt(document.getElementById('inst-record').value);
    const record = state.records.find(r => r.id === recordId);
    if (!record) return showToast("Record not found", "error");

    const remaining = record.amount - (record.totalPaid || 0);
    let payments = [];
    let meta = {};

    if (_instMode === 'even') {
        const count = parseInt(document.getElementById('inst-count').value);
        const freq = document.getElementById('inst-freq').value;
        const startDate = document.getElementById('inst-start').value;

        if (!count || count < 2 || !startDate) {
            return showToast("Please fill in all fields (min 2 payments)", "error");
        }

        const perPayment = remaining / count;
        let currentDate = new Date(startDate);

        for (let i = 0; i < count; i++) {
            const dueDate = new Date(currentDate);
            const isLast = i === count - 1;
            const paidSoFar = perPayment * i;
            const thisAmount = isLast ? remaining - paidSoFar : perPayment;

            payments.push({
                id: Date.now() + i,
                amount: Math.round(thisAmount * 100) / 100,
                dueDate: dueDate.toISOString().split('T')[0],
                paidDate: null,
                status: 'pending'
            });

            if (freq === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
            else if (freq === 'biweekly') currentDate.setDate(currentDate.getDate() + 14);
            else currentDate.setMonth(currentDate.getMonth() + 1);
        }
        meta = { numberOfPayments: count, frequency: freq, startDate };

    } else {
        // Custom mode
        const rows = document.querySelectorAll('#custom-rows .custom-row');
        if (rows.length < 1) return showToast("Add at least one payment", "error");

        let total = 0;
        rows.forEach((row, i) => {
            const amount = parseFloat(row.querySelector('.cr-amount').value) || 0;
            const dueDate = row.querySelector('.cr-date').value;
            if (amount <= 0 || !dueDate) return;
            total += amount;
            payments.push({
                id: Date.now() + i,
                amount: Math.round(amount * 100) / 100,
                dueDate: dueDate,
                paidDate: null,
                status: 'pending'
            });
        });

        if (payments.length === 0) return showToast("Please fill in payment details", "error");
        if (Math.abs(total - remaining) > 0.01) {
            return showToast(`Totals (${total.toFixed(2)}) must match target (${remaining.toFixed(2)})`, "error");
        }

        // Sort by due date
        payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        meta = {
            numberOfPayments: payments.length,
            frequency: 'custom',
            startDate: payments[0].dueDate
        };
    }

    const plan = {
        id: Date.now(),
        recordId: recordId,
        totalAmount: remaining,
        currency: record.currency,
        person: record.person,
        type: record.type,
        ...meta,
        payments: payments
    };

    state.instalmentPlans.push(plan);
    save();
    renderInstalments();
    showToast(`Repayment plan created: ${payments.length} payments`);
}

function buildPlanCard(plan) {
    const paidPayments = plan.payments.filter(p => p.status === 'paid');
    const totalPaidAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const progress = (totalPaidAmount / plan.totalAmount) * 100;
    const isComplete = progress >= 99.9;

    const card = document.createElement('div');
    card.className = 'plan-card';

    const directionLabel = plan.type === 'lender' ? 'They owe you' : 'You owe';
    const freqLabel = plan.frequency === 'custom' ? 'custom schedule' : plan.frequency;

    card.innerHTML = `
        <h4>
            <span>${esc(plan.person)} <span class="r-badge ${isComplete ? 'badge-paid' : 'badge-partial'}">${isComplete ? 'Complete' : `${paidPayments.length}/${plan.numberOfPayments}`}</span></span>
            <span style="font-size:0.8rem; color:var(--muted);">${directionLabel}</span>
        </h4>
        <div class="plan-summary">
            ${freqLabel} &bull; ${plan.numberOfPayments} payments &bull; ${totalPaidAmount.toFixed(2)} / ${plan.totalAmount.toFixed(2)} ${esc(plan.currency)} paid
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${progress}%"></div>
        </div>

        <div class="plan-body">
            <div class="plan-schedule">
                ${plan.payments.map(p => buildPaymentRow(p, plan)).join('')}
            </div>
            <div class="plan-calendar">
                ${buildMiniCalendar(plan)}
            </div>
        </div>

        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <div class="cal-legend">
                <span class="cal-dot cal-dot-paid"></span> Paid
                <span class="cal-dot cal-dot-pending"></span> Due
                <span class="cal-dot cal-dot-overdue"></span> Overdue
            </div>
            <button class="btn-sm" onclick="deleteInstalmentPlan(${plan.id})" style="border-color:#ff4757; color:#ff4757;">Delete Plan</button>
        </div>
    `;
    return card;
}

function buildPaymentRow(payment, plan) {
    const isPaid = payment.status === 'paid';
    const isOverdue = payment.status === 'overdue';

    return `
        <div class="instalment-row ${isPaid ? 'paid' : ''}">
            <div>
                <span class="inst-date">${payment.dueDate}</span>
                ${isOverdue ? '<span class="r-badge badge-overdue" style="margin-left:6px;">Overdue</span>' : ''}
                ${isPaid ? '<span class="r-badge badge-paid" style="margin-left:6px;">Paid</span>' : ''}
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="inst-amount">${payment.amount.toFixed(2)} ${esc(plan.currency)}</span>
                ${!isPaid ? `<button class="btn-sm" onclick="markInstalmentPaid(${plan.id}, ${payment.id})">Mark Paid</button>` : ''}
            </div>
        </div>
    `;
}

// --- Mini Calendar ---
// Shows every month that has a due date in this plan, with days highlighted.
function buildMiniCalendar(plan) {
    // Group payments by YYYY-MM
    const byMonth = {};
    plan.payments.forEach(p => {
        const key = p.dueDate.substring(0, 7); // YYYY-MM
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(p);
    });

    const keys = Object.keys(byMonth).sort();
    if (keys.length === 0) return '';

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date().toISOString().split('T')[0];

    return keys.map(key => {
        const [yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // getDay(): 0=Sun, we want Mon start
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;

        // Build map: day -> payment status
        const dayMap = {};
        byMonth[key].forEach(p => {
            const day = parseInt(p.dueDate.substring(8, 10));
            dayMap[day] = p;
        });

        let cells = '';
        // Header row
        ['M','T','W','T','F','S','S'].forEach(d => {
            cells += `<div class="cal-head">${d}</div>`;
        });
        // Empty cells before 1st
        for (let i = 0; i < startOffset; i++) {
            cells += '<div class="cal-cell cal-empty"></div>';
        }
        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const payment = dayMap[d];
            let cls = 'cal-cell';
            let title = '';
            if (payment) {
                if (payment.status === 'paid') cls += ' cal-paid';
                else if (payment.status === 'overdue') cls += ' cal-overdue';
                else cls += ' cal-pending';
                title = `${payment.amount.toFixed(2)} ${plan.currency}`;
            }
            const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
            if (dateStr === today) cls += ' cal-today';
            cells += `<div class="${cls}" title="${title}">${d}</div>`;
        }

        return `
            <div class="mini-cal">
                <div class="cal-title">${monthNames[month]} ${year}</div>
                <div class="cal-grid">${cells}</div>
            </div>
        `;
    }).join('');
}

function markInstalmentPaid(planId, paymentId) {
    const plan = state.instalmentPlans.find(p => p.id === planId);
    if (!plan) return;

    const payment = plan.payments.find(p => p.id === paymentId);
    if (!payment || payment.status === 'paid') return;

    payment.status = 'paid';
    payment.paidDate = new Date().toISOString().split('T')[0];

    // Update the parent record's totalPaid
    const record = state.records.find(r => r.id === plan.recordId);
    if (record) {
        record.totalPaid = (record.totalPaid || 0) + payment.amount;
        if (record.totalPaid >= record.amount - 0.01) {
            record.status = 'paid';
        }
    }

    save();
    render();
    renderInstalments();
    showToast(`Payment of ${payment.amount.toFixed(2)} marked as paid!`);
}

function markOverduePayments() {
    const today = new Date().toISOString().split('T')[0];
    state.instalmentPlans.forEach(plan => {
        plan.payments.forEach(p => {
            if (p.status === 'pending' && p.dueDate < today) {
                p.status = 'overdue';
            }
        });
    });
}

function deleteInstalmentPlan(planId) {
    if (!confirm("Delete this repayment plan? (Records will not be affected)")) return;
    state.instalmentPlans = state.instalmentPlans.filter(p => p.id !== planId);
    save();
    renderInstalments();
    showToast("Instalment plan removed");
}
