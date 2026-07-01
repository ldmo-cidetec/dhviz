// views/JacobianView.js
// Renders the Jacobian tab: the 6xn geometric Jacobian matrix,
// the velocity equation, and the Yoshikawa manipulability indicator.
// Renders directly into each panel (no cloneNode).

const tex = (str, display = false) => {
    if (typeof katex === 'undefined') return str;
    return katex.renderToString(str, { throwOnError: false, displayMode: display });
};

const bmatrix = M => {
    const rows = M.map(r => r.join(' & ')).join(' \\\\ ');
    return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
};

const badge = (label, style) => {
    const s = document.createElement('span');
    s.className = `text-xs px-2 py-0.5 rounded-full border ${style}`;
    s.textContent = label;
    return s;
};

const sectionHeader = (label, badgeEl) => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    const title = document.createElement('span');
    title.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
    title.textContent = label;
    div.appendChild(title);
    if (badgeEl) div.appendChild(badgeEl);
    return div;
};

class JacobianView {

    constructor() {
        this._panelMd = document.getElementById('panel-jacobian-md');
        this._panelSm = document.getElementById('panel-jacobian-sm');
    }

    render(rows, data) {
        const content = this._buildContent(rows, data);
        [this._panelMd, this._panelSm].forEach(panel => {
            if (!panel) return;
            panel.innerHTML = '';
            panel.appendChild(content.cloneNode(true));
        });
    }

    _buildContent(rows, data) {
        const wrap = document.createElement('div');
        wrap.className = 'space-y-5 pb-6';
        wrap.style.fontSize = '0.78rem';

        if (!rows || rows.length === 0 || !data) {
            const empty = document.createElement('p');
            empty.className = 'text-gray-400 text-sm';
            empty.textContent = 'Add links in DH Parameters to compute the Jacobian.';
            wrap.appendChild(empty);
            return wrap;
        }

        const { J_num_latex, manipulability, n } = data;

        // Numeric Jacobian 
        const numSection = document.createElement('div');
        numSection.className = 'space-y-2';
        numSection.appendChild(sectionHeader(
            'Geometric Jacobian',
            badge('Numeric - current q', 'border-gray-200 text-gray-500 bg-gray-50')
        ));

        // Velocity relation equation
        const velEq = document.createElement('p');
        velEq.className = 'text-xs text-gray-400';
        velEq.innerHTML = tex(
            `\\begin{bmatrix} v \\\\ \\omega \\end{bmatrix} = J(q)\\,\\dot{q}, \\quad q = [q_1 \\; \\cdots \\; q_{${n}}]^T, \\quad \\dot{q} = [\\dot{q}_1 \\; \\cdots \\; \\dot{q}_{${n}}]^T`
        );
        numSection.appendChild(velEq);

        // Definition
        const def = document.createElement('p');
        def.className = 'text-xs text-gray-400';
        def.innerHTML = tex(
            `J(q) = \\begin{bmatrix} J_v \\\\ J_\\omega \\end{bmatrix} \\in \\mathbb{R}^{6 \\times ${n}}`
        );
        numSection.appendChild(def);

        const numMat = document.createElement('div');
        numMat.className = 'overflow-x-auto';
        numMat.innerHTML = tex(bmatrix(J_num_latex), true);
        numSection.appendChild(numMat);
        wrap.appendChild(numSection);

        // Manipulability indicator 
        if (manipulability !== null) {
            const singular = manipulability < 1e-4;
            const singDiv  = document.createElement('div');
            singDiv.className = `flex items-center gap-3 px-3 py-2 rounded-lg border ${
                singular
                    ? 'border-red-200 bg-red-50'
                    : 'border-green-200 bg-green-50'
            }`;

            const dot = document.createElement('div');
            dot.className = `w-2 h-2 rounded-full flex-shrink-0 ${singular ? 'bg-red-500' : 'bg-green-500'}`;
            singDiv.appendChild(dot);

            const wLabel = document.createElement('span');
            wLabel.className = 'text-xs text-gray-600';
            wLabel.innerHTML = tex(`w = \\sqrt{\\det(J_v J_v^T)} = ${parseFloat(manipulability.toFixed(6))}`);
            singDiv.appendChild(wLabel);

            const status = document.createElement('span');
            status.className = `text-xs font-semibold ml-auto ${singular ? 'text-red-500' : 'text-green-600'}`;
            status.textContent = singular ? 'Singular' : 'Non-singular';
            singDiv.appendChild(status);

            wrap.appendChild(singDiv);
        }

        return wrap;
    }
}

export default JacobianView;