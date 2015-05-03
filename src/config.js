var sys       = require('pex-sys');
var color     = require('pex-color');

var Platform  = sys.Platform;
var Color     = color.Color;

var RoomIdMap = {
  //'Afleveres i Wiseflow',
  'Bevægelse B.001' : 'B.001',
  'Teatersal C.024' : 'C.024',
  'VNT A.004' : 'A.004',
  //'Bevægelse 2',
  'Auditorium C.028' : 'C.028',
  'Behandlingsrum C.033' : 'C.033',
  //'Bevægelse 1',
  'Mikrobiologi C.224' : 'C.224',
  'Learning Lab C.216' : 'C.216',
  'NaturVid. Café C.123' : 'C.123',
  'Brikserum C.125' : 'C.125',
  //'Ude af huset',
  'Brikserum C.129' : 'C.129',
  'canteen': 'KantineS', //TODO: Fix 'KantineS'
  'Kantine': 'KantineS'  //TODO: Fix 'KantineS'
};

var AgentTypes = {
  'spl'         : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'SPL - Sygeplejerskeuddannelsen' },
  'pmu'         : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'PMU - Psykomotorikuddannelsen' },
  'fys'         : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'FYS - Fysioterapeutuddannelsen' },
  'soc'         : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'SOC - Socialrådgiveruddannelsen' },
  'paed'        : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'PÆD - Pædagoguddannelsen' },
  'div'         : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'DIV - Diverse aktiviteter' },
  'diplomS'     : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'Diplom S - Diplomuddannelse - Sundhed' },
  'diplomL'     : { colors: ["#FF0000", "#FFAA00"], student: true,  programme: 'Diplom L - Diplomuddannelse - Ledelse' },
  'teacher'     : { colors: ["#0000FF", "#00FFFF"], student: false, programme: 'Teacher' },
  'researcher'  : { colors: ["#DD33FF", "#FF22FF"], student: false, programme: 'Researcher' },
  'janitor'     : { colors: ["#7B5647", "#7B5647"], student: false, programme: 'Janitor' },
  'cook'        : { colors: ["#FF0000", "#FFFF00"], student: false, programme: 'Cook' },
  'admin'       : { colors: ["#0000FF", "#00FFFF"], student: false, programme: 'Admin' },
  'unknown'     : { colors: ["#FFFFFF", "#FFFFFF"], student: false, programme: '' },
}

var EnergyTypes = {
  'social':    { id: 0, color: '#FF0000', intensity: 0.5 },
  'knowledge': { id: 1, color: '#00FF00', intensity: 0.5 },
  'economic':  { id: 2, color: '#0000FF', intensity: 0.5 },
  'power':     { id: 3, color: '#FF9900', intensity: 0.5 },
  'dirt':      { id: 4, color: '#904930', intensity: 0.5 }
};

var RoomTypes = {
  ''         : { label: 'Other'    , color: '#999999', centerColor: '#999999', edgeColor: '#999999' },
  'classroom': { label: 'Classroom', color: '#00FF00', centerColor: '#00FF00', edgeColor: '#00FF00' },
  'toilet'   : { label: 'Toilet'   , color: '#FF0000', centerColor: '#0055DD', edgeColor: '#0055DD' },
  'research' : { label: 'Research' , color: '#FF00FF', centerColor: '#FF00FF', edgeColor: '#FF00FF' },
  'knowledge': { label: 'Knowledge', color: '#FF00FF', centerColor: '#FF00FF', edgeColor: '#FF00FF' },
  'admin'    : { label: 'Admin'    , color: '#112f28', centerColor: '#122120', edgeColor: '#3333FF' },
  'closet'   : { label: 'Closet'   , color: '#996600', centerColor: '#996600', edgeColor: '#996600' },
  'food'     : { label: 'Food'     , color: '#FFAA00', centerColor: '#FFAA00', edgeColor: '#FFAA00' },
  'exit'     : { label: 'Exit'     , color: '#FF0000', centerColor: '#FF0000', edgeColor: '#FF0000' },
  'empty'    : { label: 'Empty'    , color: '#000000', centerColor: '#000000', edgeColor: '#000000' },
  'cell'     : { label: 'Cell'     , color: '#696E98', centerColor: '#696E98', edgeColor: '#FF00FF' }
};

var Floors = [
  { name: 'All', id: -1 },
  { name: 'A 0', id:  1 },
  { name: 'A 1', id:  2 },
  { name: 'B 0', id:  3 },
  { name: 'B 1', id:  4 },
  { name: 'C 0', id:  5 },
  { name: 'C 1', id:  6 },
  { name: 'C 2', id:  7 }
];

var FloorId = {
  All: -1,
  A_0:  1,
  A_1:  2,
  B_0:  3,
  B_1:  4,
  C_0:  5,
  C_1:  6,
  C_2:  7
};

var EnergyPaths = [
  //Knowledge (in all views)
  //each lab (*agents) -> random classroom
  { from: "research", to: "classroom", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "agents" },
  //each lab (*agents) -> random exit
  { from: "research", to: "exit", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "agents" },
  //The Library (*agents) -> each classroom
  { from: "library", to: "classroom", fromNum: 'all', toNum: 10, energy: "knowledge", multiplier: "agents" },
  //The Library (*agents) -> each exit
  { from: "library", to: "exit", fromNum: 'all', toNum: 10, energy: "knowledge", multiplier: "agents" },
  //each exit (*random*intensity) -> The Library
  { from: "exit", to: "library", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "intensity" },
  //each exit (*random*intensity) -> random lab
  { from: "exit", to: "research", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "intensity" },
  //each exit (*random*intensity) -> random teacher room
  { from: "exit", to: "teacher", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "intensity" },

  //Knowledge (additionally in Macro view)
  //each lab (*agents) -> random knowledge blob cell
  { from: "research", to: "knowledgeBlob", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "agents" },
  //The Library (*agents) -> each knowledge blob cell
  { from: "library", to: "knowledgeBlob", fromNum: 'all', toNum: 10, energy: "knowledge", multiplier: "intensity" },
  //Each knowledge blob cell (*random*intensity) -> The Library
  { from: "knowledgeBlob", to: "library", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "intensity" },
  //Each knowledge blob cell (*random*intensity) -> random lab
  { from: "knowledgeBlob", to: "research", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "intensity" },
  //Each knowledge blob cell (*random*intensity) -> random teacher room
  { from: "knowledgeBlob", to: "teacher", fromNum: 'all', toNum: 1, energy: "knowledge", multiplier: "intensity" },

  //Social (in all views)
  //each classroom (*agents) -> random classroom
  { from: "classroom", to: "classroom", fromNum: 'all', toNum: 1, energy: "social", multiplier: "agents" },
  //each classroom (*agents) -> random exit
  { from: "classroom", to: "exit", fromNum: 'all', toNum: 1, energy: "social", multiplier: "agents" },
  //The Canteen (*agents) -> each exit
  { from: "canteen", to: "exit", fromNum: 'all', toNum: 10, energy: "social", multiplier: "agents" },
  //The Cafe (*agents) -> each exit
  { from: "cafe", to: "exit", fromNum: 'all', toNum: 10, energy: "social", multiplier: "intensity" },
  //each exit (*random*intensity) -> The Canteen
  { from: "exit", to: "canteen", fromNum: 10, toNum: 1, energy: "social", multiplier: "intensity" },
  //each exit (*random*intensity) -> The Cafe
  { from: "exit", to: "cafe", fromNum: 10, toNum: 1, energy: "social", multiplier: "intensity" },

  //Social (additionally in Macro view)
  //each classroom (*agents) -> random social blob cell
  { from: "classroom", to: "socialBlob", fromNum: 10, toNum: 1, energy: "social", multiplier: "agents" },
  //The Canteen (*agents) -> each social blob cell
  { from: "canteen", to: "socialBlob", fromNum: 10, toNum: 1, energy: "social", multiplier: "agents" },
  //The Cafe (*agents) -> each social blob cell
  { from: "cafe", to: "socialBlob", fromNum: 10, toNum: 1, energy: "social", multiplier: "agents" },
  //Each social blob cell (*random*intensity) -> The Canteen
  { from: "socialBlob", to: "classrom", fromNum: 10, toNum: 1, energy: "social", multiplier: "intensity" },
  //Each social blob cell (*random*intensity) -> The Cafe
  { from: "socialBlob", to: "canteen", fromNum: 10, toNum: 1, energy: "social", multiplier: "intensity" },
  //Each social blob cell (*random*intensity) -> random classroom
  { from: "socialBlob", to: "cafe", fromNum: 10, toNum: 1, energy: "social", multiplier: "intensity" },

  //Power (in all views)
  //each admin room (*agents) -> random admin room
  { from: "admin", to: "admin", fromNum: 'all', toNum: 1, energy: "power", multiplier: "agents" },
  //each admin room (*agents) -> random classroom
  { from: "admin", to: "classroom", fromNum: 'all', toNum: 1, energy: "power", multiplier: "agents" },
  //each admin room (*agents) -> random teacher room
  { from: "admin", to: "teacher", fromNum: 'all', toNum: 1, energy: "power", multiplier: "agents" },
  //each admin room (*agents) -> random exit
  { from: "admin", to: "exit", fromNum: 'all', toNum: 1, energy: "power", multiplier: "agents" },
  //The Library (*agents) -> each classroom
  { from: "library", to: "classroom", fromNum: 'all', toNum: 10, energy: "power", multiplier: "agents" },
  //The Library (*agents) -> each exit
  { from: "library", to: "exit", fromNum: 'all', toNum: 10, energy: "power", multiplier: "agents" },
  //each exit (*random*intensity) -> The Library
  { from: "exit", to: "library", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },
  //each exit (*random*intensity) -> random admin room
  { from: "exit", to: "admin", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },
  //each exit (*random*intensity) -> random classroom
  { from: "exit", to: "classroom", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },
  //each exit (*random*intensity) -> random teacher room
  { from: "exit", to: "teacher", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },

  //Power (additionally in Macro view)
  //each admin room (*agents) -> random power blob cell
  { from: "admin", to: "powerBlob", fromNum: 'all', toNum: 1, energy: "power", multiplier: "agents" },
  //The Library (*agents) -> each knowledge blob cell
  { from: "library", to: "knowledgeBlob", fromNum: 'all', toNum: 1, energy: "power", multiplier: "agents" },
  //Each power blob cell (*random*intensity) -> The Library
  { from: "powerBlob", to: "library", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },
  //Each power blob cell (*random*intensity) -> random admin room
  { from: "powerBlob", to: "admin", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },
  //Each power blob cell (*random*intensity) -> random classroom
  { from: "powerBlob", to: "classroom", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },
  //Each power blob cell (*random*intensity) -> random teacher room
  { from: "powerBlob", to: "teacher", fromNum: 'all', toNum: 1, energy: "power", multiplier: "intensity" },

  //Brown (in all views)
  //each lab (*agents) -> random exit
  { from: "research", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //each classroom (*agents) -> random exit
  { from: "classroom", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //each teacher room (*agents) -> random exit
  { from: "teacher", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //each admin room (*agents) -> random exit
  { from: "admin", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //each toilet (*agents) -> random exit
  { from: "toilet", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //each closet (*agents) -> random exit
  { from: "closed", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //The Canteen (*agents) -> each exit
  { from: "canteen", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //The Cafe (*agents) -> each exit
  { from: "cafe", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
  //The Library (*agents) -> each exit
  { from: "library", to: "exit", fromNum: 'all', toNum: 1, energy: "dirt", multiplier: "agents" },
];

var Config = {
  serverUrl: Platform.isPlask ? 'http://localhost:8080' : 'http://localhost:8080',
  settingsFile: Platform.isPlask ? __dirname + '/settings.json' : 'settings.json',
  dataPath: Platform.isPlask ? __dirname + '/../data' : 'data',
  roomIdMap: RoomIdMap,
  energyTypes: EnergyTypes,
  agentTypes: AgentTypes,

  //map
  cellCloseness: 0.00155,
  cellEdgeWidth: 1,
  bgColor: '#312D2D',
  membraneColor: '#EEEEEE',

  agentLineColor: '#000000',
  agentFillColor: '#FFFFFF',
  agentFillColorBasedOnAccentColor: true,
  agentInvertFillAndLineColorBasedOnGender: true,

  roomTypes: RoomTypes,
  floors: Floors,
  energyPaths: EnergyPaths,

  minStudentAge: 18,
  maxStudentAge: 40,

  maxDistortPoints: 100,

  energySpriteSize: 0.5,
  agentSpriteSize: 10,

  energyPointsPerPathLength: 50,
  energyAgentCountStrength: 2,
  energyIntensityStrength: 5,

  cameraRotationDuration: 120*5, //10min,

  floorId: FloorId,

  parseColors: parseColors
};

function parseColors() {
  Object.keys(Config).forEach(function(key) {
    var value = Config[key];
    if (value && value.length && value[0] == '#') {
      Config[key] = Color.fromHex(Config[key]);
    }
  })


  Object.keys(Config.energyTypes).forEach(function(type) {
    if (Config.energyTypes[type].color[0] == '#') {
      Config.energyTypes[type].color = Color.fromHex(Config.energyTypes[type].color);
    }
  })

  Object.keys(Config.agentTypes).forEach(function(agentType) {
    if (Config.agentTypes[agentType].colors[0][0] == '#') {
      Config.agentTypes[agentType].colors[0] = Color.fromHex(Config.agentTypes[agentType].colors[0]);
      Config.agentTypes[agentType].colors[1] = Color.fromHex(Config.agentTypes[agentType].colors[1]);
    }
  })

  Object.keys(Config.roomTypes).forEach(function(type) {
    var roomType = Config.roomTypes[type];
    if (roomType.color[0] =='#') roomType.color = Color.fromHex(roomType.color);
    if (roomType.centerColor[0] =='#') roomType.centerColor = Color.fromHex(roomType.centerColor);
    if (roomType.edgeColor[0] =='#') roomType.edgeColor = Color.fromHex(roomType.edgeColor);
  });
}

Config.parseColors();

module.exports = Config;