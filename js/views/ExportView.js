// views/ExportView.js
// Renders the Export tab with Python and MATLAB code blocks.
// Each language has a Numeric/Symbolic toggle and a Copy button.
// Uses highlight.js for syntax highlighting.
// Copy and toggle buttons use event delegation on each panel.

class ExportView {

    constructor() {
        this._panelMd = document.getElementById('panel-export-md');
        this._panelSm = document.getElementById('panel-export-sm');

        // Track active mode per language: 'numeric' | 'symbolic'
        this._mode = { python: 'numeric', matlab: 'numeric' };

        // Event delegation for toggle and copy buttons
        [this._panelMd, this._panelSm].forEach(panel => {
            if (!panel) return;

            // Toggle Numeric / Symbolic
            panel.addEventListener('click', e => {
                const btn = e.target.closest('[data-mode-btn]');
                if (btn) {
                    const lang = btn.dataset.lang;
                    const mode = btn.dataset.modeBtn;
                    this._mode[lang] = mode;
                    this._applyMode(panel, lang, mode);
                }
            });

            // Copy
            panel.addEventListener('click', e => {
                const btn = e.target.closest('[data-copy-lang]');
                if (!btn) return;
                const lang = btn.dataset.copyLang;
                const codeEl = panel.querySelector(`code[data-lang="${lang}"][data-mode="${this._mode[lang]}"]`);
                if (!codeEl) return;
                const text = codeEl.dataset.raw;
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(() => this._flashCopy(btn));
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
                    document.body.appendChild(ta);
                    ta.focus(); ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    this._flashCopy(btn);
                }
            });
        });
    }

    _flashCopy(btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 1500);
    }

    _applyMode(panel, lang, mode) {
        // Show/hide code blocks
        panel.querySelectorAll(`code[data-lang="${lang}"]`).forEach(el => {
            el.closest('pre').style.display = el.dataset.mode === mode ? '' : 'none';
        });
        // Update toggle buttons
        panel.querySelectorAll(`[data-mode-btn][data-lang="${lang}"]`).forEach(btn => {
            const active = btn.dataset.modeBtn === mode;
            btn.classList.toggle('bg-black',    active);
            btn.classList.toggle('text-white',  active);
            btn.classList.toggle('bg-white',    !active);
            btn.classList.toggle('text-gray-400', !active);
        });
    }

    render(rows, code) {
        [this._panelMd, this._panelSm].forEach(panel => {
            if (!panel) return;
            panel.innerHTML = '';
            panel.appendChild(this._buildContent(rows, code));
        });
    }

    _buildContent(rows, code) {
        const wrap = document.createElement('div');
        wrap.className = 'space-y-2 pb-6';

        if (!rows || rows.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-gray-400 text-sm';
            p.textContent = 'Add links in DH Parameters to generate code.';
            wrap.appendChild(p);
            return wrap;
        }

        // Each language is wrapped in a collapsible accordion.
        // Both collapsed by default.
        wrap.appendChild(this._accordion('Python', 'python', 'python',
            code.pythonNumeric, code.pythonSymbolic, false));
        wrap.appendChild(this._accordion('MATLAB', 'matlab', 'matlab',
            code.matlabNumeric, code.matlabSymbolic, false));

        return wrap;
    }

    // Wraps a language block in a bordered accordion with a clickable header
    _accordion(label, lang, hljsLang, numericCode, symbolicCode, openByDefault) {
        const outer = document.createElement('div');
        outer.className = 'border border-gray-200 rounded-lg overflow-hidden';

        // Accordion header row: language name + chevron
        const headerRow = document.createElement('button');
        headerRow.className = `w-full flex items-center justify-between px-3 py-2
            bg-gray-50 hover:bg-gray-100 transition focus:outline-none`;

        const headerLabel = document.createElement('span');
        headerLabel.className = 'text-xs font-semibold text-gray-600 uppercase tracking-wide';
        headerLabel.textContent = label;
        headerRow.appendChild(headerLabel);

        const chevron = document.createElement('span');
        chevron.className = 'text-gray-400 transition-transform duration-200';
        chevron.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"/>
        </svg>`;
        headerRow.appendChild(chevron);

        outer.appendChild(headerRow);

        // Accordion body: the existing language block (hidden/shown)
        const body = document.createElement('div');
        body.className = 'px-3 pt-3';
        body.style.display = openByDefault ? 'block' : 'none';
        if (!openByDefault) chevron.style.transform = 'rotate(-90deg)';

        body.appendChild(this._langBlock(label, lang, hljsLang, numericCode, symbolicCode));
        outer.appendChild(body);

        // Toggle open/close on header click
        headerRow.addEventListener('click', () => {
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            chevron.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
        });

        return outer;
    }

    _langBlock(label, lang, hljsLang, numericCode, symbolicCode) {
        const section = document.createElement('div');
        section.className = 'space-y-2 pb-3';

        // Header: only the Numeric/Symbolic toggle and Copy button (label is in accordion header)
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2';

        // N / S toggle (same style as R / P in DH table)
        const toggle = document.createElement('div');
        toggle.className = 'inline-flex rounded overflow-hidden border border-gray-200';

        ['numeric', 'symbolic'].forEach((mode, idx) => {
            const btn = document.createElement('button');
            btn.textContent       = mode === 'numeric' ? 'Numeric' : 'Symbolic';
            btn.dataset.modeBtn   = mode;
            btn.dataset.lang      = lang;
            const isActive = (idx === 0); // numeric active by default
            btn.className = `px-2 py-0.5 text-xs font-semibold focus:outline-none transition
                ${isActive ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-gray-700'}`;
            toggle.appendChild(btn);
        });
        left.appendChild(toggle);
        header.appendChild(left);

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'text-xs text-gray-400 hover:text-black border border-gray-200 rounded px-2 py-0.5 transition';
        copyBtn.textContent = 'Copy';
        copyBtn.dataset.copyLang = lang;
        header.appendChild(copyBtn);

        section.appendChild(header);

        // Code blocks 
        [
            { mode: 'numeric',  src: numericCode  },
            { mode: 'symbolic', src: symbolicCode },
        ].forEach(({ mode, src }) => {
            const pre  = document.createElement('pre');
            const code = document.createElement('code');
            code.dataset.lang = lang;
            code.dataset.mode = mode;
            code.dataset.raw  = src;
            code.className    = `language-${hljsLang}`;
            pre.className     = 'rounded-lg overflow-x-auto text-xs leading-relaxed border border-gray-200 p-3';
            pre.style.fontFamily = 'ui-monospace, monospace';
            pre.style.display = mode === 'numeric' ? '' : 'none'; // numeric visible by default

            if (typeof hljs !== 'undefined') {
                code.innerHTML = hljs.highlight(src, { language: hljsLang }).value;
            } else {
                code.textContent = src;
            }

            pre.appendChild(code);
            section.appendChild(pre);
        });

        return section;
    }
}

export default ExportView;