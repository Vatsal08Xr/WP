export function drawGeometricCity(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const numBuildings = 60;
    const padding = width * 0.02;
    const maxW = (width - padding * 2) / (numBuildings * 0.5);

    // Draw background sun/moon
    ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(width * (rng() * 0.6 + 0.2), height * 0.4, Math.min(width, height) * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Draw buildings from back to front (based on height roughly)
    const buildings = [];
    for (let i = 0; i < numBuildings; i++) {
        buildings.push({
            x: padding + (rng() * (width - padding * 2)),
            w: maxW * (rng() * 1.5 + 0.5),
            h: height * (rng() * rng() * 0.7 + 0.1), // more short buildings, some tall
            colorIndex: Math.floor(rng() * colors.colors.length)
        });
    }
    
    // Sort by height descending so taller buildings are in back
    buildings.sort((a, b) => b.h - a.h);

    for (const b of buildings) {
        const y = height - b.h;
        const color = colors.colors[b.colorIndex];
        
        const grad = ctx.createLinearGradient(b.x, y, b.x, height);
        grad.addColorStop(0, color);
        grad.addColorStop(1, colors.bg);
        
        ctx.fillStyle = grad;
        ctx.fillRect(b.x, y, b.w, b.h);
        
        // Outline
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = width * 0.001;
        ctx.strokeRect(b.x, y, b.w, b.h);
        
        // Windows
        if (rng() > 0.3 && b.w > width * 0.02) {
            ctx.fillStyle = colors.colors[(b.colorIndex + 1) % colors.colors.length];
            ctx.globalAlpha = 0.8;
            ctx.fillRect(b.x + b.w * 0.2, y + b.h * 0.05, b.w * 0.2, b.h * 0.05);
            ctx.globalAlpha = 1.0;
        }
    }
}
