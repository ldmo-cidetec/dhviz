// models/SceneModel.js
// Builds and manages the Three.js scene for the robot visualizer.
// Creates all 3D geometry (link cylinders, joint markers, coordinate frame
// axes, reference point spheres) from DH row data and current joint values.
//
// Uses Z-up convention to match the standard DH frame orientation:
//   camera.up = [0, 0, 1], grid is rotated 90 degrees.
//
// Disposes GPU resources (geometries, materials, textures) before every
// rebuild to prevent VRAM leaks during extended use.

import * as THREE from 'three';

class SceneModel {

    constructor() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf3f4f6);

        // Camera - Z up
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 100);
        this.camera.position.set(1.0, -1.0, 0.8);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(2, 4, 3);
        this.scene.add(dirLight);

        // Robot geometry group - rebuilt on every DH change
        this._robotGroup = new THREE.Group();
        this.scene.add(this._robotGroup);

        // Visualization scales (controlled by the Scale sliders in the UI)
        this.scale = { link: 1, joint: 1, axes: 1, text: 1 };

        // Reference points group - rebuilt when points change
        this._pointsGroup = new THREE.Group();
        this.scene.add(this._pointsGroup);
        this._frames  = [];
        this._points  = [];

        // Base axes group - shows frame {0} at the world origin
        this._baseAxesGroup = new THREE.Group();
        this.scene.add(this._baseAxesGroup);

        // Ground grid - XY plane (Z up), rotated 90 degrees from default
        const grid = new THREE.GridHelper(2, 20, 0xcccccc, 0xe5e7eb);
        grid.rotation.x = Math.PI / 2;
        this.scene.add(grid);
    }

    // Craig DH 4x4 matrix as THREE.Matrix4.
    // Used to accumulate frame transforms when rebuilding the scene.
    _dhMatrix(alpha, a, d, theta) {
        const ca = Math.cos(alpha), sa = Math.sin(alpha);
        const ct = Math.cos(theta), st = Math.sin(theta);

        // THREE.Matrix4.set takes row-major arguments
        const m = new THREE.Matrix4();
        m.set(
             ct,  -st,    0,   a,
             st*ca, ct*ca, -sa, -sa*d,
             st*sa, ct*sa,  ca,  ca*d,
             0,    0,     0,   1
        );
        return m;
    }

    // Release all GPU memory held by a group before rebuilding it.
    // Must be called before group.clear() to prevent VRAM leaks.
    _disposeGroup(group) {
        group.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        });
        group.clear();
    }

    // Rebuild all robot geometry from the current DH rows and joint values.
    // Called on every structural change and every slider move.
    update(rows) {
        this._disposeGroup(this._robotGroup);
        this._disposeGroup(this._baseAxesGroup);

        // Base frame {0} is always shown at the world origin
        this._baseAxesGroup.add(this._makeAxes(0.08 * this.scale.axes, null, 0, this.scale.text));

        // Always cache at least frame {0} = identity
        this._frames = [[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]];

        if (rows.length === 0) {
            this._rebuildPoints();
            return;
        }

        // Accumulate transforms and store each frame's full 4x4 matrix
        const frames = [new THREE.Matrix4()]; // frame {0} = identity
        let accumulated = new THREE.Matrix4();

        rows.forEach(row => {
            const theta = row.jointType === 'R' ? row.theta + (row.actuated ? row.q : 0) : row.theta;
            const d     = row.jointType === 'P' ? row.d     + (row.actuated ? row.q : 0) : row.d;

            const local = this._dhMatrix(row.alpha, row.a, d, theta);
            accumulated = accumulated.clone().multiply(local);
            frames.push(accumulated.clone());
        });

        // Cache frames as plain 4x4 row-major arrays for PointsController
        this._frames = frames.map(m => {
            const e = m.elements; // THREE stores column-major
            return [
                [e[0], e[4], e[8],  e[12]],
                [e[1], e[5], e[9],  e[13]],
                [e[2], e[6], e[10], e[14]],
                [e[3], e[7], e[11], e[15]],
            ];
        });

        // Build geometry for each link
        rows.forEach((row, i) => {
            const framePrev = frames[i];
            const frameCurr = frames[i + 1];

            const from = new THREE.Vector3().setFromMatrixPosition(framePrev);
            const to   = new THREE.Vector3().setFromMatrixPosition(frameCurr);

            // L-shaped elbow: the DH link has two physical segments.
            // Segment 1 (a_{i-1}): along X of framePrev, length = row.a
            // Segment 2 (d_i): along Z after the alpha rotation, length = d
            // The elbow point is where segment 1 ends and segment 2 begins -
            // i.e. framePrev translated by (a, 0, 0) along its own X axis,
            // then rotated by alpha (but not yet translated by d or rotated by theta).
            const xAxisPrev = new THREE.Vector3(1, 0, 0).transformDirection(framePrev);
            const elbow = from.clone().addScaledVector(xAxisPrev, row.a);

            // Segment 1: from -> elbow (along X)
            this._robotGroup.add(this._makeLinkCylinder(from, elbow, this.scale.link));
            // Segment 2: elbow -> to (along Z, after alpha rotation)
            this._robotGroup.add(this._makeLinkCylinder(elbow, to, this.scale.link));
            // Small sphere at the elbow to smooth the joint between segments
            this._robotGroup.add(this._makeElbowJoint(elbow, this.scale.link));

            // Joint marker at the destination frame origin
            const zAxis = new THREE.Vector3(0, 0, 1)
                .transformDirection(frameCurr);

            if (!row.actuated) {
                this._robotGroup.add(this._makePassiveJoint(to, this.scale.joint));
            } else if (row.jointType === 'R') {
                this._robotGroup.add(this._makeRevoluteJoint(to, zAxis, this.scale.joint));
            } else {
                this._robotGroup.add(this._makePrismaticJoint(to, zAxis, this.scale.joint));
            }

            // Coordinate frame axes at the destination
            this._robotGroup.add(this._makeAxes(0.05 * this.scale.axes, frameCurr, i + 1, this.scale.text));
        });

        this._rebuildPoints();
    }

    // Returns the cached frame transforms as plain 4x4 arrays.
    // Used by PointsController to compute reference point world positions.
    getFrames() { return this._frames; }

    updatePoints(points) {
        this._points = points;
        this._rebuildPoints();
    }

    // Rebuild reference point red spheres at their world positions
    _rebuildPoints() {
        this._disposeGroup(this._pointsGroup);
        if (!this._points || this._frames.length === 0) return;

        this._points.forEach(point => {
            const T = this._frames[point.frameIndex];
            if (!T) return;

            // Transform local point coordinates to world frame
            const wx = T[0][0]*point.x + T[0][1]*point.y + T[0][2]*point.z + T[0][3];
            const wy = T[1][0]*point.x + T[1][1]*point.y + T[1][2]*point.z + T[1][3];
            const wz = T[2][0]*point.x + T[2][1]*point.y + T[2][2]*point.z + T[2][3];

            const geo  = new THREE.SphereGeometry(0.018 * this.scale.joint, 10, 10);
            const mat  = new THREE.MeshLambertMaterial({ color: 0xef4444 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(wx, wy, wz);
            this._pointsGroup.add(mesh);
        });
    }

    // Cylinder between two 3D points representing a link
    _makeLinkCylinder(from, to, scale = 1) {
        const dir    = new THREE.Vector3().subVectors(to, from);
        const length = dir.length();
        if (length < 1e-6) return new THREE.Object3D();
        const geo  = new THREE.CylinderGeometry(0.012 * scale, 0.012 * scale, length, 8);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x374151 });
        const mesh = new THREE.Mesh(geo, mat);
        const mid  = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        return mesh;
    }

    // Small sphere at the elbow point between the two link segments.
    // Uses the same radius and color as the link cylinder for a smooth joint.
    _makeElbowJoint(position, scale = 1) {
        const geo  = new THREE.SphereGeometry(0.012 * scale, 8, 8);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x374151 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        return mesh;
    }

    // Blue cylinder representing a revolute joint, aligned with its Z axis
    _makeRevoluteJoint(position, zAxis, scale = 1) {
        const geo  = new THREE.CylinderGeometry(0.030 * scale, 0.030 * scale, 0.040 * scale, 12);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x2563eb });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), zAxis.clone().normalize());
        return mesh;
    }

    // Amber box representing a prismatic joint, aligned with its Z axis
    _makePrismaticJoint(position, zAxis, scale = 1) {
        const geo  = new THREE.BoxGeometry(0.045 * scale, 0.045 * scale, 0.045 * scale);
        const mat  = new THREE.MeshLambertMaterial({ color: 0xd97706 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), zAxis.clone().normalize());
        return mesh;
    }

    // Green sphere representing a passive (non-actuated) joint
    _makePassiveJoint(position, scale = 1) {
        const geo  = new THREE.SphereGeometry(0.028 * scale, 10, 10);
        const mat  = new THREE.MeshLambertMaterial({ color: 0x22c55e });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        return mesh;
    }

    // RGB coordinate frame triad with billboard text labels at each axis tip
    _makeAxes(size, matrix = null, frameIndex = null, textScale = 1) {
        const group = new THREE.Group();
        const dirs  = [
            { dir: new THREE.Vector3(1, 0, 0), color: 0xef4444, name: 'X' },
            { dir: new THREE.Vector3(0, 1, 0), color: 0x22c55e, name: 'Y' },
            { dir: new THREE.Vector3(0, 0, 1), color: 0x3b82f6, name: 'Z' },
        ];

        dirs.forEach(({ dir, color, name }) => {
            const geo  = new THREE.CylinderGeometry(0.004, 0.004, size, 6);
            const mat  = new THREE.MeshLambertMaterial({ color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            mesh.position.copy(dir.clone().multiplyScalar(size / 2));
            group.add(mesh);

            if (frameIndex !== null) {
                const sprite = this._makeTextSprite(`${name}`, `${frameIndex}`, color);
                sprite.position.copy(dir.clone().multiplyScalar(size * 1.3));
                sprite.scale.set(0.06 * textScale, 0.04 * textScale, 1);
                group.add(sprite);
            }
        });

        if (matrix) {
            group.applyMatrix4(matrix);
        }
        return group;
    }

    // Canvas-based billboard sprite showing a letter and optional subscript.
    // Stays facing the camera at all angles (THREE.Sprite behavior).
    _makeTextSprite(text, subscript, color) {
        const canvas  = document.createElement('canvas');
        canvas.width  = 128;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Main letter
        const hex = '#' + color.toString(16).padStart(6, '0');
        ctx.fillStyle = hex;
        ctx.font      = 'bold 52px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 8, 36);

        // Subscript (frame index)
        if (subscript !== '') {
            ctx.font      = 'bold 32px sans-serif';
            ctx.fillStyle = hex;
            ctx.fillText(subscript, 46, 52);
        }

        const texture  = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map:         texture,
            transparent: true,
            depthTest:   false,
        });
        const sprite = new THREE.Sprite(material);
        // Scale is set by the caller to support the textScale slider
        return sprite;
    }
}

export default SceneModel;
