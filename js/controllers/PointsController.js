// controllers/PointsController.js
// Manages reference point interactions: add/remove buttons, label and frame
// selects, and coordinate number inputs.
//
// Two update paths are used to avoid closing the mobile keyboard while typing:
//   change event - full re-render via pointsModel.updatePoint (label, frameIndex)
//   input event  - silent update: writes directly to the point object and only
//                  refreshes the 3D scene and results panel, not the config form

class PointsController {

    constructor(pointsModel, pointsView, dhModel, dhView, sceneModel, sceneView) {
        this.pointsModel = pointsModel;
        this.pointsView  = pointsView;
        this.dhModel     = dhModel;
        this.dhView      = dhView;
        this.sceneModel  = sceneModel;
        this.sceneView   = sceneView;

        // Inject the points config section into the containers provided by DHView
        dhView.getPointsContainers().forEach(c => pointsView.mountConfigSection(c));

        // Full re-render when points are added, removed, or structurally changed
        this.pointsModel.subscribe(() => this._update());

        // When the robot changes, clamp point frame indices and re-render
        this.dhModel.subscribe(() => {
            this.pointsModel.clampFrames(this.dhModel.rowCount);
            this._update();
        });
        // Pose-only change: just refresh results and scene (sliders)
        this.dhModel.subscribeScene(() => this._update());

        this._initEvents();
        this._update();
    }

    _update() {
        const points    = this.pointsModel.points;
        const numFrames = this.dhModel.rowCount;
        const results   = this._computeResults(points);

        this.pointsView.renderConfig(points, numFrames);
        this.pointsView.renderResults(points, results);
        this.sceneModel.updatePoints(points);
        if (this.sceneView) this.sceneView.requestRender();
    }

    // Compute the position of each point in the base frame {0}
    // using the accumulated transform T stored in the scene model.
    _computeResults(points) {
        return points.map(point => {
            const frames = this.sceneModel.getFrames();
            if (!frames || point.frameIndex >= frames.length) return null;

            const T = frames[point.frameIndex];
            // p_world = T * [x, y, z, 1]^T
            const x = point.x, y = point.y, z = point.z;
            return [
                T[0][0]*x + T[0][1]*y + T[0][2]*z + T[0][3],
                T[1][0]*x + T[1][1]*y + T[1][2]*z + T[1][3],
                T[2][0]*x + T[2][1]*y + T[2][2]*z + T[2][3],
            ];
        });
    }

    _initEvents() {
        // Add / remove point buttons
        document.addEventListener('click', e => {
            if (e.target.closest('[data-add-point]')) {
                this.pointsModel.addPoint(0);
            }
            const removeBtn = e.target.closest('[data-remove-point]');
            if (removeBtn) {
                this.pointsModel.removePoint(Number(removeBtn.dataset.removePoint));
            }
        });

        // Label and frame select changes - full re-render
        document.addEventListener('change', e => {
            const el = e.target.closest('[data-field][data-point-id]');
            if (!el) return;
            const id    = Number(el.dataset.pointId);
            const field = el.dataset.field;
            const value = field === 'label'
                ? el.value
                : (field === 'frameIndex' ? Number(el.value) : parseFloat(el.value) || 0);
            this.pointsModel.updatePoint(id, field, value);
        });

        // Coordinate inputs while typing - silent update to keep keyboard open on mobile
        document.addEventListener('input', e => {
            const el = e.target.closest('input[type="number"][data-field][data-point-id]');
            if (!el) return;
            const id    = Number(el.dataset.pointId);
            const field = el.dataset.field;
            const value = parseFloat(el.value) || 0;

            // Write directly to the point object without triggering a config re-render
            const point = this.pointsModel.points.find(p => p.id === id);
            if (!point) return;
            point[field] = value;

            // Refresh only scene and results
            const results = this._computeResults(this.pointsModel.points);
            this.pointsView.renderResults(this.pointsModel.points, results);
            this.sceneModel.updatePoints(this.pointsModel.points);
            if (this.sceneView) this.sceneView.requestRender();
        });
    }
}

export default PointsController;
