// TabManager.js
// Handles tab switching for both desktop (md) and mobile (sm) layouts.
// When the user clicks a tab button, it shows the corresponding panel,
// updates the active button style, and emits 'tabChange' on the EventBus
// so lazy controllers know when to recompute their content.
// Tab names: 'config', 'matrices', 'jacobian', 'export', 'urdf'

class TabManager {

    constructor(bus) {
        this._bus       = bus;
        this._activeTab = 'config'; // starts on the DH Parameters tab

        // Each layout entry pairs tab button IDs with panel IDs and tab names
        const layouts = [
            {
                tabs:   ['tab-config-md',   'tab-matrices-md',   'tab-jacobian-md',   'tab-export-md',   'tab-urdf-md'],
                panels: ['panel-config-md', 'panel-matrices-md', 'panel-jacobian-md', 'panel-export-md', 'panel-urdf-md'],
                names:  ['config',          'matrices',          'jacobian',          'export',          'urdf'],
            },
            {
                tabs:   ['tab-config-sm',   'tab-matrices-sm',   'tab-jacobian-sm',   'tab-export-sm',   'tab-urdf-sm'],
                panels: ['panel-config-sm', 'panel-matrices-sm', 'panel-jacobian-sm', 'panel-export-sm', 'panel-urdf-sm'],
                names:  ['config',          'matrices',          'jacobian',          'export',          'urdf'],
            },
        ];

        layouts.forEach(({ tabs, panels, names }) => {
            tabs.forEach((tabId, activeIdx) => {
                const btn = document.getElementById(tabId);
                if (!btn) return;
                btn.addEventListener('click', () => {
                    // Update button styles and panel visibility for this layout
                    tabs.forEach((id, i) => {
                        const b = document.getElementById(id);
                        const p = document.getElementById(panels[i]);
                        if (!b || !p) return;
                        const isActive = i === activeIdx;
                        b.classList.toggle('border-black',       isActive);
                        b.classList.toggle('text-black',         isActive);
                        b.classList.toggle('border-transparent', !isActive);
                        b.classList.toggle('text-gray-400',      !isActive);
                        if (isActive) {
                            p.classList.remove('hidden');
                            p.style.display = '';
                        } else {
                            p.classList.add('hidden');
                            p.style.display = 'none';
                        }
                    });
                    this._activeTab = names[activeIdx];
                    this._bus.emit('tabChange', this._activeTab);
                });
            });
        });
    }

    // Returns true if the given tab name is currently active
    isActive(name) { return this._activeTab === name; }
}

export default TabManager;
