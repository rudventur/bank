// ===== Peoples Bank • Twin Edition — CSV Import Module =====
// Handles Monzo CSV statement import and auto-matching.

function handleCSV(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const matches = [];

        if (state.mode !== 'borrower') {
            showToast("CSV Auto-match is designed for Borrower Mode (finding payments you made). Please switch modes.", "error");
            return;
        }

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length < 4) continue;

            let amount = 0;
            let date = row[0] || '';
            let name = row[3] || 'Unknown';

            for (let c of row) {
                if (!isNaN(parseFloat(c)) && c.includes('-')) {
                    amount = Math.abs(parseFloat(c));
                    break;
                }
            }

            if (amount > 0) {
                const openDebts = state.records.filter(r =>
                    r.type === 'borrower' &&
                    r.status === 'open' &&
                    !r.isInvestment &&
                    Math.abs(r.amount - (r.totalPaid || 0) - amount) < 0.05
                );

                if (openDebts.length > 0) {
                    matches.push({
                        date: date,
                        amount: amount,
                        name: name,
                        potentialMatches: openDebts
                    });
                }
            }
        }

        if (matches.length > 0) {
            showMatches(matches);
        } else {
            showToast("No automatic matches found in CSV.", "error");
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function showMatches(matches) {
    const list = document.getElementById('match-list');
    list.innerHTML = '';

    matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'match-item';
        div.innerHTML = `
            <div>
                <div><strong>${esc(m.date)}</strong> paid <strong>${esc(m.name)}</strong></div>
                <small style="color:#888">Amount: ${m.amount.toFixed(2)}</small>
            </div>
            <div style="color:var(--primary); font-weight:bold;">Match Found!</div>
        `;
        div.onclick = () => {
            const debt = m.potentialMatches[0];
            debt.status = 'paid';
            debt.totalPaid = debt.amount;
            save();
            render();
            document.getElementById('match-modal').close();
            showToast(`Marked debt to ${debt.person} as Paid!`);
        };
        list.appendChild(div);
    });

    document.getElementById('match-modal').showModal();
}
