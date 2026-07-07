export function drawFlowers(ctx, width, height, colors, rng) {
    // 1. Solid background with a subtle radial gradient for atmospheric glow
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, adjustColorBrightness(colors.bg, 1.2));
    gradient.addColorStop(1, colors.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Dynamic scale helper
    const scale = Math.min(width, height);
    
    // Choose blend mode based on background brightness
    const isDarkBackground = isBgDark(colors.bg);
    ctx.globalCompositeOperation = 'source-over';

    // Generate 3 to 5 flower coordinates
    const numFlowers = Math.floor(rng() * 3) + 3; // 3 to 5
    const flowers = [];

    // Stems are generated bottom-up
    for (let i = 0; i < numFlowers; i++) {
        // Distribute flowers nicely across the width/height
        const targetX = width * (0.2 + (i / (numFlowers - 1)) * 0.6 + (rng() - 0.5) * 0.1);
        const targetY = height * (0.15 + (rng() * 0.45)); // keep them in top 15% to 60%
        const flowerRadius = scale * (0.08 + rng() * 0.08); // petal size
        
        flowers.push({
            x: targetX,
            y: targetY,
            r: flowerRadius,
            color: colors.colors[i % colors.colors.length],
            secondaryColor: colors.colors[(i + 1) % colors.colors.length],
            seed: rng(),
            petals: Math.floor(rng() * 3) + 5, // 5 to 7 petals
            angleOffset: rng() * Math.PI * 2
        });
    }

    // Sort flowers bottom to top (by Y) to draw lower flowers first
    flowers.sort((a, b) => b.y - a.y);

    // --- DRAW STEMS AND LEAVES FIRST ---
    flowers.forEach(flower => {
        const startX = width * (0.35 + rng() * 0.3); // stem start at bottom
        const startY = height;
        
        // Control points for nice organic curvy stem
        const cp1x = startX + (rng() - 0.5) * width * 0.3;
        const cp1y = height * 0.7;
        const cp2x = flower.x + (rng() - 0.5) * width * 0.2;
        const cp2y = flower.y + (height - flower.y) * 0.4;

        // Draw Stem
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, flower.x, flower.y);
        ctx.strokeStyle = flower.color;
        ctx.lineWidth = scale * 0.003;
        ctx.globalAlpha = 0.4;
        ctx.stroke();

        // Draw Leaves attached to this stem
        const tValues = [0.45, 0.7]; // position along stem
        tValues.forEach((t, idx) => {
            const leafPt = getBezierPoint(t, startX, startY, cp1x, cp1y, cp2x, cp2y, flower.x, flower.y);
            const leafAngle = (idx === 0 ? -1 : 1) * (0.3 + rng() * 0.5) + Math.atan2(flower.y - leafPt.y, flower.x - leafPt.x);
            const leafSize = flower.r * (0.5 + rng() * 0.4);
            drawLeaf(ctx, leafPt.x, leafPt.y, leafSize, leafAngle, flower.color, isDarkBackground);
        });
    });

    // --- DRAW FLOWER HEADS (Petals, Veins, Stamens) ---
    // If dark mode, use screen blend mode for a vibrant translucent overlay effect
    if (isDarkBackground) {
        ctx.globalCompositeOperation = 'screen';
    }

    flowers.forEach(flower => {
        drawFlowerHead(ctx, flower, isDarkBackground, rng);
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
}

// Draw a single translucent leaf with fine detailing
function drawLeaf(ctx, x, y, size, angle, color, isDark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.globalAlpha = isDark ? 0.15 : 0.25;
    ctx.fillStyle = color;
    
    // Smooth Bezier Leaf shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.3, -size * 0.25, size * 0.7, -size * 0.2, size, 0);
    ctx.bezierCurveTo(size * 0.7, size * 0.2, size * 0.3, size * 0.25, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Leaf center vein
    ctx.globalAlpha = isDark ? 0.3 : 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    // Side veins
    ctx.lineWidth = size * 0.008;
    const numVeins = 4;
    for (let i = 1; i <= numVeins; i++) {
        const vx = size * (i / (numVeins + 1));
        const vyScale = 0.15 * (1.0 - (i / (numVeins + 1)));
        
        // Upward side vein
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.quadraticCurveTo(vx + size * 0.05, -size * vyScale, vx + size * 0.1, -size * vyScale * 1.2);
        ctx.stroke();

        // Downward side vein
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.quadraticCurveTo(vx + size * 0.05, size * vyScale, vx + size * 0.1, size * vyScale * 1.2);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw layered petals and glowing stamens
function drawFlowerHead(ctx, flower, isDark, rng) {
    const { x, y, r, color, secondaryColor, petals, angleOffset } = flower;

    // Draw 2 layers of petals (outer/back, then inner/front)
    const layers = [
        { scale: 1.0, opacity: isDark ? 0.12 : 0.22, rotOffset: 0, col: color },
        { scale: 0.82, opacity: isDark ? 0.16 : 0.26, rotOffset: Math.PI / petals, col: secondaryColor }
    ];

    layers.forEach(layer => {
        ctx.fillStyle = layer.col;
        ctx.strokeStyle = layer.col;
        
        for (let i = 0; i < petals; i++) {
            const angle = angleOffset + (i / petals) * Math.PI * 2 + layer.rotOffset;
            const size = r * layer.scale;
            const spread = 0.38 + (petals * 0.01); // petal width factor

            ctx.save();
            ctx.globalAlpha = layer.opacity;

            // Translucent organic petal paths
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(
                x + size * 0.45 * Math.cos(angle - spread),
                y + size * 0.45 * Math.sin(angle - spread),
                x + size * 0.85 * Math.cos(angle - spread * 0.5),
                y + size * 0.85 * Math.sin(angle - spread * 0.5),
                x + size * Math.cos(angle),
                y + size * Math.sin(angle)
            );
            ctx.bezierCurveTo(
                x + size * 0.85 * Math.cos(angle + spread * 0.5),
                y + size * 0.85 * Math.sin(angle + spread * 0.5),
                x + size * 0.45 * Math.cos(angle + spread),
                y + size * 0.45 * Math.sin(angle + spread),
                x,
                y
            );
            ctx.closePath();
            ctx.fill();

            // Distinct, fine vein lines inside petals
            ctx.globalAlpha = layer.opacity * 1.8;
            ctx.lineWidth = size * 0.006;
            const veinAngles = [-spread * 0.55, -spread * 0.25, 0, spread * 0.25, spread * 0.55];
            veinAngles.forEach(vAngle => {
                const finalAngle = angle + vAngle;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(
                    x + size * 0.5 * Math.cos(finalAngle + vAngle * 0.2),
                    y + size * 0.5 * Math.sin(finalAngle + vAngle * 0.2),
                    x + size * 0.9 * Math.cos(finalAngle),
                    y + size * 0.9 * Math.sin(finalAngle)
                );
                ctx.stroke();
            });

            ctx.restore();
        }
    });

    // --- DRAW GLOWING STAMENS IN THE CENTER ---
    ctx.save();
    ctx.globalAlpha = isDark ? 0.75 : 0.9;
    ctx.strokeStyle = secondaryColor;
    ctx.fillStyle = color;
    
    const numStamens = petals * 3;
    const centerRadius = r * 0.18;
    
    // Subtle central pistil/pollen aura
    ctx.beginPath();
    ctx.arc(x, y, centerRadius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = secondaryColor;
    ctx.globalAlpha = isDark ? 0.3 : 0.4;
    ctx.fill();

    // Individual fine stamens
    for (let i = 0; i < numStamens; i++) {
        const angle = angleOffset + (i / numStamens) * Math.PI * 2;
        const length = centerRadius * (1.1 + Math.sin(i * 3) * 0.3);
        const sx = x + Math.cos(angle) * length;
        const sy = y + Math.sin(angle) * length;

        ctx.globalAlpha = isDark ? 0.45 : 0.6;
        ctx.lineWidth = r * 0.005;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Stamen pollen tip
        ctx.globalAlpha = isDark ? 0.85 : 0.95;
        ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.015, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// 1D Bezier math helper to find position along curve
function getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
        x: uuu * x1 + 3 * uu * t * x2 + 3 * u * tt * x3 + ttt * x4,
        y: uuu * y1 + 3 * uu * t * y2 + 3 * u * tt * y3 + ttt * y4
    };
}

// Determine if the background is dark to customize blend mode
function isBgDark(hex) {
    if (!hex || hex[0] !== '#') return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.45;
}

// Utility to slightly adjust light/dark variations
function adjustColorBrightness(hex, factor) {
    if (!hex || hex[0] !== '#') return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, Math.floor(r * factor));
    g = Math.min(255, Math.floor(g * factor));
    b = Math.min(255, Math.floor(b * factor));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
