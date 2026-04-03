// ===== Peoples Bank • Twin Edition — Core App =====

const DB_KEY = 'peoples_twin_v3';

let state = {
    mode: 'lender',       // 'lender' or 'borrower'
    activeTab: 'records',  // 'records', 'investments', 'instalments', 'import', 'settings'
    records: [],
    instalmentPlans: [],   // managed by instalments.js
    email: ''
};

// --- Init ---
window.onload = function () {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        } catch (e) { console.error('Corrupt data'); }
    }

    // Migrate from v2 if needed
    const oldData = localStorage.getItem('peoples_twin_v2');
    if (!saved && oldData) {
        try {
            const old = JSON.parse(oldData);
            state.mode = old.mode || 'lender';
            state.email = old.email || '';
            state.records = (old.records || []).map(r => ({
                ...r,
                isInvestment: false,
                interestRate: 0,
                interestType: 'none',
                totalPaid: 0
            }));
            save();
        } catch (e) { console.error('Migration failed'); }
    }

    document.getElementById('p-date').valueAsDate = new Date();
    document.getElementById('my-email').value = state.email || '';

    setMode(state.mode, true);
    switchTab(state.activeTab || 'records');
    render();
};

// --- Mode Switching ---
function setMode(mode, skipSave) {
    state.mode = mode;

    const bg = document.getElementById('switch-bg');
    const btnL = document.getElementById('btn-lender');
    const btnB = document.getElementById('btn-borrower');

    if (mode === 'lender') {
        bg.style.transform = 'translateX(0%)';
        btnL.classList.add('active');
        btnB.classList.remove('active');
        document.body.classList.remove('borrower-mode');
    } else {
        bg.style.transform = 'translateX(100%)';
        btnL.classList.remove('active');
        btnB.classList.add('active');
        document.body.classList.add('borrower-mode');
    }

    updateUI();
    render();
    if (!skipSave) save();
}

function updateUI() {
    const isLender = state.mode === 'lender';
    document.getElementById('view-subtitle').textContent = isLender
        ? "You are the Lender (You are owed money)"
        : "You are the Borrower (You owe money)";
    document.getElementById('form-title').textContent = isLender
        ? "Record a Loan / Investment"
        : "Record a Borrowing / Debt";
    document.getElementById('btn-submit').textContent = isLender
        ? "Record Loan"
        : "Record Debt";

    // Show/hide investment checkbox (only in lender mode)
    const investToggle = document.getElementById('invest-toggle');
    if (investToggle) {
        investToggle.style.display = isLender ? 'flex' : 'none';
        if (!isLender) {
            document.getElementById('p-invest').checked = false;
            toggleInvestFields(false);
        }
    }
}

// --- Tab Navigation ---
function switchTab(tabId) {
    state.activeTab = tabId;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(tc => {
        tc.classList.toggle('active', tc.id === 'tab-' + tabId);
    });

    // Re-render relevant tab content
    if (tabId === 'investments') renderInvestments();
    if (tabId === 'instalments') renderInstalments();

    save();
}

// --- Core Add Handler ---
function handleAdd(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value.trim();
    const amount = parseFloat(document.getElementById('p-amount').value);
    const currency = document.getElementById('p-curr').value || '\u00a3';
    const date = document.getElementById('p-date').value;
    const reason = document.getElementById('p-reason').value.trim();
    const fileInput = document.getElementById('p-proof');

    // Investment fields
    const isInvestment = state.mode === 'lender' && document.getElementById('p-invest').checked;
    let interestRate = 0;
    let interestType = 'none';
    let contractNote = '';

    if (isInvestment) {
        interestRate = parseFloat(document.getElementById('p-interest-rate').value) || 0;
        interestType = document.getElementById('p-interest-type').value || 'none';
        contractNote = document.getElementById('p-contract-note').value.trim();
    }

    if (!name || !amount) return showToast("Please enter name and amount", "error");

    const processRecord = (proofData) => {
        const record = {
            id: Date.now(),
            type: state.mode,
            person: name,
            amount: amount,
            currency: currency,
            date: date,
            reason: reason,
            proof: proofData,
            status: 'open',
            isInvestment: isInvestment,
            interestRate: interestRate,
            interestType: interestType,
            contractNote: contractNote,
            totalPaid: 0
        };

        state.records.unshift(record);
        save();
        render();

        // Reset form
        document.getElementById('p-name').value = '';
        document.getElementById('p-amount').value = '';
        document.getElementById('p-reason').value = '';
        document.getElementById('p-proof').value = '';
        if (isInvestment) {
            document.getElementById('p-invest').checked = false;
            toggleInvestFields(false);
        }
        showToast(isInvestment ? "Investment recorded!" : "Record saved!");
    };

    if (fileInput.files[0]) {
        compressImage(fileInput.files[0]).then(processRecord).catch(() => {
            showToast("Image error, saving without it", "error");
            processRecord(null);
        });
    } else {
        processRecord(null);
    }
}

function deleteRecord(id) {
    if (!confirm("Delete this record?")) return;
    state.records = state.records.filter(r => r.id !== id);
    // Also remove any instalment plans linked to this record
    state.instalmentPlans = state.instalmentPlans.filter(p => p.recordId !== id);
    save();
    render();
    if (state.activeTab === 'investments') renderInvestments();
    if (state.activeTab === 'instalments') renderInstalments();
}

function saveEmail() {
    state.email = document.getElementById('my-email').value.trim();
    save();
    showToast("Email saved");
}

function save() {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
}

// --- Toggle investment fields ---
function toggleInvestFields(show) {
    const fields = document.getElementById('invest-fields');
    if (fields) {
        fields.classList.toggle('visible', show);
    }
}

// --- Records Rendering ---
function render() {
    const list = document.getElementById('list');
    list.innerHTML = '';

    let balance = 0;
    const peopleList = new Set();

    const activeRecords = state.records.filter(r => r.type === state.mode && !r.isInvestment);

    if (activeRecords.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>No records in this view yet.</div>';
    }

    activeRecords.forEach(r => {
        peopleList.add(r.person);

        if (state.mode === 'lender') balance += r.amount - (r.totalPaid || 0);
        else balance -= r.amount - (r.totalPaid || 0);

        const remaining = r.amount - (r.totalPaid || 0);
        const isPaid = remaining <= 0.01;

        const div = document.createElement('div');
        div.className = 'record-item lending';
        div.innerHTML = `
            <div class="r-info">
                <h4>${esc(r.person)} <span class="r-badge badge-loan">${isPaid ? 'Paid' : 'Loan'}</span></h4>
                <div class="r-meta">
                    <span>${r.date}</span> &bull;
                    <span>${esc(r.reason) || 'No reason'}</span>
                </div>
                ${r.proof ? '<div style="font-size:0.75rem; color:var(--primary); margin-top:5px;">📎 Proof attached</div>' : ''}
                ${r.totalPaid > 0 ? `<div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">Paid: ${r.totalPaid.toFixed(2)} / ${r.amount.toFixed(2)} ${r.currency}</div>` : ''}
            </div>
            <div style="text-align:right;">
                <div class="r-amount">${remaining.toFixed(2)} ${esc(r.currency)}</div>
                <button class="btn-del" onclick="deleteRecord(${r.id})">Remove</button>
            </div>
        `;
        list.appendChild(div);
    });

    // Update Balance Display
    const balEl = document.getElementById('balance-display');
    const prefix = state.mode === 'lender' ? '' : '-';
    balEl.textContent = (balance >= 0 ? '+' : '') + balance.toFixed(2);
    balEl.style.color = balance >= 0 ? 'var(--primary)' : '#888';

    // Update Datalist
    const dl = document.getElementById('people-list');
    dl.innerHTML = '';
    state.records.forEach(r => peopleList.add(r.person));
    peopleList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        dl.appendChild(opt);
    });
}

// --- Utils ---
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    if (type === 'error') t.style.borderLeftColor = '#ff4757';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
