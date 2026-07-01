// models/URDFModel.js
// Generates URDF XML from Craig DH parameters.
// Each link owns its visual cylinder, defined in its own frame going from
// (0,0,0) to the next joint origin. This ensures visuals move correctly
// when joints are actuated in RViz or MoveIt.
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

    // Craig DH joint origin relative to parent frame.
    // For revolute joints theta is variable (set to 0 for the static URDF origin).
    // For prismatic joints d is variable (set to 0 for the static URDF origin).
    _jointOrigin(row) {
        const alpha = row.alpha;
        const a     = row.a;
        const d     = row.jointType === 'P' ? 0 : row.d;
        const theta = row.jointType === 'R' ? 0 : row.theta;
        return {
            xyz: [a, -d * Math.sin(alpha), d * Math.cos(alpha)],
            rpy: [alpha, 0, theta],
        };
    }

    // Add a cylinder visual from (0,0,0) to (ex,ey,ez) in the current link frame.
    // Uses the verified RPY formula to align the URDF cylinder (Z axis) with
    // the direction vector.
    _cylinderTo(ex, ey, ez, mat, lines) {
        const len = Math.sqrt(ex*ex + ey*ey + ez*ez);
        if (len < 0.001) return;

        const mx = ex/2, my = ey/2, mz = ez/2;
        const nx = ex/len, ny = ey/len, nz = ez/len;

        const roll  = -Math.asin(Math.max(-1, Math.min(1, ny)));
        const pitch =  Math.atan2(nx, nz);

        lines.push(`    <visual>`);
        lines.push(`      <origin xyz="${this._fmt(mx)} ${this._fmt(my)} ${this._fmt(mz)}" rpy="${this._fmt(roll)} ${this._fmt(pitch)} 0"/>`);
        lines.push(`      <geometry><cylinder radius="0.015" length="${this._fmt(len)}"/></geometry>`);
        lines.push(`      <material name="${mat}"/>`);
        lines.push(`    </visual>`);
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
        // Cylinder from {0} to {1} uses the same color as the first link
        const firstMat = rows[0].actuated ? 'blue' : 'gray';
        this._cylinderTo(...origins[0].xyz, firstMat, lines);
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
                // Cylinder connecting this frame to the next joint origin
                this._cylinderTo(...nextOrigin.xyz, mat, lines);
            }

            lines.push('  </link>');
            lines.push('');
        });

        lines.push('</robot>');
        return lines.join('\n');
    }
}

export default URDFModel;
