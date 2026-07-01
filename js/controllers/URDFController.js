// controllers/URDFController.js
// Lazy controller: only regenerates the URDF when the URDF tab is active.
// Also recomputes immediately if the tab is already open when a DH change fires.

class URDFController {

    constructor(dhModel, urdfModel, urdfView, dhView) {
        this.dhModel   = dhModel;
        this.urdfModel = urdfModel;
        this.urdfView  = urdfView;
        this.dhView    = dhView;

        this._dirty = true;

        // Mark dirty and recompute if the tab is already visible
        this.dhModel.subscribe(() => {
            this._dirty = true;
            if (this.dhView.isTabActive('urdf')) this._update();
        });

        // Recompute whenever the URDF tab becomes active
        this.dhView.onTabChange(tab => {
            if (tab === 'urdf') this._update();
        });
    }

    _update() {
        const rows = this.dhModel.rows;
        const urdf = this.urdfModel.generate(rows);
        this.urdfView.render(rows, urdf);
        this._dirty = false;
    }
}

export default URDFController;
