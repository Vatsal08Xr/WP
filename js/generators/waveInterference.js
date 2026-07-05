export function drawWaveInterference(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    const numWaves = 45;
    ctx.lineWidth = width * 0.0015;
    
    for(let i = 0; i < numWaves; i++) {
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.strokeStyle = color;
        
        const yCenter = (height * 0.1) + (rng() * height * 0.8);
        const amplitude = (rng() * 0.25 + 0.05) * height;
        const frequency = (rng() * 1.5 + 0.5) * 0.01;
        const phase = rng() * Math.PI * 2;
        
        ctx.beginPath();
        let started = false;
        
        for(let x = -width * 0.05; x <= width * 1.05; x += width * 0.01) {
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
