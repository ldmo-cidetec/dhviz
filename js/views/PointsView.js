// views/PointsView.js
// Renders reference point controls in two locations:
//   config section  - injected into [data-points-config] containers in the DH tab
//   results section - world-frame coordinates shown at the bottom of the Matrices tab
// Config containers are mounted once by PointsController and survive DHView re-renders.

const tex = str => {
    if (typeof katex === 'undefined') return str;
    return katex.renderToString(str, { throwOnError: false });
};

class PointsView {

    constructor() {
        // Settings panel: config section (injected by DHView after sliders)
        this._configContainers = []; // filled by DHView via mountConfigSection()

        // Matrices panel: results section
        this._matPanelMd = document.getElementById('panel-matrices-md');
        this._matPanelSm = document.getElementById('panel-matrices-sm');
    }

    // Called by DHView to inject the config section into each layout panel
    mountConfigSection(container) {
        this._configContainers.push(container);
    }

    // Config section (Settings tab)

    renderConfig(points, numFrames) {
        this._configContainers.forEach(container => {
            container.innerHTML = '';
            container.appendChild(this._buildConfigSection(points, numFrames));
        });
    }

    _buildConfigSection(points, numFrames) {
        const wrap = document.createElement('div');
        wrap.className = 'mt-4 pt-4 border-t border-gray-200 space-y-3';

        // Header
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between';

        const title = document.createElement('p');
        title.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
        title.textContent = 'Reference points';
        header.appendChild(title);

        const addBtn = document.createElement('button');
        addBtn.dataset.addPoint = true;
        addBtn.className = 'text-xs text-gray-400 hover:text-black border border-gray-200 rounded px-2 py-0.5 transition';
        addBtn.textContent = '+ Add point';
        header.appendChild(addBtn);
        wrap.appendChild(header);

        if (points.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'text-xs text-gray-300 italic';
            empty.textContent = 'No reference points defined.';
            wrap.appendChild(empty);
            return wrap;
        }

        // Frame options: {0}, {1}, ..., {n}
        const frameOptions = Array.from({ length: numFrames + 1 }, (_, i) => i);

        points.forEach(point => {
            wrap.appendChild(this._buildPointRow(point, frameOptions));
        });

        return wrap;
    }

    _buildPointRow(point, frameOptions) {
        const row = document.createElement('div');
        row.className = 'flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2';
        row.dataset.pointId = point.id;

        // Label input
        const labelInput = document.createElement('input');
        labelInput.type            = 'text';
        labelInput.value           = point.label;
        labelInput.dataset.field   = 'label';
        labelInput.dataset.pointId = point.id;
        labelInput.className       = 'w-16 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-black';

        // Frame selector
        const frameLabel = document.createElement('span');
        frameLabel.className = 'text-xs text-gray-400 flex-shrink-0';
        frameLabel.innerHTML = 'Frame:';

        const frameSelect = document.createElement('select');
        frameSelect.dataset.field   = 'frameIndex';
        frameSelect.dataset.pointId = point.id;
        frameSelect.className       = 'text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-black bg-white';
        frameOptions.forEach(i => {
            const opt = document.createElement('option');
            opt.value    = i;
            opt.textContent = `{${i}}`;
            opt.selected = i === point.frameIndex;
            frameSelect.appendChild(opt);
        });

        // x, y, z inputs
        const coords = ['x', 'y', 'z'];
        const coordInputs = coords.map(axis => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center gap-1';

            const lbl = document.createElement('span');
            lbl.className = 'text-xs text-gray-400';
            lbl.innerHTML = tex(axis);

            const input = document.createElement('input');
            input.type          = 'number';
            input.step          = '0.1';
            input.value         = point[axis].toFixed(3);
            input.dataset.field = axis;
            input.dataset.pointId = point.id;
            input.className     = 'w-16 text-right text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-black';

            wrapper.appendChild(lbl);
            wrapper.appendChild(input);
            return wrapper;
        });

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.dataset.removePoint = point.id;
        removeBtn.className = 'text-gray-300 hover:text-red-500 text-lg leading-none focus:outline-none transition ml-auto';
        removeBtn.innerHTML = '&times;';

        row.append(labelInput, frameLabel, frameSelect, ...coordInputs, removeBtn);
        return row;
    }

    // Results section (Matrices tab) 

    renderResults(points, results) {
        [this._matPanelMd, this._matPanelSm].forEach(panel => {
            if (!panel) return;

            // Remove previous results section if exists
            const prev = panel.querySelector('[data-points-results]');
            if (prev) prev.remove();

            if (points.length === 0) return;

            const section = this._buildResultsSection(points, results);
            panel.appendChild(section);
        });
    }

    _buildResultsSection(points, results) {
        const section = document.createElement('div');
        section.dataset.pointsResults = true;
        section.className = 'mt-4 pt-4 border-t border-gray-200 space-y-3';
        section.style.fontSize = '0.78rem';

        const header = document.createElement('p');
        header.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
        header.textContent = 'Reference points in base frame';
        section.appendChild(header);

        points.forEach((point, i) => {
            const res = results[i];
            const block = document.createElement('div');
            block.className = 'space-y-1';

            const title = document.createElement('p');
            title.className = 'text-xs text-gray-500';
            title.innerHTML = tex(`{}^0${point.label} = {}^0T_{${point.frameIndex}} \\cdot {}^{${point.frameIndex}}p`);
            block.appendChild(title);

            const val = document.createElement('p');
            val.className = 'text-xs font-mono text-gray-700';
            if (res) {
                val.innerHTML = tex(
                    `\\begin{bmatrix} ${res[0].toFixed(4)} \\\\ ${res[1].toFixed(4)} \\\\ ${res[2].toFixed(4)} \\end{bmatrix}`,
                    true
                );
            } else {
                val.textContent = 'N/A';
            }
            block.appendChild(val);
            section.appendChild(block);
        });

        return section;
    }
}

export default PointsView;