// ===== Peoples Bank • Twin Edition — Signature Pad =====
// Touch + mouse drawable canvas for on-screen signing.

let sigCanvas = null;
let sigCtx = null;
let sigDrawing = false;
let sigHasContent = false;

function initSignaturePad(canvasId) {
    sigCanvas = document.getElementById(canvasId);
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');
    sigHasContent = false;

    // Size to parent
    const rect = sigCanvas.parentElement.getBoundingClientRect();
    sigCanvas.width = rect.width;
    sigCanvas.height = 160;

    // Clear
    sigCtx.fillStyle = '#111';
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);

    // Hint text
    sigCtx.fillStyle = '#333';
    sigCtx.font = '14px monospace';
    sigCtx.textAlign = 'center';
    sigCtx.fillText('Sign here', sigCanvas.width / 2, sigCanvas.height / 2 + 5);

    // Drawing style
    sigCtx.strokeStyle = '#fff';
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';

    // Remove old listeners to avoid duplication
    sigCanvas.removeEventListener('mousedown', sigStart);
    sigCanvas.removeEventListener('mousemove', sigMove);
    sigCanvas.removeEventListener('mouseup', sigEnd);
    sigCanvas.removeEventListener('mouseleave', sigEnd);
    sigCanvas.removeEventListener('touchstart', sigTouchStart);
    sigCanvas.removeEventListener('touchmove', sigTouchMove);
    sigCanvas.removeEventListener('touchend', sigEnd);

    // Mouse
    sigCanvas.addEventListener('mousedown', sigStart);
    sigCanvas.addEventListener('mousemove', sigMove);
    sigCanvas.addEventListener('mouseup', sigEnd);
    sigCanvas.addEventListener('mouseleave', sigEnd);

    // Touch
    sigCanvas.addEventListener('touchstart', sigTouchStart, { passive: false });
    sigCanvas.addEventListener('touchmove', sigTouchMove, { passive: false });
    sigCanvas.addEventListener('touchend', sigEnd);
}

function sigStart(e) {
    sigDrawing = true;
    if (!sigHasContent) {
        // Clear the hint text on first stroke
        sigCtx.fillStyle = '#111';
        sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
        sigHasContent = true;
    }
    sigCtx.beginPath();
    sigCtx.moveTo(e.offsetX, e.offsetY);
}

function sigMove(e) {
    if (!sigDrawing) return;
    sigCtx.lineTo(e.offsetX, e.offsetY);
    sigCtx.stroke();
}

function sigEnd() {
    sigDrawing = false;
}

function sigTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigDrawing = true;
    if (!sigHasContent) {
        sigCtx.fillStyle = '#111';
        sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
        sigHasContent = true;
    }
    sigCtx.beginPath();
    sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
}

function sigTouchMove(e) {
    e.preventDefault();
    if (!sigDrawing) return;
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    sigCtx.stroke();
}

function clearSignature() {
    if (!sigCanvas || !sigCtx) return;
    sigHasContent = false;
    sigCtx.fillStyle = '#111';
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
    sigCtx.fillStyle = '#333';
    sigCtx.font = '14px monospace';
    sigCtx.textAlign = 'center';
    sigCtx.fillText('Sign here', sigCanvas.width / 2, sigCanvas.height / 2 + 5);
}

function getSignatureDataUrl() {
    if (!sigCanvas || !sigHasContent) return null;
    return sigCanvas.toDataURL('image/png');
}
