// models/MatrixModel.js
// Computes local DH transformation matrices using the Craig (modified DH) convention.
// Each local matrix ^{i-1}T_i is returned in two forms:
//   locals        - LaTeX strings (symbolic, via Algebrite) with q_i as symbols
//   localsNumeric - numeric values evaluated at current joint variables
// The accumulated global matrix ^0T_n is returned as a numeric LaTeX bmatrix.

class MatrixModel {

    // Format a number for Algebrite.
    // - Zero threshold: 1e-10
    // - Integers stay as integers
    // - Floats use 4 decimals (enough precision, avoids KaTeX truncation)
    // - Negative numbers are wrapped in parentheses to avoid parse errors
    //   e.g. q1+-0.5 would be invalid; q1+(-0.5) is correct
    _n(v) {
        if (Math.abs(v) < 1e-10) return '0';
        const r = Math.round(v);
        if (Math.abs(v - r) < 1e-10) return r < 0 ? `(${r})` : String(r);
        const s = v.toFixed(4);
        return v < 0 ? `(${s})` : s;
    }

    // Run an Algebrite expression and return the result string
    _alg(expr) {
        try { return Algebrite.run(expr); }
        catch (e) { return '0'; }
    }

    // Simplify a raw Algebrite expression and convert to LaTeX.
    // varMap replaces Algebrite variable names (e.g. 'q1') with subscript form ('q_{1}').
    _toLatex(expr, varMap) {
        let latex = this._alg(`printlatex(simplify(${expr}))`);
        latex = latex.replace(/^"|"$/g, '');
        // Clean float artifacts produced by Algebrite
        latex = latex
            .replace(/\b0\.0{1,4}\b/g, '0')
            .replace(/\b1\.0{1,4}(?=[a-zA-Z\\(])/g, '')
            .replace(/\b1\.0{1,4}\b/g, '1')
            .replace(/\(-1\)/g, '-1');
        // Restore q_{i} subscript notation
        for (const [clean, sub] of Object.entries(varMap)) {
            latex = latex.replaceAll(clean, sub);
        }
        return latex;
    }

    // Returns a 4x4 array of raw Algebrite expression strings
    // representing the Craig DH matrix ^{i-1}T_i.
    _rawMatrix(row, qName) {
        const isR = row.jointType === 'R';
        const isP = row.jointType === 'P';

        const ca = this._n(Math.cos(row.alpha));
        const sa = this._n(Math.sin(row.alpha));
        const a  = this._n(row.a);

        // theta is symbolic for actuated revolute joints
        const thetaExpr = isR && row.actuated
            ? (Math.abs(row.theta) < 1e-10 ? qName : `${qName}+${this._n(row.theta)}`)
            : this._n(row.theta);

        // d is symbolic for actuated prismatic joints
        const dExpr = isP && row.actuated
            ? (Math.abs(row.d) < 1e-10 ? qName : `${qName}+${this._n(row.d)}`)
            : this._n(row.d);

        const ct = `cos(${thetaExpr})`;
        const st = `sin(${thetaExpr})`;

        return [
            [ ct,          `(-1)*${st}`,     '0',          a                        ],
            [ `${ca}*${st}`, `${ca}*${ct}`,  `(-1)*${sa}`, `(-1)*${sa}*(${dExpr})`  ],
            [ `${sa}*${st}`, `${sa}*${ct}`,   ca,           `${ca}*(${dExpr})`       ],
            [ '0',          '0',              '0',          '1'                      ],
        ];
    }

    // Main entry point. Returns { locals, localsNumeric, globalLatex }.
    compute(rows) {
        if (typeof Algebrite === 'undefined') {
            return { locals: [], globalLatex: null };
        }

        // Assign a q index only to actuated joints
        let qi = 1;
        const entries = rows.map(row => {
            const idx    = row.actuated ? qi++ : null;
            const qName  = idx !== null ? `q${idx}` : 'q_unused';
            const varMap = idx !== null ? { [qName]: `q_{${idx}}` } : {};
            const raw    = this._rawMatrix(row, qName);
            return { raw, varMap, qName };
        });

        // Symbolic local matrices - each cell is a LaTeX string
        const locals = entries.map(({ raw, varMap }) =>
            raw.map(r => r.map(cell => this._toLatex(cell, varMap)))
        );

        // Numeric local matrices - each cell is a formatted number string
        const fmt = v => Math.abs(v) < 1e-10 ? '0' : String(parseFloat(v.toFixed(4)));
        const localsNumeric = rows.map(row => {
            const d     = row.jointType === 'P' ? row.d + (row.actuated ? row.q : 0) : row.d;
            const theta = row.jointType === 'R' ? row.theta + (row.actuated ? row.q : 0) : row.theta;
            const ca = Math.cos(row.alpha), sa = Math.sin(row.alpha);
            const ct = Math.cos(theta),     st = Math.sin(theta);
            return [
                [ fmt(ct),      fmt(-st),      '0',        fmt(row.a) ],
                [ fmt(ca*st),   fmt(ca*ct),    fmt(-sa),   fmt(-sa*d) ],
                [ fmt(sa*st),   fmt(sa*ct),    fmt(ca),    fmt(ca*d)  ],
                [ '0',          '0',           '0',        '1'        ],
            ];
        });

        // Global matrix: numeric product of all local matrices at current q values
        let globalLatex = null;
        try {
            let G = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

            rows.forEach(row => {
                const d     = row.jointType === 'P' ? row.d + (row.actuated ? row.q : 0) : row.d;
                const theta = row.jointType === 'R' ? row.theta + (row.actuated ? row.q : 0) : row.theta;
                const ca = Math.cos(row.alpha), sa = Math.sin(row.alpha);
                const ct = Math.cos(theta),     st = Math.sin(theta);
                const T = [
                    [ ct,      -st,      0,    row.a ],
                    [ ca*st,   ca*ct,   -sa,  -sa*d  ],
                    [ sa*st,   sa*ct,    ca,   ca*d  ],
                    [ 0,       0,        0,    1     ],
                ];
                const R = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
                for (let i = 0; i < 4; i++)
                    for (let j = 0; j < 4; j++)
                        for (let k = 0; k < 4; k++)
                            R[i][j] += G[i][k] * T[k][j];
                G = R;
            });

            const fmtRows = G.map(r =>
                r.map(v => Math.abs(v) < 1e-10 ? '0' : String(parseFloat(v.toFixed(4)))).join(' & ')
            ).join(' \\\\ ');
            globalLatex = `\\begin{bmatrix} ${fmtRows} \\end{bmatrix}`;

        } catch (e) {
            globalLatex = null;
        }

        return { locals, localsNumeric, globalLatex };
    }
}

export default MatrixModel;
