export function drawFluidMesh(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    const numBlobs = 8;
    
    // Set blur relative to canvas size
    ctx.filter = `blur(${Math.min(width, height) * 0.2}px)`;
    
    for (let i = 0; i < numBlobs; i++) {
        const x = rng() * width;
        const y = rng() * height;
        const r = (rng() * 0.5 + 0.2) * Math.min(width, height);
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        
        // Convert hex to rgba for opacity (using roughly 60% opacity)
        // For simplicity we just use hex+alpha, e.g. #ff0000 -> #ff000099
        ctx.fillStyle = color + '99'; 
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.filter = 'none';
}
