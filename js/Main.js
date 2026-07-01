// Main.js
// Application entry point.
// Instantiates infrastructure, models, views, and controllers,
// then wires them together following the MVC pattern:
//   Models  - hold all state and computation logic
//   Views   - render data into the DOM
//   Controllers - handle user events and mediate between models and views

import EventBus           from './EventBus.js';
import TabManager         from './TabManager.js';
import HelpPanel          from './HelpPanel.js';

import DHModel            from './models/DHModel.js';
import SceneModel         from './models/SceneModel.js';
import MatrixModel        from './models/MatrixModel.js';
import JacobianModel      from './models/JacobianModel.js';
import ExportModel        from './models/ExportModel.js';
import PointsModel        from './models/PointsModel.js';
import URDFModel          from './models/URDFModel.js';

import DHView             from './views/DHView.js';
import SceneView          from './views/SceneView.js';
import MatrixView         from './views/MatrixView.js';
import JacobianView       from './views/JacobianView.js';
import ExportView         from './views/ExportView.js';
import PointsView         from './views/PointsView.js';
import URDFView           from './views/URDFView.js';

import DHController       from './controllers/DHController.js';
import SceneController    from './controllers/SceneController.js';
import MatrixController   from './controllers/MatrixController.js';
import JacobianController from './controllers/JacobianController.js';
import ExportController   from './controllers/ExportController.js';
import PointsController   from './controllers/PointsController.js';
import URDFController     from './controllers/URDFController.js';

document.addEventListener('DOMContentLoaded', () => {

    // Infrastructure - shared across all components
    const bus        = new EventBus();      // pub/sub channel (used for 'tabChange')
    const tabManager = new TabManager(bus); // wires tab buttons to panels and the bus
    const helpPanel  = new HelpPanel();     // open/close logic for the help panel

    // Models - one per feature area
    const dhModel       = new DHModel();       // DH parameter rows (the robot definition)
    const sceneModel    = new SceneModel();    // Three.js scene geometry
    const matrixModel   = new MatrixModel();   // local and global DH transform matrices
    const jacobianModel = new JacobianModel(); // geometric Jacobian and manipulability
    const exportModel   = new ExportModel();   // Python and MATLAB code generation
    const pointsModel   = new PointsModel();   // reference points attached to frames
    const urdfModel     = new URDFModel();     // URDF XML generation

    // Views - render model data into the DOM
    const dhView       = new DHView(bus, tabManager); // DH table, sliders, guide text
    const sceneView    = new SceneView(sceneModel);   // Three.js canvas and OrbitControls
    const matrixView   = new MatrixView();            // transformation matrices panel
    const jacobianView = new JacobianView();          // Jacobian panel
    const exportView   = new ExportView();            // code export panel
    const pointsView   = new PointsView();            // reference points in DH and Matrices tabs
    const urdfView     = new URDFView();              // URDF panel

    // Controllers - connect models to views and handle user events
    const dhController       = new DHController(dhModel, dhView);
    const sceneController    = new SceneController(dhModel, sceneModel, sceneView);
    const matrixController   = new MatrixController(dhModel, matrixModel, matrixView, dhView);
    const jacobianController = new JacobianController(dhModel, jacobianModel, jacobianView, dhView);
    const exportController   = new ExportController(dhModel, exportModel, exportView, dhView, matrixModel, pointsModel);
    const pointsController   = new PointsController(pointsModel, pointsView, dhModel, dhView, sceneModel, sceneView);
    const urdfController     = new URDFController(dhModel, urdfModel, urdfView, dhView);

});
