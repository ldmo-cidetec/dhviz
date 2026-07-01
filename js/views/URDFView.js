// views/URDFView.js
// Renders the URDF tab: XML code block with syntax highlighting,
// Copy to clipboard, and Download .urdf buttons.
// Copy and Download use event delegation on each panel.

class URDFView {

    constructor() {
        this._panelMd = document.getElementById('panel-urdf-md');
        this._panelSm = document.getElementById('panel-urdf-sm');

        // Copy button via event delegation
        [this._panelMd, this._panelSm].forEach(panel => {
            if (!panel) return;
            panel.addEventListener('click', e => {
                // Copy
                const copyBtn = e.target.closest('[data-urdf-copy]');
                if (copyBtn) {
                    const code = panel.querySelector('[data-urdf-code]');
                    if (!code) return;
                    const text = code.dataset.raw;
                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(text).then(() => this._flash(copyBtn));
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.cssText = 'position:fixed;opacity:0';
                        document.body.appendChild(ta);
                        ta.focus(); ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        this._flash(copyBtn);
                    }
                }

                // Download
                const dlBtn = e.target.closest('[data-urdf-download]');
                if (dlBtn) {
                    const code = panel.querySelector('[data-urdf-code]');
                    if (!code) return;
                    const blob = new Blob([code.dataset.raw], { type: 'application/xml' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href     = url;
                    a.download = 'robot.urdf';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            });
        });
    }

    _flash(btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 1500);
    }

    render(rows, urdf) {
        [this._panelMd, this._panelSm].forEach(panel => {
            if (!panel) return;
            panel.innerHTML = '';
            panel.appendChild(this._buildContent(rows, urdf));
        });
    }

    _buildContent(rows, urdf) {
        const wrap = document.createElement('div');
        wrap.className = 'space-y-4 pb-6';

        if (!rows || rows.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-gray-400 text-sm';
            p.textContent = 'Add links in DH Parameters to generate the URDF.';
            wrap.appendChild(p);
            return wrap;
        }

        // Header 
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2';

        const title = document.createElement('span');
        title.className = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';
        title.textContent = 'URDF';
        left.appendChild(title);

        const badge = document.createElement('span');
        badge.className = 'text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-400 bg-gray-50';
        badge.textContent = 'XML';
        left.appendChild(badge);

        header.appendChild(left);

        const btns = document.createElement('div');
        btns.className = 'flex items-center gap-2';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'text-xs text-gray-400 hover:text-black border border-gray-200 rounded px-2 py-0.5 transition';
        copyBtn.textContent = 'Copy';
        copyBtn.dataset.urdfCopy = true;
        btns.appendChild(copyBtn);

        const dlBtn = document.createElement('button');
        dlBtn.className = 'text-xs text-gray-400 hover:text-black border border-gray-200 rounded px-2 py-0.5 transition';
        dlBtn.textContent = 'Download .urdf';
        dlBtn.dataset.urdfDownload = true;
        btns.appendChild(dlBtn);

        header.appendChild(btns);
        wrap.appendChild(header);

        // Code block 
        const pre  = document.createElement('pre');
        const code = document.createElement('code');
        code.dataset.urdfCode = true;
        code.dataset.raw      = urdf;
        code.className        = 'language-xml';
        pre.className         = 'rounded-lg overflow-x-auto text-xs leading-relaxed border border-gray-200 p-3';
        pre.style.fontFamily  = 'ui-monospace, monospace';

        if (typeof hljs !== 'undefined') {
            code.innerHTML = hljs.highlight(urdf, { language: 'xml' }).value;
        } else {
            code.textContent = urdf;
        }

        pre.appendChild(code);
        wrap.appendChild(pre);

        return wrap;
    }
}

export default URDFView;