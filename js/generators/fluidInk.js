import { createNoise2D } from 'https://esm.sh/simplex-noise@4.0.1';

// ─── Utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
    if (!hex) return [200, 200, 200];
    const h = hex.replace('#', '');
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16)
    ];
}

function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
}

function colorShift(hex, amount) {
    const [r, g, b] = hexToRgb(hex);
    const cl = v => Math.max(0, Math.min(255, Math.round(v)));
    return `rgb(${cl(r + amount)},${cl(g + amount)},${cl(b + amount)})`;
}

// ─── Catmull-Rom spline interpolation ───────────────────────────────────

function catmullRom(pts, count) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const sf = t * (n - 1);
        const s = Math.min(Math.floor(sf), n - 2);
        const u = sf - s;
        const u2 = u * u, u3 = u2 * u;
        const p0 = pts[Math.max(0, s - 1)];
        const p1 = pts[s];
        const p2 = pts[Math.min(n - 1, s + 1)];
        const p3 = pts[Math.min(n - 1, s + 2)];
        out.push({
            x: 0.5 * (2*p1.x + (-p0.x+p2.x)*u + (2*p0.x-5*p1.x+4*p2.x-p3.x)*u2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*u3),
            y: 0.5 * (2*p1.y + (-p0.y+p2.y)*u + (2*p0.y-5*p1.y+4*p2.y-p3.y)*u2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*u3)
        });
    }
    return out;
}

// ─── Spine generation – enters and exits canvas edges ───────────────────

function makeSpine(W, H, rng, count) {
    const edgePt = (e) => {
        const t = 0.15 + rng() * 0.7;
        if (e === 0) return { x: t * W, y: -H * 0.08 };
        if (e === 1) return { x: W * 1.08, y: t * H };
        if (e === 2) return { x: t * W, y: H * 1.08 };
        return { x: -W * 0.08, y: t * H };
    };

    const entry = Math.floor(rng() * 4);
    let exit;
    do { exit = Math.floor(rng() * 4); } while (exit === entry);

    const start = edgePt(entry);
    const end = edgePt(exit);
    const nWp = 2 + Math.floor(rng() * 2);
    const wps = [start];
    for (let i = 0; i < nWp; i++) {
        const f = (i + 1) / (nWp + 1);
        wps.push({
            x: start.x + (end.x - start.x) * f + (rng() - 0.5) * W * 0.5,
            y: start.y + (end.y - start.y) * f + (rng() - 0.5) * H * 0.5
        });
    }
    wps.push(end);
    return catmullRom(wps, count);
}

// ─── Compute normals along spine ────────────────────────────────────────

function computeNormals(spine) {
    return spine.map((p, i, a) => {
        let dx, dy;
        if (i === 0) { dx = a[1].x - p.x; dy = a[1].y - p.y; }
        else if (i === a.length - 1) { dx = p.x - a[i - 1].x; dy = p.y - a[i - 1].y; }
        else { dx = a[i + 1].x - a[i - 1].x; dy = a[i + 1].y - a[i - 1].y; }
        const len = Math.hypot(dx, dy) || 1;
        return { x: -dy / len, y: dx / len };
    });
}

// ─── Trace ribbon outline as current path ───────────────────────────────

function traceOutline(ctx, left, right) {
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
}

// ─── Draw a single paint ribbon onto an offscreen buffer ────────────────

function drawRibbon(mainCtx, bufCtx, W, H, spine, norms, rcols, baseW, noise, noise2, rng) {
    const N = spine.length;

    // Edge distortion parameters (pre-compute so edges are deterministic)
    const nScale = 0.003 + rng() * 0.004;
    const nStr   = 0.2 + rng() * 0.35;
    const sL     = rng() * 100;
    const sR     = rng() * 100;

    // Build left/right edges with noise distortion and smooth taper
    const left = [], right = [], hws = [];
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const taper = Math.min(1, t * 4.5) * Math.min(1, (1 - t) * 4.5);
        const ts = taper * taper * (3 - 2 * taper); // smoothstep
        const wVar = 0.8 + noise(i * 0.02 + sL * 2, 0) * 0.4;
        const hw = baseW * ts * wVar * 0.5;

        const eL = noise(spine[i].x * nScale + sL, spine[i].y * nScale) * nStr * hw;
        const eR = noise(spine[i].x * nScale + sR, spine[i].y * nScale + 200) * nStr * hw;

        left.push({ x: spine[i].x + norms[i].x * (hw + eL), y: spine[i].y + norms[i].y * (hw + eL) });
        right.push({ x: spine[i].x - norms[i].x * (hw + eR), y: spine[i].y - norms[i].y * (hw + eR) });
        hws.push(hw);
    }

    // Clear buffer for this ribbon
    bufCtx.clearRect(0, 0, W, H);

    // ── A. Feathered glow – multiple slightly-wider fills at low opacity ──
    for (let g = 3; g >= 1; g--) {
        const sc = 1 + g * 0.12;
        bufCtx.save();
        bufCtx.globalAlpha = 0.04;
        bufCtx.fillStyle = rcols[0];
        const gl = [], gr = [];
        for (let i = 0; i < N; i++) {
            const cx = (left[i].x + right[i].x) * 0.5;
            const cy = (left[i].y + right[i].y) * 0.5;
            gl.push({ x: cx + (left[i].x - cx) * sc, y: cy + (left[i].y - cy) * sc });
            gr.push({ x: cx + (right[i].x - cx) * sc, y: cy + (right[i].y - cy) * sc });
        }
        traceOutline(bufCtx, gl, gr);
        bufCtx.fill();
        bufCtx.restore();
    }

    // ── B. Base ribbon fill ──
    bufCtx.save();
    bufCtx.globalAlpha = 0.65 + rng() * 0.25;
    bufCtx.fillStyle = rcols[0];
    traceOutline(bufCtx, left, right);
    bufCtx.fill();
    bufCtx.restore();

    // ── C. Marbling bands – many parallel strokes following the spine ──
    //    Each band is offset perpendicular to the spine and drawn as a
    //    wide, semi-transparent stroke. Overlapping bands create the
    //    characteristic pigment-mixing look of real acrylic pour art.
    bufCtx.save();
    traceOutline(bufCtx, left, right);
    bufCtx.clip();

    const numBands = 30 + Math.floor(rng() * 25);
    for (let b = 0; b < numBands; b++) {
        const perp   = (rng() * 2 - 1) * 0.95; // position across width
        const col    = rcols[Math.floor(rng() * rcols.length)];
        const alpha  = 0.06 + rng() * 0.28;
        const bFreq  = 0.001 + rng() * 0.003;
        const bAmp   = 0.15 + rng() * 0.45;
        const lw     = (0.04 + rng() * 0.18) * baseW;

        bufCtx.beginPath();
        for (let i = 0; i < N; i += 3) {
            const hw = hws[i];
            const bn = noise2(spine[i].x * bFreq + b * 7.3, spine[i].y * bFreq + b * 13.7) * bAmp;
            const d = (perp + bn) * hw;
            const x = spine[i].x + norms[i].x * d;
            const y = spine[i].y + norms[i].y * d;
            if (i === 0) bufCtx.moveTo(x, y);
            else bufCtx.lineTo(x, y);
        }
        bufCtx.globalAlpha = alpha;
        bufCtx.strokeStyle = col;
        bufCtx.lineWidth = lw;
        bufCtx.lineCap = 'round';
        bufCtx.stroke();
    }
    bufCtx.restore();

    // ── D. Paint cells – dark voids where background shows through ──
    //    Cells are clustered, organic, stretched along the flow direction.
    //    Rendered via destination-out to punch transparent holes in the ribbon.
    bufCtx.save();
    bufCtx.globalCompositeOperation = 'destination-out';

    const numClusters = 2 + Math.floor(rng() * 4);
    for (let cl = 0; cl < numClusters; cl++) {
        const si = Math.floor(rng() * N * 0.6 + N * 0.2);
        const hw = hws[si];
        if (hw < 5) continue;

        const cX = spine[si].x + norms[si].x * (rng() * 2 - 1) * hw * 0.5;
        const cY = spine[si].y + norms[si].y * (rng() * 2 - 1) * hw * 0.5;
        const cR = hw * (0.4 + rng() * 1.0);
        const nc = 3 + Math.floor(rng() * 8);

        // Flow angle for stretching cells along paint direction
        const fAngle = Math.atan2(
            spine[Math.min(si + 5, N - 1)].y - spine[si].y,
            spine[Math.min(si + 5, N - 1)].x - spine[si].x
        );

        for (let c = 0; c < nc; c++) {
            const cx = cX + (rng() - 0.5) * cR;
            const cy = cY + (rng() - 0.5) * cR * 0.5;
            const cr = cR * (0.04 + rng() * 0.16);
            const stretch = 1.2 + rng() * 1.5;

            bufCtx.save();
            bufCtx.globalAlpha = 0.35 + rng() * 0.55;
            bufCtx.translate(cx, cy);
            bufCtx.rotate(fAngle + (rng() - 0.5) * 0.3);
            bufCtx.scale(stretch, 1);

            const grad = bufCtx.createRadialGradient(0, 0, cr * 0.15, 0, 0, cr);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(0.6, 'rgba(0,0,0,0.7)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            bufCtx.fillStyle = grad;
            bufCtx.beginPath();
            bufCtx.arc(0, 0, cr, 0, Math.PI * 2);
            bufCtx.fill();

            // Satellite lobes for organic irregularity
            const nLobes = Math.floor(rng() * 3);
            for (let l = 0; l < nLobes; l++) {
                const lx = (rng() - 0.5) * cr * 1.5;
                const ly = (rng() - 0.5) * cr * 0.8;
                const lr = cr * (0.2 + rng() * 0.4);
                const lg = bufCtx.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr);
                lg.addColorStop(0, 'rgba(0,0,0,0.8)');
                lg.addColorStop(1, 'rgba(0,0,0,0)');
                bufCtx.fillStyle = lg;
                bufCtx.beginPath();
                bufCtx.arc(lx, ly, lr, 0, Math.PI * 2);
                bufCtx.fill();
            }
            bufCtx.restore();
        }
    }
    bufCtx.restore();

    // ── E. Edge threads – thin paint tendrils extending from ribbon edges ──
    const threadCount = 6 + Math.floor(rng() * 10);
    for (let t = 0; t < threadCount; t++) {
        const si = Math.floor(rng() * N * 0.7 + N * 0.15);
        const hw = hws[si];
        if (hw < 3) continue;
        const side = rng() > 0.5 ? 1 : -1;
        const sx = side > 0 ? left[si].x : right[si].x;
        const sy = side > 0 ? left[si].y : right[si].y;
        const len = hw * (0.3 + rng() * 1.5);
        const ang = Math.atan2(norms[si].y, norms[si].x) * side + (rng() - 0.5) * 0.5;

        bufCtx.save();
        bufCtx.globalAlpha = 0.1 + rng() * 0.3;
        bufCtx.strokeStyle = rcols[Math.floor(rng() * rcols.length)];
        bufCtx.lineWidth = Math.max(0.5, hw * 0.008 + rng() * hw * 0.015);
        bufCtx.lineCap = 'round';
        bufCtx.beginPath();
        bufCtx.moveTo(sx, sy);
        bufCtx.quadraticCurveTo(
            sx + Math.cos(ang) * len * 0.5 + (rng() - 0.5) * len * 0.3,
            sy + Math.sin(ang) * len * 0.5 + (rng() - 0.5) * len * 0.3,
            sx + Math.cos(ang) * len,
            sy + Math.sin(ang) * len
        );
        bufCtx.stroke();
        bufCtx.restore();
    }

    // ── F. Tiny specular bubbles inside paint ──
    bufCtx.save();
    traceOutline(bufCtx, left, right);
    bufCtx.clip();

    const bubCount = 12 + Math.floor(rng() * 20);
    for (let b = 0; b < bubCount; b++) {
        const si = Math.floor(rng() * N);
        const hw = hws[si];
        if (hw < 3) continue;
        const d = (rng() * 2 - 1) * hw * 0.8;
        const bx = spine[si].x + norms[si].x * d;
        const by = spine[si].y + norms[si].y * d;
        const br = Math.max(0.5, hw * (0.003 + rng() * rng() * 0.012));

        bufCtx.globalAlpha = 0.15 + rng() * 0.35;
        const bGrad = bufCtx.createRadialGradient(bx, by, 0, bx, by, br);
        bGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
        bGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
        bGrad.addColorStop(1, 'rgba(255,255,255,0)');
        bufCtx.fillStyle = bGrad;
        bufCtx.beginPath();
        bufCtx.arc(bx, by, br, 0, Math.PI * 2);
        bufCtx.fill();
    }
    bufCtx.restore();

    // Composite this ribbon onto the main canvas
    mainCtx.drawImage(bufCtx.canvas, 0, 0);
}

// ─── Scattered edge droplets ────────────────────────────────────────────

function drawDroplets(ctx, W, H, palette, rng) {
    const count = 25 + Math.floor(rng() * 35);
    for (let i = 0; i < count; i++) {
        const col = palette[Math.floor(rng() * palette.length)];
        const x = rng() * W;
        const y = rng() * H;
        const r = Math.max(0.5, (0.3 + rng() * rng() * 2) * Math.min(W, H) / 1000);
        ctx.save();
        ctx.globalAlpha = 0.25 + rng() * 0.55;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ─── Subtle specular highlights ─────────────────────────────────────────

function drawHighlights(ctx, W, H, rng) {
    const count = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
        const x = rng() * W;
        const y = rng() * H;
        const r = (0.01 + rng() * 0.03) * Math.min(W, H);
        ctx.save();
        ctx.globalAlpha = 0.015 + rng() * 0.035;
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.3)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ─── Main export ────────────────────────────────────────────────────────

export function drawFluidInk(ctx, width, height, colors, rng) {
    const noise  = createNoise2D(rng);
    const noise2 = createNoise2D(rng);

    // Pure background (works best with dark/black)
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Shuffle user palette for variety
    const palette = [...colors.colors].sort(() => rng() - 0.5);
    const numRibbons = 2 + Math.floor(rng() * 2); // 2–3 major paint bodies
    const spineSamples = 200;

    // Single reusable offscreen buffer (one per ribbon, cleared each time)
    const buf = document.createElement('canvas');
    buf.width = width;
    buf.height = height;
    const bufCtx = buf.getContext('2d');

    for (let r = 0; r < numRibbons; r++) {
        const spine = makeSpine(width, height, rng, spineSamples);
        const norms = computeNormals(spine);

        // Assign 3–5 related color shades to this ribbon
        const base = palette[r % palette.length];
        const rcols = [base];
        const nc = 1 + Math.floor(rng() * Math.min(2, palette.length - 1));
        for (let c = 0; c < nc; c++) {
            rcols.push(palette[(r + c + 1) % palette.length]);
        }
        rcols.push(colorShift(base, 30));  // lighter variant
        rcols.push(colorShift(base, -25)); // darker variant

        const baseW = (0.06 + rng() * 0.14) * Math.min(width, height);
        drawRibbon(ctx, bufCtx, width, height, spine, norms, rcols, baseW, noise, noise2, rng);
    }

    // Scattered micro droplets
    drawDroplets(ctx, width, height, palette, rng);

    // Gentle glossy highlights
    drawHighlights(ctx, width, height, rng);
}
