export function drawGridGlitch(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    const columns = 24;
    const rows = 14;
    const cellW = width / columns;
    const cellH = height / rows;
    
    // Base grid
    ctx.strokeStyle = colors.colors[0];
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = width * 0.0005;
    
    for(let x=0; x<=width; x+=cellW) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, height); ctx.stroke();
    }
    for(let y=0; y<=height; y+=cellH) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width, y); ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;
    
    const numBlocks = 180;
    
    for (let i = 0; i < numBlocks; i++) {
        const col = Math.floor(rng() * columns);
        const row = Math.floor(rng() * rows);
        const colSpan = Math.floor(rng() * 4) + 1;
        const rowSpan = Math.floor(rng() * rng() * 3) + 1;
        
        const x = col * cellW;
        const y = row * cellH;
        const w = colSpan * cellW;
        const h = rowSpan * cellH;
        
        const type = rng();
        
        if (type < 0.45) {
            // Solid block
            ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
            ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        } else if (type < 0.75) {
            // Striped block
            const stripeColor = colors.colors[Math.floor(rng() * colors.colors.length)];
            ctx.strokeStyle = stripeColor;
            ctx.lineWidth = 2;
            for(let sx = x + 2; sx < x + w - 2; sx += 6) {
                ctx.beginPath(); ctx.moveTo(sx, y + 2); ctx.lineTo(sx, y + h - 2); ctx.stroke();
            }
        } else {
            // Data glitch blocks (small sub-rects)
            ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
            const subCols = 4;
            const subRows = 4;
            const subW = w / subCols;
            const subH = h / subRows;
            
            for(let r=0; r<subRows; r++) {
                for(let c=0; c<subCols; c++) {
                    if(rng() > 0.5) {
                        ctx.fillRect(x + c*subW + 1, y + r*subH + 1, subW - 2, subH - 2);
                    }
                }
            }
        }
    }
}
