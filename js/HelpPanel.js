// HelpPanel.js
// Manages the help panel: open/close animation, topic expand/collapse,
// back button to return to the full topic list, and on-demand KaTeX rendering.
// KaTeX is rendered the first time the panel opens (not on page load)
// to avoid rendering hidden elements before they are visible.

class HelpPanel {

    constructor() {
        this._panel   = document.getElementById('help-panel');
        this._openBtn = document.getElementById('help-open-button');

        if (!this._panel || !this._openBtn) return;

        const panel   = this._panel;
        const backBtn = document.getElementById('help-back-button');
        const topics  = Array.from(panel.querySelectorAll('.help-topic'));
        const headers = Array.from(panel.querySelectorAll('.help-topic-header'));

        // Open / close panel
        this._openBtn.addEventListener('click', () => {
            panel.style.display = 'block';
            panel.style.animation = 'slideIn 0.25s ease-out';
            this._renderMath();
        });

        document.getElementById('help-close-button')
            ?.addEventListener('click', () => {
                panel.style.display = 'none';
            });

        // Initialize all topic contents as hidden via style.display instead of
        // the Tailwind 'hidden' class, so toggling with style.display later
        // is not blocked by Tailwind's display:none !important rule
        topics.forEach(t => {
            const c = t.querySelector('.help-topic-content');
            if (c) { c.classList.remove('hidden'); c.style.display = 'none'; }
        });

        // Expand / collapse a topic when its header is clicked
        headers.forEach((header, idx) => {
            header.addEventListener('click', () => {
                const content = topics[idx].querySelector('.help-topic-content');
                backBtn?.classList.remove('hidden');

                // Collapse all other topics
                topics.forEach((t, i) => {
                    if (i !== idx) {
                        t.classList.add('hidden');
                        const c = t.querySelector('.help-topic-content');
                        if (c) c.style.display = 'none';
                    }
                });

                // Toggle this topic's content
                const isVisible = content.style.display === 'block';
                content.style.display = isVisible ? 'none' : 'block';
            });
        });

        // Back button: restore all topics and hide their contents
        backBtn?.addEventListener('click', () => {
            backBtn.classList.add('hidden');
            topics.forEach(t => {
                t.classList.remove('hidden');
                const c = t.querySelector('.help-topic-content');
                if (c) c.style.display = 'none';
            });
        });
    }

    // Render all .math-inline and .math-block spans with KaTeX.
    // The katex-rendered class prevents re-rendering on subsequent opens.
    _renderMath() {
        if (typeof katex === 'undefined') return;
        this._panel.querySelectorAll('.math-inline:not(.katex-rendered)').forEach(el => {
            try {
                katex.render(el.textContent, el, { throwOnError: false, displayMode: false });
                el.classList.add('katex-rendered');
            } catch(e) {}
        });
        this._panel.querySelectorAll('.math-block:not(.katex-rendered)').forEach(el => {
            try {
                katex.render(el.textContent, el, { throwOnError: false, displayMode: true });
                el.classList.add('katex-rendered');
            } catch(e) {}
        });
    }
}

export default HelpPanel;
