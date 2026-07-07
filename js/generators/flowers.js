export function drawFlowers(ctx, width, height, colors, rng) {
    // 1. Atmospheric radial gradient background
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, adjustColorBrightness(colors.bg, 1.25));
    gradient.addColorStop(1, colors.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width, height);
    const isDarkBackground = isBgDark(colors.bg);

    // Main branching stem geometry
    const stemColor = colors.colors[0];
    const mainStem = {
        startX: width * (0.45 + rng() * 0.1),
        startY: height,
        endX: width * (0.45 + rng() * 0.1) + (rng() - 0.5) * width * 0.2,
        endY: height * (0.15 + rng() * 0.1),
    };

    const cp1x = mainStem.startX + (rng() - 0.5) * width * 0.2;
    const cp1y = height * 0.65;
    const cp2x = mainStem.endX + (rng() - 0.5) * width * 0.15;
    const cp2y = mainStem.endY + height * 0.25;

    // Draw main thick stem
    ctx.beginPath();
    ctx.moveTo(mainStem.startX, mainStem.startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = scale * 0.007;
    ctx.globalAlpha = 0.55;
    ctx.stroke();

    // Generate organic side branches along the main stem
    const numBranches = 6 + Math.floor(rng() * 4); // 6 to 9 side shoots
    const branches = [];

    for (let i = 0; i < numBranches; i++) {
        // Distribute positions t along the stem
        const t = 0.25 + (i / (numBranches - 1)) * 0.65 + (rng() - 0.5) * 0.05;
        const pt = getBezierPoint(t, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        
        // Find tangent of the curve to align branch direction
        const tangent = getBezierTangent(t, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        const stemAngle = Math.atan2(tangent.y, tangent.x);

        // Branch angle goes outward (alternating left/right)
        const dir = (i % 2 === 0) ? -1 : 1;
        const branchAngle = stemAngle + dir * (Math.PI / 3.5 + rng() * Math.PI / 6);
        
        // Length shrinks as we get closer to the top
        const branchLength = scale * (0.18 + rng() * 0.14) * (1.1 - t * 0.65);
        const bx = pt.x + Math.cos(branchAngle) * branchLength;
        const by = pt.y + Math.sin(branchAngle) * branchLength;

        const bcp1x = pt.x + Math.cos(branchAngle - dir * 0.15) * branchLength * 0.55;
        const bcp1y = pt.y + Math.sin(branchAngle - dir * 0.15) * branchLength * 0.55;

        branches.push({
            startX: pt.x,
            startY: pt.y,
            endX: bx,
            endY: by,
            bcp1x: bcp1x,
            bcp1y: bcp1y,
            color: colors.colors[(i + 1) % colors.colors.length],
            secondaryColor: colors.colors[(i + 2) % colors.colors.length],
            angle: branchAngle,
            t: t,
            dir: dir
        });
    }

    // Draw side branches & leaves
    branches.forEach(branch => {
        ctx.beginPath();
        ctx.moveTo(branch.startX, branch.startY);
        ctx.quadraticCurveTo(branch.bcp1x, branch.bcp1y, branch.endX, branch.endY);
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = scale * 0.0035;
        ctx.globalAlpha = 0.5;
        ctx.stroke();

        // Draw multiple leaves along each branch
        const leafTValues = [0.35, 0.7];
        leafTValues.forEach((lt, idx) => {
            const leafPt = getQuadraticPoint(lt, branch.startX, branch.startY, branch.bcp1x, branch.bcp1y, branch.endX, branch.endY);
            const leafAngle = branch.angle + (idx === 0 ? -1 : 1) * (0.4 + rng() * 0.4);
            const leafSize = scale * (0.035 + rng() * 0.02) * (1.0 - branch.t * 0.4);
            drawLeaf(ctx, leafPt.x, leafPt.y, leafSize, leafAngle, branch.color, isDarkBackground);
        });
    });

    // Draw leaves on the main stem too
    const stemLeafTValues = [0.35, 0.55, 0.75];
    stemLeafTValues.forEach((slt, idx) => {
        const leafPt = getBezierPoint(slt, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        const tangent = getBezierTangent(slt, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        const stemAngle = Math.atan2(tangent.y, tangent.x);
        const dir = (idx % 2 === 0) ? -1 : 1;
        const leafAngle = stemAngle + dir * (Math.PI / 2.5 + rng() * 0.3);
        const leafSize = scale * (0.05 + rng() * 0.025);
        drawLeaf(ctx, leafPt.x, leafPt.y, leafSize, leafAngle, colors.colors[idx % colors.colors.length], isDarkBackground);
    });

    // Draw flower heads (Blossoms or Buds depending on maturity/height)
    if (isDarkBackground) {
        ctx.globalCompositeOperation = 'screen';
    }

    branches.forEach(branch => {
        // Size scales down near the top of the main stem
        const r = scale * (0.065 + rng() * 0.035) * (1.15 - branch.t * 0.7);

        if (r > scale * 0.035) {
            // Fully open blossoms on lower/middle branches
            const flower = {
                x: branch.endX,
                y: branch.endY,
                r: r,
                color: branch.color,
                secondaryColor: branch.secondaryColor,
                petals: Math.floor(rng() * 3) + 5,
                angleOffset: rng() * Math.PI * 2
            };
            drawFlowerHead(ctx, flower, isDarkBackground, rng, colors.colors);
        } else {
            // Closed/half-open buds on higher/smaller shoots
            drawBud(ctx, branch.endX, branch.endY, r * 1.5, branch.angle, branch.color, stemColor, isDarkBackground);
        }
    });

    // Draw main terminal bud/small flower at the very tip of the main stem
    const terminalR = scale * 0.038;
    const terminalAngle = Math.atan2(mainStem.endY - cp2y, mainStem.endX - cp2x);
    drawBud(ctx, mainStem.endX, mainStem.endY, terminalR * 1.4, terminalAngle, colors.colors[colors.colors.length - 1], stemColor, isDarkBackground);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
}

// Draw a single translucent leaf with fine detailing
function drawLeaf(ctx, x, y, size, angle, color, isDark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.globalAlpha = isDark ? 0.14 : 0.22;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.3, -size * 0.25, size * 0.7, -size * 0.2, size, 0);
    ctx.bezierCurveTo(size * 0.7, size * 0.2, size * 0.3, size * 0.25, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Leaf center vein
    ctx.globalAlpha = isDark ? 0.28 : 0.38;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.022;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    // Side veins
    ctx.lineWidth = size * 0.009;
    const numVeins = 4;
    for (let i = 1; i <= numVeins; i++) {
        const vx = size * (i / (numVeins + 1));
        const vyScale = 0.14 * (1.0 - (i / (numVeins + 1)));
        
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.quadraticCurveTo(vx + size * 0.04, -size * vyScale, vx + size * 0.08, -size * vyScale * 1.25);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.quadraticCurveTo(vx + size * 0.04, size * vyScale, vx + size * 0.08, size * vyScale * 1.25);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw layered petals and glowing stamens
function drawFlowerHead(ctx, flower, isDark, rng, allColors) {
    const { x, y, r, color, secondaryColor, petals, angleOffset } = flower;

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
            const spread = 0.38 + (petals * 0.008);

            ctx.save();
            ctx.globalAlpha = layer.opacity;

            // Outer loop
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

            // Distinct fine veining lines
            ctx.globalAlpha = layer.opacity * 1.85;
            ctx.lineWidth = size * 0.007;
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

    // Glowing stamens
    ctx.save();
    ctx.globalAlpha = isDark ? 0.75 : 0.9;
    ctx.strokeStyle = secondaryColor;
    
    const numStamens = petals * 3;
    const centerRadius = r * 0.18;
    
    ctx.beginPath();
    ctx.arc(x, y, centerRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = secondaryColor;
    ctx.globalAlpha = isDark ? 0.35 : 0.45;
    ctx.fill();

    for (let i = 0; i < numStamens; i++) {
        const angle = angleOffset + (i / numStamens) * Math.PI * 2;
        const length = centerRadius * (1.15 + Math.sin(i * 3) * 0.25);
        const sx = x + Math.cos(angle) * length;
        const sy = y + Math.sin(angle) * length;

        ctx.globalAlpha = isDark ? 0.45 : 0.6;
        ctx.lineWidth = r * 0.006;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        ctx.globalAlpha = isDark ? 0.85 : 0.95;
        ctx.fillStyle = allColors[Math.floor(rng() * allColors.length)];
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.016, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Draw a closed/half-open flower bud
function drawBud(ctx, x, y, r, angle, color, sepalColor, isDark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Sepals wrapping around base (green/stem color)
    ctx.fillStyle = sepalColor;
    ctx.globalAlpha = isDark ? 0.4 : 0.55;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, 0);
    ctx.bezierCurveTo(-r * 0.55, -r * 0.25, -r * 0.2, -r * 0.55, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.2, -r * 0.55, r * 0.55, -r * 0.25, r * 0.4, 0);
    ctx.quadraticCurveTo(0, r * 0.15, -r * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    // Closed overlapping petals
    ctx.fillStyle = color;
    ctx.globalAlpha = isDark ? 0.65 : 0.85;
    
    // Left petal lobe
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.75, -r * 0.45, -r * 0.35, -r * 1.1, 0, -r * 1.3);
    ctx.bezierCurveTo(-r * 0.08, -r * 0.75, 0, -r * 0.35, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Right petal lobe
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(r * 0.75, -r * 0.45, r * 0.35, -r * 1.1, 0, -r * 1.3);
    ctx.bezierCurveTo(r * 0.08, -r * 0.75, 0, -r * 0.35, 0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// 1D Bezier math helper to find position along cubic curve
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

// Get the derivative (tangent vector) of a cubic Bezier curve at t
function getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4) {
    const u = 1 - t;
    const d1x = 3 * u * u * (x2 - x1);
    const d1y = 3 * u * u * (y2 - y1);
    const d2x = 6 * u * t * (x3 - x2);
    const d2y = 6 * u * t * (y3 - y2);
    const d3x = 3 * t * t * (x4 - x3);
    const d3y = 3 * t * t * (y4 - y3);

    return {
        x: d1x + d2x + d3x,
        y: d1y + d2y + d3y
    };
}

// 1D Bezier math helper to find position along quadratic curve
function getQuadraticPoint(t, x1, y1, x2, y2, x3, y3) {
    const u = 1 - t;
    return {
        x: u * u * x1 + 2 * u * t * x2 + t * t * x3,
        y: u * u * y1 + 2 * u * t * y2 + t * t * y3
    };
}

// Determine if the background is dark to customize blend mode
function isBgDark(hex) {
    if (!hex || hex[0] !== '#') return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
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

