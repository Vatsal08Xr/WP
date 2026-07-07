export function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateRandomPalette(isDark) {
    const baseHue = Math.floor(Math.random() * 360);
    
    // Background color
    const bgL = isDark ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 10) + 90; // 5-15% or 90-100%
    const bgS = Math.floor(Math.random() * 15); // low saturation for bg
    const bg = hslToHex(baseHue, bgS, bgL);
    
    // 3 accent colors (analogous or triadic scheme)
    const colors = [];
    const numColors = 3;
    const hueStep = 30 + Math.floor(Math.random() * 90); // 30 to 120 degree shifts
    
    for (let i = 0; i < numColors; i++) {
        const h = (baseHue + (i + 1) * hueStep) % 360;
        const s = 65 + Math.floor(Math.random() * 25); // 65-90% saturation
        const l = isDark ? 45 + Math.floor(Math.random() * 20) : 35 + Math.floor(Math.random() * 20); // 45-65% or 35-55% lightness
        colors.push(hslToHex(h, s, l));
    }
    
    return { bg, colors };
}
