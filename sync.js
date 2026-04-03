// ===== Peoples Bank • Twin Edition — Sync Module =====
// Export/import state as JSON files for offline device-to-device sync.
// Both parties open the app, fill in the deal together, then both export
// the same file — matching records on both devices, no internet needed.

// --- Export full state as a .json file ---
function exportData() {
    const exportPayload = {
        _format: 'peoples_bank_twin',
        _version: 3,
        _exportedAt: new Date().toISOString(),
        mode: state.mode,
        records: state.records,
        instalmentPlans: state.instalmentPlans,
        email: state.email
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'peoples-bank-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported! Share this file with the other device.');
}

// --- Import from a .json file (merges, doesn't overwrite) ---
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data._format !== 'peoples_bank_twin') {
                showToast('Not a valid Peoples Bank file.', 'error');
                return;
            }

            // Merge records — skip duplicates by id
            const existingIds = new Set(state.records.map(r => r.id));
            let newCount = 0;

            (data.records || []).forEach(r => {
                if (!existingIds.has(r.id)) {
                    state.records.push(r);
                    newCount++;
                }
            });

            // Merge instalment plans
            const existingPlanIds = new Set(state.instalmentPlans.map(p => p.id));
            let newPlans = 0;

            (data.instalmentPlans || []).forEach(p => {
                if (!existingPlanIds.has(p.id)) {
                    state.instalmentPlans.push(p);
                    newPlans++;
                }
            });

            // Sort records by date descending
            state.records.sort((a, b) => b.id - a.id);

            save();
            render();
            if (state.activeTab === 'investments') renderInvestments();
            if (state.activeTab === 'instalments') renderInstalments();

            showToast(`Imported ${newCount} records, ${newPlans} plans. Duplicates skipped.`);
        } catch (err) {
            showToast('Could not read this file. Is it valid JSON?', 'error');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// --- Export a single record as a standalone contract file ---
function exportRecord(id) {
    const record = state.records.find(r => r.id === id);
    if (!record) return;

    const plan = state.instalmentPlans.find(p => p.recordId === id);

    const contractPayload = {
        _format: 'peoples_bank_twin',
        _version: 3,
        _exportedAt: new Date().toISOString(),
        _type: 'single_contract',
        records: [record],
        instalmentPlans: plan ? [plan] : []
    };

    const safeName = (record.person || 'contract').replace(/[^a-zA-Z0-9]/g, '_');
    const blob = new Blob([JSON.stringify(contractPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${safeName}-${record.date || 'undated'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Contract for ${record.person} exported!`);
}

// --- Camera capture (returns a promise with base64 image) ---
function captureFromCamera() {
    return new Promise((resolve, reject) => {
        // Create a hidden video + canvas for camera capture
        const modal = document.getElementById('camera-modal');
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');

        // Request camera — prefer rear camera on mobile for "on the spot" photos
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        }).then(stream => {
            video.srcObject = stream;
            video.play();
            modal.showModal();

            // Store resolve/reject + stream on the modal for the buttons to use
            modal._resolve = resolve;
            modal._reject = reject;
            modal._stream = stream;
        }).catch(err => {
            showToast('Camera not available: ' + err.message, 'error');
            reject(err);
        });
    });
}

function snapPhoto() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');

    canvas.width = Math.min(video.videoWidth, 800);
    canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

    // Stop camera
    stopCamera();
    modal.close();

    if (modal._resolve) modal._resolve(dataUrl);
}

function cancelCamera() {
    const modal = document.getElementById('camera-modal');
    stopCamera();
    modal.close();
    if (modal._reject) modal._reject(new Error('Cancelled'));
}

function stopCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    if (modal._stream) {
        modal._stream.getTracks().forEach(t => t.stop());
        modal._stream = null;
    }
    video.srcObject = null;
}

// Called from the form's camera button
function takeProofPhoto() {
    captureFromCamera().then(dataUrl => {
        // Store the captured image in a temporary holder so handleAdd can use it
        window._capturedProof = dataUrl;
        document.getElementById('camera-status').textContent = 'Photo captured!';
        document.getElementById('camera-status').style.color = 'var(--primary)';
        showToast('Photo captured! It will be attached when you save.');
    }).catch(() => {
        // User cancelled or camera failed — no action needed
    });
}
