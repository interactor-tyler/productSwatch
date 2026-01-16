// Colors with real images (from productImgs directory)
const REAL_IMAGE_COLORS = ['black', 'blue', 'green', 'orange', 'yellow'];

// Color configuration
const colorConfig = {
    // Real image colors
    black:  { name: 'Black',  image: 'productImgs/BLACK_-_OW_1.jpg' },
    blue:   { name: 'Blue',   image: 'productImgs/BLUE_-_OW_1.jpg' },
    green:  { name: 'Green',  image: 'productImgs/GREEN_-_OW_1.jpg' },
    orange: { name: 'Orange', image: 'productImgs/ORANGE_-_OW_1.jpg' },
    yellow: { name: 'Yellow', image: 'productImgs/YELLOW_-_OW_1.jpg' },
    // Placeholder colors
    white:  { name: 'White',  bg: 'ffffff', text: '1a1a1a' },
    red:    { name: 'Red',    bg: 'dc2626', text: 'ffffff' },
    purple: { name: 'Purple', bg: '9333ea', text: 'ffffff' },
    pink:   { name: 'Pink',   bg: 'ec4899', text: 'ffffff' }
};

// Product data
const product = {
    title: 'One-Wrap Cable Tie',
    sku: 'OW-001'
};

// Current selected color
let selectedColor = 'black';

// Get image src for selected color
function getImageSrc(colorKey) {
    const color = colorConfig[colorKey];

    // Check if this color has a real image
    if (REAL_IMAGE_COLORS.includes(colorKey)) {
        return color.image;
    }

    // Use placehold.co for placeholder colors
    const text = encodeURIComponent(`${product.title}\n${color.name}`);
    return `https://placehold.co/600x600/${color.bg}/${color.text}?text=${text}`;
}

// DOM Elements
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxColor = document.getElementById('lightbox-color');
const lightboxTitle = document.getElementById('lightbox-title');
const productImage = document.querySelector('.image-wrapper img');
const colorLabel = document.querySelector('.selected-color span');

// Color swatch click handler
document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
        e.stopPropagation();

        const colorKey = swatch.dataset.color;
        selectedColor = colorKey;

        // Update active swatch
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');

        // Update selected color label
        colorLabel.textContent = colorConfig[colorKey].name;

        // Update product image
        productImage.src = getImageSrc(colorKey);
    });
});

// Open lightbox
document.querySelector('.image-wrapper').addEventListener('click', () => {
    openLightbox();
});

function openLightbox() {
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function updateLightbox() {
    const colorName = colorConfig[selectedColor].name;
    lightboxImage.src = getImageSrc(selectedColor);
    lightboxImage.alt = `${product.title} - ${colorName}`;
    lightboxColor.textContent = colorName;
    lightboxTitle.textContent = product.title;
}

// Event listeners
document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
document.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
});

// Add Logo button click handler
document.querySelector('.add-logo-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof openLogoEditor === 'function') {
        openLogoEditor(getImageSrc(selectedColor));
    }
});
