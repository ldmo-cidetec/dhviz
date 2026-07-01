// models/BaseExporter.js
// Shared utility methods extended by PythonExporter and MatlabExporter.
// Provides number formatting and actuated joint counting used by both languages.

class BaseExporter {

    // Count how many joints in the table are actuated (have a joint variable)
    actuatedCount(rows) { return rows.filter(r => r.actuated).length; }

    // Format a number to 6 decimal places, or '0.0' for values near zero
    fmt(v) {
        if (Math.abs(v) < 1e-10) return '0.0';
        return v.toFixed(6);
    }

    // Build DH parameter lines for each row
    // Returns array of { lines, qi } per row
    buildDHParams(rows, lang) {
        const isPy  = lang === 'python';
        const cmt   = isPy ? '#' : '%';
        const semi  = isPy ? ''  : ';';
        let qi = 1;

        return rows.map((row, i) => {
            const isR  = row.jointType === 'R';
            const isP  = row.jointType === 'P';
            const ind  = isPy ? '    ' : '    ';
            const lines = [];
            const desc = `${isR ? 'Revolute' : 'Prismatic'}${row.actuated ? '' : ' (passive)'}`;
            lines.push(`${ind}${cmt} Link ${i+1} - ${desc}`);
            lines.push(`${ind}alpha${i} = ${this.fmt(row.alpha)}${semi}   ${cmt} rad`);
            lines.push(`${ind}a${i}     = ${this.fmt(row.a)}${semi}   ${cmt} m`);

            if (isP && row.actuated) {
                const off = Math.abs(row.d) < 1e-10 ? '' : (isPy ? ` + ${this.fmt(row.d)}` : ` + ${this.fmt(row.d)}`);
                lines.push(`${ind}d${i+1}     = ${isPy ? `q[${qi-1}]` : `q(${qi})`}${off}${semi}`);
                lines.push(`${ind}theta${i+1} = ${this.fmt(row.theta)}${semi}`);
                qi++;
            } else if (isR && row.actuated) {
                lines.push(`${ind}d${i+1}     = ${this.fmt(row.d)}${semi}`);
                const off = Math.abs(row.theta) < 1e-10 ? '' : ` + ${this.fmt(row.theta)}`;
                lines.push(`${ind}theta${i+1} = ${isPy ? `q[${qi-1}]` : `q(${qi})`}${off}${semi}`);
                qi++;
            } else {
                lines.push(`${ind}d${i+1}     = ${this.fmt(row.d)}${semi}`);
                lines.push(`${ind}theta${i+1} = ${this.fmt(row.theta)}${semi}`);
            }
            return lines.join('\n');
        });
    }
}

export default BaseExporter;
