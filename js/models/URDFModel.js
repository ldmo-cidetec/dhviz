// models/URDFModel.js
// Generates URDF XML from Craig DH parameters.
// Each link owns its visual cylinders, defined in its own frame going from
// (0,0,0) to the next joint origin. This ensures visuals move correctly
// when joints are actuated in RViz or MoveIt.
//
// L-shaped links (same as SceneModel): the DH link has two physical segments.
//   Segment 1 (a_i):     (0,0,0) -> elbow (a, 0, 0), along X of the link frame
//   Segment 2 (d_{i+1}): elbow -> next joint origin, along Z after the alpha rotation
//
// RPY formula to align a URDF cylinder (Z axis) with direction (nx, ny, nz):
//   roll  = -asin(ny)
//   pitch =  atan2(nx, nz)
// Verified: R(roll, pitch, 0) * [0,0,1]^T = [nx, ny, nz]^T

class URDFModel {

    _fmt(v) {
        if (Math.abs(v) < 1e-10) return '0';
        return parseFloat(v.toFixed(6)).toString();
    }
    _fmtV(v) { return v.map(x => this._fmt(x)).join(' '); }

    // Craig DH joint origin relative to parent frame:
    //   T = Rx(alpha) * Tx(a) * Rz(theta) * Tz(d)
    // The static offsets row.theta and row.d are always kept in the origin.
    // The joint variable q is then applied by URDF about/along the child Z axis:
    //   revolute:  Rz(theta) * Rz(q) = Rz(theta + q)
    //   prismatic: Tz(d) * Tz(q)     = Tz(d + q)
    // so the URDF at q = 0 matches the DH model (and the Three.js scene).
    _jointOrigin(row) {
        const alpha = row.alpha;
        const a     = row.a;
        const d     = row.d;
        const theta = row.theta;
        return {
            xyz: [a, -d * Math.sin(alpha), d * Math.cos(alpha)],
            rpy: this._rpyFromAlphaTheta(alpha, theta),
        };
    }

    // URDF rpy (fixed axes, R = Rz(yaw) * Ry(pitch) * Rx(roll)) equivalent to
    // the DH rotation R = Rx(alpha) * Rz(theta). Using [alpha, 0, theta] directly
    // would give Rz(theta) * Rx(alpha), which is wrong when both are non-zero.
    _rpyFromAlphaTheta(alpha, theta) {
        const ca = Math.cos(alpha), sa = Math.sin(alpha);
        const ct = Math.cos(theta), st = Math.sin(theta);

        // R = Rx(alpha) * Rz(theta)
        const R00 = ct;
        const R10 = ca*st,   R11 = ca*ct,  R12 = -sa;
        const R20 = sa*st,   R21 = sa*ct,  R22 = ca;

        const cp = Math.hypot(R00, R10);
        if (cp < 1e-9) {
            // Gimbal lock (pitch = +-90 deg): set yaw = 0 and solve roll alone
            return [Math.atan2(-R12, R11), Math.atan2(-R20, cp), 0];
        }
        return [
            Math.atan2(R21, R22),  // roll
            Math.atan2(-R20, cp),  // pitch
            Math.atan2(R10, R00),  // yaw
        ];
    }

    // Add a cylinder visual from (sx,sy,sz) to (ex,ey,ez) in the current link frame.
    // Uses the verified RPY formula to align the URDF cylinder (Z axis) with
    // the direction vector.
    _cylinderBetween([sx, sy, sz], [ex, ey, ez], mat, lines) {
        const dx = ex - sx, dy = ey - sy, dz = ez - sz;
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (len < 0.001) return;

        const mx = (sx + ex)/2, my = (sy + ey)/2, mz = (sz + ez)/2;
        const nx = dx/len, ny = dy/len, nz = dz/len;

        const roll  = -Math.asin(Math.max(-1, Math.min(1, ny)));
        const pitch =  Math.atan2(nx, nz);

        lines.push(`    <visual>`);
        lines.push(`      <origin xyz="${this._fmt(mx)} ${this._fmt(my)} ${this._fmt(mz)}" rpy="${this._fmt(roll)} ${this._fmt(pitch)} 0"/>`);
        lines.push(`      <geometry><cylinder radius="0.015" length="${this._fmt(len)}"/></geometry>`);
        lines.push(`      <material name="${mat}"/>`);
        lines.push(`    </visual>`);
    }

    // L-shaped link from (0,0,0) to the next joint origin xyz = [a, -d*sin(alpha), d*cos(alpha)].
    // The elbow (a, 0, 0) is where segment 1 ends and segment 2 begins.
    _linkTo(xyz, mat, lines) {
        const elbow = [xyz[0], 0, 0];

        // Segment 1: origin -> elbow (along X)
        this._cylinderBetween([0, 0, 0], elbow, mat, lines);
        // Segment 2: elbow -> next joint origin (along Z, after alpha rotation)
        this._cylinderBetween(elbow, xyz, mat, lines);

        // Small sphere at the elbow to smooth the joint between segments.
        // Only needed when both segments exist.
        const seg1 = Math.abs(xyz[0]) >= 0.001;
        const seg2 = Math.hypot(xyz[1], xyz[2]) >= 0.001;
        if (seg1 && seg2) {
            lines.push(`    <visual><origin xyz="${this._fmtV(elbow)}" rpy="0 0 0"/>`);
            lines.push('      <geometry><sphere radius="0.015"/></geometry>');
            lines.push(`      <material name="${mat}"/></visual>`);
        }
    }

    generate(rows, robotName = 'dhviz_robot') {
        if (rows.length === 0) return '<!-- No links defined -->';

        const origins = rows.map(row => this._jointOrigin(row));

        const lines = [];
        lines.push(`<?xml version="1.0"?>`);
        lines.push(`<robot name="${robotName}">`);
        lines.push('');

        // Materials
        lines.push('  <material name="blue"><color rgba="0.15 0.39 0.93 1.0"/></material>');
        lines.push('  <material name="gray"><color rgba="0.7 0.7 0.7 1.0"/></material>');
        lines.push('  <material name="dark"><color rgba="0.15 0.15 0.15 1.0"/></material>');
        lines.push('  <material name="red"><color rgba="0.9 0.15 0.15 1.0"/></material>');
        lines.push('  <material name="joint_color"><color rgba="0.1 0.2 0.75 1.0"/></material>');
        lines.push('');

        // base_link: dark sphere at {0} + cylinder to joint_1
        lines.push('  <link name="base_link">');
        lines.push('    <visual><origin xyz="0 0 0" rpy="0 0 0"/>');
        lines.push('      <geometry><sphere radius="0.025"/></geometry>');
        lines.push('      <material name="dark"/></visual>');
        // L-shaped link from {0} to {1} uses the same color as the first link
        const firstMat = rows[0].actuated ? 'blue' : 'gray';
        this._linkTo(origins[0].xyz, firstMat, lines);
        lines.push('  </link>');
        lines.push('');

        rows.forEach((row, i) => {
            const isR        = row.jointType === 'R';
            const isP        = row.jointType === 'P';
            const linkName   = `link_${i + 1}`;
            const jointName  = `joint_${i + 1}`;
            const parentName = i === 0 ? 'base_link' : `link_${i}`;
            const jointType  = !row.actuated ? 'fixed' : (isR ? 'revolute' : 'prismatic');
            const { xyz, rpy } = origins[i];
            const sliderMin  = row.min !== undefined ? row.min : (isR ? -3.14159 : -1.0);
            const sliderMax  = row.max !== undefined ? row.max : (isR ?  3.14159 :  1.0);
            const mat        = row.actuated ? 'blue' : 'gray';
            const isLast     = i === rows.length - 1;
            const nextOrigin = !isLast ? origins[i + 1] : null;

            // Joint: positions and orients the child link frame
            lines.push(`  <joint name="${jointName}" type="${jointType}">`);
            lines.push(`    <parent link="${parentName}"/><child link="${linkName}"/>`);
            lines.push(`    <origin xyz="${this._fmtV(xyz)}" rpy="${this._fmtV(rpy)}"/>`);
            lines.push(`    <axis xyz="0 0 1"/>`);
            if (row.actuated) {
                lines.push(`    <limit lower="${this._fmt(sliderMin)}" upper="${this._fmt(sliderMax)}" effort="100" velocity="1.0"/>`);
                lines.push(`    <dynamics damping="0.1" friction="0.1"/>`);
            }
            lines.push(`  </joint>`);
            lines.push('');

            // Link: joint sphere at origin + cylinder to next joint (or red sphere for end-effector)
            lines.push(`  <link name="${linkName}">`);
            lines.push('    <visual><origin xyz="0 0 0" rpy="0 0 0"/>');
            lines.push('      <geometry><sphere radius="0.024"/></geometry>');
            lines.push('      <material name="joint_color"/></visual>');

            if (isLast) {
                // End-effector: red sphere slightly larger than joint spheres
                lines.push('    <visual><origin xyz="0 0 0" rpy="0 0 0"/>');
                lines.push('      <geometry><sphere radius="0.026"/></geometry>');
                lines.push('      <material name="red"/></visual>');
            } else {
                // L-shaped link connecting this frame to the next joint origin
                this._linkTo(nextOrigin.xyz, mat, lines);
            }

            lines.push('  </link>');
            lines.push('');
        });

        lines.push('</robot>');
        return lines.join('\n');
    }
}

export default URDFModel;
