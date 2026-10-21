// models/JacobianModel.js
// Computes the numeric geometric Jacobian (Craig DH convention).
//
// The 6xn Jacobian maps joint velocities to end-effector velocities:
//   [v; w] = J(q) * dq
//
// For revolute joint i:
//   Jv_i = z_{i-1} x (o_n - o_{i-1})
//   Jw_i = z_{i-1}
//
// For prismatic joint i:
//   Jv_i = z_{i-1}
//   Jw_i = 0
//
// The Yoshikawa manipulability measure w = sqrt(det(Jv * Jv^T)) is computed
// using only the non-zero rows of Jv to handle planar robots correctly.

class JacobianModel {

    // Numeric 4x4 Craig DH matrix evaluated at current q
    _numericDHMatrix(row) {
        const d = row.jointType === 'P' ? row.d + (row.actuated ? row.q : 0) : row.d;
        const theta = row.jointType === 'R' ? row.theta + (row.actuated ? row.q : 0) : row.theta;
        const ca = Math.cos(row.alpha), sa = Math.sin(row.alpha);
        const ct = Math.cos(theta), st = Math.sin(theta);
        return [
            [ct, -st, 0, row.a],
            [ca * st, ca * ct, -sa, -sa * d],
            [sa * st, sa * ct, ca, ca * d],
            [0, 0, 0, 1],
        ];
    }

    _multiplyNumeric(A, B) {
        const R = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                for (let k = 0; k < 4; k++)
                    R[i][j] += A[i][k] * B[k][j];
        return R;
    }

    // Determinant of a 3x3 matrix (used for manipulability)
    _det3(M) {
        return (
            M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
            M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
            M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
        );
    }

    // Returns { J_num_latex, manipulability, n }
    compute(rows) {
        //const n = rows.length;
        const n = rows.filter(r => r.jointType !== 'F').length;
        if (n === 0) return null;

        try {
            // Accumulate frame transforms, storing the state before each joint
            let Gnum = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
            const numFramesBefore = [];
            for (const row of rows) {
                Gnum = this._multiplyNumeric(Gnum, this._numericDHMatrix(row));
                numFramesBefore.push(Gnum.map(r => [...r]));
            }

            // End-effector position in world frame
            const on = [Gnum[0][3], Gnum[1][3], Gnum[2][3]];

            // Build Jacobian columns - every joint contributes one column
            const Jv_num = [], Jw_num = [];
            rows.forEach((row, i) => {
                if (row.jointType === 'F') return; // fixed links do not contribute
                const T = numFramesBefore[i];
                const z = [T[0][2], T[1][2], T[2][2]]; // z axis of frame {i-1}
                const o = [T[0][3], T[1][3], T[2][3]]; // origin of frame {i-1}
                const d = [on[0] - o[0], on[1] - o[1], on[2] - o[2]];

                if (row.jointType === 'R') {
                    Jv_num.push([
                        z[1] * d[2] - z[2] * d[1],
                        z[2] * d[0] - z[0] * d[2],
                        z[0] * d[1] - z[1] * d[0],
                    ]);
                    Jw_num.push([...z]);
                } else {
                    Jv_num.push([...z]);
                    Jw_num.push([0, 0, 0]);
                }
            });

            // Assemble 6xn Jacobian
            const J_num = [];
            for (let r = 0; r < 3; r++) J_num.push(Jv_num.map(col => col[r]));
            for (let r = 0; r < 3; r++) J_num.push(Jw_num.map(col => col[r]));


            // Manipulability
            const manipulability = this._computeManipulability(J_num, n);

            const fmt = v => Math.abs(v) < 1e-10 ? '0' : String(parseFloat(v.toFixed(4)));
            const J_num_latex = J_num.map(r => r.map(fmt));

            return { J_num_latex, manipulability, n };

        } catch (e) {
            console.error('Jacobian error:', e);
            return null;
        }
    }

    // Determinant of any square matrix (n x n)
    _det(M) {
        const size = M.length;
        if (size === 1) return M[0][0];
        if (size === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
        if (size === 3) {
            return (
                M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
                M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
                M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
            );
        }
        // Minor expansion for n > 3
        let detVal = 0;
        for (let j = 0; j < size; j++) {
            const subMatrix = M.slice(1).map(row => row.filter((_, colIdx) => colIdx !== j));
            detVal += (j % 2 === 0 ? 1 : -1) * M[0][j] * this._det(subMatrix);
        }
        return detVal;
    }

    // Adaptive manipulability method based on n
    _computeManipulability(J_num, n) {
        if (n < 6) {
            // Matrix J^T * J (n x n)
            const JTJ = Array.from({ length: n }, (_, i) =>
                Array.from({ length: n }, (_, j) =>
                    Array.from({ length: 6 }).reduce((sum, _, k) => sum + J_num[k][i] * J_num[k][j], 0)
                )
            );
            return Math.sqrt(Math.max(0, this._det(JTJ)));
        } else {
            // Matrix J * J^T (6 x 6)
            const JJT = Array.from({ length: 6 }, (_, i) =>
                Array.from({ length: 6 }, (_, j) =>
                    Array.from({ length: n }).reduce((sum, _, k) => sum + J_num[i][k] * J_num[j][k], 0)
                )
            );
            return Math.sqrt(Math.max(0, this._det(JJT)));
        }
    }
}

export default JacobianModel;
