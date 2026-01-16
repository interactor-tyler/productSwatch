/**
 * Logo Overlay Editor
 * Allows users to upload a logo, position it on a product image, and export as JPG
 */

// File validation constants
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// Editor state
const editorState = {
    productImage: null,
    productImageSrc: null,
    logo: {
        image: null,
        file: null,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        scale: 1
    },
    canvas: null,
    ctx: null,
    canvasRect: null,
    isOpen: false
};

// DOM Elements (initialized on DOMContentLoaded)
let editorModal, editorCanvas, uploadZone, uploadInput, uploadError;
let downloadBtn, rotationSlider, rotationValue, logoOverlay, canvasWrapper;

/**
 * Initialize the logo editor
 */
function initLogoEditor() {
    editorModal = document.getElementById('logo-editor');
    editorCanvas = document.getElementById('logo-editor-canvas');
    uploadZone = document.getElementById('logo-upload-zone');
    uploadInput = document.getElementById('logo-upload-input');
    uploadError = document.getElementById('logo-upload-error');
    downloadBtn = document.getElementById('logo-download-btn');
    rotationSlider = document.getElementById('logo-rotation');
    rotationValue = document.getElementById('logo-rotation-value');
    logoOverlay = document.getElementById('logo-overlay');
    canvasWrapper = document.querySelector('.logo-editor-canvas-wrapper');

    if (!editorModal || !editorCanvas) {
        console.warn('Logo editor elements not found');
        return;
    }

    editorState.canvas = editorCanvas;
    editorState.ctx = editorCanvas.getContext('2d');

    setupEventListeners();
    setupInteract();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Close button
    document.querySelector('.logo-editor-close')?.addEventListener('click', closeLogoEditor);

    // Backdrop click
    document.querySelector('.logo-editor-backdrop')?.addEventListener('click', closeLogoEditor);

    // Cancel button
    document.getElementById('logo-cancel-btn')?.addEventListener('click', closeLogoEditor);

    // Download button
    downloadBtn?.addEventListener('click', exportAsJPG);

    // Upload zone click
    uploadZone?.addEventListener('click', () => uploadInput?.click());

    // File input change
    uploadInput?.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone?.addEventListener('dragover', handleDragOver);
    uploadZone?.addEventListener('dragleave', handleDragLeave);
    uploadZone?.addEventListener('drop', handleDrop);

    // Rotation slider
    rotationSlider?.addEventListener('input', handleRotationChange);

    // Keyboard events
    document.addEventListener('keydown', handleKeydown);

    // Window resize
    window.addEventListener('resize', debounce(handleResize, 250));
}

/**
 * Setup Interact.js for drag, resize, rotate
 */
function setupInteract() {
    if (typeof interact === 'undefined') {
        console.warn('Interact.js not loaded');
        return;
    }

    interact('#logo-overlay')
        .draggable({
            inertia: true,
            // Ignore drag events from rotation handle
            ignoreFrom: '.rotate-handle',
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            listeners: {
                move: dragMoveListener,
                end: updateCanvasFromOverlay
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            preserveAspectRatio: true,
            inertia: true,
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 30, height: 30 },
                    max: { width: 500, height: 500 }
                })
            ],
            listeners: {
                move: resizeMoveListener,
                end: updateCanvasFromOverlay
            }
        });

    // Setup rotation handle
    interact('.rotate-handle')
        .draggable({
            listeners: {
                start: rotateStartListener,
                move: rotateMoveListener,
                end: updateCanvasFromOverlay
            }
        });
}

/**
 * Drag move listener for Interact.js
 */
function dragMoveListener(event) {
    const target = event.target;
    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    target.style.transform = `translate(${x}px, ${y}px) rotate(${editorState.logo.rotation}deg)`;
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);

    editorState.logo.x = x;
    editorState.logo.y = y;

    // Update canvas in real-time during drag
    renderCanvas();
}

/**
 * Resize move listener for Interact.js
 */
function resizeMoveListener(event) {
    const target = event.target;
    let x = parseFloat(target.getAttribute('data-x')) || 0;
    let y = parseFloat(target.getAttribute('data-y')) || 0;

    target.style.width = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';

    x += event.deltaRect.left;
    y += event.deltaRect.top;

    target.style.transform = `translate(${x}px, ${y}px) rotate(${editorState.logo.rotation}deg)`;
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);

    editorState.logo.x = x;
    editorState.logo.y = y;
    editorState.logo.width = event.rect.width;
    editorState.logo.height = event.rect.height;

    // Update canvas in real-time during resize
    renderCanvas();
}

/**
 * Store the starting angle for rotation
 */
let rotationStartAngle = 0;

/**
 * Rotation start listener - calculate initial angle
 */
function rotateStartListener(event) {
    const logoCenter = getLogoCenterPosition();
    const startAngle = getAngleFromCenter(event.clientX, event.clientY, logoCenter);
    rotationStartAngle = startAngle - editorState.logo.rotation;
}

/**
 * Rotation move listener - calculate and apply rotation
 */
function rotateMoveListener(event) {
    const logoCenter = getLogoCenterPosition();
    const currentAngle = getAngleFromCenter(event.clientX, event.clientY, logoCenter);
    let rotation = currentAngle - rotationStartAngle;

    // Normalize to -180 to 180 range
    while (rotation > 180) rotation -= 360;
    while (rotation < -180) rotation += 360;

    // Round to nearest degree
    rotation = Math.round(rotation);

    editorState.logo.rotation = rotation;

    // Update overlay transform
    if (logoOverlay) {
        const { x, y } = editorState.logo;
        logoOverlay.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }

    // Update rotation slider and value display
    if (rotationSlider) {
        rotationSlider.value = rotation;
    }
    if (rotationValue) {
        rotationValue.textContent = rotation + '°';
    }

    // Update canvas in real-time
    renderCanvas();
}

/**
 * Get the center position of the logo in screen coordinates
 */
function getLogoCenterPosition() {
    if (!logoOverlay || !canvasWrapper) {
        return { x: 0, y: 0 };
    }

    const wrapperRect = canvasWrapper.getBoundingClientRect();
    const { x, y, width, height } = editorState.logo;

    return {
        x: wrapperRect.left + x + width / 2,
        y: wrapperRect.top + y + height / 2
    };
}

/**
 * Calculate angle from center point to a position
 */
function getAngleFromCenter(clientX, clientY, center) {
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    // atan2 returns radians, convert to degrees
    // Subtract 90 because our handle is at the top (not right)
    return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
}

/**
 * Update canvas after overlay manipulation
 */
function updateCanvasFromOverlay() {
    renderCanvas();
}

/**
 * Open the logo editor modal
 */
function openLogoEditor(productImageSrc) {
    if (!editorModal) {
        initLogoEditor();
    }

    // Check if we're opening with a different product image
    const isNewProduct = editorState.productImageSrc !== productImageSrc;

    editorState.productImageSrc = productImageSrc;
    editorState.isOpen = true;

    // Load product image
    const img = new Image();
    // Only set crossOrigin for local images, not external URLs
    if (!productImageSrc.startsWith('http')) {
        img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
        editorState.productImage = img;
        setupCanvas();

        // If opening with a new product, reset logo state
        if (isNewProduct) {
            resetLogoState();
        } else if (editorState.logo.image) {
            // Re-render with existing logo
            updateLogoOverlay();
        }

        renderCanvas();
        updateDownloadButton();
    };
    img.onerror = () => {
        showToast('Failed to load product image', 'error');
    };
    img.src = productImageSrc;

    editorModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset logo state if no logo loaded
    if (!editorState.logo.image) {
        resetLogoState();
    }

    updateDownloadButton();
}

/**
 * Close the logo editor modal
 */
function closeLogoEditor() {
    if (!editorModal) return;

    editorModal.classList.remove('active');
    document.body.style.overflow = '';
    editorState.isOpen = false;
}

/**
 * Setup canvas dimensions
 */
function setupCanvas() {
    if (!editorState.productImage || !editorState.canvas) return;

    const img = editorState.productImage;
    const maxWidth = Math.min(600, window.innerWidth - 100);
    const maxHeight = Math.min(500, window.innerHeight - 300);

    let width = img.width;
    let height = img.height;

    // Scale down if needed
    if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
    }
    if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
    }

    editorState.canvas.width = width;
    editorState.canvas.height = height;
    editorState.canvasRect = { width, height };

    // Set wrapper size
    if (canvasWrapper) {
        canvasWrapper.style.width = width + 'px';
        canvasWrapper.style.height = height + 'px';
    }
}

/**
 * Render the canvas with product image and logo overlay
 */
function renderCanvas() {
    const { ctx, canvas, productImage, logo } = editorState;
    if (!ctx || !canvas || !productImage) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw product image (base layer)
    ctx.drawImage(productImage, 0, 0, canvas.width, canvas.height);

    // Draw logo (overlay layer)
    if (logo.image) {
        ctx.save();

        // Calculate center position
        const centerX = logo.x + logo.width / 2;
        const centerY = logo.y + logo.height / 2;

        // Move to logo center for rotation
        ctx.translate(centerX, centerY);
        ctx.rotate(logo.rotation * Math.PI / 180);

        // Draw logo centered at origin
        ctx.drawImage(
            logo.image,
            -logo.width / 2,
            -logo.height / 2,
            logo.width,
            logo.height
        );

        ctx.restore();
    }
}

/**
 * Validate logo file
 */
function validateLogoFile(file) {
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload a JPG, PNG, or SVG file.'
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File too large (${sizeMB}MB). Maximum size is 2MB.`
        };
    }

    return { valid: true };
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
        processLogoFile(file);
    }
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadZone?.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadZone?.classList.remove('dragover');
}

/**
 * Handle drop
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    uploadZone?.classList.remove('dragover');

    const file = event.dataTransfer?.files?.[0];
    if (file) {
        processLogoFile(file);
    }
}

/**
 * Process logo file
 */
function processLogoFile(file) {
    // Clear previous errors
    clearUploadError();

    // Validate file
    const validation = validateLogoFile(file);
    if (!validation.valid) {
        showUploadError(validation.error);
        return;
    }

    // Load image
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            editorState.logo.image = img;
            editorState.logo.file = file;

            // Set initial size (fit within canvas with max 200px)
            const maxSize = 150;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (maxSize / width) * height;
                    width = maxSize;
                } else {
                    width = (maxSize / height) * width;
                    height = maxSize;
                }
            }

            // Center the logo
            editorState.logo.width = width;
            editorState.logo.height = height;
            editorState.logo.x = (editorState.canvasRect?.width || 300) / 2 - width / 2;
            editorState.logo.y = (editorState.canvasRect?.height || 300) / 2 - height / 2;
            editorState.logo.rotation = 0;

            // Update UI
            updateLogoOverlay();
            updateUploadZonePreview(e.target.result);
            updateDownloadButton();
            renderCanvas();

            // Reset rotation slider
            if (rotationSlider) {
                rotationSlider.value = 0;
            }
            if (rotationValue) {
                rotationValue.textContent = '0°';
            }
        };
        img.onerror = () => {
            showUploadError('Failed to load image. Please try another file.');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showUploadError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
}

/**
 * Update logo overlay element position and size
 */
function updateLogoOverlay() {
    if (!logoOverlay || !editorState.logo.image) return;

    const { x, y, width, height, rotation } = editorState.logo;

    logoOverlay.style.width = width + 'px';
    logoOverlay.style.height = height + 'px';
    logoOverlay.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    logoOverlay.setAttribute('data-x', x);
    logoOverlay.setAttribute('data-y', y);

    // Update image inside overlay (reuse existing or create new)
    let overlayImg = logoOverlay.querySelector('img');
    if (!overlayImg) {
        overlayImg = document.createElement('img');
        overlayImg.alt = 'Logo overlay';
        overlayImg.draggable = false;
        // Insert at the beginning so resize handles stay on top
        logoOverlay.insertBefore(overlayImg, logoOverlay.firstChild);
    }
    overlayImg.src = editorState.logo.image.src;

    logoOverlay.style.display = 'block';
}

/**
 * Update upload zone to show preview
 */
function updateUploadZonePreview(dataUrl) {
    if (!uploadZone) return;

    uploadZone.classList.add('has-logo');

    const previewImg = uploadZone.querySelector('.logo-preview-thumb');
    if (previewImg) {
        previewImg.src = dataUrl;
    }
}

/**
 * Show upload error
 */
function showUploadError(message) {
    if (!uploadZone || !uploadError) return;

    uploadZone.classList.add('error');
    uploadError.textContent = message;
}

/**
 * Clear upload error
 */
function clearUploadError() {
    if (!uploadZone || !uploadError) return;

    uploadZone.classList.remove('error');
    uploadError.textContent = '';
}

/**
 * Handle rotation change
 */
function handleRotationChange(event) {
    const rotation = parseInt(event.target.value, 10);
    editorState.logo.rotation = rotation;

    if (rotationValue) {
        rotationValue.textContent = rotation + '°';
    }

    // Update overlay transform
    if (logoOverlay && editorState.logo.image) {
        const { x, y } = editorState.logo;
        logoOverlay.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }

    renderCanvas();
}

/**
 * Handle keyboard events
 */
function handleKeydown(event) {
    if (!editorState.isOpen) return;

    if (event.key === 'Escape') {
        closeLogoEditor();
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    if (!editorState.isOpen || !editorState.productImage) return;

    setupCanvas();
    updateLogoOverlay();
    renderCanvas();
}

/**
 * Update download button state
 */
function updateDownloadButton() {
    if (!downloadBtn) return;
    downloadBtn.disabled = !editorState.logo.image;
}

/**
 * Export canvas as JPG
 */
function exportAsJPG() {
    if (!editorState.canvas || !editorState.logo.image) {
        showToast('Please upload a logo first', 'error');
        return;
    }

    try {
        // Create high-resolution export canvas
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');

        // Use original product image dimensions for better quality
        const img = editorState.productImage;
        exportCanvas.width = img.width;
        exportCanvas.height = img.height;

        // Calculate scale factor
        const scaleX = img.width / editorState.canvasRect.width;
        const scaleY = img.height / editorState.canvasRect.height;

        // Draw product image at full resolution
        exportCtx.drawImage(img, 0, 0, img.width, img.height);

        // Draw logo at scaled position
        const logo = editorState.logo;
        if (logo.image) {
            exportCtx.save();

            const scaledX = logo.x * scaleX;
            const scaledY = logo.y * scaleY;
            const scaledWidth = logo.width * scaleX;
            const scaledHeight = logo.height * scaleY;

            const centerX = scaledX + scaledWidth / 2;
            const centerY = scaledY + scaledHeight / 2;

            exportCtx.translate(centerX, centerY);
            exportCtx.rotate(logo.rotation * Math.PI / 180);

            exportCtx.drawImage(
                logo.image,
                -scaledWidth / 2,
                -scaledHeight / 2,
                scaledWidth,
                scaledHeight
            );

            exportCtx.restore();
        }

        // Convert to blob and download
        exportCanvas.toBlob((blob) => {
            if (!blob) {
                showToast('Failed to export image', 'error');
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${product?.title || 'product'}-with-logo.jpg`.replace(/\s+/g, '-').toLowerCase();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('Image downloaded successfully!', 'success');
        }, 'image/jpeg', 0.92);
    } catch (error) {
        // Handle tainted canvas error (CORS issue with external images)
        if (error.name === 'SecurityError') {
            showToast('Cannot export: please use a product with a local image', 'error');
        } else {
            showToast('Failed to export image', 'error');
        }
        console.error('Export error:', error);
    }
}

/**
 * Reset logo state
 */
function resetLogoState() {
    editorState.logo = {
        image: null,
        file: null,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        scale: 1
    };

    if (logoOverlay) {
        logoOverlay.style.display = 'none';
        // Remove any existing logo image from overlay
        const existingImg = logoOverlay.querySelector('img');
        if (existingImg) {
            existingImg.remove();
        }
        // Reset transform and data attributes
        logoOverlay.style.transform = '';
        logoOverlay.removeAttribute('data-x');
        logoOverlay.removeAttribute('data-y');
    }

    if (uploadZone) {
        uploadZone.classList.remove('has-logo', 'error');
    }

    if (uploadInput) {
        uploadInput.value = '';
    }

    if (rotationSlider) {
        rotationSlider.value = 0;
    }

    if (rotationValue) {
        rotationValue.textContent = '0°';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    let toast = document.querySelector('.logo-editor-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'logo-editor-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `logo-editor-toast ${type}`;

    // Force reflow
    toast.offsetHeight;

    toast.classList.add('active');

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

/**
 * Debounce utility function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initLogoEditor);
