# DHViz: A Denavit-Hartenberg Visualizer

DHViz is an interactive web-based tool for configuring and visualizing the kinematics of open-chain robotic manipulators using the **Craig (modified DH) convention**. It computes transformation matrices, the geometric Jacobian, and generates ready-to-use code in Python and MATLAB. A URDF export for ROS is also included.

The implementation uses **Three.js**, **JavaScript ES Modules**, and a **Model-View-Controller (MVC)** architecture. It runs in the browser without any build tools and can also be packaged as a standalone desktop application using Electron.

---

## Features

- Interactive DH parameter table (Craig convention: $\alpha_{i-1}$, $a_{i-1}$, $d_i$, $\theta_i$)
- Revolute and prismatic joints, actuated and passive
- Real-time 3D visualization with Z-up coordinate frames (Three.js)
- Local and global transformation matrices (symbolic via Algebrite + KaTeX, numeric)
- Geometric Jacobian $J(q) \in \mathbb{R}^{6 \times n}$ with Yoshikawa manipulability measure
- Reference points attached to any frame with world-frame position computation
- Code export: Python (NumPy / SymPy) and MATLAB (numeric / Symbolic Math Toolbox)
- URDF export compatible with ROS, RViz, and MoveIt
- Responsive layout for desktop and mobile
- Standalone desktop app (Electron)

---

## Project Architecture (MVC)

```
js/
├── EventBus.js
├── TabManager.js
├── HelpPanel.js
├── Main.js
│
├── models/
│   ├── DHModel.js
│   ├── SceneModel.js
│   ├── MatrixModel.js
│   ├── JacobianModel.js
│   ├── PointsModel.js
│   ├── ExportModel.js
│   ├── BaseExporter.js
│   ├── PythonExporter.js
│   ├── MatlabExporter.js
│   └── URDFModel.js
│
├── views/
│   ├── DHView.js
│   ├── SceneView.js
│   ├── MatrixView.js
│   ├── JacobianView.js
│   ├── ExportView.js
│   ├── PointsView.js
│   └── URDFView.js
│
└── controllers/
    ├── DHController.js
    ├── SceneController.js
    ├── MatrixController.js
    ├── JacobianController.js
    ├── ExportController.js
    ├── PointsController.js
    └── URDFController.js
```

- **Models** - hold all state and computation logic (DH parameters, matrices, Jacobian, export, URDF)
- **Views** - render data into the DOM
- **Controllers** - handle user events and mediate between models and views
- **EventBus** - decouples tab change notifications from controllers
- **TabManager** - manages tab switching for desktop and mobile layouts
- **HelpPanel** - manages the help panel open/close and topic expansion

---

## Dependencies

All libraries are loaded locally from the `libs/` folder. No internet connection is required at runtime.

| Library | Version | Purpose |
|---|---|---|
| Tailwind CSS | 2.2.19 | UI layout and styling |
| Three.js | r166 | 3D scene and rendering |
| KaTeX | 0.16.9 | Math rendering |
| Algebrite | 1.4.0 | Symbolic algebra for matrices |
| highlight.js | 11.9.0 | Syntax highlighting in Export and URDF tabs |

Three.js is imported using the native browser `importmap`:

```html
<script type="importmap">
{
    "imports": {
        "three": "./libs/js/three/build/three.module.min.js",
        "three/addons/": "./libs/js/three/examples/jsm/"
    }
}
</script>
```

---

## Running in the Browser

DHViz uses ES Modules and requires a local server. The simplest options are:

**Python (no installation required):**
```bash
cd dhviz/
python -m http.server 8080
```
Then open `http://localhost:8080` in the browser.

**VS Code Live Server:**
Install the Live Server extension and click **Go Live**.

---

## Desktop Application (Electron)

DHViz can also run as a standalone desktop application without a browser or server.

### Requirements

- Node.js
- npm

### Setup

```bash
npm install
```

### Run in development

```bash
npm run electron
```

### Build installer

```bash
npm run dist
```

The installer is generated in `release/`. On Windows, an `.exe` installer is produced. On macOS, a `.dmg` file. On Linux, an `.AppImage`.

---

## Project Structure

```
dhviz/
├── index.html
├── favicon.svg
├── favicon.ico
├── package.json
│
├── electron/
│   └── main.cjs
│
├── js/
│   └── (MVC modules, see above)
│
├── libs/
│   ├── css/
│   │   ├── tailwind.min.css
│   │   ├── katex.min.css
│   │   └── github.min.css
│   └── js/
│       ├── katex.min.js
│       ├── algebrite.bundle-for-browser.min.js
│       ├── highlight.min.js
│       ├── python.min.js
│       ├── matlab.min.js
│       ├── xml.min.js
│       └── three/
│           ├── build/
│           │   └── three.module.min.js
│           └── examples/
│               └── jsm/
│                   └── controls/
│                       └── OrbitControls.js
│
└── img/
    └── logo.png
```

---

## Adding a New Tab

DHViz is designed to be extended. To add a new tab:

### 1. Add the tab button and panel in `index.html`

Follow the same structure as the existing tabs (DH, Matrices, Jacobian, Export, URDF).

### 2. Register the tab in `TabManager.js`

Add the new tab ID and panel ID to the `layouts` array in both the desktop (`md`) and mobile (`sm`) entries.

### 3. Create a Model

Add a new file in `js/models/`. The model holds all data and computation logic for the new tab.

### 4. Create a View

Add a new file in `js/views/`. The view renders the model data into the DOM.

### 5. Create a Controller

Add a new file in `js/controllers/`. Use the lazy controller pattern:

```js
this._dirty = true;
this.dhModel.subscribe(() => { this._dirty = true; });
this.dhView.onTabChange(tab => {
    if (tab === 'your_tab' && this._dirty) this._update();
});
```

### 6. Wire everything in `Main.js`

Import and instantiate the new model, view, and controller.

---

## Design Principles

- No bundlers or build tools required for browser use
- Minimal dependencies
- Clear MVC separation
- Lazy computation: tabs only compute when active
- Demand-based rendering: Three.js only draws when the scene changes
- Mobile-friendly layout with safe area support

---

## Live Preview

A hosted version of DHViz is available at:

**[https://dr-rodriguez-molina.com/dhviz/](https://dr-rodriguez-molina.com/dhviz/)**

No installation required - runs directly in the browser.
