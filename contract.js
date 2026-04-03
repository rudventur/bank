// ===== Peoples Bank • Twin Edition — Contract Generator =====
// Generates a contract image via HTML5 Canvas.
// Proof photo as background (if any), dark overlay, monospace data, signature zone.

const CONTRACT_W = 900;
const CONTRACT_H = 1350;

// Generate a unique contract ID from timestamp + names
function generateContractId(record) {
    const ts = record.id.toString(36).toUpperCase();
    const nameHash = (record.person || 'X').slice(0, 3).toUpperCase();
    return `PBT-${nameHash}-${ts}`;
}

// Main entry: build the full contract canvas (without signature — that's composited later)
function generateContractCanvas(record, signatureDataUrl) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = CONTRACT_W;
        canvas.height = CONTRACT_H;
        const ctx = canvas.getContext('2d');

        const contractId = generateContractId(record);
        const isInvest = record.isInvestment;

        // Step 1: draw background
        const drawContent = () => {
            // Dark overlay
            ctx.fillStyle = 'rgba(5, 5, 5, 0.88)';
            ctx.fillRect(0, 0, CONTRACT_W, CONTRACT_H);

            // Accent line at top
            const accentColor = isInvest ? '#ffd700' : (record.type === 'lender' ? '#00ff9d' : '#ff4757');
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, 0, CONTRACT_W, 6);

            // Header
            ctx.fillStyle = accentColor;
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PEOPLES BANK TWIN', CONTRACT_W / 2, 55);

            ctx.fillStyle = '#666';
            ctx.font = '14px monospace';
            ctx.fillText(isInvest ? 'INVESTMENT CONTRACT' : 'LOAN CONTRACT', CONTRACT_W / 2, 80);

            ctx.fillText('ID: ' + contractId, CONTRACT_W / 2, 100);

            // Divider
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(60, 120);
            ctx.lineTo(CONTRACT_W - 60, 120);
            ctx.stroke();

            // Data fields — left-aligned monospace
            ctx.textAlign = 'left';
            ctx.font = '16px monospace';
            let y = 160;
            const lx = 70;       // label x
            const vx = 320;      // value x
            const lineH = 34;

            const printField = (label, value) => {
                if (!value && value !== 0) return;
                ctx.fillStyle = '#666';
                ctx.font = '13px monospace';
                ctx.fillText(label, lx, y);
                ctx.fillStyle = '#eee';
                ctx.font = '16px monospace';
                // Wrap long values
                const maxW = CONTRACT_W - vx - 60;
                const words = String(value).split(' ');
                let line = '';
                let firstLine = true;
                for (const word of words) {
                    const test = line + (line ? ' ' : '') + word;
                    if (ctx.measureText(test).width > maxW && line) {
                        ctx.fillText(line, vx, y);
                        y += lineH * 0.7;
                        line = word;
                        firstLine = false;
                    } else {
                        line = test;
                    }
                }
                ctx.fillText(line, vx, y);
                y += lineH;
            };

            // The deal
            const modeLabel = record.type === 'lender' ? 'LENDER' : 'BORROWER';
            printField('YOU ARE', modeLabel);
            printField('OTHER PARTY', record.person || 'Unnamed');
            printField('AMOUNT', record.amount.toFixed(2) + ' ' + (record.currency || '£'));
            printField('DATE', record.date || 'Not specified');
            printField('REASON', record.reason || '—');

            if (isInvest) {
                y += 10;
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('── INVESTMENT TERMS ──', lx, y);
                ctx.fillStyle = '#eee';
                ctx.font = '16px monospace';
                y += lineH;

                const impLabels = { low: 'LOW', normal: 'NORMAL', high: 'HIGH', critical: 'CRITICAL' };
                const impColors = { low: '#888', normal: '#3b82f6', high: '#ffa500', critical: '#ff4757' };
                const imp = record.importance || 'normal';

                printField('INTEREST RATE', record.interestRate ? record.interestRate + '%' : 'None');
                printField('INTEREST TYPE', record.interestType === 'none' ? 'None' : (record.interestType || 'None'));

                // Importance in colour
                ctx.fillStyle = '#666';
                ctx.font = '13px monospace';
                ctx.fillText('IMPORTANCE', lx, y);
                ctx.fillStyle = impColors[imp] || '#eee';
                ctx.font = 'bold 16px monospace';
                ctx.fillText(impLabels[imp] || 'NORMAL', vx, y);
                y += lineH;

                ctx.font = '16px monospace';
                printField('DURATION', record.contractDuration || '—');
                if (record.contractNote) printField('TERMS', record.contractNote);
            }

            // Contact & account
            if (record.contactPhone || record.contactEmail || record.accountDetails) {
                y += 10;
                ctx.fillStyle = '#555';
                ctx.font = 'bold 14px monospace';
                ctx.fillText('── CONTACT & ACCOUNT ──', lx, y);
                y += lineH;
                ctx.font = '16px monospace';

                printField('PHONE', record.contactPhone);
                printField('EMAIL', record.contactEmail);
                printField('ACCOUNT', record.accountDetails);
            }

            // Signature zone header
            const sigY = CONTRACT_H - 300;
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(60, sigY);
            ctx.lineTo(CONTRACT_W - 60, sigY);
            ctx.stroke();

            ctx.fillStyle = '#555';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SIGNATURES', CONTRACT_W / 2, sigY + 20);

            // Two signature boxes
            const boxW = (CONTRACT_W - 180) / 2;
            const boxH = 160;
            const boxY = sigY + 35;

            // Left: Lender
            ctx.strokeStyle = '#333';
            ctx.strokeRect(60, boxY, boxW, boxH);
            ctx.fillStyle = '#444';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LENDER', 60 + boxW / 2, boxY + boxH + 16);

            // Right: Borrower
            ctx.strokeRect(120 + boxW, boxY, boxW, boxH);
            ctx.fillText('BORROWER', 120 + boxW + boxW / 2, boxY + boxH + 16);

            // Composite signature if provided
            if (signatureDataUrl) {
                const sigImg = new Image();
                sigImg.onload = () => {
                    // Draw signature into the lender box (left)
                    ctx.drawImage(sigImg, 65, boxY + 5, boxW - 10, boxH - 10);
                    drawFooter(ctx, accentColor);
                    resolve(canvas);
                };
                sigImg.src = signatureDataUrl;
                return;
            }

            drawFooter(ctx, accentColor);
            resolve(canvas);
        };

        // If there's a proof photo, draw it as background first
        if (record.proof) {
            const bgImg = new Image();
            bgImg.onload = () => {
                // Cover the canvas with the proof image
                const scale = Math.max(CONTRACT_W / bgImg.width, CONTRACT_H / bgImg.height);
                const w = bgImg.width * scale;
                const h = bgImg.height * scale;
                ctx.drawImage(bgImg, (CONTRACT_W - w) / 2, (CONTRACT_H - h) / 2, w, h);
                drawContent();
            };
            bgImg.onerror = () => {
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, CONTRACT_W, CONTRACT_H);
                drawContent();
            };
            bgImg.src = record.proof;
        } else {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, CONTRACT_W, CONTRACT_H);
            drawContent();
        }
    });
}

function drawFooter(ctx, accentColor) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, CONTRACT_H - 40, CONTRACT_W, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO DATABASE. NO SERVER. TRUST + FILES.', CONTRACT_W / 2, CONTRACT_H - 16);
}
