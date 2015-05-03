var Promise           = require('bluebird');
var sys               = require('pex-sys');
var glu               = require('pex-glu');
var random            = require('pex-random');
var color             = require('pex-color');
var gui               = require('pex-gui');
var R                 = require('ramda');
var plask             = require('plask');
var debug             = require('debug').enable('ucc/*')
var log               = require('debug')('ucc/main');

//CES
var meshRendererSys               = require('./ucc/sys/meshRendererSys');
var mapSys                        = require('./ucc/sys/mapSys');
var energySys                     = require('./ucc/sys/energySys');
var energyUpdaterSys              = require('./ucc/sys/energyUpdaterSys');
var energyPointSpriteUpdaterSys   = require('./ucc/sys/energyPointSpriteUpdaterSys');
var agentTargetNodeUpdaterSys     = require('./ucc/sys/agentTargetNodeUpdaterSys');
var agentTargetNodeFollowerSys    = require('./ucc/sys/agentTargetNodeFollowerSys');
var agentFlockingSys              = require('./ucc/sys/agentFlockingSys');
var agentPositionUpdaterSys       = require('./ucc/sys/agentPositionUpdaterSys');
var agentSpawnSys                 = require('./ucc/sys/agentSpawnSys');
var agentKillSys                  = require('./ucc/sys/agentKillSys');
var agentPointSpriteUpdaterSys    = require('./ucc/sys/agentPointSpriteUpdaterSys');
var agentDebugInfoUpdaterSys      = require('./ucc/sys/agentDebugInfoUpdaterSys');
var displacePointUpdaterSys       = require('./ucc/sys/displacePointUpdaterSys');
var roomInfoUpdaterSys            = require('./ucc/sys/roomInfoUpdaterSys');
var flufSys                       = require('./ucc/sys/flufSys');
var GUIControlExt                 = require('./gui/GUIControlExt');

//Stores
var MapStore          = require('./ucc/stores/MapStore');
var AgentStore        = require('./ucc/stores/AgentStore')

//Config
var config            = require('./config');
var AgentModes        = require('./ucc/agents/agentModes');

//Data
var Client            = require('./ucc/data/Client');
var FakeClient        = require('./ucc/data/FakeClient');

var Platform          = sys.Platform;
var Time              = sys.Time;
var PerspectiveCamera = glu.PerspectiveCamera;
var Arcball           = glu.Arcball;
var Color             = color.Color;
var GUI               = gui.GUI;
var DebugText         = require('./typo/DebugText');

var Vec3              = require('pex-geom').Vec3;

log('init')

var VK_LEFT  = Platform.isPlask ? 123 : 37;
var VK_RIGHT = Platform.isPlask ? 124 : 39;

var state = {
  MAC: 'Unknown',
  DPI: Platform.isBrowser ? 1 : plask.Window.screensInfo()[0].highdpi,

  //data
  liveData: false,

  //scene
  initFloor: 7,
  camera: null,
  cameraPosZ: 0.30,
  cameraRotation: 0,
  arcball: null,
  zoom: 1,

  //entities
  entities: [],

  //stores
  map: null,

  //map config
  minNodeDistance: 0.001,
  maxAgentCount: Platform.isPlask ? 500 : 500,

  //state
  currentTime: 0,
  timeSpeed: Platform.isPlask ? 1 : 0.5,
  agentSpeed: Platform.isPlask ? 0.01 : 0.01/2,
  showCells: true,
  showAgents: true,
  showEnergy: true,
  debug: false,
  showNodes: false,
  showCorridors: false,
  showLabels: false,
  sway: 0,

  //ui
  guiCurrentFloor: 7,

  //debug
  debugText: null
};

try {
  var sys_conf = uccextension.read_system_configSync(); // reads the entire (json) config file
  var json = JSON.parse(sys_conf);          // parses the json
  log("mac_address: " + json.mac_address);      // reads the mac
  state.MAC = json.mac_address;
}
catch(e) {
  log('uccextension not available');
  state.MAC = '' + e;
}

var GUI_OFFSET = Platform.isPlask ? 0 : 9999;

sys.Window.create({
  settings: {
    width: 1400 * state.DPI,
    height: 900 * state.DPI,
    type: '3d',
    fullscreen: Platform.isBrowser ? true : false,
    highdpi: state.DPI,
    borderless: true,
  },
  init: function() {
    this.initGUI();
    log('MAX_VERTEX_UNIFORM_VECTORS ' + this.gl.getParameter(this.gl.MAX_VERTEX_UNIFORM_VECTORS));
    log('MAX_VERTEX_ATTRIBS ' + this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS));
  },
  initAll: function() {
    this.initDataClient();
    this.initLibs();
    this.initScene();
    this.initStores();
    this.initKeys();
  },
  initGUI: function() {
    //Time.verbose = true;

    this.gui = new GUI(this);
    this.gui.setEnabled(true);
    this.gui.addHeader('MAC');
    this.gui.addLabel(state.MAC);
    this.gui.addHeader('Options');
    this.gui.addParam('Sway Enabled', state, 'sway');
    this.gui.addHeader('Map');
    this.gui.addRadioList('Floor', state, 'guiCurrentFloor', config.floors.map(function(floor) {
      return { name: floor.name, value: floor.id };
    }), function(floor) {
      state.map.setFocusRoom(null);
      state.map.setFloor(floor);
      this.killAllAgents();

    }.bind(this));
    var roomList = [
      { name: 'None', value: null },
      { name: 'C.117', value: 'C.117' }
    ]
    this.gui.addRadioList('Room', state, 'focusedRoom', roomList, function(roomId) {
      state.map.setFocusRoom(roomId);
    })

    this.gui.addHeader('Data');
    this.gui.addRadioList('Source', state, 'liveData', [
      { name: 'Generated', value: 0 },
      { name: 'Live', value: 1 }
    ], function(liveData) {
      this.killAllAgents();
    }.bind(this));
    this.gui.addHeader('Debug');
    this.gui.addParam('debug', state, 'debug');
    this.gui.addParam('showCells', state, 'showCells');
    this.gui.addParam('showCorridors', state, 'showCorridors');
    this.gui.addParam('showNodes', state, 'showNodes');
    this.gui.addParam('showAgents', state, 'showAgents');
    this.gui.addParam('showEnergy', state, 'showEnergy');
    this.gui.addParam('showLabels', state, 'showLabels');

    this.gui.addHeader('UI').setPosition(180 * state.DPI, 10 * state.DPI + GUI_OFFSET);
    this.gui.addHeader('Global Colors');
    this.gui.addParam('Cell Edge Width', config, 'cellEdgeWidth', { min: 0.5, max: 5 });
    this.gui.addParam('BgColor', config, 'bgColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Corridor', config, 'corridorColor');
    this.gui.addParam('Cell', config, 'cellColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Cell Center', config, 'cellCenterColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Cell Edge', config, 'cellEdgeColor', {}, this.onColorChange.bind(this));
    this.gui.addHeader('Room colors').setPosition(350 * state.DPI, 10 * state.DPI + GUI_OFFSET);
    this.gui.addParam('Classroom',        config.roomTypes.classroom, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Classroom Center', config.roomTypes.classroom, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Classroom Edge',   config.roomTypes.classroom, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Food',             config.roomTypes.food, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Food Center',      config.roomTypes.food, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Food Edge',        config.roomTypes.food, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Research',         config.roomTypes.research, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Research Center',  config.roomTypes.research, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Research Edge',    config.roomTypes.research, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Knowledge',        config.roomTypes.knowledge, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Knowledge Center', config.roomTypes.knowledge, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Knowledge Edge',   config.roomTypes.knowledge, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addHeader('Other room colors').setPosition(520 * state.DPI, 10 * state.DPI + GUI_OFFSET);
    this.gui.addParam('Admin',            config.roomTypes.admin, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Admin Center',     config.roomTypes.admin, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Admin Edge',       config.roomTypes.admin, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Toilet',           config.roomTypes.toilet, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Toilet Center',    config.roomTypes.toilet, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Toilet Edge',      config.roomTypes.toilet, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Closet',           config.roomTypes.closet, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Closet Center',    config.roomTypes.closet, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Closet Edge',      config.roomTypes.closet, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Exit',             config.roomTypes.exit, 'color', {}, this.onColorChange.bind(this))
    this.gui.addParam('Exit Center',      config.roomTypes.exit, 'centerColor', {}, this.onColorChange.bind(this));
    this.gui.addParam('Exit Edge',        config.roomTypes.exit, 'edgeColor', {}, this.onColorChange.bind(this));
    this.gui.addHeader('Agents 1').setPosition(690 * state.DPI, 10 * state.DPI + GUI_OFFSET);
    Object.keys(config.agentTypes).forEach(function(agentType) {
      this.gui.addParam(agentType + ' 0', config.agentTypes[agentType].colors, '0');
    }.bind(this));
    this.gui.addHeader('Agents 2').setPosition(860 * state.DPI, 10 * state.DPI + GUI_OFFSET);
    Object.keys(config.agentTypes).forEach(function(agentType) {
      this.gui.addParam(agentType + ' 1', config.agentTypes[agentType].colors, '1');
    }.bind(this));
    this.gui.addHeader('Energies').setPosition(1030 * state.DPI, 10 * state.DPI + GUI_OFFSET);
    this.gui.addParam('Social',    config.energyTypes.social, 'color');
    this.gui.addParam('Knowledge', config.energyTypes.knowledge, 'color');
    this.gui.addParam('Economic',  config.energyTypes.economic, 'color');
    this.gui.addParam('Power',      config.energyTypes.power, 'color');
    this.gui.addParam('Dirt',      config.energyTypes.dirt, 'color');
    this.gui.addParam('Social Intensity',    config.energyTypes.social, 'intensity');
    this.gui.addParam('Knowledge Intensity',    config.energyTypes.knowledge, 'intensity');
    this.gui.addParam('Economic Intensity',    config.energyTypes.economic, 'intensity');
    this.gui.addParam('Power Intensity',    config.energyTypes.power, 'intensity');
    this.gui.addParam('Dirt Intensity',    config.energyTypes.dirt, 'intensity');
    this.gui.addHeader('Programme colors')

    /*
    Object.keys(config.programmeColors).forEach(function(programme, programmeIndex) {
      if (programme != 'default') {
        var label = this.gui.addParam(programme.substr(0, 20) + '', config.programmeColors[programme], 'primary', { readonly: true });
      }
    }.bind(this));
*/

    //this.gui.addLabel('Rooms').setPosition(180, 10);

    this.gui.load(config.settingsFile, this.initAll.bind(this));

    state.debugText = new DebugText(this.width, this.height, state.DPI);
  },
  initDataClient: function() {
    //this.client = state.client = new Client(config.serverUrl);
    this.fakeClient = state.fakeClient = new FakeClient(state.timeSpeed, state);
  },
  initLibs: function() {
    Promise.longStackTraces();
    random.seed(0);
  },
  initScene: function() {
    state.camera = new PerspectiveCamera(60, this.width / this.height, 0.01, 10);
    state.arcball = new Arcball(this, state.camera);
  },
  initStores: function() {
    Promise.all([
      MapStore.init(),
      AgentStore.init()
    ])
    .spread(function(map, agents) {
      map.setFloor(state.initFloor);

      state.map = map;
      state.agents = agents;

      state.width = this.width;
      state.height = this.height;

    }.bind(this))
    .catch(function(e) {
      log(e.stack)
    })
  },
  initKeys: function() {
    this.on('keyDown', function(e) {
      switch(e.str) {
        //case ' ': this.killAllAgents(); break;
        case 'd': state.debug = !state.debug; break;
        case 'g': this.gui.toggleEnabled(); break;
        case 'c': state.showCells = !state.showCells; break;
        case 'p': state.showCorridors = !state.showCorridors; state.showNodes = !state.showNodes; break;
        case 'a': state.showAgents = !state.showAgents; break;
        case 'e': state.showEnergy = !state.showEnergy; break;
        case 'l': state.showLabels = !state.showLabels; break;
        case 'q': config.bgColor = Color.fromHex('#FF0000'); config.cellColor = Color.fromHex('#FF0000'); this.onColorChange(); break;
        case 'S': this.gui.save(config.settingsFile); break;
        case 'L': this.gui.load(config.settingsFile); break;
      }
    }.bind(this));
  },
  initMouse: function() {
    var gen = require('pex-gen');
    var materials = require('pex-materials');
    var geom = require('pex-geom');

    var mouseMesh = new glu.Mesh(new gen.Cube(0.01), new materials.SolidColor({ color: Color.Red }));
    var mouseMesh2 = new glu.Mesh(new gen.Cube(0.01), new materials.SolidColor({ color: Color.Red }));
    var mouseMesh3 = new glu.Mesh(new gen.Cube(0.01), new materials.SolidColor({ color: Color.Red }));

    var xyPlane = {
      point: new geom.Vec3(0, 0, 0),
      normal: new geom.Vec3(0, 0, 1)
    }

    this.on('mouseMoved', function(e) {
      state.mousePos = {
        x: e.x,
        y: e.y
      }

      var ray = state.camera.getWorldRay(e.x, e.y, this.width, this.height);
      var hit = ray.hitTestPlane(xyPlane.point, xyPlane.normal)[0];
      if (!hit) return;
      mouseMesh.position.copy(hit);

      state.mouseHit = {
        x: hit.x,
        y: hit.y,
        z: hit.z
      };

      var ray2 = state.camera.getWorldRay(this.width - e.x, this.height - e.y, this.width, this.height);
      var hit2 = ray2.hitTestPlane(xyPlane.point, xyPlane.normal)[0];
      mouseMesh2.position.copy(hit2);
      state.mouseHit2 = {
        x: hit2.x,
        y: hit2.y,
        z: hit2.z
      };

      var ray3 = state.camera.getWorldRay(e.y, e.x, this.width, this.height);
      var hit3 = ray3.hitTestPlane(xyPlane.point, xyPlane.normal)[0];
      mouseMesh3.position.copy(hit3);
      state.mouseHit3 = {
        x: hit3.x,
        y: hit3.y,
        z: hit3.z
      };
    }.bind(this));

    /*
    state.entities.push({
      type: 'mouse',
      mesh: mouseMesh
    })

    state.entities.push({
      type: 'mouse',
      mesh: mouseMesh2
    })

    state.entities.push({
      type: 'mouse',
      mesh: mouseMesh3
    })
*/
  },
  killAllAgents: function() {
    var agents = R.filter(R.where({ agent: R.identity }), state.entities);

    agents.forEach(function(agent) {
      agent.state.entity = null;
      state.entities.splice(state.entities.indexOf(agent), 1);
    })
  },
  update: function() {
    if (this.client) {
      this.client.enabled = state.liveData;
      this.fakeClient.enabled = !state.liveData;
    }

    if (state.camera) {
      state.zoom = 1/state.camera.getTarget().distance(state.camera.getPosition())
    }
  },
  onColorChange: function() {
    var entitiesWithMesh = R.filter(R.where({ mesh: R.identity }), state.entities);
    entitiesWithMesh.forEach(function(entity) {
      if (entity.mesh.geometry.colors) {
        entity.mesh.geometry.colors.dirty = true;
      }
    });
  },
  updateSystems: function() {
    agentDebugInfoUpdaterSys(state);
    mapSys(state);
    energySys(state);
    energyUpdaterSys(state);
    agentSpawnSys(state);
    agentTargetNodeUpdaterSys(state);
    agentKillSys(state);
    roomInfoUpdaterSys(state);
    agentTargetNodeFollowerSys(state);
    agentPositionUpdaterSys(state);

    agentFlockingSys(state);
    agentPointSpriteUpdaterSys(state);
    energyPointSpriteUpdaterSys(state);

    flufSys(state);

    displacePointUpdaterSys(state);

    meshRendererSys(state);

    this.fakeClient.update(state);

    state.map.dirty = false;
  },
  draw: function() {
    this.update();

    var agents = R.filter(R.where({ agent: true }), state.entities);

    glu.clearColorAndDepth(config.bgColor);
    glu.enableDepthReadAndWrite(true);

    if (state.map && state.map.selectedNodes) {
      try {
        this.updateSystems();
      }
      catch(e) {
        log(e);
      }
    }

    if (state.showLabels) {
      state.debugText.draw(state.camera);
    }
    else {
      state.debugText.texts = []; //clear!
    }
    this.gui.draw();

    var err = this.gl.getError()
    if (err) {
      log('GL ERROR ' + err);
    }
  }
});