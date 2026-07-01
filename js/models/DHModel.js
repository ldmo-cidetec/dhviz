// models/DHModel.js
// Stores the DH parameter table as an array of rows.
// Each row represents one link/joint transformation ^{i-1}T_i
// using the Craig (modified DH) convention: alpha_{i-1}, a_{i-1}, d_i, theta_i
//
// Two notification channels:
//   subscribe      - fires on structural changes (add/remove row, jointType)
//   subscribeScene - fires on pose-only changes (slider moved), no table re-render needed

class DHModel {

    constructor() {
        this._rows          = [];
        this._listeners     = [];
        this._sceneListeners = [];
        this._nextId        = 1;
    }

    // Each row represents one link transformation: ^{i-1}T_i
    // Craig convention: alpha_{i-1}, a_{i-1}, d_i, theta_i
    // jointType : 'R' (revolute) | 'P' (prismatic) | 'F' (fixed)
    // actuated  : derived from jointType - true for R/P, false for F.
    //             Kept as a stored field so existing code reading row.actuated
    //             keeps working unchanged; always kept in sync by updateRow().
    // variable  : theta_i if R, d_i if P - controlled by slider
    _makeRow() {
        return {
            id:        this._nextId++,
            jointType: 'R',
            actuated:  true,
            alpha:     0,   // alpha_{i-1}  [rad]
            a:         0,   // a_{i-1}      [m]
            d:         0,   // d_i          [m]
            theta:     0,   // theta_i      [rad]
            q:         0,   // joint variable (set by slider, does not affect table offset)
        };
    }

    // Add a new link to the end of the table.
    // The new last row is forced to Fixed since the end-effector
    // frame cannot be actuated.
    addRow() {
        this._rows.push(this._makeRow());
        this._enforceLastRowFixed();
        this._notify();
    }

    // Remove the link with the given id.
    // The new last row (if any) is forced to Fixed.
    removeRow(id) {
        this._rows = this._rows.filter(r => r.id !== id);
        this._enforceLastRowFixed();
        this._notify();
    }

    // Ensures the last row in the table always has jointType 'F' (fixed),
    // since the end-effector frame cannot be actuated.
    _enforceLastRowFixed() {
        if (this._rows.length === 0) return;
        const last = this._rows[this._rows.length - 1];
        last.jointType = 'F';
        last.actuated  = false;
    }

    // Update a structural field (jointType) - triggers full table re-render.
    // When jointType changes, actuated is kept in sync automatically:
    // 'F' (fixed) is never actuated, 'R'/'P' always are.
    updateRow(id, field, value) {
        const row = this._rows.find(r => r.id === id);
        if (!row) return;
        row[field] = value;
        if (field === 'jointType') {
            row.actuated = value !== 'F';
        }
        this._notify();
    }

    // Update a numeric DH param - only triggers scene rebuild, not table re-render
    updateParam(id, field, value) {
        const row = this._rows.find(r => r.id === id);
        if (!row) return;
        row[field] = value;
        this._notifyScene();
    }

    // Update q (slider) - only triggers scene rebuild
    updateQ(id, value) {
        const row = this._rows.find(r => r.id === id);
        if (!row) return;
        row.q = value;
        this._notifyScene();
    }

    get rows()     { return this._rows; }
    get rowCount() { return this._rows.length; }

    // subscribe: structural change listeners (full re-render)
    // subscribeScene: pose-only change listeners (scene update only)
    // onStructureChange / onPoseChange are named aliases for clarity
    onStructureChange(fn) { this._listeners.push(fn); }
    onPoseChange(fn)      { this._sceneListeners.push(fn); }

    subscribe(fn)      { this.onStructureChange(fn); }
    subscribeScene(fn) { this.onPoseChange(fn); }

    _notify()      { this._listeners.forEach(fn => fn()); }
    _notifyScene() { this._sceneListeners.forEach(fn => fn()); }
}

export default DHModel;
