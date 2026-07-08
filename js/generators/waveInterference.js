export function drawWaveInterference(ctx, width, height, colors, rng, options = {}) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    const numWaves = options.num !== undefined ? options.num : Math.max(8, Math.round(45 * height / 2160));
    
    // Fallback if thick not provided is ~4 for 1920 width, so we set default userThick to 2.
    const userThick = options.thick !== undefined ? options.thick : 2;
    
    const exactThickCount = Math.min(numWaves, Math.floor(rng() * 2) + 2); // 2 or 3 waves
    const exactThickIndices = new Set();
    while (exactThickIndices.size < exactThickCount) {
        exactThickIndices.add(Math.floor(rng() * numWaves));
    }
    
    for(let i = 0; i < numWaves; i++) {
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.strokeStyle = color;
        
        let waveThick = userThick;
        if (!exactThickIndices.has(i)) {
            // 1-2% less in random
            const reduction = 0.01 + rng() * 0.01;
            waveThick = userThick * (1 - reduction);
        }
        
        ctx.lineWidth = Math.max(1, waveThick * (width / 1920));
        
        const yCenter = (height * 0.1) + (rng() * height * 0.8);
        const ampScale = options.amp !== undefined ? options.amp / 100 : 1.0;
        const amplitude = (rng() * 0.20 + 0.06) * height * ampScale;
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
