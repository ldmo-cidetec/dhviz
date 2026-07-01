// controllers/MatrixController.js
// Lazy controller: only recomputes transformation matrices when the Matrices
// tab is active. Also recomputes immediately if the tab is already open
// when a DH change fires (structural or pose).

class MatrixController {

    constructor(dhModel, matrixModel, matrixView, dhView) {
        this.dhModel     = dhModel;
        this.matrixModel = matrixModel;
        this.matrixView  = matrixView;
        this.dhView      = dhView;

        this._dirty = true;

        // Mark dirty and recompute if the tab is already visible
        this.dhModel.subscribe(() => {
            this._dirty = true;
            if (this.dhView.isTabActive('matrices')) this._update();
        });
        this.dhModel.subscribeScene(() => {
            this._dirty = true;
            if (this.dhView.isTabActive('matrices')) this._update();
        });

        // Recompute when switching to this tab
        this.dhView.onTabChange(tab => {
            if (tab === 'matrices' && this._dirty) this._update();
        });
    }

    _update() {
        const rows = this.dhModel.rows;
        const data = this.matrixModel.compute(rows);
        this.matrixView.render(rows, data);
        this._dirty = false;
    }
}

export default MatrixController;
