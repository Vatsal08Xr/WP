import { createNoise2D, createNoise3D } from 'https://esm.sh/simplex-noise@4.0.1';

// ─── Utility ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
    if (!hex) return [255, 255, 255];
    const h = hex.replace('#', '');
    return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16)
    ];
}

function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Palette picker (uses user palette colors + bg) ────────────────────────

function buildInkPalette(colors, bg, rng) {
    // Shuffle and pick 3–5 of the user's accent colors plus bg
    const shuffled = [...colors].sort(() => rng() - 0.5);
    const count = 3 + Math.floor(rng() * (Math.min(colors.length, 3)));
    return { inks: shuffled.slice(0, count), bg };
}

// ─── Flow field ─────────────────────────────────────────────────────────────

function makeFlowField(noise2D, width, height, rng) {
    const scale   = 0.0008 + rng() * 0.001;    // frequency of field
    const twist   = (rng() - 0.5) * 8;         // how much it rotates
    const zOff    = rng() * 100;
    const bias    = (rng() - 0.5) * Math.PI;   // global directional bias
    return (x, y) => {
        const n = noise2D(x * scale + zOff, y * scale + zOff * 1.3);
        return bias + n * Math.PI * twist;
    };
}

// ─── Bezier path builder along flow field ───────────────────────────────────

function traceStreamline(flowFn, x0, y0, steps, stepLen) {
    const pts = [{ x: x0, y: y0 }];
    let x = x0, y = y0;
    for (let i = 0; i < steps; i++) {
        const angle = flowFn(x, y);
        x += Math.cos(angle) * stepLen;
        y += Math.sin(angle) * stepLen;
        pts.push({ x, y });
    }
    return pts;
}

// Draw a smooth bezier path through points
function drawSmoothPath(ctx, pts) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) * 0.5;
        const my = (pts[i].y + pts[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}

// ─── Offscreen canvas helper ─────────────────────────────────────────────────

function makeOffscreen(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return { canvas: c, ctx: c.getContext('2d') };
}

// ─── Layer 1 – Background with subtle texture ───────────────────────────────

function drawBackground(ctx, width, height, bg, rng) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Very faint noise grain over bg for paint thickness feel
    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;
    const [br, bg2, bb] = hexToRgb(bg);
    // Only sample a fraction of pixels for speed
    for (let i = 0; i < d.length; i += 16) {
        const noise = (rng() - 0.5) * 18;
        d[i]     = clamp(br + noise, 0, 255);
        d[i + 1] = clamp(bg2 + noise, 0, 255);
        d[i + 2] = clamp(bb + noise, 0, 255);
    }
    ctx.putImageData(imageData, 0, 0);
}

// ─── Layer 2 – Major liquid bodies ──────────────────────────────────────────

function drawLiquidBodies(oCtx, width, height, palette, flowFn, rng) {
    const { inks } = palette;
    const numBodies = 2 + Math.floor(rng() * 3); // 2–4

    // Entry sides: top, bottom, left, right, diagonal
    const entries = [
        () => ({ x: rng() * width, y: -height * 0.05 }),
        () => ({ x: rng() * width, y: height * 1.05 }),
        () => ({ x: -width * 0.05, y: rng() * height }),
        () => ({ x: width * 1.05, y: rng() * height }),
    ];

    for (let b = 0; b < numBodies; b++) {
        const ink = inks[b % inks.length];
        const start = entries[Math.floor(rng() * entries.length)]();
        const steps = 120 + Math.floor(rng() * 80);
        const stepLen = (width + height) * 0.005;

        const pts = traceStreamline(flowFn, start.x, start.y, steps, stepLen);
        const ribbonWidth = (0.08 + rng() * 0.18) * Math.min(width, height);

        // Draw fat ribbon with gradient across its width
        oCtx.save();
        oCtx.globalCompositeOperation = 'source-over';
        oCtx.globalAlpha = 0.55 + rng() * 0.3;

        drawSmoothPath(oCtx, pts);

        oCtx.lineWidth = ribbonWidth;
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        oCtx.strokeStyle = ink;
        oCtx.stroke();

        // Soft feathered edge – draw wider and more transparent
        drawSmoothPath(oCtx, pts);
        oCtx.lineWidth = ribbonWidth * 1.6;
        oCtx.globalAlpha = 0.08 + rng() * 0.1;
        oCtx.strokeStyle = ink;
        oCtx.stroke();

        oCtx.restore();
    }
}

// ─── Layer 3 – Secondary flowing tendrils ───────────────────────────────────

function drawTendrils(oCtx, width, height, palette, flowFn, rng) {
    const { inks } = palette;
    const count = 8 + Math.floor(rng() * 12);

    for (let i = 0; i < count; i++) {
        const ink = inks[Math.floor(rng() * inks.length)];
        const x0 = rng() * width * 1.2 - width * 0.1;
        const y0 = rng() * height * 1.2 - height * 0.1;
        const steps = 60 + Math.floor(rng() * 80);
        const stepLen = (width + height) * 0.003;
        const pts = traceStreamline(flowFn, x0, y0, steps, stepLen);
        const lw = (0.005 + rng() * 0.025) * Math.min(width, height);

        oCtx.save();
        oCtx.globalAlpha = 0.3 + rng() * 0.45;
        oCtx.globalCompositeOperation = rng() > 0.7 ? 'screen' : 'source-over';
        drawSmoothPath(oCtx, pts);
        oCtx.lineWidth = lw;
        oCtx.lineCap = 'round';
        oCtx.strokeStyle = ink;
        oCtx.stroke();

        // Feather
        if (rng() > 0.5) {
            drawSmoothPath(oCtx, pts);
            oCtx.lineWidth = lw * 2.5;
            oCtx.globalAlpha *= 0.15;
            oCtx.stroke();
        }
        oCtx.restore();
    }
}

// ─── Layer 4 – Paint cells (alcohol ink characteristic) ─────────────────────

function drawCells(oCtx, width, height, palette, flowFn, noise2D, rng) {
    const { inks, bg } = palette;
    const cellCount = 18 + Math.floor(rng() * 22);
    const zOff = rng() * 50;

    for (let i = 0; i < cellCount; i++) {
        const x = rng() * width;
        const y = rng() * height;
        const n = noise2D(x * 0.002 + zOff, y * 0.002 + zOff * 1.7);
        if (n < -0.2) continue; // Skip dark negative space areas

        const cellInk = rng() > 0.3
            ? inks[Math.floor(rng() * inks.length)]
            : bg;

        const baseR = (0.02 + rng() * 0.07) * Math.min(width, height);
        // Stretch cell along flow direction
        const angle = flowFn(x, y);
        const stretch = 1.5 + rng() * 3;

        oCtx.save();
        oCtx.translate(x, y);
        oCtx.rotate(angle);
        oCtx.scale(stretch, 1);

        // Organic cell shape via multiple overlapping ellipses
        const numLobes = 3 + Math.floor(rng() * 4);
        oCtx.globalAlpha = 0.25 + rng() * 0.45;
        oCtx.globalCompositeOperation = rng() > 0.6 ? 'overlay' : 'source-over';

        for (let l = 0; l < numLobes; l++) {
            const offX = (rng() - 0.5) * baseR * 0.8;
            const offY = (rng() - 0.5) * baseR * 0.4;
            const r = baseR * (0.4 + rng() * 0.7);
            const grad = oCtx.createRadialGradient(offX, offY, 0, offX, offY, r);
            grad.addColorStop(0, rgba(cellInk, 0.9));
            grad.addColorStop(0.6, rgba(cellInk, 0.4));
            grad.addColorStop(1, rgba(cellInk, 0));
            oCtx.fillStyle = grad;
            oCtx.beginPath();
            oCtx.ellipse(offX, offY, r, r * 0.6, rng() * Math.PI, 0, Math.PI * 2);
            oCtx.fill();
        }

        // Cell edge outline (thin dark/light line at boundary)
        if (rng() > 0.5) {
            oCtx.globalAlpha = 0.12 + rng() * 0.2;
            oCtx.globalCompositeOperation = 'source-over';
            oCtx.strokeStyle = rng() > 0.5 ? rgba(bg, 1) : rgba(cellInk, 1);
            oCtx.lineWidth = baseR * 0.04;
            oCtx.beginPath();
            oCtx.ellipse(0, 0, baseR * stretch * 0.9, baseR * 0.5, 0, 0, Math.PI * 2);
            oCtx.stroke();
        }

        oCtx.restore();
    }
}

// ─── Layer 5 – Fine marbling veins ──────────────────────────────────────────

function drawMarblingVeins(oCtx, width, height, palette, flowFn, rng) {
    const { inks, bg } = palette;
    const veinCount = 12 + Math.floor(rng() * 16);

    for (let i = 0; i < veinCount; i++) {
        const ink = rng() > 0.2 ? inks[Math.floor(rng() * inks.length)] : bg;
        const x0 = rng() * width;
        const y0 = rng() * height;
        const steps = 40 + Math.floor(rng() * 60);
        const stepLen = (width + height) * 0.002;
        const pts = traceStreamline(flowFn, x0, y0, steps, stepLen);

        oCtx.save();
        oCtx.globalAlpha = 0.12 + rng() * 0.25;
        oCtx.globalCompositeOperation = 'source-over';
        drawSmoothPath(oCtx, pts);
        oCtx.lineWidth = Math.max(0.5, (0.001 + rng() * 0.004) * Math.min(width, height));
        oCtx.lineCap = 'round';
        oCtx.strokeStyle = ink;
        oCtx.stroke();
        oCtx.restore();
    }
}

// ─── Layer 6 – Bubbles ──────────────────────────────────────────────────────

function drawBubbles(oCtx, width, height, palette, rng) {
    const { inks, bg } = palette;
    const count = 40 + Math.floor(rng() * 60);

    for (let i = 0; i < count; i++) {
        const x = rng() * width;
        const y = rng() * height;
        const r = (0.002 + rng() * rng() * 0.015) * Math.min(width, height);
        const ink = rng() > 0.3 ? inks[Math.floor(rng() * inks.length)] : bg;

        oCtx.save();
        oCtx.globalAlpha = 0.15 + rng() * 0.45;

        // Bubble fill
        const grad = oCtx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        grad.addColorStop(0, rgba(ink, 0.5));
        grad.addColorStop(0.7, rgba(ink, 0.1));
        grad.addColorStop(1, rgba(ink, 0));
        oCtx.fillStyle = grad;
        oCtx.beginPath();
        oCtx.arc(x, y, r, 0, Math.PI * 2);
        oCtx.fill();

        // Specular highlight
        if (rng() > 0.4) {
            oCtx.globalAlpha = 0.4 + rng() * 0.4;
            const hx = x - r * 0.35;
            const hy = y - r * 0.35;
            const hr = r * 0.25;
            const hgrad = oCtx.createRadialGradient(hx, hy, 0, hx, hy, hr);
            hgrad.addColorStop(0, 'rgba(255,255,255,0.8)');
            hgrad.addColorStop(1, 'rgba(255,255,255,0)');
            oCtx.fillStyle = hgrad;
            oCtx.beginPath();
            oCtx.arc(hx, hy, hr, 0, Math.PI * 2);
            oCtx.fill();
        }

        oCtx.restore();
    }
}

// ─── Layer 7 – Edge droplets ─────────────────────────────────────────────────

function drawDroplets(oCtx, width, height, palette, flowFn, rng) {
    const { inks } = palette;
    const count = 20 + Math.floor(rng() * 30);

    for (let i = 0; i < count; i++) {
        const ink = inks[Math.floor(rng() * inks.length)];
        const x = rng() * width;
        const y = rng() * height;
        const r = (0.001 + rng() * rng() * 0.007) * Math.min(width, height);
        const angle = flowFn(x, y);
        const tailLen = r * (2 + rng() * 5);

        oCtx.save();
        oCtx.globalAlpha = 0.3 + rng() * 0.5;
        oCtx.translate(x, y);
        oCtx.rotate(angle + Math.PI);

        // Teardrop body
        oCtx.fillStyle = ink;
        oCtx.beginPath();
        oCtx.arc(0, 0, r, 0, Math.PI * 2);
        oCtx.fill();

        // Thin tail
        const grad = oCtx.createLinearGradient(0, 0, tailLen, 0);
        grad.addColorStop(0, rgba(ink, 0.6));
        grad.addColorStop(1, rgba(ink, 0));
        oCtx.strokeStyle = grad;
        oCtx.lineWidth = r * 0.4;
        oCtx.lineCap = 'round';
        oCtx.beginPath();
        oCtx.moveTo(0, 0);
        oCtx.lineTo(tailLen, 0);
        oCtx.stroke();

        oCtx.restore();
    }
}

// ─── Layer 8 – Highlights / glossy sheen ────────────────────────────────────

function drawHighlights(oCtx, width, height, rng) {
    const count = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
        const x = rng() * width;
        const y = rng() * height;
        const rx = (0.05 + rng() * 0.2) * width;
        const ry = (0.02 + rng() * 0.08) * height;
        const angle = rng() * Math.PI;

        oCtx.save();
        oCtx.translate(x, y);
        oCtx.rotate(angle);
        oCtx.globalAlpha = 0.03 + rng() * 0.06;
        oCtx.globalCompositeOperation = 'screen';

        const grad = oCtx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        oCtx.fillStyle = grad;

        oCtx.beginPath();
        oCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        oCtx.fill();
        oCtx.restore();
    }
}

// ─── Layer 9 – Micro noise grain ────────────────────────────────────────────

function drawGrain(oCtx, width, height, rng) {
    // Draw sparse scattered noise dots very efficiently
    oCtx.save();
    oCtx.globalAlpha = 0.025;
    oCtx.globalCompositeOperation = 'overlay';
    oCtx.fillStyle = '#ffffff';

    const count = Math.floor(width * height * 0.003);
    for (let i = 0; i < count; i++) {
        const x = rng() * width;
        const y = rng() * height;
        const r = rng() * 0.8 + 0.2;
        oCtx.beginPath();
        oCtx.arc(x, y, r, 0, Math.PI * 2);
        oCtx.fill();
    }
    oCtx.restore();
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function drawFluidInk(ctx, width, height, colors, rng) {
    const noise2D = createNoise2D(rng);
    const noise2D2 = createNoise2D(rng);

    const palette = buildInkPalette(colors.colors, colors.bg, rng);

    // Create two flow fields with slight variance for rich turbulence
    const flow1 = makeFlowField(noise2D, width, height, rng);
    const flow2 = makeFlowField(noise2D2, width, height, rng);
    // Blend them
    const blendFlow = (x, y) => {
        const t = 0.35 + rng() * 0.3;
        return lerp(flow1(x, y), flow2(x, y), t);
    };

    // Work on offscreen canvas so we can composite layers cleanly
    const { canvas: off, ctx: oCtx } = makeOffscreen(width, height);

    // Layer 0: background
    drawBackground(oCtx, width, height, palette.bg, rng);

    // Layer 1: major liquid bodies
    drawLiquidBodies(oCtx, width, height, palette, blendFlow, rng);

    // Soft blur between layers (paint spreading)
    if (width <= 2000) {
        // Only blur for preview — skip for 4K exports to stay within time budget
        oCtx.filter = `blur(${Math.min(width, height) * 0.006}px)`;
        const snap = makeOffscreen(width, height);
        snap.ctx.drawImage(off, 0, 0);
        oCtx.filter = 'none';
        oCtx.clearRect(0, 0, width, height);
        oCtx.drawImage(snap.canvas, 0, 0);
    }

    // Layer 2: secondary tendrils
    drawTendrils(oCtx, width, height, palette, blendFlow, rng);

    // Layer 3: paint cells
    drawCells(oCtx, width, height, palette, blendFlow, noise2D, rng);

    // Layer 4: marbling veins
    drawMarblingVeins(oCtx, width, height, palette, blendFlow, rng);

    // Layer 5: bubbles
    drawBubbles(oCtx, width, height, palette, rng);

    // Layer 6: droplets with tails
    drawDroplets(oCtx, width, height, palette, blendFlow, rng);

    // Layer 7: glossy highlights
    drawHighlights(oCtx, width, height, rng);

    // Layer 8: micro grain
    drawGrain(oCtx, width, height, rng);

    // Blit to main canvas
    ctx.drawImage(off, 0, 0);
}
