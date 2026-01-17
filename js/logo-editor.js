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
        originalWidth: 100,
        originalHeight: 100,
        rotation: 0,
        scale: 1,
        opacity: 1,
        maintainAspectRatio: true
    },
    background: {
        rotation: 0,
        zoom: 1,
        panX: 0,
        panY: 0,
        opacity: 1
    },
    canvas: null,
    ctx: null,
    canvasRect: null,
    isOpen: false
};

// DOM Elements (initialized on DOMContentLoaded)
let editorModal, editorCanvas, uploadZone, uploadInput, uploadError;
let downloadBtn, rotationSlider, rotationValue, logoOverlay, canvasWrapper;
let sizeSlider, sizeValue, aspectRatioToggle, resetSizeBtn;
let logoOpacitySlider, logoOpacityValue;
let bgRotationSlider, bgRotationValue, bgZoomSlider, bgZoomValue;
let bgOpacitySlider, bgOpacityValue;
let bgPanXSlider, bgPanXValue, bgPanYSlider, bgPanYValue, bgPanControls, bgPanYControls, bgResetBtn;

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

    // New controls
    sizeSlider = document.getElementById('logo-size');
    sizeValue = document.getElementById('logo-size-value');
    aspectRatioToggle = document.getElementById('logo-aspect-ratio');
    resetSizeBtn = document.getElementById('logo-reset-size');
    logoOpacitySlider = document.getElementById('logo-opacity');
    logoOpacityValue = document.getElementById('logo-opacity-value');
    bgRotationSlider = document.getElementById('bg-rotation');
    bgRotationValue = document.getElementById('bg-rotation-value');
    bgZoomSlider = document.getElementById('bg-zoom');
    bgZoomValue = document.getElementById('bg-zoom-value');
    bgOpacitySlider = document.getElementById('bg-opacity');
    bgOpacityValue = document.getElementById('bg-opacity-value');
    bgPanXSlider = document.getElementById('bg-pan-x');
    bgPanXValue = document.getElementById('bg-pan-x-value');
    bgPanYSlider = document.getElementById('bg-pan-y');
    bgPanYValue = document.getElementById('bg-pan-y-value');
    bgPanControls = document.getElementById('bg-pan-controls');
    bgPanYControls = document.getElementById('bg-pan-y-controls');
    bgResetBtn = document.getElementById('bg-reset');

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

    // Logo controls
    rotationSlider?.addEventListener('input', handleRotationChange);
    sizeSlider?.addEventListener('input', handleSizeChange);
    logoOpacitySlider?.addEventListener('input', handleLogoOpacityChange);
    aspectRatioToggle?.addEventListener('change', handleAspectRatioToggle);
    resetSizeBtn?.addEventListener('click', handleResetSize);

    // Background controls
    bgRotationSlider?.addEventListener('input', handleBgRotationChange);
    bgZoomSlider?.addEventListener('input', handleBgZoomChange);
    bgOpacitySlider?.addEventListener('input', handleBgOpacityChange);
    bgPanXSlider?.addEventListener('input', handleBgPanXChange);
    bgPanYSlider?.addEventListener('input', handleBgPanYChange);
    bgResetBtn?.addEventListener('click', handleBgReset);

    // Double-click to reset sliders to default values
    setupSliderDoubleClickReset();

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
            modifiers: [
                interact.modifiers.aspectRatio({
                    ratio: 'preserve',
                    enabled: () => editorState.logo.maintainAspectRatio
                }),
                interact.modifiers.restrictSize({
                    min: { width: 30, height: 30 },
                    max: { width: 500, height: 500 }
                })
            ],
            inertia: true,
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
    // Set crossOrigin for external URLs to enable canvas export
    if (productImageSrc.startsWith('http')) {
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
    img.onerror = (error) => {
        console.error('Failed to load product image:', productImageSrc, error);
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
    if (!ctx || !canvas || !productImage) {
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw product image (base layer) with background transformations
    ctx.save();

    const bgRotation = editorState.background.rotation;
    const bgZoom = editorState.background.zoom;
    const bgPanX = editorState.background.panX;
    const bgPanY = editorState.background.panY;
    const bgOpacity = editorState.background.opacity;

    // Apply background opacity
    ctx.globalAlpha = bgOpacity;

    // Move to canvas center for rotation and zoom
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(bgRotation * Math.PI / 180);
    ctx.scale(bgZoom, bgZoom);

    // Apply pan offset (scaled by canvas size for consistent behavior)
    const panOffsetX = (bgPanX / 100) * canvas.width;
    const panOffsetY = (bgPanY / 100) * canvas.height;

    // Draw background image centered at origin with pan offset
    ctx.drawImage(productImage, -canvas.width / 2 + panOffsetX, -canvas.height / 2 + panOffsetY, canvas.width, canvas.height);

    ctx.restore();

    // Draw logo (overlay layer)
    if (logo.image) {
        ctx.save();

        // Apply logo opacity
        ctx.globalAlpha = logo.opacity;

        // Calculate center position
        const logoCenterX = logo.x + logo.width / 2;
        const logoCenterY = logo.y + logo.height / 2;

        // Move to logo center for rotation
        ctx.translate(logoCenterX, logoCenterY);
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
            editorState.logo.originalWidth = width;
            editorState.logo.originalHeight = height;
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
 * Note: The overlay is just for interaction handles - the logo itself renders on canvas
 */
function updateLogoOverlay() {
    if (!logoOverlay || !editorState.logo.image) return;

    const { x, y, width, height, rotation } = editorState.logo;

    logoOverlay.style.width = width + 'px';
    logoOverlay.style.height = height + 'px';
    logoOverlay.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    logoOverlay.setAttribute('data-x', x);
    logoOverlay.setAttribute('data-y', y);

    // Remove any existing logo image - we only want the interactive handles visible
    const overlayImg = logoOverlay.querySelector('img');
    if (overlayImg) {
        overlayImg.remove();
    }

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
 * Handle size slider change
 */
function handleSizeChange(event) {
    const scale = parseInt(event.target.value, 10) / 100;

    if (sizeValue) {
        sizeValue.textContent = event.target.value + '%';
    }

    if (!editorState.logo.image) return;

    const { originalWidth, originalHeight } = editorState.logo;
    editorState.logo.width = originalWidth * scale;
    editorState.logo.height = originalHeight * scale;

    updateLogoOverlay();
    renderCanvas();
}

/**
 * Handle aspect ratio toggle
 */
function handleAspectRatioToggle(event) {
    editorState.logo.maintainAspectRatio = event.target.checked;
}

/**
 * Handle reset size button
 */
function handleResetSize() {
    if (!editorState.logo.image) return;

    const { originalWidth, originalHeight } = editorState.logo;
    editorState.logo.width = originalWidth;
    editorState.logo.height = originalHeight;

    if (sizeSlider) {
        sizeSlider.value = 100;
    }
    if (sizeValue) {
        sizeValue.textContent = '100%';
    }

    updateLogoOverlay();
    renderCanvas();
}

/**
 * Handle background rotation change
 */
function handleBgRotationChange(event) {
    const rotation = parseInt(event.target.value, 10);
    editorState.background.rotation = rotation;

    if (bgRotationValue) {
        bgRotationValue.textContent = rotation + '°';
    }

    renderCanvas();
}

/**
 * Handle background zoom change
 */
function handleBgZoomChange(event) {
    const zoom = parseInt(event.target.value, 10) / 100;
    editorState.background.zoom = zoom;

    if (bgZoomValue) {
        bgZoomValue.textContent = event.target.value + '%';
    }

    // Enable/disable pan controls based on zoom level
    const enablePan = zoom > 1;
    if (bgPanXSlider) {
        bgPanXSlider.disabled = !enablePan;
    }
    if (bgPanYSlider) {
        bgPanYSlider.disabled = !enablePan;
    }
    if (bgPanControls) {
        bgPanControls.classList.toggle('disabled', !enablePan);
    }
    if (bgPanYControls) {
        bgPanYControls.classList.toggle('disabled', !enablePan);
    }

    // Update pan slider ranges based on zoom
    updatePanSliderRanges(zoom);

    renderCanvas();
}

/**
 * Handle background opacity change
 */
function handleBgOpacityChange(event) {
    const opacity = parseInt(event.target.value, 10) / 100;
    editorState.background.opacity = opacity;

    if (bgOpacityValue) {
        bgOpacityValue.textContent = event.target.value + '%';
    }

    renderCanvas();
}

/**
 * Handle logo opacity change
 */
function handleLogoOpacityChange(event) {
    const opacity = parseInt(event.target.value, 10) / 100;
    editorState.logo.opacity = opacity;

    if (logoOpacityValue) {
        logoOpacityValue.textContent = event.target.value + '%';
    }

    renderCanvas();
}

/**
 * Update pan slider ranges based on zoom level
 */
function updatePanSliderRanges(zoom) {
    // Pan range increases with zoom - at 500% we can pan much further
    const maxPan = Math.round((zoom - 1) * 100);

    if (bgPanXSlider) {
        bgPanXSlider.min = -maxPan;
        bgPanXSlider.max = maxPan;
    }
    if (bgPanYSlider) {
        bgPanYSlider.min = -maxPan;
        bgPanYSlider.max = maxPan;
    }
}

/**
 * Handle background pan X change
 */
function handleBgPanXChange(event) {
    const panX = parseInt(event.target.value, 10);
    editorState.background.panX = panX;

    if (bgPanXValue) {
        bgPanXValue.textContent = panX;
    }

    renderCanvas();
}

/**
 * Handle background pan Y change
 */
function handleBgPanYChange(event) {
    const panY = parseInt(event.target.value, 10);
    editorState.background.panY = panY;

    if (bgPanYValue) {
        bgPanYValue.textContent = panY;
    }

    renderCanvas();
}

/**
 * Handle background reset button
 */
function handleBgReset() {
    editorState.background.rotation = 0;
    editorState.background.zoom = 1;
    editorState.background.panX = 0;
    editorState.background.panY = 0;
    editorState.background.opacity = 1;

    // Reset all background controls
    if (bgRotationSlider) {
        bgRotationSlider.value = 0;
    }
    if (bgRotationValue) {
        bgRotationValue.textContent = '0°';
    }
    if (bgZoomSlider) {
        bgZoomSlider.value = 100;
    }
    if (bgZoomValue) {
        bgZoomValue.textContent = '100%';
    }
    if (bgOpacitySlider) {
        bgOpacitySlider.value = 100;
    }
    if (bgOpacityValue) {
        bgOpacityValue.textContent = '100%';
    }
    if (bgPanXSlider) {
        bgPanXSlider.value = 0;
        bgPanXSlider.disabled = true;
    }
    if (bgPanXValue) {
        bgPanXValue.textContent = '0';
    }
    if (bgPanYSlider) {
        bgPanYSlider.value = 0;
        bgPanYSlider.disabled = true;
    }
    if (bgPanYValue) {
        bgPanYValue.textContent = '0';
    }

    // Mark pan controls as disabled
    if (bgPanControls) {
        bgPanControls.classList.add('disabled');
    }
    if (bgPanYControls) {
        bgPanYControls.classList.add('disabled');
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

        // Draw product image at full resolution with background transformations
        exportCtx.save();

        const bgRotation = editorState.background.rotation;
        const bgZoom = editorState.background.zoom;
        const bgPanX = editorState.background.panX;
        const bgPanY = editorState.background.panY;
        const bgOpacity = editorState.background.opacity;

        // Apply background opacity
        exportCtx.globalAlpha = bgOpacity;

        // Move to canvas center for rotation and zoom
        const bgCenterX = img.width / 2;
        const bgCenterY = img.height / 2;
        exportCtx.translate(bgCenterX, bgCenterY);
        exportCtx.rotate(bgRotation * Math.PI / 180);
        exportCtx.scale(bgZoom, bgZoom);

        // Apply pan offset (scaled by image size for consistent behavior)
        const panOffsetX = (bgPanX / 100) * img.width;
        const panOffsetY = (bgPanY / 100) * img.height;

        // Draw background image centered at origin with pan offset
        exportCtx.drawImage(img, -img.width / 2 + panOffsetX, -img.height / 2 + panOffsetY, img.width, img.height);

        exportCtx.restore();

        // Draw logo at scaled position
        const logo = editorState.logo;
        if (logo.image) {
            exportCtx.save();

            // Apply logo opacity
            exportCtx.globalAlpha = logo.opacity;

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

        // Test if canvas is tainted before calling toBlob
        // This will throw SecurityError if canvas is tainted
        try {
            exportCanvas.toDataURL();
        } catch (testError) {
            if (testError.name === 'SecurityError') {
                // Canvas is tainted - this happens with:
                // 1. External images without CORS headers (like placeholder images)
                // 2. Local files when opened via file:// protocol
                const isExternal = editorState.productImageSrc?.startsWith('http');
                const errorMsg = isExternal
                    ? 'Cannot export: external placeholder images do not support export. Select a real product color.'
                    : 'Cannot export: please run on a web server (not file://)';
                showToast(errorMsg, 'error');
                console.error('Canvas is tainted - CORS issue with product image:', editorState.productImageSrc);
                return;
            }
            throw testError;
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
            // Get product title from main.js if available, or use default
            const productTitle = (typeof product !== 'undefined' && product?.title) ? product.title : 'product';
            link.download = `${productTitle}-with-logo.jpg`.replace(/\s+/g, '-').toLowerCase();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('Image downloaded successfully!', 'success');
        }, 'image/jpeg', 0.92);
    } catch (error) {
        // Handle tainted canvas error (CORS issue with external images)
        if (error.name === 'SecurityError') {
            const isExternal = editorState.productImageSrc?.startsWith('http');
            const errorMsg = isExternal
                ? 'Cannot export: external placeholder images do not support export. Select a real product color.'
                : 'Cannot export: please run on a web server (not file://)';
            showToast(errorMsg, 'error');
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
        originalWidth: 100,
        originalHeight: 100,
        rotation: 0,
        scale: 1,
        opacity: 1,
        maintainAspectRatio: true
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

    // Reset all controls
    if (rotationSlider) {
        rotationSlider.value = 0;
    }
    if (rotationValue) {
        rotationValue.textContent = '0°';
    }
    if (sizeSlider) {
        sizeSlider.value = 100;
    }
    if (sizeValue) {
        sizeValue.textContent = '100%';
    }
    if (logoOpacitySlider) {
        logoOpacitySlider.value = 100;
    }
    if (logoOpacityValue) {
        logoOpacityValue.textContent = '100%';
    }
    if (aspectRatioToggle) {
        aspectRatioToggle.checked = true;
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
 * Setup double-click to reset sliders to default values
 */
function setupSliderDoubleClickReset() {
    // Define slider configurations with their default values and reset handlers
    const sliderConfigs = [
        {
            slider: sizeSlider,
            valueDisplay: sizeValue,
            defaultValue: 100,
            suffix: '%',
            onReset: () => {
                editorState.logo.width = editorState.logo.originalWidth;
                editorState.logo.height = editorState.logo.originalHeight;
                updateLogoOverlay();
                renderCanvas();
            }
        },
        {
            slider: rotationSlider,
            valueDisplay: rotationValue,
            defaultValue: 0,
            suffix: '°',
            onReset: () => {
                editorState.logo.rotation = 0;
                if (logoOverlay && editorState.logo.image) {
                    const { x, y } = editorState.logo;
                    logoOverlay.style.transform = `translate(${x}px, ${y}px) rotate(0deg)`;
                }
                renderCanvas();
            }
        },
        {
            slider: logoOpacitySlider,
            valueDisplay: logoOpacityValue,
            defaultValue: 100,
            suffix: '%',
            onReset: () => {
                editorState.logo.opacity = 1;
                renderCanvas();
            }
        },
        {
            slider: bgRotationSlider,
            valueDisplay: bgRotationValue,
            defaultValue: 0,
            suffix: '°',
            onReset: () => {
                editorState.background.rotation = 0;
                renderCanvas();
            }
        },
        {
            slider: bgZoomSlider,
            valueDisplay: bgZoomValue,
            defaultValue: 100,
            suffix: '%',
            onReset: () => {
                editorState.background.zoom = 1;
                // Disable pan controls when zoom resets to 100%
                if (bgPanXSlider) bgPanXSlider.disabled = true;
                if (bgPanYSlider) bgPanYSlider.disabled = true;
                if (bgPanControls) bgPanControls.classList.add('disabled');
                if (bgPanYControls) bgPanYControls.classList.add('disabled');
                renderCanvas();
            }
        },
        {
            slider: bgOpacitySlider,
            valueDisplay: bgOpacityValue,
            defaultValue: 100,
            suffix: '%',
            onReset: () => {
                editorState.background.opacity = 1;
                renderCanvas();
            }
        },
        {
            slider: bgPanXSlider,
            valueDisplay: bgPanXValue,
            defaultValue: 0,
            suffix: '',
            onReset: () => {
                editorState.background.panX = 0;
                renderCanvas();
            }
        },
        {
            slider: bgPanYSlider,
            valueDisplay: bgPanYValue,
            defaultValue: 0,
            suffix: '',
            onReset: () => {
                editorState.background.panY = 0;
                renderCanvas();
            }
        }
    ];

    // Add double-click listeners to each slider
    sliderConfigs.forEach(config => {
        if (!config.slider) return;

        config.slider.addEventListener('dblclick', () => {
            // Reset the slider value
            config.slider.value = config.defaultValue;

            // Update the display value
            if (config.valueDisplay) {
                config.valueDisplay.textContent = config.defaultValue + config.suffix;
            }

            // Call the reset handler
            config.onReset();
        });
    });
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
