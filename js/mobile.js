import seedrandom from 'https://esm.sh/seedrandom@3.0.5';
import { palettes } from './palettes.js';
import { downloadCanvas } from './exportUtils.js';
import { drawTopography } from './generators/topography.js';
import { drawFluidMesh } from './generators/fluidMesh.js';
import { drawVoronoi } from './generators/voronoi.js';
import { drawWaveInterference } from './generators/waveInterference.js';
import { drawParticles } from './generators/particles.js';
import { drawLandscape } from './generators/landscape.js';
import { drawGeometricCity } from './generators/geometricCity.js';
import { drawCrystals } from './generators/crystals.js';
import { drawNebula } from './generators/nebula.js';
import { drawGridGlitch } from './generators/gridGlitch.js';
import { drawFlowField } from './generators/flowField.js';
import { drawOrbitals } from './generators/orbitals.js';

const generators = {
    topography: drawTopography,
    fluidMesh: drawFluidMesh,
    voronoi: drawVoronoi,
    waveInterference: drawWaveInterference,
    particles: drawParticles,
    landscape: drawLandscape,
    geometricCity: drawGeometricCity,
    crystals: drawCrystals,
    nebula: drawNebula,
    gridGlitch: drawGridGlitch,
    flowField: drawFlowField,
    orbitals: drawOrbitals
};

// ----- Elements -----
const canvas = document.getElementById('mobile-preview-canvas');
if (!canvas) throw new Error('Mobile canvas not found');

const ctx = canvas.getContext('2d', { willReadFrequently: true });
const wrapper = document.getElementById('mobile-canvas-wrapper');
const outer = document.getElementById('mobile-canvas-container-outer');
const themeNameDisplay = document.getElementById('mobile-theme-name-display');
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
const previewDesktopBtn = document.getElementById('mobile-preview-desktop-btn');
const previewIphoneBtn = document.getElementById('mobile-preview-iphone-btn');
const generateBtn = document.getElementById('mobile-btn-generate');
const dlDesktopBtn = document.getElementById('mobile-btn-dl-desktop');
const dlIphoneBtn = document.getElementById('mobile-btn-dl-iphone');
const customPaletteEditor = document.getElementById('mobile-custom-palette-editor');
const customBgColor = document.getElementById('mobile-custom-bg-color');
const customAccentColors = document.querySelectorAll('.mobile-custom-accent-color');

// ----- State -----
const state = {
    theme: 'topography',
    themeName: 'Topography',
    palette: 'monochrome',
    isDark: document.documentElement.classList.contains('dark'),
    previewMode: 'desktop',
    seed: Math.random().toString(36).substring(2, 15),
    customPalette: { bg: '#18181b', colors: ['#3b82f6', '#8b5cf6', '#ec4899'] }
};



// ----- Colors -----
function getColors() {
    if (state.palette === 'custom') return state.customPalette;
    const mode = state.isDark ? 'dark' : 'light';
    return palettes[state.palette]?.[mode] || palettes.monochrome[mode];
}

// ----- UI sync -----
function updateUI() {
    if (themeNameDisplay) themeNameDisplay.textContent = state.themeName;

    document.querySelectorAll('#mobile-theme-grid .theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
    document.querySelectorAll('#mobile-palette-grid .palette-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.palette === state.palette);
    });

    if (state.palette === 'custom') customPaletteEditor?.classList.remove('hidden');
    else customPaletteEditor?.classList.add('hidden');

    // Preview toggle active state
    const desktopActive = state.previewMode === 'desktop';
    [previewDesktopBtn, previewIphoneBtn].forEach((btn, i) => {
        const active = (i === 0) === desktopActive;
        btn.style.background = active ? 'rgba(161,161,170,0.3)' : '';
        btn.style.color = active ? '' : 'rgba(161,161,170,0.7)';
    });

    wrapper.style.borderRadius = desktopActive ? '6px' : '22px';
}

// ----- Render -----
let renderTimeout;
function triggerUpdate() {
    const ratio = state.previewMode === 'desktop' ? (16 / 9) : (1170 / 2532);
    const rect = outer.getBoundingClientRect();
    const availW = rect.width;
    const availH = rect.height;

    if (availW < 10 || availH < 10) return; // not laid out yet

    let w = availW;
    let h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }

    // Floor to integers
    w = Math.floor(w);
    h = Math.floor(h);

    wrapper.style.width = `${w}px`;
    wrapper.style.height = `${h}px`;

    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const generatorFn = generators[state.theme];
        if (!generatorFn) return;
        const rng = seedrandom(state.seed);
        generatorFn(ctx, canvas.width, canvas.height, getColors(), rng);
    }, 60);
}

// ----- Event listeners -----
document.querySelectorAll('#mobile-theme-grid .theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        state.themeName = btn.dataset.name;
        state.seed = Math.random().toString(36).substring(2, 15);
        updateUI();
        triggerUpdate();
    });
});

document.querySelectorAll('#mobile-palette-grid .palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.palette = btn.dataset.palette;
        updateUI();
        triggerUpdate();
    });
});

customBgColor?.addEventListener('input', e => {
    state.customPalette.bg = e.target.value;
    triggerUpdate();
});

customAccentColors.forEach((input, i) => {
    input.addEventListener('input', e => {
        state.customPalette.colors[i] = e.target.value;
        triggerUpdate();
    });
});

mobileThemeToggle?.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.documentElement.classList.toggle('dark', state.isDark);
    updateUI();
    triggerUpdate();
});

generateBtn?.addEventListener('click', () => {
    state.seed = Math.random().toString(36).substring(2, 15);
    triggerUpdate();
});

previewDesktopBtn?.addEventListener('click', () => {
    state.previewMode = 'desktop';
    updateUI();
    triggerUpdate();
});

previewIphoneBtn?.addEventListener('click', () => {
    state.previewMode = 'iphone';
    updateUI();
    triggerUpdate();
});

dlDesktopBtn?.addEventListener('click', () => {
    downloadCanvas(3840, 2160, generators[state.theme], getColors(), state.seed,
        `wallpaper-desktop-${state.theme}-${state.seed}.png`);
});

dlIphoneBtn?.addEventListener('click', () => {
    downloadCanvas(1290, 2796, generators[state.theme], getColors(), state.seed,
        `wallpaper-iphone-${state.theme}-${state.seed}.png`);
});

window.addEventListener('resize', triggerUpdate);

// ----- Init: use ResizeObserver so we render as soon as the container has real size -----
// This avoids the race condition where getBoundingClientRect returns 0 at module load time.
const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
        if (entry.contentRect.width > 10 && entry.contentRect.height > 10) {
            triggerUpdate();
        }
    }
});
ro.observe(outer);

// Also run immediately in case layout is already done
updateUI();
triggerUpdate();
