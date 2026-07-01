// controllers/DHController.js
// Handles all user interactions on the DH Parameters tab:
//   - Add / remove link buttons
//   - Joint type toggle (R/P) and actuated checkbox
//   - Numeric parameter inputs (alpha, a, d, theta)
//   - Joint variable sliders
//
// Structural changes (jointType, actuated) trigger a full table re-render
// via model.subscribe. Numeric changes only update the scene via
// model.updateParam / model.updateQ, keeping active inputs intact on mobile.

// Fields whose change requires a full table re-render
const STRUCTURAL_FIELDS = new Set(['jointType']);

// Fields whose change only needs a scene update (no table re-render)
const PARAM_FIELDS = new Set(['alpha', 'a', 'd', 'theta']);

class DHController {

    constructor(model, view) {
        this.model = model;
        this.view  = view;

        this.model.subscribe(() => this.view.render(this.model.rows));
        this._addEventListeners();
        this.view.render(this.model.rows);
    }

    _addEventListeners() {

        // Click: add row, remove row, joint type toggle
        document.addEventListener('click', e => {

            if (e.target.closest('[data-add-row]')) {
                this.model.addRow();
                return;
            }

            const removeBtn = e.target.closest('[data-remove-row]');
            if (removeBtn) {
                this.model.removeRow(Number(removeBtn.dataset.removeRow));
                return;
            }

            const jointBtn = e.target.closest('[data-joint-btn]');
            if (jointBtn) {
                this.model.updateRow(
                    Number(jointBtn.dataset.rowId),
                    'jointType',
                    jointBtn.dataset.jointBtn
                );
            }
        });

        // Input: numeric param inputs and joint variable sliders
        // Uses 'input' event so the scene updates continuously while typing or dragging.
        // updateParam / updateQ only notify the scene, never re-render the table.
        document.addEventListener('input', e => {
            const el = e.target;

            if (el.matches('input[type="number"][data-field][data-row-id]')) {
                const field = el.dataset.field;
                if (!PARAM_FIELDS.has(field)) return;
                this.model.updateParam(
                    Number(el.dataset.rowId),
                    field,
                    parseFloat(el.value) || 0
                );
                return;
            }

            if (el.matches('input[type="range"][data-slider-row-id]')) {
                this.model.updateQ(
                    Number(el.dataset.sliderRowId),
                    parseFloat(el.value) || 0
                );
            }

            // Exact value input: update model directly without dispatching to slider
            // This avoids re-rendering the sliders while the input is active
            if (el.matches('input[type="number"][data-exact-row-id]')) {
                this.model.updateQ(
                    Number(el.dataset.exactRowId),
                    parseFloat(el.value) || 0
                );
            }
        });

    }
}

export default DHController;