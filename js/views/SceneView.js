// views/SceneView.js
// Mounts the Three.js renderer into the DOM and manages OrbitControls.
// Uses demand-based rendering: only draws a frame when requestRender() is called
// or when the camera is moving (damping). This avoids a continuous 60fps loop
// when the scene is idle.

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class SceneView {

    constructor(sceneModel) {
        this.model = sceneModel;

        this._containerMd = document.getElementById('scene-container');
        this._containerSm = document.getElementById('scene-sm');

        this._canvas = this.model.renderer.domElement;
        this._mount();

        // OrbitControls 
        this.controls = new OrbitControls(this.model.camera, this._canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        //  cale overlay panels 
        this._buildScalePanels();

        // View preset panels 
        this._buildViewPanels();

        // Resize 
        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(this._containerMd);
        this._resizeObserver.observe(this._containerSm);
        this._onResize();

        // Animation loop (demand-based)
        this._needsRender = true;
        this.controls.addEventListener('change', () => { this._needsRender = true; });
        this._animate();
    }

    //  View preset panels 

    _buildViewPanels() {
        ['view-panel-md', 'view-panel-sm'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.appendChild(this._buildViewContent());
        });
    }

    _buildViewContent() {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-1';

        // View presets: name, plane label, camera position, up vector
        const views = [
            {
                label: 'ISO',
                plane: '',
                title: 'Isometric view',
                pos:   [1.0, -1.0, 0.8],
                up:    [0, 0, 1],
                icon:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" class="w-4 h-4 flex-shrink-0">
                            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5Z"/>
                            <path d="M8 2V14M2 5.5L14 10.5M14 5.5L2 10.5" stroke-opacity="0.4"/>
                        </svg>`,
            },
            {
                label: 'TOP',
                plane: 'X\u2080-Y\u2080',
                title: 'Top view (+Z) \u2014 X\u2080-Y\u2080 plane',
                pos:   [0, 0, 2],
                up:    [0, 1, 0],
                icon:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 flex-shrink-0">
                            <rect x="3" y="3" width="10" height="10" rx="1"/>
                            <line x1="8" y1="1" x2="8" y2="4"/>
                            <polyline points="6.5,2 8,1 9.5,2"/>
                        </svg>`,
            },
            {
                label: 'FRONT',
                plane: 'X\u2080-Z\u2080',
                title: 'Front view (+Y) \u2014 X\u2080-Z\u2080 plane',
                pos:   [0, -2, 0],
                up:    [0, 0, 1],
                icon:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 flex-shrink-0">
                            <rect x="3" y="3" width="10" height="10" rx="1"/>
                            <line x1="8" y1="15" x2="8" y2="12"/>
                            <polyline points="6.5,14 8,15 9.5,14"/>
                        </svg>`,
            },
            {
                label: 'RIGHT',
                plane: 'Y\u2080-Z\u2080',
                title: 'Right view (+X) \u2014 Y\u2080-Z\u2080 plane',
                pos:   [2, 0, 0],
                up:    [0, 0, 1],
                icon:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 flex-shrink-0">
                            <rect x="3" y="3" width="10" height="10" rx="1"/>
                            <line x1="1" y1="8" x2="4" y2="8"/>
                            <polyline points="2,6.5 1,8 2,9.5"/>
                        </svg>`,
            },
        ];

        views.forEach(({ label, plane, title, pos, up, icon }) => {
            const btn = document.createElement('button');
            btn.title     = title;
            btn.className = `flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
                             text-gray-500 hover:bg-gray-100 hover:text-black transition
                             focus:outline-none w-full text-left`;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'font-semibold';
            labelSpan.textContent = label;

            btn.innerHTML = icon;
            btn.appendChild(labelSpan);

            if (plane) {
                const planeSpan = document.createElement('span');
                planeSpan.className = 'text-gray-300 font-normal';
                planeSpan.textContent = `(${plane})`;
                btn.appendChild(planeSpan);
            }

            btn.addEventListener('click', () => this._setView(pos, up));
            wrap.appendChild(btn);
        });

        return wrap;
    }

    // Animate camera to a preset view position
    _setView(pos, up) {
        const cam    = this.model.camera;
        const target = this.controls.target;

        // Distance from target kept the same as current camera distance
        const dist = cam.position.distanceTo(target);
        const dir  = new (cam.position.constructor)(pos[0], pos[1], pos[2]).normalize();

        cam.position.copy(target).addScaledVector(dir, dist);
        cam.up.set(up[0], up[1], up[2]);
        this.controls.update();
        this.requestRender();
    }

    _buildScalePanels() {
        ['scale-panel-md', 'scale-panel-sm'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.appendChild(this._buildScaleContent());
        });
    }

    _buildScaleContent() {
        const wrap = document.createElement('div');

        const title = document.createElement('p');
        title.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2';
        title.textContent = 'Scale';
        wrap.appendChild(title);

        [
            { key: 'link',  label: 'Links'  },
            { key: 'joint', label: 'Joints' },
            { key: 'axes',  label: 'Axes'   },
            { key: 'text',  label: 'Text'   },
        ].forEach(({ key, label }) => {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-1';

            const lbl = document.createElement('span');
            lbl.className = 'flex-shrink-0 text-xs text-gray-500 w-9';
            lbl.textContent = label;
            row.appendChild(lbl);

            const slider = document.createElement('input');
            slider.type             = 'range';
            slider.min              = 0.1;
            slider.max              = 5;
            slider.step             = 0.1;
            slider.value            = 1;
            slider.dataset.scaleKey = key;
            slider.className        = 'min-w-0 flex-grow accent-black cursor-pointer';
            slider.style.width      = '0';  // flex will size it correctly without overflow
            row.appendChild(slider);

            const display = document.createElement('span');
            display.className = 'flex-shrink-0 text-xs text-gray-500 w-8 text-right font-mono';
            display.textContent = '1.0';
            row.appendChild(display);

            // Update display while dragging
            slider.addEventListener('input', () => {
                display.textContent = parseFloat(slider.value).toFixed(1);
            });

            wrap.appendChild(row);
        });

        return wrap;
    }

    //  Canvas mounting 

    _mount() {
        const target = this._activeContainer();
        if (!this._canvas.parentElement ||
             this._canvas.parentElement !== target) {
            target.appendChild(this._canvas);
        }
    }

    _activeContainer() {
        const layoutMd = document.getElementById('layout-md');
        return layoutMd && layoutMd.offsetParent !== null
            ? this._containerMd
            : this._containerSm;
    }

    //  Resize 

    _onResize() {
        this._mount();
        const container = this._activeContainer();
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        this.model.camera.aspect = w / h;
        this.model.camera.updateProjectionMatrix();
        this.model.renderer.setSize(w, h);
        this.requestRender();
    }

    //  Render / animation 

    // Call this to request a re-render on the next frame
    requestRender() { this._needsRender = true; }

    render() {
        const dampingActive = this.controls.update();
        if (dampingActive) this._needsRender = true;
        this.model.renderer.render(this.model.scene, this.model.camera);
        if (!dampingActive) this._needsRender = false;
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        if (this._needsRender) this.render();
    }
}

export default SceneView;