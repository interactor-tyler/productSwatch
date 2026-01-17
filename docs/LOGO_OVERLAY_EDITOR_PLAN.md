# Logo Overlay Editor - Implementation Plan

## Overview

Build a logo overlay editor that allows users to upload a logo (JPG, PNG, or SVG, max 2MB), position it on a product image, and export the composited result as JPG.

**Priority:** Speed & Modern Design Practices
**Tech Stack:** Vanilla JS (consistent with existing codebase), HTML5 Canvas API

---

## Architecture Decision

### Recommended Approach: Canvas-Based Editor

Given the existing vanilla JS architecture and the requirement for speed, we'll use:

- **HTML5 Canvas API** - For image composition and manipulation
- **Native Drag & Drop API** - For logo upload
- **Interact.js** (lightweight ~30KB) - For drag/resize/rotate interactions

This approach:
- Maintains consistency with the existing codebase
- Requires no build step
- Loads quickly via CDN (single dependency)
- Provides smooth, modern interactions

---

## Feature Requirements

### Core Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Logo Upload | Drag-drop or file picker for JPG/PNG/SVG logos (max 2MB) | P0 |
| Logo Positioning | Drag logo anywhere on product image | P0 |
| Logo Resizing | Scale logo up/down with handles | P0 |
| Logo Rotation | Rotate logo to any angle | P1 |
| Export JPG | Download composited image as JPEG | P0 |

### Enhanced Features (Post-MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Logo Opacity | Adjust logo transparency | P2 |
| Undo/Redo | Revert/restore changes | P2 |
| Multiple Logos | Add multiple logos | P3 |
| Preset Positions | Quick placement (center, corner, etc.) | P2 |

---

## Implementation Plan

### Phase 1: Editor Foundation
**Estimated Complexity: Medium**

#### 1.1 Create Editor Modal Structure

Add a new modal that opens when user clicks "Add Logo" button on a product.

```
┌─────────────────────────────────────────────────────┐
│  Logo Overlay Editor                           [X]  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │           Product Image Canvas              │    │
│  │              + Logo Overlay                 │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────────┐  ┌──────────────────────────┐    │
│  │ Upload Logo  │  │ Controls: Position/Size  │    │
│  └──────────────┘  └──────────────────────────┘    │
│                                                     │
│         ┌────────────────┐  ┌──────────┐           │
│         │  Download JPG  │  │  Cancel  │           │
│         └────────────────┘  └──────────┘           │
└─────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Add "Add Logo" button to product card
- [ ] Create editor modal HTML structure
- [ ] Style modal with existing design system (CSS variables)
- [ ] Implement modal open/close logic with keyboard support (ESC)
- [ ] Add responsive styling for mobile devices

#### 1.2 Logo Upload System

**Tasks:**
- [ ] Create drag-and-drop zone with visual feedback
- [ ] Implement file input fallback button
- [ ] Validate file types (JPG, JPEG, PNG, SVG only)
- [ ] Validate file size (max 2MB, reject larger files with error message)
- [ ] Show upload preview/confirmation
- [ ] Handle upload errors gracefully (invalid type, oversized file)

---

### Phase 2: Canvas Rendering
**Estimated Complexity: Medium-High**

#### 2.1 Canvas Setup

**Tasks:**
- [ ] Create canvas element matching product image aspect ratio
- [ ] Load product image onto canvas as base layer
- [ ] Handle high-DPI displays (devicePixelRatio scaling)
- [ ] Implement canvas resize on window resize

#### 2.2 Logo Layer Management

**Tasks:**
- [ ] Render uploaded logo on canvas
- [ ] Implement layer compositing (product base + logo overlay)
- [ ] Store logo state (x, y, width, height, rotation)
- [ ] Implement efficient re-rendering on state change

---

### Phase 3: Interactive Controls
**Estimated Complexity: High**

#### 3.1 Drag to Position

**Tasks:**
- [ ] Integrate Interact.js from CDN
- [ ] Make logo draggable within canvas bounds
- [ ] Show position feedback during drag
- [ ] Implement snap-to-center guides (optional)

#### 3.2 Resize Controls

**Tasks:**
- [ ] Add resize handles to logo corners
- [ ] Maintain aspect ratio during resize (shift key to unlock)
- [ ] Set minimum/maximum size limits
- [ ] Show size feedback during resize

#### 3.3 Rotation Controls

**Tasks:**
- [ ] Add rotation handle above logo
- [ ] Implement smooth rotation with visual feedback
- [ ] Add rotation angle display
- [ ] Implement snap-to-45-degree angles (optional)

---

### Phase 4: Export Functionality
**Estimated Complexity: Low**

#### 4.1 JPG Export

**Tasks:**
- [ ] Flatten canvas layers to single image
- [ ] Convert canvas to JPEG blob (quality 0.92)
- [ ] Trigger download with filename: `{product}-with-logo.jpg`
- [ ] Show success feedback on download

---

### Phase 5: Polish & UX
**Estimated Complexity: Low-Medium**

#### 5.1 Visual Feedback

**Tasks:**
- [ ] Add loading states during image processing
- [ ] Show success toast on export completion
- [ ] Add hover states for all interactive elements
- [ ] Implement smooth animations for modal and controls

#### 5.2 Accessibility

**Tasks:**
- [ ] Add ARIA labels to all controls
- [ ] Implement keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Add screen reader announcements for actions
- [ ] Ensure color contrast meets WCAG AA

#### 5.3 Mobile Optimization

**Tasks:**
- [ ] Implement touch gestures (pinch-to-zoom, two-finger rotate)
- [ ] Optimize control sizes for touch (44px minimum)
- [ ] Test and fix layout on various screen sizes
- [ ] Add mobile-specific help text

---

## Technical Implementation Details

### File Structure

```
productSwatch/
├── index.html              (add editor modal HTML)
├── productImgs/            (existing)
└── js/                     (new directory - optional)
    └── logo-editor.js      (editor logic - can be inline)
```

### External Dependencies (CDN)

```html
<!-- Interact.js - Drag, resize, rotate interactions -->
<script src="https://cdn.jsdelivr.net/npm/interactjs@1.10.18/dist/interact.min.js"></script>
```

### Key JavaScript Functions

```javascript
// Core editor state
const editorState = {
  productImage: null,
  logo: {
    image: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1
  },
  canvas: null,
  ctx: null
};

// File validation constants
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// Main functions to implement
function openLogoEditor(productImageSrc) { }
function closeLogoEditor() { }
function validateLogoFile(file) { }  // Returns { valid: boolean, error?: string }
function handleLogoUpload(file) { }
function renderCanvas() { }
function updateLogoPosition(x, y) { }
function updateLogoSize(width, height) { }
function updateLogoRotation(angle) { }
function exportAsJPG() { }
```

### Logo File Validation

```javascript
function validateLogoFile(file) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPG, PNG, or SVG file.'
    };
  }

  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum size is 2MB.`
    };
  }

  return { valid: true };
}
```

### Canvas Rendering Algorithm

```javascript
function renderCanvas() {
  const { ctx, canvas, productImage, logo } = editorState;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw product image (base layer)
  ctx.drawImage(productImage, 0, 0, canvas.width, canvas.height);

  // Draw logo (overlay layer)
  if (logo.image) {
    ctx.save();

    // Move to logo center for rotation
    ctx.translate(logo.x + logo.width / 2, logo.y + logo.height / 2);
    ctx.rotate(logo.rotation * Math.PI / 180);
    ctx.globalAlpha = logo.opacity;

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
```

---

## UI Design Specifications

### Editor Modal

| Property | Value |
|----------|-------|
| Max Width | 900px |
| Background | var(--color-white) |
| Border Radius | 12px |
| Shadow | 0 20px 60px rgba(0,0,0,0.3) |
| Padding | 24px |

### Upload Zone

| State | Style |
|-------|-------|
| Default | Dashed border, light gray bg, "JPG, PNG, or SVG (max 2MB)" hint |
| Hover | Primary color border, light primary bg |
| Active (dragging) | Solid primary border, pulsing animation |
| Error | Red border, error message displayed |
| Has Logo | Show thumbnail, "Change Logo" button |

### Control Buttons

| Button | Style |
|--------|-------|
| Download JPG | Primary color, white text |
| Cancel | Gray outline |

### Logo Handles

| Handle | Style |
|--------|-------|
| Corner Resize | 10px circles, primary color |
| Rotation | 12px circle with rotation icon, top-center |
| Border | 2px dashed primary (when selected) |

---

## Testing Checklist

### Functional Testing

- [ ] Upload JPG logo - displays correctly
- [ ] Upload PNG logo - displays correctly
- [ ] Upload SVG logo - displays correctly
- [ ] Reject file over 2MB with error message
- [ ] Reject invalid file type (e.g., .gif, .webp) with error message
- [ ] Drag logo to all corners
- [ ] Resize logo smaller
- [ ] Resize logo larger
- [ ] Rotate logo 360 degrees
- [ ] Export JPG - correct format and quality
- [ ] Cancel closes editor without changes
- [ ] ESC key closes editor
- [ ] Click backdrop closes editor

### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Performance Testing

- [ ] Logo files near 2MB limit
- [ ] High-resolution product images
- [ ] Multiple rapid exports
- [ ] Memory usage over extended session

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large file uploads | Enforce 2MB limit with clear error messaging |
| Invalid file types | Validate MIME type before processing |
| CORS issues with images | Ensure all images are same-origin or CORS-enabled |
| Mobile performance | Use requestAnimationFrame, reduce render frequency |
| Browser compatibility | Feature detection, graceful degradation |

---

## Success Metrics

1. **Time to First Interaction**: Editor opens in < 200ms
2. **Upload to Preview**: Logo appears in < 500ms after upload
3. **Export Speed**: JPG export completes in < 1 second
4. **Mobile Usability**: All features functional on touch devices
5. **File Size**: Total added JS < 50KB (gzipped, single dependency)

---

## Implementation Order (Recommended)

1. **Phase 1.1** - Editor modal structure & styling
2. **Phase 1.2** - Logo upload system (with 2MB/type validation)
3. **Phase 2.1** - Canvas setup
4. **Phase 2.2** - Basic logo rendering
5. **Phase 3.1** - Drag positioning (Interact.js)
6. **Phase 4.1** - JPG export (first working MVP)
7. **Phase 3.2** - Resize controls
8. **Phase 3.3** - Rotation controls
9. **Phase 5** - Polish & accessibility

This order prioritizes getting a working MVP (upload + drag + JPG export) before adding advanced controls.

---

## Conclusion

This plan provides a complete roadmap for implementing a logo overlay editor that:

- Maintains the existing vanilla JS architecture
- Uses a single external dependency (Interact.js ~30KB)
- Provides a modern, smooth user experience
- Enforces logo requirements (JPG/PNG/SVG, max 2MB)
- Exports composited images as high-quality JPG
- Works across desktop and mobile devices
- Follows the existing design system

The implementation can be completed in the existing `index.html` file or modularized into a separate JS file based on preference.
