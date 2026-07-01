// models/PointsModel.js
// Manages reference points attached to specific DH frames.
// Each point has: id, frameIndex (0 = base, 1..n = link frames),
// local coordinates (x, y, z), and a label.
//
// Two notification channels matching DHModel:
//   subscribe      - full re-render (add/remove/label/frameIndex changes)
//   subscribeScene - scene + results only (coordinate changes while typing on mobile)

class PointsModel {

    constructor() {
        this._points        = [];
        this._listeners     = [];
        this._sceneListeners = [];
        this._nextId        = 1;
    }

    _makePoint(frameIndex) {
        return {
            id:         this._nextId++,
            frameIndex: frameIndex,  // 0 = base frame, i = frame {i}
            x:          0,
            y:          0,
            z:          0,
            label:      `P${this._nextId - 1}`,
        };
    }

    addPoint(frameIndex = 0) {
        this._points.push(this._makePoint(frameIndex));
        this._notify();
    }

    removePoint(id) {
        this._points = this._points.filter(p => p.id !== id);
        this._notify();
    }

    // Update any field - triggers full re-render
    updatePoint(id, field, value) {
        const point = this._points.find(p => p.id === id);
        if (!point) return;
        point[field] = value;
        this._notify();
    }

    // Update x/y/z coordinates silently - only notifies scene, not config UI
    // Keeps the mobile keyboard open while the user is typing
    updateCoord(id, field, value) {
        const point = this._points.find(p => p.id === id);
        if (!point) return;
        point[field] = value;
        this._notifyScene();
    }

    subscribe(fn)      { this._listeners.push(fn); }
    subscribeScene(fn) { this._sceneListeners.push(fn); }
    _notify()          { this._listeners.forEach(fn => fn()); }
    _notifyScene()     { this._sceneListeners.forEach(fn => fn()); }

    // Clamp point frame indices when robot links are removed
    clampFrames(maxFrame) {
        let changed = false;
        this._points.forEach(p => {
            if (p.frameIndex > maxFrame) {
                p.frameIndex = maxFrame;
                changed = true;
            }
        });
        if (changed) this._notify();
    }

    get points()  { return this._points; }
}

export default PointsModel;
