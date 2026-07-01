// electron/main.cjs
// Electron main process for DHViz.
// Loads index.html directly from the project root using file:// —
// no build step or local server required.
// Written as CommonJS (.cjs) so Electron can load it regardless of
// the "type" field in package.json.

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width:    1280,
        height:   800,
        minWidth: 600,
        minHeight: 500,
        title: 'DHViz: A Denavit-Hartenberg Visualizer',
        webPreferences: {
            nodeIntegration: false,  // keep Node.js APIs out of the renderer
            contextIsolation: true,  // isolate renderer from main process
        },
    });

    // Load the app directly from the project root
    // __dirname = .../electron/, so going up one level reaches the root
    win.loadFile(path.join(__dirname, '..', 'index.html'));

    // Hide the default Electron menu bar
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    // macOS: re-create the window when the dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
