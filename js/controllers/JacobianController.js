// controllers/JacobianController.js
// Lazy controller: only recomputes the Jacobian when the Jacobian tab is active.
// Also recomputes immediately if the tab is already open when a DH change fires.

class JacobianController {

    constructor(dhModel, jacobianModel, jacobianView, dhView) {
        this.dhModel       = dhModel;
        this.jacobianModel = jacobianModel;
        this.jacobianView  = jacobianView;
        this.dhView        = dhView;

        this._dirty = true;

        // Mark dirty and recompute if the tab is already visible
        this.dhModel.subscribe(() => {
            this._dirty = true;
            if (this.dhView.isTabActive('jacobian')) this._update();
        });
        this.dhModel.subscribeScene(() => {
            this._dirty = true;
            if (this.dhView.isTabActive('jacobian')) this._update();
        });

        // Recompute when switching to this tab
        this.dhView.onTabChange(tab => {
            if (tab === 'jacobian' && this._dirty) this._update();
        });
    }

    _update() {
        const rows = this.dhModel.rows;
        const data = this.jacobianModel.compute(rows);
        this.jacobianView.render(rows, data);
        this._dirty = false;
    }
}

export default JacobianController;
