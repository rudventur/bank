// ===== Peoples Bank • Twin Edition — Sharing Module =====
// Download PNG, JSON, email, QR code for contract sharing.
// Uses qrcode.js from cdnjs for QR generation.

// --- Download contract as PNG ---
function downloadContractPNG(canvas, record) {
    const link = document.createElement('a');
    const safeName = (record.person || 'contract').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `contract-${safeName}-${record.date || 'undated'}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Contract PNG downloaded!');
}

// --- Download record as JSON ---
function downloadContractJSON(record) {
    const plan = state.instalmentPlans.find(p => p.recordId === record.id);
    const payload = {
        _format: 'peoples_bank_twin',
        _version: 3,
        _type: 'single_contract',
        _exportedAt: new Date().toISOString(),
        _contractId: generateContractId(record),
        records: [stripProof(record)],
        instalmentPlans: plan ? [plan] : []
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (record.person || 'contract').replace(/[^a-zA-Z0-9]/g, '_');
    a.href = url;
    a.download = `contract-${safeName}-${record.date || 'undated'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Contract JSON downloaded!');
}

// Strip the proof image from JSON export to keep file small for QR
function stripProof(record) {
    const copy = { ...record };
    delete copy.proof;
    return copy;
}

// --- Email contract details ---
function emailContract(record) {
    const contractId = generateContractId(record);
    const subject = encodeURIComponent(`Peoples Bank Contract: ${contractId}`);
    const lines = [
        'PEOPLES BANK TWIN — CONTRACT',
        '============================',
        '',
        'Contract ID: ' + contractId,
        'Type: ' + (record.isInvestment ? 'Investment' : 'Loan'),
        'Party: ' + (record.person || 'Unnamed'),
        'Amount: ' + record.amount.toFixed(2) + ' ' + (record.currency || '£'),
        'Date: ' + (record.date || 'Not specified'),
        'Reason: ' + (record.reason || '—'),
        ''
    ];

    if (record.isInvestment) {
        lines.push('Interest: ' + (record.interestRate || 0) + '% ' + (record.interestType || 'none'));
        lines.push('Importance: ' + (record.importance || 'normal'));
        if (record.contractNote) lines.push('Terms: ' + record.contractNote);
        lines.push('');
    }

    if (record.contactPhone) lines.push('Phone: ' + record.contactPhone);
    if (record.contactEmail) lines.push('Email: ' + record.contactEmail);
    if (record.accountDetails) lines.push('Account: ' + record.accountDetails);

    lines.push('');
    lines.push('---');
    lines.push('NO DATABASE. NO SERVER. TRUST + FILES.');
    lines.push('Please attach the contract PNG to this email.');

    const body = encodeURIComponent(lines.join('\n'));
    const mailto = record.contactEmail
        ? `mailto:${record.contactEmail}?subject=${subject}&body=${body}`
        : `mailto:?subject=${subject}&body=${body}`;

    window.open(mailto, '_blank');
    showToast('Email draft opened — attach the PNG!');
}

// --- QR Code (contains full JSON minus proof) ---
function generateContractQR(record, targetElementId) {
    const container = document.getElementById(targetElementId);
    if (!container) return;
    container.innerHTML = '';

    const plan = state.instalmentPlans.find(p => p.recordId === record.id);
    const payload = JSON.stringify({
        _format: 'peoples_bank_twin',
        _version: 3,
        _type: 'single_contract',
        _contractId: generateContractId(record),
        records: [stripProof(record)],
        instalmentPlans: plan ? [plan] : []
    });

    // Check if QRCode lib is loaded
    if (typeof QRCode === 'undefined') {
        container.innerHTML = '<div style="color:#ff4757; font-size:0.85rem;">QR library loading...</div>';
        return;
    }

    try {
        new QRCode(container, {
            text: payload,
            width: 220,
            height: 220,
            colorDark: '#ffffff',
            colorLight: '#111111',
            correctLevel: QRCode.CorrectLevel.L
        });
    } catch (err) {
        // Data too large for QR — try with minimal payload
        const minimal = JSON.stringify({
            _f: 'pbt',
            r: [{
                id: record.id,
                t: record.type,
                p: record.person,
                a: record.amount,
                c: record.currency,
                d: record.date,
                inv: record.isInvestment ? 1 : 0
            }]
        });
        try {
            new QRCode(container, {
                text: minimal,
                width: 220,
                height: 220,
                colorDark: '#ffffff',
                colorLight: '#111111',
                correctLevel: QRCode.CorrectLevel.L
            });
            container.insertAdjacentHTML('beforeend',
                '<div style="color:var(--muted); font-size:0.7rem; margin-top:6px;">Compact mode — scan + import JSON for full data</div>');
        } catch (e2) {
            container.innerHTML = '<div style="color:#ff4757; font-size:0.85rem;">Data too large for QR. Use JSON export instead.</div>';
        }
    }
}
