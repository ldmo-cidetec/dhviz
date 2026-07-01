// views/DHView.js
// Renders the DH Parameters tab: guide text, the parameter table, joint sliders,
// and the drag-to-resize handles for desktop and mobile layouts.
// Tab switching is delegated to TabManager; this view only proxies
// isTabActive() and onTabChange() for controllers.

// KaTeX helper: renders a LaTeX string to HTML.
// Falls back to plain text if KaTeX has not loaded yet.
const tex = str => {
    if (typeof katex === 'undefined') return str;
    return katex.renderToString(str, { throwOnError: false });
};

class DHView {

    constructor(bus, tabManager) {
        this._bus        = bus;
        this._tabManager = tabManager;

        // Tab content panels for desktop (md) and mobile (sm)
        this.panelConfigMd   = document.getElementById('panel-config-md');
        this.panelMatricesMd = document.getElementById('panel-matrices-md');
        this.panelConfigSm   = document.getElementById('panel-config-sm');
        this.panelMatricesSm = document.getElementById('panel-matrices-sm');

        // Constrain panels to their container width to prevent horizontal overflow
        [this.panelConfigMd, this.panelConfigSm,
         this.panelMatricesMd, this.panelMatricesSm,
         document.getElementById('panel-urdf-md'),
         document.getElementById('panel-urdf-sm')].forEach(p => {
            if (p) { p.style.overflowX = 'hidden'; p.style.width = '100%'; }
        });
        const lp = document.getElementById('left-panel');
        if (lp) lp.style.overflowX = 'hidden';

        // Resize handle elements
        this.leftPanel = document.getElementById('left-panel');
        this.layoutMd  = document.getElementById('layout-md');
        this.resizeV   = document.getElementById('resize-v');
        this.sceneSm   = document.getElementById('scene-sm');
        this.layoutSm  = document.getElementById('layout-sm');
        this.resizeH   = document.getElementById('resize-h');

        this._buildSharedContent();
        this._mountContent();
        this._initResize();
    }

    // Build the settings panel and table once.
    // The same DOM node is cloned into desktop and mobile containers.
    _buildSharedContent() {
        this._settingsPanel = this._buildSettingsPanel();
 
        this._matricesPanel = document.createElement('div');
        this._matricesPanel.innerHTML =
            '<p class="text-gray-400 text-sm">Open the Matrices tab to compute the transformation matrices.</p>';
    }

    _mountContent() {
        this.panelConfigMd.appendChild(this._settingsPanel.cloneNode(true));
        this.panelConfigSm.appendChild(this._settingsPanel.cloneNode(true));

        // Points config containers are appended directly (not cloned) so they
        // survive render() rebuilds without losing their injected content
        const ptMd = document.createElement('div');
        ptMd.dataset.pointsConfig = true;
        this.panelConfigMd.appendChild(ptMd);

        const ptSm = document.createElement('div');
        ptSm.dataset.pointsConfig = true;
        this.panelConfigSm.appendChild(ptSm);

        this.panelMatricesMd.appendChild(this._matricesPanel.cloneNode(true));
        this.panelMatricesSm.appendChild(this._matricesPanel.cloneNode(true));
    }

    // Build the full settings panel: guide text, table, Add link button, sliders wrap
    _buildSettingsPanel() {
        const wrap = document.createElement('div');

        // Guide text explaining the DH convention and joint types
        const guide = document.createElement('div');
        guide.className = 'mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-xs text-gray-500 leading-relaxed';
        guide.innerHTML = `
            <p>
                Each row defines the transformation
                ${tex('{}^{i-1}T_i')} between consecutive frames
                using the <strong>Craig (modified DH)</strong> convention:
                ${tex('\\alpha_{i-1}')}, ${tex('a_{i-1}')}, ${tex('d_i')}, ${tex('\\theta_i')}.
            </p>
            <div class="space-y-2">
                <div class="flex items-start gap-2">
                    <span class="mt-0.5 inline-block w-5 h-5 rounded text-center text-white text-xs font-bold leading-5 flex-shrink-0" style="background:#2563eb">R</span>
                    <span><strong>Revolute</strong> - rotates about ${tex('z_i')}.
                    The joint variable is ${tex('\\theta_i = q_i')} (angle).
                    ${tex('d_i')} is a constant offset.</span>
                </div>
                <div class="flex items-start gap-2">
                    <span class="mt-0.5 inline-block w-5 h-5 rounded text-center text-white text-xs font-bold leading-5 flex-shrink-0" style="background:#d97706">P</span>
                    <span><strong>Prismatic</strong> - translates along ${tex('z_i')}.
                    The joint variable is ${tex('d_i = q_i')} (distance).
                    ${tex('\\theta_i')} is a constant offset.</span>
                </div>
                <div class="flex items-start gap-2">
                    <span class="mt-0.5 inline-block w-5 h-5 rounded text-center text-white text-xs font-bold leading-5 flex-shrink-0" style="background:#16a34a">F</span>
                    <span><strong>Fixed</strong> - no motion at this joint.
                    Both ${tex('d_i')} and ${tex('\\theta_i')} are constant offsets.
                    The last link is always fixed, since the end-effector frame cannot be actuated.</span>
                </div>
            </div>
        `;
        wrap.appendChild(guide);

        // Table header label
        const tableHeader = document.createElement('p');
        tableHeader.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2';
        tableHeader.textContent = 'DH Parameter Table';
        wrap.appendChild(tableHeader);

        // Table wrapper: overflow-x:auto allows horizontal scroll on small screens
        // without expanding the panel beyond 100% width
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'overflow-x:auto; max-width:100%; width:100%;';

        const table = document.createElement('table');
        // w-full ensures the table fills all available horizontal space
        table.className = 'w-full text-sm border border-gray-200 rounded-lg overflow-hidden';
        table.style.minWidth = '700px';

        // Table header with KaTeX symbols for each column
        const thead = document.createElement('thead');
        thead.className = 'bg-gray-50 text-gray-600';
        thead.innerHTML = `
            <tr>
                <th class="px-3 py-2 text-center font-semibold">${tex('i')}</th>
                <th class="px-3 py-2 text-center font-semibold">${tex('{}^{i-1}T_{i}')}</th>
                <th class="px-3 py-2 text-center font-semibold">${tex('\\alpha_{i-1}')}</th>
                <th class="px-3 py-2 text-center font-semibold">${tex('a_{i-1}')}</th>
                <th class="px-3 py-2 text-center font-semibold">${tex('d_i')}</th>
                <th class="px-3 py-2 text-center font-semibold">${tex('\\theta_i')}</th>
                <th class="px-3 py-2 text-center font-semibold">Joint</th>
                <th class="px-1 py-2"></th>
            </tr>
        `;
        table.appendChild(thead);

        // Body is populated by render() on every model change
        const tbody = document.createElement('tbody');
        tbody.className = 'divide-y divide-gray-200';
        tbody.dataset.dhTbody = true;
        table.appendChild(tbody);

        tableWrap.appendChild(table);
        wrap.appendChild(tableWrap);

        // Add link button
        const btn = document.createElement('button');
        btn.dataset.addRow = true;
        btn.className = `
            w-full mt-3 py-2 border border-gray-200 rounded-lg
            text-gray-400 hover:border-black hover:text-black text-sm
            transition flex items-center justify-center gap-2
        `;
        btn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add link
        `;
        wrap.appendChild(btn);

        // Joint sliders container - populated by renderSliders()
        const slidersWrap = document.createElement('div');
        slidersWrap.dataset.slidersWrap = true;
        slidersWrap.className = 'mt-4 pt-4 border-t border-gray-200 space-y-3';
        wrap.appendChild(slidersWrap);

        return wrap;
    }

    // Rebuild the joint variable sliders for all actuated joints.
    // Called by render() after the table is updated.
    renderSliders(rows) {
        const actuated = rows.filter(r => r.actuated);

        document.querySelectorAll('[data-sliders-wrap]').forEach(wrap => {
            wrap.innerHTML = '';
            if (actuated.length === 0) return;

            const title = document.createElement('p');
            title.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2';
            title.textContent = 'Joint variables';
            wrap.appendChild(title);

            actuated.forEach((row, i) => {
                const isR  = row.jointType === 'R';
                const qi   = rows.indexOf(row) + 1;
                const unit = isR ? 'rad' : 'm';
                const min  = isR ? -Math.PI : -1;
                const max  = isR ? Math.PI  :  1;
                const step = isR ? (Math.PI / 20).toFixed(6) : '0.1';

                const outer = document.createElement('div');
                outer.className = 'space-y-0';

                const block = document.createElement('div');
                block.className = 'flex flex-wrap items-center gap-2';

                // q_i label
                const label = document.createElement('span');
                label.className = 'flex-shrink-0 text-xs text-gray-500 w-8 text-right';
                label.innerHTML = tex(`q_{${qi}}`);
                block.appendChild(label);

                // Min input (editable joint limit)
                const minInput = document.createElement('input');
                minInput.type      = 'number';
                minInput.step      = step;
                minInput.value     = min.toFixed(3);
                minInput.className = 'w-16 text-right text-xs px-1 py-0.5 rounded border border-gray-200 text-gray-500 focus:outline-none focus:border-black';
                block.appendChild(minInput);

                // Slider
                const slider = document.createElement('input');
                slider.type                = 'range';
                slider.min                 = min;
                slider.max                 = max;
                slider.step                = 'any';
                slider.value               = row.q || 0;
                slider.dataset.sliderRowId = row.id;
                slider.className           = 'flex-grow min-w-0 accent-black cursor-pointer';
                slider.style.minWidth      = '80px';
                slider.setAttribute('inputmode', 'none');
                slider.addEventListener('focus', () => slider.blur());
                block.appendChild(slider);

                // Max input (editable joint limit)
                const maxInput = document.createElement('input');
                maxInput.type      = 'number';
                maxInput.step      = step;
                maxInput.value     = max.toFixed(3);
                maxInput.className = 'w-16 text-left text-xs px-1 py-0.5 rounded border border-gray-200 text-gray-500 focus:outline-none focus:border-black';
                block.appendChild(maxInput);

                // Exact value input - replaces the read-only display on the right.
                // The user can type a precise value here; the slider updates in sync.
                const exactInput = document.createElement('input');
                exactInput.type               = 'number';
                exactInput.step               = '0.1';
                exactInput.value              = (row.q || 0).toFixed(4);
                exactInput.dataset.exactRowId = row.id;
                exactInput.className          = 'ml-auto w-24 text-right text-xs px-2 py-0.5 rounded border border-gray-300 bg-gray-50 text-gray-700 focus:outline-none focus:border-black focus:bg-white transition font-mono';
                block.appendChild(exactInput);

                // Update slider bounds when limits change
                minInput.addEventListener('change', () => {
                    slider.min = parseFloat(minInput.value) || min;
                });
                maxInput.addEventListener('change', () => {
                    slider.max = parseFloat(maxInput.value) || max;
                });

                // Slider dragged: keep exact input in sync
                slider.addEventListener('input', () => {
                    exactInput.value = parseFloat(slider.value).toFixed(4);
                });

                const unitSpan = document.createElement('span');
                unitSpan.className = 'flex-shrink-0 text-xs text-gray-400 w-6';
                unitSpan.innerHTML = tex(`\\mathrm{${unit}}`);
                block.appendChild(unitSpan);

                // While typing or using arrows: sync slider visually only.
                // DHController listens to this input via data-exact-row-id
                // and updates the model directly - no re-render of the slider row.
                exactInput.addEventListener('input', () => {
                    const v = parseFloat(exactInput.value);
                    if (Number.isNaN(v)) return;
                    const min_ = parseFloat(slider.min);
                    const max_ = parseFloat(slider.max);
                    const clamped = Math.min(Math.max(v, min_), max_);
                    // Write clamped value back so the input never goes out of range
                    if (clamped !== v) exactInput.value = clamped;
                    slider.value = clamped;
                });

                exactInput.addEventListener('keydown', e => {
                    if (e.key === 'Enter') exactInput.blur();
                });

                outer.appendChild(block);
                wrap.appendChild(outer);
            });
        });
    }

    // Returns all [data-points-config] containers for PointsView to inject into
    getPointsContainers() {
        return Array.from(document.querySelectorAll('[data-points-config]'));
    }

    // Rebuild the tbody rows and sliders for the current model state
    render(rows) {
        document.querySelectorAll('[data-dh-tbody]').forEach(tbody => {
            tbody.innerHTML = '';
            rows.forEach((row, idx) => tbody.appendChild(this._buildRow(row, idx, idx === rows.length - 1)));
        });
        this.renderSliders(rows);
    }

    // Build a single <tr> for one DH row
    _buildRow(row, idx, isLast) {
        const isR = row.jointType === 'R';
        const tr  = document.createElement('tr');
        tr.className     = 'hover:bg-gray-50';
        tr.dataset.rowId = row.id;

        // Column i: row index
        const tdI = document.createElement('td');
        tdI.className = 'px-3 py-2 text-center text-gray-600 font-medium';
        tdI.innerHTML = tex(`${idx + 1}`);
        tr.appendChild(tdI);

        // Column T: link transformation label
        const tdT = document.createElement('td');
        tdT.className = 'px-3 py-2 text-center text-gray-500';
        tdT.innerHTML = tex(`{}^{${idx}}T_{${idx + 1}}`);
        tr.appendChild(tdT);

        // Columns alpha, a, d, theta: numeric inputs
        const RAD_STEP = (Math.PI / 20).toFixed(6);
        const M_STEP   = '0.1';

        const params = [
            { field: 'alpha', value: row.alpha, variable: false, pill: `\\alpha_{${idx}}`,     unit: 'rad', step: RAD_STEP },
            { field: 'a',     value: row.a,     variable: false, pill: `a_{${idx}}`,            unit: 'm',   step: M_STEP   },
            { field: 'd',     value: row.d,     variable: !isR,  pill: `d_{${idx + 1}}`,        unit: 'm',   step: M_STEP   },
            { field: 'theta', value: row.theta,  variable: isR,   pill: `\\theta_{${idx + 1}}`, unit: 'rad', step: RAD_STEP },
        ];

        params.forEach(({ field, value, variable, pill, unit, step }) => {
            const td = document.createElement('td');
            td.className = 'px-1 py-1';
            td.style.minWidth = '140px';

            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center gap-1';

            if (variable && row.actuated) {
                // Variable field for an actuated joint: shows q_i + offset input in blue
                const hint = document.createElement('span');
                hint.className = 'flex-shrink-0 text-xs text-gray-400 select-none';
                hint.innerHTML = tex(pill) + ':';
                wrapper.appendChild(hint);

                const varName = document.createElement('span');
                varName.className = 'flex-shrink-0 text-xs text-blue-500 select-none';
                varName.innerHTML = tex(`q_{${idx + 1}}`);
                wrapper.appendChild(varName);

                const plus = document.createElement('span');
                plus.className = 'flex-shrink-0 text-xs text-gray-400 select-none';
                plus.textContent = '+';
                wrapper.appendChild(plus);

                const input = document.createElement('input');
                input.type          = 'number';
                input.step          = step;
                input.value         = value.toFixed(3);
                input.dataset.field = field;
                input.dataset.rowId = row.id;
                input.className     = 'text-right text-sm px-2 py-1 rounded border border-blue-300 bg-blue-50 text-blue-600 focus:outline-none focus:border-blue-500';
                input.style.width   = '70px';
                wrapper.appendChild(input);

            } else if (variable && !row.actuated) {
                // Variable field for a passive joint: fixed value displayed normally
                const hint = document.createElement('span');
                hint.className = 'flex-shrink-0 text-xs text-gray-400 select-none';
                hint.innerHTML = tex(pill) + ':';
                wrapper.appendChild(hint);

                const fixed = document.createElement('input');
                fixed.type          = 'number';
                fixed.step          = step;
                fixed.value         = value.toFixed(3);
                fixed.dataset.field = field;
                fixed.dataset.rowId = row.id;
                fixed.className     = 'text-right text-sm px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-black';
                fixed.style.width   = '70px';
                wrapper.appendChild(fixed);

            } else {
                // Non-variable field (constant parameter)
                const hint = document.createElement('span');
                hint.className = 'flex-shrink-0 text-xs text-gray-400 select-none';
                hint.innerHTML = tex(pill) + ':';
                wrapper.appendChild(hint);

                const input = document.createElement('input');
                input.type          = 'number';
                input.step          = step;
                input.value         = value.toFixed(3);
                input.dataset.field = field;
                input.dataset.rowId = row.id;
                input.className     = 'text-right text-sm px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-black';
                input.style.width   = '70px';
                wrapper.appendChild(input);
            }

            const unitSpan = document.createElement('span');
            unitSpan.className = 'flex-shrink-0 text-xs text-gray-400 select-none';
            unitSpan.innerHTML = tex(`\\mathrm{${unit}}`);
            wrapper.appendChild(unitSpan);

            td.appendChild(wrapper);
            tr.appendChild(td);
        });

        // Joint type toggle R / P / F
        // On the last link, R and P are disabled - only Fixed is allowed,
        // since the end-effector frame cannot be actuated.
        const tdJoint = document.createElement('td');
        tdJoint.className = 'px-3 py-2 text-center';
        const toggle = document.createElement('div');
        toggle.className = 'inline-flex rounded overflow-hidden border border-gray-200';

        const JOINT_TYPES = [
            { type: 'R', title: 'Revolute'  },
            { type: 'P', title: 'Prismatic' },
            { type: 'F', title: 'Fixed'     },
        ];

        JOINT_TYPES.forEach(({ type, title }) => {
            const disabled = isLast && type !== 'F';
            const btn = document.createElement('button');
            btn.textContent      = type;
            btn.title            = title;
            btn.dataset.jointBtn = type;
            btn.dataset.rowId    = row.id;
            btn.disabled         = disabled;
            btn.className = `w-7 py-0.5 text-xs font-semibold focus:outline-none transition
                ${row.jointType === type
                    ? 'bg-black text-white'
                    : disabled
                        ? 'bg-gray-50 text-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-400 hover:text-gray-700'}`;
            toggle.appendChild(btn);
        });
        tdJoint.appendChild(toggle);
        tr.appendChild(tdJoint);

        // Remove button - only shown on the last row
        const tdRm = document.createElement('td');
        tdRm.className = 'px-2 py-1 text-center';
        if (isLast) {
            const btnRm = document.createElement('button');
            btnRm.innerHTML         = '&times;';
            btnRm.dataset.removeRow = row.id;
            btnRm.className = 'text-gray-300 hover:text-red-500 text-lg leading-none focus:outline-none transition';
            tdRm.appendChild(btnRm);
        }
        tr.appendChild(tdRm);

        return tr;
    }

    // Proxy methods: controllers call these instead of accessing TabManager directly
    isTabActive(name) { return this._tabManager.isActive(name); }
    onTabChange(fn)   { this._bus.on('tabChange', fn); }

    // Drag-to-resize handles for desktop (vertical) and mobile (horizontal)
    _initResize() {
        // Vertical handle (desktop): resizes the left panel width
        let vDrag = false;
        this.resizeV.addEventListener('mousedown', () => {
            vDrag = true;
            this._setDragCursor('col-resize');
        });
        document.addEventListener('mousemove', e => {
            if (!vDrag) return;
            const rect = this.layoutMd.getBoundingClientRect();
            this.leftPanel.style.width =
                this._clamp(e.clientX - rect.left, 200, rect.width - 280) + 'px';
        });
        document.addEventListener('mouseup', () => {
            vDrag = false;
            this._clearCursor();
        });

        // Horizontal handle (mobile): resizes the scene vs config split
        let hDrag = false;
        this.resizeH.addEventListener('mousedown',  () => { hDrag = true; this._setDragCursor('row-resize'); });
        this.resizeH.addEventListener('touchstart', () => { hDrag = true; }, { passive: true });
        document.addEventListener('mousemove', e  => this._applyH(hDrag, e.clientY));
        document.addEventListener('touchmove', e  => this._applyH(hDrag, e.touches[0].clientY), { passive: true });
        document.addEventListener('mouseup',  ()  => { hDrag = false; this._clearCursor(); });
        document.addEventListener('touchend', ()  => { hDrag = false; });
    }

    _applyH(active, clientY) {
        if (!active) return;
        const rect = this.layoutSm.getBoundingClientRect();
        this.sceneSm.style.height =
            this._clamp(clientY - rect.top, 120, rect.height - 160) + 'px';
    }

    _clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

    _setDragCursor(cur) {
        document.body.style.cursor     = cur;
        document.body.style.userSelect = 'none';
    }

    _clearCursor() {
        document.body.style.cursor = document.body.style.userSelect = '';
    }
}

export default DHView;