import seedrandom from 'https://esm.sh/seedrandom@3.0.5';

export function downloadCanvas(width, height, generatorFn, colors, seed, filename, options) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const rng = seedrandom(seed);
    
    generatorFn(ctx, width, height, colors, rng, options);
    
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
