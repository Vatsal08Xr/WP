export function drawWaveInterference(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    // Scale wave count with canvas height so mobile gets fewer, more breathable waves
    const numWaves = Math.max(8, Math.round(45 * height / 2160));
    ctx.lineWidth = Math.max(1, width * 0.002);
    
    for(let i = 0; i < numWaves; i++) {
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.strokeStyle = color;
        
        const yCenter = (height * 0.1) + (rng() * height * 0.8);
        const amplitude = (rng() * 0.20 + 0.06) * height;
        const frequency = (rng() * 1.5 + 0.5) * 0.01;
        const phase = rng() * Math.PI * 2;
        
        ctx.beginPath();
        let started = false;
        
        for(let x = -width * 0.05; x <= width * 1.05; x += width * 0.005) {
            const y = yCenter + 
                      Math.sin(x * frequency + phase) * amplitude + 
                      Math.cos(x * frequency * 0.4 + phase) * (amplitude * 0.4);
                      
            if(!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}
