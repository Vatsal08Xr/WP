export function drawFlowers(ctx, width, height, colors, rng) {
    const scale = Math.min(width, height);
    const isDarkBackground = isBgDark(colors.bg);

    // Pick 12 random styles for Petals, Leaves, and Stems based on seed
    const petalStyle = Math.floor(rng() * 12);
    const leafStyle = Math.floor(rng() * 12);
    const stemStyle = Math.floor(rng() * 12);

    // 1. Atmospheric radial gradient background
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, adjustColorBrightness(colors.bg, 1.25));
    gradient.addColorStop(1, colors.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Extend palette to 8 colors
    const palette = buildFlowerPalette(colors, rng, isDarkBackground);

    // 3. Draw swirls in the background
    drawSwirls(ctx, width, height, palette, rng, isDarkBackground, scale);

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
    drawStyledStem(ctx, mainStem.startX, mainStem.startY, mainStem.endX, mainStem.endY, cp1x, cp1y, cp2x, cp2y, stemColor, scale * 0.007, stemStyle, rng);

    // Generate side branches
    const numBranches = 5 + Math.floor(rng() * 3); // 5 to 7 side shoots
    const branches = [];

    for (let i = 0; i < numBranches; i++) {
        const t = 0.25 + (i / (numBranches - 1)) * 0.6 + (rng() - 0.5) * 0.05;
        const pt = getBezierPoint(t, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        
        const tangent = getBezierTangent(t, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        const stemAngle = Math.atan2(tangent.y, tangent.x);

        const dir = (i % 2 === 0) ? -1 : 1;
        const branchAngle = stemAngle + dir * (Math.PI / 3.5 + rng() * Math.PI / 6);
        
        const branchLength = scale * (0.22 + rng() * 0.12) * (1.1 - t * 0.65);
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
            color: palette[(i + 1) % palette.length],
            secondaryColor: palette[(i + 2) % palette.length],
            angle: branchAngle,
            t: t,
            dir: dir
        });
    }

    // Draw side branches
    branches.forEach(branch => {
        drawStyledStem(ctx, branch.startX, branch.startY, branch.endX, branch.endY, branch.bcp1x, branch.bcp1y, branch.bcp1x, branch.bcp1y, stemColor, scale * 0.0035, stemStyle, rng);

        // Draw multiple enlarged leaves along each branch
        const leafTValues = [0.35, 0.75];
        leafTValues.forEach((lt, idx) => {
            const leafPt = getQuadraticPoint(lt, branch.startX, branch.startY, branch.bcp1x, branch.bcp1y, branch.endX, branch.endY);
            const leafAngle = branch.angle + (idx === 0 ? -1 : 1) * (0.35 + rng() * 0.35);
            // Enlarged leaf sizes (from 0.035 up to 0.12 scale)
            const leafSize = scale * (0.11 + rng() * 0.05) * (1.0 - branch.t * 0.4);
            drawStyledLeaf(ctx, leafPt.x, leafPt.y, leafSize, leafAngle, branch.color, isDarkBackground, leafStyle, rng);
        });
    });

    // Draw leaves on the main stem too
    const stemLeafTValues = [0.3, 0.5, 0.7];
    stemLeafTValues.forEach((slt, idx) => {
        const leafPt = getBezierPoint(slt, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        const tangent = getBezierTangent(slt, mainStem.startX, mainStem.startY, cp1x, cp1y, cp2x, cp2y, mainStem.endX, mainStem.endY);
        const stemAngle = Math.atan2(tangent.y, tangent.x);
        const dir = (idx % 2 === 0) ? -1 : 1;
        const leafAngle = stemAngle + dir * (Math.PI / 2.3 + rng() * 0.3);
        const leafSize = scale * (0.14 + rng() * 0.04);
        drawStyledLeaf(ctx, leafPt.x, leafPt.y, leafSize, leafAngle, palette[idx % palette.length], isDarkBackground, leafStyle, rng);
    });

    // Draw flower heads (Blossoms or Buds depending on maturity/height)
    if (isDarkBackground) {
        ctx.globalCompositeOperation = 'screen';
    } else {
        ctx.globalCompositeOperation = 'multiply';
    }

    branches.forEach(branch => {
        const r = scale * (0.075 + rng() * 0.035) * (1.2 - branch.t * 0.7);

        if (r > scale * 0.04) {
            // Fully open blossoms on lower/middle branches
            const flower = {
                x: branch.endX,
                y: branch.endY,
                r: r,
                color: branch.color,
                secondaryColor: branch.secondaryColor,
                color3: palette[Math.floor(rng() * palette.length)],
                petals: Math.floor(rng() * 3) + 5,
                angleOffset: rng() * Math.PI * 2
            };
            drawFlowerHead(ctx, flower, isDarkBackground, rng, palette, petalStyle);
        } else {
            // Closed/half-open buds on higher/smaller shoots
            drawBud(ctx, branch.endX, branch.endY, r * 1.5, branch.angle, branch.color, stemColor, isDarkBackground);
        }
    });

    // Draw main terminal bud at the very tip of the main stem
    const terminalR = scale * 0.042;
    const terminalAngle = Math.atan2(mainStem.endY - cp2y, mainStem.endX - cp2x);
    drawBud(ctx, mainStem.endX, mainStem.endY, terminalR * 1.4, terminalAngle, palette[palette.length - 1], stemColor, isDarkBackground);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
}

// ==========================================
// 12 DISTINCT LEAF STYLES
// ==========================================
function drawStyledLeaf(ctx, x, y, size, angle, color, isDark, styleIndex, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.globalAlpha = isDark ? 0.18 : 0.32;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    switch (styleIndex) {
        case 0: // Skeletal Lanceolate (Detailed, parallel veins, x-ray look)
        default:
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.35, -size * 0.18, size * 0.75, -size * 0.12, size, 0);
            ctx.bezierCurveTo(size * 0.75, size * 0.12, size * 0.35, size * 0.18, 0, 0);
            ctx.closePath();
            ctx.fill();

            // Center vein
            ctx.globalAlpha = isDark ? 0.45 : 0.55;
            ctx.lineWidth = size * 0.02;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.95, 0);
            ctx.stroke();

            // Fine parallel veins
            ctx.lineWidth = size * 0.007;
            ctx.globalAlpha = isDark ? 0.35 : 0.45;
            const numSkeletalVeins = 10;
            for (let v = 1; v <= numSkeletalVeins; v++) {
                const vx = size * (v / (numSkeletalVeins + 1));
                const vy = size * 0.14 * Math.sin((v / (numSkeletalVeins + 1)) * Math.PI);
                [-1, 1].forEach(d => {
                    ctx.beginPath();
                    ctx.moveTo(vx, 0);
                    ctx.quadraticCurveTo(vx + size * 0.05, d * vy * 0.5, vx + size * 0.08, d * vy);
                    ctx.stroke();
                });
            }
            break;

        case 1: // Fern Pinnate (Leaflets along a rib)
            ctx.lineWidth = size * 0.015;
            ctx.globalAlpha = isDark ? 0.4 : 0.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size, 0);
            ctx.stroke();

            const numLeaflets = 7;
            ctx.globalAlpha = isDark ? 0.22 : 0.35;
            for (let v = 0; v < numLeaflets; v++) {
                const lx = size * (v / numLeaflets) * 0.9 + size * 0.1;
                const lSize = size * 0.25 * (1.1 - (v / numLeaflets));
                [-1, 1].forEach(d => {
                    ctx.save();
                    ctx.translate(lx, 0);
                    ctx.rotate(d * (Math.PI / 3.5));
                    ctx.beginPath();
                    ctx.ellipse(lSize, 0, lSize, lSize * 0.35, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
            }
            break;

        case 2: // Ginkgo Fan Leaf
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.2, -size * 0.4, size * 0.7, -size * 0.65, size, -size * 0.2);
            ctx.quadraticCurveTo(size * 0.85, 0, size, size * 0.2);
            ctx.bezierCurveTo(size * 0.7, size * 0.65, size * 0.2, size * 0.4, 0, 0);
            ctx.closePath();
            ctx.fill();

            // Radiating fan veins
            ctx.globalAlpha = isDark ? 0.35 : 0.45;
            ctx.lineWidth = size * 0.007;
            const fanVeins = 7;
            for (let i = 0; i < fanVeins; i++) {
                const fAngle = -0.6 + (i / (fanVeins - 1)) * 1.2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(fAngle) * size * 0.85, Math.sin(fAngle) * size * 0.85);
                ctx.stroke();
            }
            break;

        case 3: // Monstera Clefted Leaf
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.2, -size * 0.35, size * 0.7, -size * 0.4, size, 0);
            ctx.bezierCurveTo(size * 0.7, size * 0.4, size * 0.2, size * 0.35, 0, 0);
            ctx.closePath();
            ctx.fill();

            // Draw cleft cut lines
            ctx.strokeStyle = isDark ? '#111' : '#fff';
            ctx.lineWidth = size * 0.035;
            ctx.globalAlpha = 1.0;
            const numClefts = 3;
            for (let i = 1; i <= numClefts; i++) {
                const cx = size * (i / (numClefts + 1)) * 0.9;
                const clen = size * 0.25 * (1.1 - cx / size);
                [-1, 1].forEach(d => {
                    ctx.beginPath();
                    ctx.moveTo(cx, d * size * 0.05);
                    ctx.lineTo(cx + size * 0.1, d * (size * 0.05 + clen));
                    ctx.stroke();
                });
            }
            break;

        case 4: // Willow Slender (Drapey, extra narrow)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.4, -size * 0.07, size * 0.85, -size * 0.04, size * 1.3, 0);
            ctx.bezierCurveTo(size * 0.85, size * 0.04, size * 0.4, size * 0.07, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 5: // Ivy Lobed Leaf (3-5 points)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.35, -size * 0.28);
            ctx.lineTo(size * 0.45, -size * 0.18);
            ctx.lineTo(size * 0.95, 0); // Main tip
            ctx.lineTo(size * 0.45, size * 0.18);
            ctx.lineTo(size * 0.35, size * 0.28);
            ctx.closePath();
            ctx.fill();
            break;

        case 6: // Shield / Peltate Round Leaf
            ctx.beginPath();
            ctx.arc(size * 0.4, 0, size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            // Radiating veins
            ctx.lineWidth = size * 0.008;
            ctx.globalAlpha = isDark ? 0.35 : 0.45;
            for (let a = 0; a < 8; a++) {
                const rad = (a / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(size * 0.4, 0);
                ctx.lineTo(size * 0.4 + Math.cos(rad) * size * 0.4, Math.sin(rad) * size * 0.4);
                ctx.stroke();
            }
            break;

        case 7: // Oak Sinuous Lobed Leaf
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(size * 0.15, -size * 0.25, size * 0.3, -size * 0.15);
            ctx.quadraticCurveTo(size * 0.45, -size * 0.3, size * 0.6, -size * 0.15);
            ctx.quadraticCurveTo(size * 0.8, -size * 0.25, size, 0);
            ctx.quadraticCurveTo(size * 0.8, size * 0.25, size * 0.6, size * 0.15);
            ctx.quadraticCurveTo(size * 0.45, size * 0.3, size * 0.3, size * 0.15);
            ctx.quadraticCurveTo(size * 0.15, size * 0.25, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 8: // Pine Needles (Fine burst of needles)
            ctx.lineWidth = size * 0.007;
            ctx.globalAlpha = isDark ? 0.35 : 0.5;
            const numNeedles = 6;
            for (let i = 0; i < numNeedles; i++) {
                const nAngle = -0.5 + (i / numNeedles) * 1.0;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(size * 0.5 * Math.cos(nAngle), size * 0.5 * Math.sin(nAngle), size * Math.cos(nAngle), size * Math.sin(nAngle));
                ctx.stroke();
            }
            break;

        case 9: // Clover Trefoil (Heart shapes clustered)
            [-0.5, 0, 0.5].forEach(rot => {
                ctx.save();
                ctx.rotate(rot);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(size * 0.2, -size * 0.3, size * 0.6, -size * 0.2, size * 0.5, 0);
                ctx.bezierCurveTo(size * 0.6, size * 0.2, size * 0.2, size * 0.3, 0, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
            break;

        case 10: // Wavy/Undulate margins
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let t = 0; t <= 10; t++) {
                const lt = t / 10;
                const lx = size * lt;
                const ly = -size * 0.15 * Math.sin(lt * Math.PI) + (Math.sin(lt * Math.PI * 4) * size * 0.02);
                ctx.lineTo(lx, ly);
            }
            for (let t = 10; t >= 0; t--) {
                const lt = t / 10;
                const lx = size * lt;
                const ly = size * 0.15 * Math.sin(lt * Math.PI) - (Math.sin(lt * Math.PI * 4) * size * 0.02);
                ctx.lineTo(lx, ly);
            }
            ctx.closePath();
            ctx.fill();
            break;

        case 11: // Faceted Prism Leaf (Origami look)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size * 0.4, -size * 0.15);
            ctx.lineTo(size, 0);
            ctx.lineTo(size * 0.4, size * 0.15);
            ctx.closePath();
            ctx.fill();

            // Facet line drawing
            ctx.globalAlpha = isDark ? 0.4 : 0.5;
            ctx.lineWidth = size * 0.009;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size, 0);
            ctx.moveTo(size * 0.4, -size * 0.15);
            ctx.lineTo(size * 0.4, size * 0.15);
            ctx.stroke();
            break;
    }

    ctx.restore();
}

// ==========================================
// 12 DISTINCT STEM STYLES
// ==========================================
function drawStyledStem(ctx, x1, y1, x4, y4, x2, y2, x3, y3, color, baseWidth, styleIndex, rng) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    switch (styleIndex) {
        case 0: // Sinuous Glow (Smooth basic bezier)
        default:
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineWidth = baseWidth;
            ctx.stroke();
            break;

        case 1: // Hollow Double (Two thin parallel lines)
            [-1.5, 1.5].forEach(offset => {
                ctx.beginPath();
                ctx.moveTo(x1 + offset, y1);
                ctx.bezierCurveTo(x2 + offset, y2, x3 + offset, y3, x4, y4);
                ctx.lineWidth = baseWidth * 0.35;
                ctx.stroke();
            });
            break;

        case 2: // Bamboo Node (Segmented with tiny bulb nodes)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineWidth = baseWidth * 0.85;
            ctx.stroke();

            const nodeCount = 5;
            for (let i = 1; i < nodeCount; i++) {
                const t = i / nodeCount;
                const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                ctx.beginPath();
                ctx.ellipse(pt.x, pt.y, baseWidth * 2.0, baseWidth * 0.9, Math.atan2(y4-y1, x4-x1), 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 3: // Thorny Vine (Fine lines with triangular thorn extensions)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineWidth = baseWidth * 0.75;
            ctx.stroke();

            const thorns = 6;
            for (let i = 1; i <= thorns; i++) {
                const t = (i / (thorns + 1)) * 0.8 + 0.15;
                const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const tangent = getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const angle = Math.atan2(tangent.y, tangent.x) + ((i % 2 === 0 ? -1 : 1) * Math.PI / 2.3);

                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
                ctx.lineTo(pt.x + Math.cos(angle) * baseWidth * 3.5, pt.y + Math.sin(angle) * baseWidth * 3.5);
                ctx.lineTo(pt.x + Math.cos(angle - 0.2) * baseWidth * 1.5, pt.y + Math.sin(angle - 0.2) * baseWidth * 1.5);
                ctx.closePath();
                ctx.fill();
            }
            break;

        case 4: // Twisted Rope (Overlapping sinuous waves)
            const steps = 60;
            ctx.lineWidth = baseWidth * 0.4;
            for (let dir = -1; dir <= 1; dir += 2) {
                ctx.beginPath();
                for (let s = 0; s <= steps; s++) {
                    const t = s / steps;
                    const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                    const tangent = getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4);
                    const normalAngle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
                    const offset = Math.sin(t * Math.PI * 18 + (dir * Math.PI / 2)) * baseWidth * 1.2;

                    const sx = pt.x + Math.cos(normalAngle) * offset;
                    const sy = pt.y + Math.sin(normalAngle) * offset;
                    if (s === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
            break;

        case 5: // Dotted Pearl (Chain of beads)
            const beadCount = 35;
            for (let i = 0; i <= beadCount; i++) {
                const t = i / beadCount;
                const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, baseWidth * (1.1 + Math.sin(t * Math.PI) * 0.4), 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 6: // Spiral Tendrils (Standard stem + curly tendrils branching out)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineWidth = baseWidth * 0.8;
            ctx.stroke();

            const tendrilPoints = [0.3, 0.6];
            tendrilPoints.forEach((t, idx) => {
                const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const tangent = getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const dir = (idx % 2 === 0) ? -1 : 1;
                const startAngle = Math.atan2(tangent.y, tangent.x) + dir * Math.PI / 2;

                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
                let cx = pt.x;
                let cy = pt.y;
                let cAngle = startAngle;
                for (let r = 0; r < 20; r++) {
                    const stepR = baseWidth * (0.8 + r * 0.15);
                    cAngle += dir * 0.35;
                    cx += Math.cos(cAngle) * stepR;
                    cy += Math.sin(cAngle) * stepR;
                    ctx.lineTo(cx, cy);
                }
                ctx.lineWidth = baseWidth * 0.25;
                ctx.stroke();
            });
            break;

        case 7: // Branching Network (Recursive micro twigs)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineWidth = baseWidth;
            ctx.stroke();

            const twigT = [0.4, 0.7];
            twigT.forEach((t, idx) => {
                const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const dir = (idx % 2 === 0) ? -1 : 1;
                const tAngle = Math.atan2(y4 - y1, x4 - x1) + dir * (Math.PI / 4 + rng() * 0.2);
                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
                ctx.quadraticCurveTo(
                    pt.x + Math.cos(tAngle) * baseWidth * 4,
                    pt.y + Math.sin(tAngle) * baseWidth * 4,
                    pt.x + Math.cos(tAngle + 0.15) * baseWidth * 8,
                    pt.y + Math.sin(tAngle + 0.15) * baseWidth * 8
                );
                ctx.lineWidth = baseWidth * 0.4;
                ctx.stroke();
            });
            break;

        case 8: // Dashed Line (Stylized, sci-fi bloom look)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
            ctx.lineWidth = baseWidth;
            ctx.setLineDash([baseWidth * 3, baseWidth * 2.5]);
            ctx.stroke();
            ctx.setLineDash([]); // clear
            break;

        case 9: // Ribbon Twist (Polygonal winding ribbon)
            const ribbonSteps = 30;
            ctx.beginPath();
            for (let s = 0; s <= ribbonSteps; s++) {
                const t = s / ribbonSteps;
                const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const tangent = getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4);
                const normalAngle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
                const thickness = Math.sin(t * Math.PI * 6) * baseWidth * 1.5;

                const sx = pt.x + Math.cos(normalAngle) * thickness;
                const sy = pt.y + Math.sin(normalAngle) * thickness;
                if (s === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.lineWidth = baseWidth * 0.4;
            ctx.stroke();
            break;

        case 10: // Angular Segmented (Origami straight segments)
            const pt1 = getBezierPoint(0.33, x1, y1, x2, y2, x3, y3, x4, y4);
            const pt2 = getBezierPoint(0.66, x1, y1, x2, y2, x3, y3, x4, y4);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.lineTo(x4, y4);
            ctx.lineWidth = baseWidth;
            ctx.stroke();
            break;

        case 11: // Fading segments (multiple layered lines)
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
                ctx.lineWidth = baseWidth * (0.3 + j * 0.35);
                ctx.globalAlpha = 0.25 + j * 0.25;
                ctx.stroke();
            }
            break;
    }

    ctx.restore();
}

// ==========================================
// 12 DISTINCT PETAL STYLES (Flower Head loop)
// ==========================================
function drawStyledPetal(ctx, cx, cy, r, angle, color, alpha, spreadFactor, styleIndex, rng) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    const spread = spreadFactor + rng() * 0.05;
    const leftAngle = angle - spread;
    const rightAngle = angle + spread;

    const leftR = r * (0.95 + rng() * 0.1);
    const rightR = r * (0.95 + rng() * 0.1);

    ctx.beginPath();
    ctx.moveTo(cx, cy);

    switch (styleIndex) {
        case 0: // Poppy Ruffled (Broad wavy margin with cleft)
        default:
            const centerR = r * (0.83 + rng() * 0.08);
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.8) * r * 0.45, cy + Math.sin(angle - spread * 0.8) * r * 0.45,
                cx + Math.cos(leftAngle) * leftR * 0.8, cy + Math.sin(leftAngle) * leftR * 0.8,
                cx + Math.cos(angle - spread * 0.35) * leftR * 1.02, cy + Math.sin(angle - spread * 0.35) * leftR * 1.02
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.15) * centerR * 1.05, cy + Math.sin(angle - spread * 0.15) * centerR * 1.05,
                cx + Math.cos(angle + spread * 0.15) * centerR * 1.05, cy + Math.sin(angle + spread * 0.15) * centerR * 1.05,
                cx + Math.cos(angle + spread * 0.35) * rightR * 1.02, cy + Math.sin(angle + spread * 0.35) * rightR * 1.02
            );
            ctx.bezierCurveTo(
                cx + Math.cos(rightAngle) * rightR * 0.8, cy + Math.sin(rightAngle) * rightR * 0.8,
                cx + Math.cos(angle + spread * 0.8) * r * 0.45, cy + Math.sin(angle + spread * 0.8) * r * 0.45,
                cx, cy
            );
            break;

        case 1: // Pointed Lily (Slender, sharp, lanceolate petals)
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.4) * r * 0.5, cy + Math.sin(angle - spread * 0.4) * r * 0.5,
                cx + Math.cos(angle - spread * 0.15) * r * 0.95, cy + Math.sin(angle - spread * 0.15) * r * 0.95,
                cx + Math.cos(angle) * r * 1.1, cy + Math.sin(angle) * r * 1.1
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.15) * r * 0.95, cy + Math.sin(angle + spread * 0.15) * r * 0.95,
                cx + Math.cos(angle + spread * 0.4) * r * 0.5, cy + Math.sin(angle + spread * 0.4) * r * 0.5,
                cx, cy
            );
            break;

        case 2: // Saucer Round (Broad, smooth circles)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.6, cy + Math.sin(leftAngle) * r * 0.6,
                cx + Math.cos(angle - spread * 0.5) * r * 1.0, cy + Math.sin(angle - spread * 0.5) * r * 1.0,
                cx + Math.cos(angle) * r, cy + Math.sin(angle) * r
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.5) * r * 1.0, cy + Math.sin(angle + spread * 0.5) * r * 1.0,
                cx + Math.cos(rightAngle) * r * 0.6, cy + Math.sin(rightAngle) * r * 0.6,
                cx, cy
            );
            break;

        case 3: // Fringed Carnation (Multiple tiny jagged cuts along top edge)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.65, cy + Math.sin(leftAngle) * r * 0.65,
                cx + Math.cos(angle - spread * 0.5) * r * 1.0, cy + Math.sin(angle - spread * 0.5) * r * 1.0,
                cx + Math.cos(angle - spread * 0.2) * r * 0.95, cy + Math.sin(angle - spread * 0.2) * r * 0.95
            );
            // Jagged edge notches
            for (let j = -2; j <= 2; j++) {
                const jAngle = angle + (j / 5) * spread;
                const jRadius = r * (0.95 + (j % 2 === 0 ? 0.05 : -0.05));
                ctx.lineTo(cx + Math.cos(jAngle) * jRadius, cy + Math.sin(jAngle) * jRadius);
            }
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.5) * r * 1.0, cy + Math.sin(angle + spread * 0.5) * r * 1.0,
                cx + Math.cos(rightAngle) * r * 0.65, cy + Math.sin(rightAngle) * r * 0.65,
                cx, cy
            );
            break;

        case 4: // Orchid Bilobed (Distinct split heart)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.7, cy + Math.sin(leftAngle) * r * 0.7,
                cx + Math.cos(angle - spread * 0.3) * r * 1.15, cy + Math.sin(angle - spread * 0.3) * r * 1.15,
                cx + Math.cos(angle - spread * 0.08) * r * 0.95, cy + Math.sin(angle - spread * 0.08) * r * 0.95
            );
            ctx.lineTo(cx + Math.cos(angle) * r * 0.6, cy + Math.sin(angle) * r * 0.6); // deep center notch
            ctx.lineTo(cx + Math.cos(angle + spread * 0.08) * r * 0.95, cy + Math.sin(angle + spread * 0.08) * r * 0.95);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.3) * r * 1.15, cy + Math.sin(angle + spread * 0.3) * r * 1.15,
                cx + Math.cos(rightAngle) * r * 0.7, cy + Math.sin(rightAngle) * r * 0.7,
                cx, cy
            );
            break;

        case 5: // Rose Layered (Curling outer edge flaps)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.6, cy + Math.sin(leftAngle) * r * 0.6,
                cx + Math.cos(angle - spread * 0.45) * r * 1.05, cy + Math.sin(angle - spread * 0.45) * r * 1.05,
                cx + Math.cos(angle - spread * 0.1) * r * 1.0, cy + Math.sin(angle - spread * 0.1) * r * 1.0
            );
            ctx.quadraticCurveTo(cx + Math.cos(angle) * r * 1.15, cy + Math.sin(angle) * r * 1.15, cx + Math.cos(angle + spread * 0.1) * r * 1.0, cy + Math.sin(angle + spread * 0.1) * r * 1.0);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.45) * r * 1.05, cy + Math.sin(angle + spread * 0.45) * r * 1.05,
                cx + Math.cos(rightAngle) * r * 0.6, cy + Math.sin(rightAngle) * r * 0.6,
                cx, cy
            );
            break;

        case 6: // Starburst Geometric (Sharp double spikes)
            ctx.lineTo(cx + Math.cos(angle - spread * 0.4) * r * 0.9, cy + Math.sin(angle - spread * 0.4) * r * 0.9);
            ctx.lineTo(cx + Math.cos(angle - spread * 0.2) * r * 0.65, cy + Math.sin(angle - spread * 0.2) * r * 0.65);
            ctx.lineTo(cx + Math.cos(angle) * r * 1.2, cy + Math.sin(angle) * r * 1.2);
            ctx.lineTo(cx + Math.cos(angle + spread * 0.2) * r * 0.65, cy + Math.sin(angle + spread * 0.2) * r * 0.65);
            ctx.lineTo(cx + Math.cos(angle + spread * 0.4) * r * 0.9, cy + Math.sin(angle + spread * 0.4) * r * 0.9);
            ctx.closePath();
            break;

        case 7: // Ginkgo Fan Petal
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.4, cy + Math.sin(leftAngle) * r * 0.4,
                cx + Math.cos(angle - spread * 0.6) * r * 1.15, cy + Math.sin(angle - spread * 0.6) * r * 1.15,
                cx + Math.cos(angle - spread * 0.05) * r * 0.92, cy + Math.sin(angle - spread * 0.05) * r * 0.92
            );
            ctx.lineTo(cx + Math.cos(angle + spread * 0.05) * r * 0.92, cy + Math.sin(angle + spread * 0.05) * r * 0.92);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.6) * r * 1.15, cy + Math.sin(angle + spread * 0.6) * r * 1.15,
                cx + Math.cos(rightAngle) * r * 0.4, cy + Math.sin(rightAngle) * r * 0.4,
                cx, cy
            );
            break;

        case 8: // Feathery Plume (Drawn with many fine sub-arcs)
            ctx.lineWidth = r * 0.02;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            ctx.stroke();

            const plumeHairs = 12;
            ctx.lineWidth = r * 0.007;
            for (let k = 1; k < plumeHairs; k++) {
                const px = cx + Math.cos(angle) * r * (k / plumeHairs) * 0.9;
                const py = cy + Math.sin(angle) * r * (k / plumeHairs) * 0.9;
                const hLen = r * 0.3 * Math.sin((k / plumeHairs) * Math.PI);
                [-1, 1].forEach(d => {
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + Math.cos(angle + d * (spread * 0.8)) * hLen, py + Math.sin(angle + d * (spread * 0.8)) * hLen);
                    ctx.stroke();
                });
            }
            break;

        case 9: // Ribbon Wave (Long wavy curls)
            const ribbonSteps = 15;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            for (let s = 1; s <= ribbonSteps; s++) {
                const t = s / ribbonSteps;
                const wAngle = angle + Math.sin(t * Math.PI * 3.5) * spread * 0.35;
                const rx = cx + Math.cos(wAngle) * r * t;
                const ry = cy + Math.sin(wAngle) * r * t;
                ctx.lineTo(rx, ry);
            }
            ctx.lineTo(cx + Math.cos(angle) * r * 0.7, cy + Math.sin(angle) * r * 0.7);
            ctx.closePath();
            ctx.fill();
            break;

        case 10: // Drooping Bell (Downward curving petals)
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.6) * r * 0.5, cy + Math.sin(angle - spread * 0.6) * r * 0.5,
                cx + Math.cos(angle - spread * 0.1) * r * 0.8, cy + Math.sin(angle - spread * 0.1) * r * 1.3,
                cx + Math.cos(angle) * r * 1.1, cy + Math.sin(angle) * r * 1.1
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.1) * r * 0.8, cy + Math.sin(angle + spread * 0.1) * r * 1.3,
                cx + Math.cos(angle + spread * 0.6) * r * 0.5, cy + Math.sin(angle + spread * 0.6) * r * 0.5,
                cx, cy
            );
            break;

        case 11: // Serrated Teeth margins
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.6, cy + Math.sin(leftAngle) * r * 0.6,
                cx + Math.cos(angle - spread * 0.55) * r * 0.95, cy + Math.sin(angle - spread * 0.55) * r * 0.95,
                cx + Math.cos(angle - spread * 0.25) * r * 0.95, cy + Math.sin(angle - spread * 0.25) * r * 0.95
            );
            for (let j = 0; j < 5; j++) {
                const sAngle = angle - spread * 0.2 + (j / 5) * (spread * 0.4);
                const sR = r * (0.95 - (j % 2) * 0.04);
                ctx.lineTo(cx + Math.cos(sAngle) * sR, cy + Math.sin(sAngle) * sR);
            }
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.55) * r * 0.95, cy + Math.sin(angle + spread * 0.55) * r * 0.95,
                cx + Math.cos(rightAngle) * r * 0.6, cy + Math.sin(rightAngle) * r * 0.6,
                cx, cy
            );
            break;
    }

    if (styleIndex !== 8) { // Skip fill for Plume style which is stroke-only
        ctx.fill();
    }
    ctx.restore();
}

function drawFlowerHead(ctx, flower, isDark, rng, allColors, petalStyle) {
    const { x, y, r, color, secondaryColor, petals, angleOffset } = flower;

    const layers = [
        { scale: 1.0, opacity: isDark ? 0.14 : 0.24, rotOffset: 0, col: color },
        { scale: 0.82, opacity: isDark ? 0.18 : 0.28, rotOffset: Math.PI / petals, col: secondaryColor }
    ];

    layers.forEach(layer => {
        for (let i = 0; i < petals; i++) {
            const angle = angleOffset + (i / petals) * Math.PI * 2 + layer.rotOffset;
            const size = r * layer.scale;
            drawStyledPetal(ctx, x, y, size, angle, layer.col, layer.opacity, 0.42, petalStyle, rng);
        }
    });
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

// ---- MATH HELPERS FOR BG GLOWS ----
function hexWithAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(128,128,128,${alpha})`;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ---- FLOWER PALETTE (extended to 6-8 colors) ----
function buildFlowerPalette(colors, rng, isDark) {
    const base = colors.colors.slice();
    const h0 = extractHue(base[0]) || (rng() * 360);
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
        const s = 70 + rng() * 25;
        const l = isDark ? (40 + rng() * 20) : (35 + rng() * 20);
        return hslToHex(h, s, l);
    });
    return [...base, ...extended].slice(0, 8);
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

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
            x + Math.cos(angle) * r * 0.45,
            y + Math.sin(angle) * r * 0.45,
            tipX, tipY
        );
        ctx.stroke();

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
}

// ---- GLOWING CENTER ----
function drawCenter(ctx, f, rng, scale, isDark) {
    const { x, y, r, color2, color3, petals, angleOffset } = f;
    const centerR = r * 0.13;

    const aura = ctx.createRadialGradient(x, y, 0, x, y, centerR * 2.5);
    aura.addColorStop(0, hexWithAlpha(color2, isDark ? 0.9 : 0.7));
    aura.addColorStop(0.4, hexWithAlpha(color2, isDark ? 0.4 : 0.25));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, centerR * 2.5, 0, Math.PI * 2);
    ctx.fill();

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

        ctx.globalAlpha = isDark ? 0.95 : 0.85;
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.014, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---- BIG FLOWER (main draw layer) ----
function drawBigFlower(ctx, f, isDark, rng, scale) {
    const { x, y, r, color, color2, color3, petals, angleOffset } = f;
    // Handled in drawFlowerHead for layers
}
