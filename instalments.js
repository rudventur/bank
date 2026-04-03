// ===== Peoples Bank • Twin Edition — Instalments Module =====
// Create repayment plans for records, track individual payments.

// Instalment plan structure:
// {
//   id, recordId, totalAmount, currency, person,
//   numberOfPayments, frequency, startDate,
//   payments: [ { id, amount, dueDate, paidDate, status: 'pending'|'paid'|'overdue' } ]
// }

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
            <h2>Create Instalment Plan</h2>
            <label class="field-label">Select a Record</label>
            <select id="inst-record" onchange="onInstalmentRecordSelect()">
                <option value="">-- Choose a record --</option>
                ${eligibleRecords.map(r => {
                    const remaining = (r.amount - (r.totalPaid || 0)).toFixed(2);
                    return `<option value="${r.id}">${esc(r.person)} — ${remaining} ${esc(r.currency)} (${r.type === 'lender' ? 'they owe you' : 'you owe'})</option>`;
                }).join('')}
            </select>

            <div id="inst-form-fields" style="display:none;">
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
                <button class="btn-primary" onclick="createInstalmentPlan()">Create Repayment Plan</button>
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

function onInstalmentRecordSelect() {
    const sel = document.getElementById('inst-record');
    const fields = document.getElementById('inst-form-fields');
    const startInput = document.getElementById('inst-start');

    if (sel.value) {
        fields.style.display = 'block';
        startInput.valueAsDate = new Date();
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
            <span style="color:var(--muted);"> x ${count} payments = ${remaining.toFixed(2)} ${esc(record.currency)}</span>
        </div>
    `;
}

// Attach preview update listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
        if (e.target.id === 'inst-count' || e.target.id === 'inst-freq') {
            previewInstalments();
        }
    });
});

function createInstalmentPlan() {
    const recordId = parseInt(document.getElementById('inst-record').value);
    const count = parseInt(document.getElementById('inst-count').value);
    const freq = document.getElementById('inst-freq').value;
    const startDate = document.getElementById('inst-start').value;

    if (!recordId || !count || count < 2 || !startDate) {
        return showToast("Please fill in all fields (min 2 payments)", "error");
    }

    const record = state.records.find(r => r.id === recordId);
    if (!record) return showToast("Record not found", "error");

    const remaining = record.amount - (record.totalPaid || 0);
    const perPayment = remaining / count;

    // Generate payment schedule
    const payments = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < count; i++) {
        const dueDate = new Date(currentDate);
        // Last payment may differ slightly due to rounding
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

        // Advance date
        if (freq === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
        else if (freq === 'biweekly') currentDate.setDate(currentDate.getDate() + 14);
        else currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const plan = {
        id: Date.now(),
        recordId: recordId,
        totalAmount: remaining,
        currency: record.currency,
        person: record.person,
        type: record.type,
        numberOfPayments: count,
        frequency: freq,
        startDate: startDate,
        payments: payments
    };

    state.instalmentPlans.push(plan);
    save();
    renderInstalments();
    showToast(`Repayment plan created: ${count} ${freq} payments`);
}

function buildPlanCard(plan) {
    const record = state.records.find(r => r.id === plan.recordId);
    const paidPayments = plan.payments.filter(p => p.status === 'paid');
    const totalPaidAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const progress = (totalPaidAmount / plan.totalAmount) * 100;
    const isComplete = progress >= 99.9;

    const card = document.createElement('div');
    card.className = 'plan-card';

    const directionLabel = plan.type === 'lender' ? 'They owe you' : 'You owe';

    card.innerHTML = `
        <h4>
            <span>${esc(plan.person)} <span class="r-badge ${isComplete ? 'badge-paid' : 'badge-partial'}">${isComplete ? 'Complete' : `${paidPayments.length}/${plan.numberOfPayments}`}</span></span>
            <span style="font-size:0.8rem; color:var(--muted);">${directionLabel}</span>
        </h4>
        <div class="plan-summary">
            ${plan.frequency} &bull; ${plan.numberOfPayments} payments &bull; ${totalPaidAmount.toFixed(2)} / ${plan.totalAmount.toFixed(2)} ${esc(plan.currency)} paid
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${progress}%"></div>
        </div>
        <div style="margin-top:12px;">
            ${plan.payments.map(p => buildPaymentRow(p, plan)).join('')}
        </div>
        <div style="margin-top:10px; text-align:right;">
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
        // Mark record as paid if fully repaid
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
