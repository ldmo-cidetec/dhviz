// controllers/ExportController.js
// Lazy controller: only regenerates export code when the Export tab is active.
// Marks itself dirty on any DH or points change, then recomputes on the
// next tab activation to avoid unnecessary work while the tab is hidden.

class ExportController {

    constructor(dhModel, exportModel, exportView, dhView, matrixModel, pointsModel) {
        this.dhModel      = dhModel;
        this.exportModel  = exportModel;
        this.exportView   = exportView;
        this.dhView       = dhView;
        this.matrixModel  = matrixModel;
        this.pointsModel  = pointsModel;

        this._dirty = true;

        // Mark dirty on any DH or points change
        this.dhModel.subscribe(()      => { this._dirty = true; });
        this.dhModel.subscribeScene(() => { this._dirty = true; });
        if (this.pointsModel) {
            this.pointsModel.subscribe(() => { this._dirty = true; });
        }

        // Recompute when the Export tab becomes active
        this.dhView.onTabChange(tab => {
            if (tab === 'export' && this._dirty) this._update();
        });
    }

    _update() {
        const rows       = this.dhModel.rows;
        const points     = this.pointsModel ? this.pointsModel.points : [];
        const matrixData = this.matrixModel ? this.matrixModel.compute(rows) : null;
        const code       = this.exportModel.generate(rows, points, matrixData);
        this.exportView.render(rows, code);
        this._dirty = false;
    }
}

export default ExportController;
