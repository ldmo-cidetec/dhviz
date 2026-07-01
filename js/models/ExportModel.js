// models/ExportModel.js
// Thin coordinator for code generation.
// Delegates to PythonExporter and MatlabExporter and returns all four
// variants (numeric/symbolic for each language) in a single object.

import PythonExporter from './PythonExporter.js';
import MatlabExporter from './MatlabExporter.js';

class ExportModel {

    constructor() {
        this._python = new PythonExporter();
        this._matlab = new MatlabExporter();
    }

    // Returns { pythonNumeric, pythonSymbolic, matlabNumeric, matlabSymbolic }
    generate(rows, points, matrixData) {
        return {
            pythonNumeric:  this._python.numeric(rows, points),
            pythonSymbolic: this._python.symbolic(rows, points),
            matlabNumeric:  this._matlab.numeric(rows, points),
            matlabSymbolic: this._matlab.symbolic(rows, points),
        };
    }
}

export default ExportModel;
