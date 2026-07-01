// controllers/SceneController.js
// Rebuilds the 3D scene whenever the robot definition or joint values change.
// Also listens to the scale slider inputs to resize links, joints, axes, and labels.
// Calls sceneView.requestRender() after every update so the render loop only
// draws frames when something has actually changed (demand-based rendering).

class SceneController {

    constructor(dhModel, sceneModel, sceneView) {
        this.dhModel    = dhModel;
        this.sceneModel = sceneModel;
        this.sceneView  = sceneView;

        const update = () => {
            this.sceneModel.update(this.dhModel.rows);
            this.sceneView.requestRender();
        };

        // Rebuild on structural changes (links added/removed, joint type, actuated)
        this.dhModel.subscribe(update);
        // Rebuild on pose changes (slider moved)
        this.dhModel.subscribeScene(update);

        // Scale sliders (links, joints, axes, text) in the scene overlay panel
        document.addEventListener('input', e => {
            const slider = e.target.closest('input[type="range"][data-scale-key]');
            if (!slider) return;
            this.sceneModel.scale[slider.dataset.scaleKey] = parseFloat(slider.value);
            update();
        });

        update(); // initial build
    }
}

export default SceneController;
