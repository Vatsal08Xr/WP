export function drawFlowers(ctx, width, height, colors, rng) {
    const scale = Math.min(width, height);
    const isDark = isBgDark(colors.bg);

    // 1. Rich atmospheric background
    drawBackground(ctx, width, height, colors, rng, isDark);

    // 2. Extend palette to 6-8 vivid colors specifically for flowers
    const palette = buildFlowerPalette(colors, rng, isDark);

    // 3. Draw large abstract swirling background shapes (depth layer)
    drawSwirls(ctx, width, height, palette, rng, isDark, scale);

    // 4. Draw 4-6 large overlapping flowers that fill most of the canvas
    const numFlowers = 4 + Math.floor(rng() * 3); // 4 to 6
    const flowers = buildFlowerLayout(numFlowers, width, height, scale, rng, palette);

    // Draw stems first (underneath everything)
    flowers.forEach(f => drawStem(ctx, f, width, height, scale, isDark, rng));

    // Draw leaves next
    flowers.forEach(f => drawBigLeaf(ctx, f, scale, isDark, rng));

    // Draw flower bodies with screen blend for glowing translucent look
    ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';
    flowers.forEach(f => drawBigFlower(ctx, f, isDark, rng, scale));

    // Draw fine vein detail lines on top
    ctx.globalCompositeOperation = 'source-over';
    flowers.forEach(f => drawVeins(ctx, f, rng, scale, isDark));

    // Draw glowing centers
    ctx.globalCompositeOperation = isDark ? 'screen' : 'source-over';
    flowers.forEach(f => drawCenter(ctx, f, rng, scale, isDark));

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
}

// ---- BACKGROUND ----
function drawBackground(ctx, width, height, colors, rng, isDark) {
    // Base fill
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Atmospheric radial gradient from center
    const cx = width * (0.35 + rng() * 0.3);
    const cy = height * (0.35 + rng() * 0.3);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.85);
    if (isDark) {
        grad.addColorStop(0, 'rgba(40, 10, 30, 0.9)');
        grad.addColorStop(0.5, 'rgba(15, 5, 20, 0.6)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    } else {
        grad.addColorStop(0, 'rgba(255, 230, 240, 0.8)');
        grad.addColorStop(0.5, 'rgba(255, 210, 220, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
}

// ---- SWIRLING BG SHAPES ----
function drawSwirls(ctx, width, height, palette, rng, isDark, scale) {
    ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';
    const numSwirls = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < numSwirls; i++) {
        const x = rng() * width;
        const y = rng() * height;
        const r = scale * (0.25 + rng() * 0.5);
        const color = palette[Math.floor(rng() * palette.length)];

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, hexWithAlpha(color, isDark ? 0.2 : 0.12));
        grad.addColorStop(0.4, hexWithAlpha(color, isDark ? 0.07 : 0.04));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y, r * (0.5 + rng() * 1.0), r * (0.3 + rng() * 0.7), rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ---- FLOWER LAYOUT ----
function buildFlowerLayout(n, width, height, scale, rng, palette) {
    const flowers = [];
    // Position flowers to overlap and fill the canvas
    const positions = [
        { x: 0.5, y: 0.35 },  // center top - main large flower
        { x: 0.25, y: 0.55 }, // left middle
        { x: 0.72, y: 0.48 }, // right middle
        { x: 0.4, y: 0.7 },   // lower left
        { x: 0.65, y: 0.72 }, // lower right
        { x: 0.15, y: 0.3 },  // far left top
        { x: 0.85, y: 0.25 }, // far right top
    ];

    for (let i = 0; i < Math.min(n, positions.length); i++) {
        const pos = positions[i];
        const jitterX = (rng() - 0.5) * 0.12;
        const jitterY = (rng() - 0.5) * 0.1;
        // First flower is always large, others vary
        const r = scale * (i === 0 ? (0.28 + rng() * 0.1) : (0.14 + rng() * 0.14));
        const ci = i % palette.length;
        flowers.push({
            x: width * (pos.x + jitterX),
            y: height * (pos.y + jitterY),
            r: r,
            color: palette[ci],
            color2: palette[(ci + 2) % palette.length],
            color3: palette[(ci + 4) % palette.length],
            petals: 5 + Math.floor(rng() * 4), // 5-8 petals
            angleOffset: rng() * Math.PI * 2,
            scale: scale
        });
    }
    return flowers;
}

// ---- LARGE FLOWER (main draw) ----
function drawBigFlower(ctx, f, isDark, rng, scale) {
    const { x, y, r, color, color2, color3, petals, angleOffset } = f;

    // Layer 1: Outermost broad petals
    for (let i = 0; i < petals; i++) {
        const angle = angleOffset + (i / petals) * Math.PI * 2;
        drawPetal(ctx, x, y, r, angle, color, isDark ? 0.55 : 0.4, 0.42, rng);
    }

    // Layer 2: Rotated second set of petals in a second color (overlap)
    const rotOffset = Math.PI / petals;
    for (let i = 0; i < petals; i++) {
        const angle = angleOffset + rotOffset + (i / petals) * Math.PI * 2;
        drawPetal(ctx, x, y, r * 0.88, angle, color2, isDark ? 0.5 : 0.35, 0.46, rng);
    }

    // Layer 3: Inner smaller petals in a third color
    const innerPetals = petals - 1;
    for (let i = 0; i < innerPetals; i++) {
        const angle = angleOffset + (i / innerPetals) * Math.PI * 2 + rotOffset * 0.5;
        drawPetal(ctx, x, y, r * 0.65, angle, color3, isDark ? 0.6 : 0.45, 0.5, rng);
    }
}

function drawPetal(ctx, cx, cy, r, angle, color, alpha, spreadFactor, rng) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    const spread = spreadFactor + rng() * 0.08;
    const tipX = cx + Math.cos(angle) * r;
    const tipY = cy + Math.sin(angle) * r;

    // Left control
    const lAngle = angle - spread;
    const lX = cx + Math.cos(lAngle) * r * 0.65;
    const lY = cy + Math.sin(lAngle) * r * 0.65;

    // Right control
    const rAngle = angle + spread;
    const rX = cx + Math.cos(rAngle) * r * 0.65;
    const rY = cy + Math.sin(rAngle) * r * 0.65;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(lX, lY, cx + Math.cos(angle - spread * 0.55) * r * 0.9, cy + Math.sin(angle - spread * 0.55) * r * 0.9, tipX, tipY);
    ctx.bezierCurveTo(cx + Math.cos(angle + spread * 0.55) * r * 0.9, cy + Math.sin(angle + spread * 0.55) * r * 0.9, rX, rY, cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// ---- FINE VEIN LINES ----
function drawVeins(ctx, f, rng, scale, isDark) {
    const { x, y, r, color, petals, angleOffset } = f;

    ctx.globalAlpha = isDark ? 0.65 : 0.45;
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = r * 0.008;

    for (let i = 0; i < petals; i++) {
        const angle = angleOffset + (i / petals) * Math.PI * 2;
        const spread = 0.42 + rng() * 0.08;
        const tipX = x + Math.cos(angle) * r * 0.92;
        const tipY = y + Math.sin(angle) * r * 0.92;

        // Center vein
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
            x + Math.cos(angle) * r * 0.45,
            y + Math.sin(angle) * r * 0.45,
            tipX, tipY
        );
        ctx.stroke();

        // Side veins
        const numSide = 4;
        ctx.lineWidth = r * 0.004;
        ctx.globalAlpha = isDark ? 0.4 : 0.3;
        for (let s = 1; s <= numSide; s++) {
            const t = s / (numSide + 1);
            const baseX = x + Math.cos(angle) * r * t * 0.9;
            const baseY = y + Math.sin(angle) * r * t * 0.9;
            const sideLen = r * 0.18 * (1 - t * 0.5);

            [-1, 1].forEach(dir => {
                const sAngle = angle + dir * (spread * 0.5 + rng() * 0.1);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(
                    baseX + Math.cos(sAngle) * sideLen,
                    baseY + Math.sin(sAngle) * sideLen
                );
                ctx.stroke();
            });
        }
    }
    ctx.globalAlpha = 1.0;
}

// ---- GLOWING CENTER ----
function drawCenter(ctx, f, rng, scale, isDark) {
    const { x, y, r, color2, color3, petals, angleOffset } = f;
    const centerR = r * 0.13;

    // Soft glow aura
    const aura = ctx.createRadialGradient(x, y, 0, x, y, centerR * 2.5);
    aura.addColorStop(0, hexWithAlpha(color2, isDark ? 0.9 : 0.7));
    aura.addColorStop(0.4, hexWithAlpha(color2, isDark ? 0.4 : 0.25));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, centerR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pollen stamens
    const numStamens = petals * 4;
    ctx.strokeStyle = color3;
    ctx.lineWidth = r * 0.007;

    for (let i = 0; i < numStamens; i++) {
        const angle = angleOffset + (i / numStamens) * Math.PI * 2;
        const len = centerR * (0.9 + Math.sin(i * 2.5) * 0.3);
        const sx = x + Math.cos(angle) * len;
        const sy = y + Math.sin(angle) * len;

        ctx.globalAlpha = isDark ? 0.7 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Pollen dot
        ctx.globalAlpha = isDark ? 0.95 : 0.85;
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.014, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

// ---- STEMS ----
function drawStem(ctx, f, width, height, scale, isDark, rng) {
    const stemEndX = width * (0.4 + rng() * 0.2);
    const stemEndY = height * 0.98;
    const cp1x = f.x + (rng() - 0.5) * width * 0.15;
    const cp1y = f.y + (stemEndY - f.y) * 0.4;
    const cp2x = stemEndX + (rng() - 0.5) * width * 0.1;
    const cp2y = f.y + (stemEndY - f.y) * 0.7;

    ctx.globalAlpha = isDark ? 0.5 : 0.4;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = scale * 0.004;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(f.x, f.y + f.r * 0.15);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, stemEndX, stemEndY);
    ctx.stroke();

    // Store control points on flower object for leaf placement
    f._stemCp1x = cp1x; f._stemCp1y = cp1y;
    f._stemCp2x = cp2x; f._stemCp2y = cp2y;
    f._stemEndX = stemEndX; f._stemEndY = stemEndY;

    ctx.globalAlpha = 1.0;
}

// ---- LARGE LEAVES ----
function drawBigLeaf(ctx, f, scale, isDark, rng) {
    if (!f._stemCp1x) return;

    const t = 0.45 + rng() * 0.25;
    const lx = cubicBezier(t, f.x, f._stemCp1x, f._stemCp2x, f._stemEndX);
    const ly = cubicBezier(t, f.y + f.r * 0.15, f._stemCp1y, f._stemCp2y, f._stemEndY);
    const tx = cubicBezierDeriv(t, f.x, f._stemCp1x, f._stemCp2x, f._stemEndX);
    const ty = cubicBezierDeriv(t, f.y, f._stemCp1y, f._stemCp2y, f._stemEndY);
    const stemAngle = Math.atan2(ty, tx);

    [1, -1].forEach((dir, i) => {
        const leafAngle = stemAngle + dir * (Math.PI / 2.2 + rng() * 0.4);
        const leafSize = scale * (0.08 + rng() * 0.06);
        const lc = f[(i === 0) ? 'color' : 'color2'];

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leafAngle);

        ctx.globalAlpha = isDark ? 0.22 : 0.35;
        ctx.fillStyle = lc;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(leafSize * 0.25, -leafSize * 0.22, leafSize * 0.7, -leafSize * 0.18, leafSize, 0);
        ctx.bezierCurveTo(leafSize * 0.7, leafSize * 0.18, leafSize * 0.25, leafSize * 0.22, 0, 0);
        ctx.closePath();
        ctx.fill();

        // Leaf vein
        ctx.globalAlpha = isDark ? 0.55 : 0.5;
        ctx.strokeStyle = lc;
        ctx.lineWidth = leafSize * 0.025;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(leafSize * 0.9, 0);
        ctx.stroke();

        ctx.lineWidth = leafSize * 0.01;
        ctx.globalAlpha = isDark ? 0.3 : 0.3;
        for (let v = 1; v <= 4; v++) {
            const vx = leafSize * (v / 5);
            const vy = leafSize * 0.08 * (1 - v / 5);
            [-1, 1].forEach(d => {
                ctx.beginPath();
                ctx.moveTo(vx, 0);
                ctx.lineTo(vx + leafSize * 0.07, d * vy * 1.3);
                ctx.stroke();
            });
        }

        ctx.restore();
    });
}

// ---- FLOWER PALETTE (extended to 6-8 colors) ----
function buildFlowerPalette(colors, rng, isDark) {
    const base = colors.colors.slice();

    // Extract hue from first color to build a rich complementary set
    const h0 = extractHue(base[0]) || (rng() * 360);

    // Generate 5 more harmonious hues: triadic, complementary, split-complementary, analogous
    const hues = [
        h0,
        (h0 + 30) % 360,
        (h0 + 60) % 360,
        (h0 + 150) % 360,
        (h0 + 200) % 360,
        (h0 + 270) % 360,
        (h0 + 310) % 360,
        (h0 + 180) % 360,
    ];

    const extended = hues.map(h => {
        const s = 70 + rng() * 25; // 70-95% saturation — vivid
        const l = isDark ? (40 + rng() * 20) : (35 + rng() * 20); // 40-60% or 35-55%
        return hslToHex(h, s, l);
    });

    // Mix with the original palette colors for user palette integration
    return [...base, ...extended].slice(0, 8);
}

// ---- MATH HELPERS ----
function cubicBezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

function cubicBezierDeriv(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return 3*u*u*(p1-p0) + 6*u*t*(p2-p1) + 3*t*t*(p3-p2);
}

function extractHue(hex) {
    if (!hex || hex[0] !== '#') return 0;
    const r = parseInt(hex.slice(1,3),16) / 255;
    const g = parseInt(hex.slice(3,5),16) / 255;
    const b = parseInt(hex.slice(5,7),16) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max === min) return 0;
    const d = max - min;
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return h * 360;
}

function hslToHex(h, s, l) {
    l /= 100; s /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hexWithAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(128,128,128,${alpha})`;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function isBgDark(hex) {
    if (!hex || hex[0] !== '#') return true;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) / 255 < 0.45;
}
