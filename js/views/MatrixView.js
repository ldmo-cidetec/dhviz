// views/MatrixView.js
// Renders the Matrices tab with two columns per link: symbolic (via Algebrite
// and KaTeX) on the left and numeric on the right.
// The accumulated global matrix is shown at the bottom.
// Renders directly into each panel (no cloneNode).

const tex = (str, display = false) => {
    if (typeof katex === 'undefined') return str;
    return katex.renderToString(str, { throwOnError: false, displayMode: display });
};

const bmatrix = M => {
    const rows = M.map(r => r.join(' & ')).join(' \\\\ ');
    return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
};

class MatrixView {

    constructor() {
        this._panelsMd = document.getElementById('panel-matrices-md');
        this._panelsSm = document.getElementById('panel-matrices-sm');
    }

    render(rows, matrixData) {
        const content = this._buildContent(rows, matrixData);
        [this._panelsMd, this._panelsSm].forEach(panel => {
            if (!panel) return;
            panel.innerHTML = '';
            panel.appendChild(content.cloneNode(true));
        });
    }

    _buildContent(rows, { locals, localsNumeric, globalLatex }) {
        const wrap = document.createElement('div');
        wrap.className = 'pb-6';
        wrap.style.fontSize = '0.78rem';

        if (rows.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-gray-400 text-sm';
            p.textContent = 'Add links in the Settings tab to see the matrices.';
            wrap.appendChild(p);
            return wrap;
        }

        // Two-column grid
        // Left: symbolic  |  Right: numeric
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:1fr 1px 1fr; gap:0;';
        wrap.appendChild(grid);

        // Left column
        const leftCol = document.createElement('div');
        leftCol.className = 'pr-3 space-y-5';

        const leftHead = this._colHeader('Symbolic', 'border-blue-200 text-blue-500 bg-blue-50');
        leftCol.appendChild(leftHead);

        rows.forEach((_, i) => {
            leftCol.appendChild(this._matrixBlock(
                `{}^{${i}}T_{${i+1}}`, locals[i]
            ));
        });

        // Vertical divider 
        const vDivider = document.createElement('div');
        vDivider.style.cssText = 'background:#e5e7eb; width:1px;';

        // Right column 
        const rightCol = document.createElement('div');
        rightCol.className = 'pl-3 space-y-5';

        const rightHead = this._colHeader('Numeric', 'border-gray-200 text-gray-500 bg-gray-50');
        rightCol.appendChild(rightHead);

        rows.forEach((_, i) => {
            rightCol.appendChild(this._matrixBlock(
                `{}^{${i}}T_{${i+1}}`, localsNumeric[i]
            ));
        });

        grid.appendChild(leftCol);
        grid.appendChild(vDivider);
        grid.appendChild(rightCol);

        // Accumulated transformation (full width, numeric only) 
        const globalSection = document.createElement('div');
        globalSection.className = 'mt-4 pt-4 border-t border-gray-200 space-y-1';

        const globalHeader = document.createElement('div');
        globalHeader.className = 'flex items-center gap-2 mb-1';
        const globalLabel = document.createElement('span');
        globalLabel.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
        globalLabel.textContent = 'Accumulated transformation';
        const globalBadge = document.createElement('span');
        globalBadge.className = 'text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50';
        globalBadge.textContent = 'Numeric';
        globalHeader.appendChild(globalLabel);
        globalHeader.appendChild(globalBadge);
        globalSection.appendChild(globalHeader);

        const chain = rows.map((_, i) => `{}^{${i}}T_{${i+1}}`).join('\\cdot');
        const globalTitle = document.createElement('p');
        globalTitle.className = 'text-xs text-gray-400 mb-1';
        globalTitle.innerHTML = tex(`{}^{0}T_{${rows.length}} = ${chain}`);
        globalSection.appendChild(globalTitle);

        const globalMat = document.createElement('div');
        globalMat.className = 'overflow-x-auto';
        globalMat.innerHTML = globalLatex
            ? tex(globalLatex, true)
            : '<p class="text-gray-300 text-xs">Not available.</p>';
        globalSection.appendChild(globalMat);

        wrap.appendChild(globalSection);

        return wrap;
    }

    // Helpers

    _colHeader(label, badgeClass, faded = false) {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 pb-2 border-b border-gray-100 mb-1';

        const title = document.createElement('span');
        title.className = `text-xs font-semibold uppercase tracking-wide ${faded ? 'text-gray-300' : 'text-gray-500'}`;
        title.textContent = label;
        div.appendChild(title);

        const badge = document.createElement('span');
        badge.className = `text-xs px-2 py-0.5 rounded-full border ${badgeClass}`;
        badge.textContent = label;
        div.appendChild(badge);

        return div;
    }

    _matrixBlock(titleLatex, M) {
        const block = document.createElement('div');
        block.className = 'space-y-1';

        const title = document.createElement('p');
        title.className = 'text-xs text-gray-400';
        title.innerHTML = tex(titleLatex);
        block.appendChild(title);

        const mat = document.createElement('div');
        mat.className = 'overflow-x-auto';
        mat.innerHTML = tex(bmatrix(M), true);
        block.appendChild(mat);

        return block;
    }

    _divider() {
        const d = document.createElement('div');
        d.className = 'border-t border-gray-100 my-2';
        return d;
    }
}

export default MatrixView;