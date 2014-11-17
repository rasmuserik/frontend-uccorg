var R       = require('ramda');
var random  = require('pex-random');
var color   = require('pex-color');

var Color   = color.Color;

function spawnStudents(state, agents) {
  var aliveStudents = R.filter(R.where({ studentId: R.identity }), agents);

  var aliveStudentsIds = R.map(R.prop('studentId'), aliveStudents);
  var currentStudentsIds = R.map(R.prop('id'), state.activities.currentStudents);

  var studentsToSpawn = R.difference(currentStudentsIds, aliveStudentsIds);

  if (state.verbose) console.log('spawnStudents', 'aliveStudentsIds:', aliveStudentsIds.length, 'currentStudentsIds:', currentStudentsIds.length, 'studentsToSpawn:', studentsToSpawn.length);

  studentsToSpawn.forEach(function(studentId) {
    var position = random.element(state.map.selectedNodes).position;
    var color = Color.Red;
    state.entities.push({
      pointSize: 5,
      agent: true,
      position: position,
      prevPosition: position.dup(),
      color: color,
      targetNode: null,
      studentId: studentId
    });
  })
}

function agentSpawnSys(state) {
  var agents = R.filter(R.where({ agent: R.identity }), state.entities);

  spawnStudents(state, agents);

  

  //state.activities.current.forEach(function(activity) {
  //  activity.groups.map(function(groupId) {
  //    var group = state.groups.byId[groupId];
  //    if (!group) return;
  //    group.students.forEach(function(student) {
  //      if (aliveAgentsIds.indexOf(student.id) == -1) {
//
  //      }
  //    })
  //  }))
  //})

  //for(var i=0; i<100 - agents.length; i++) {
    
  //}

  //if (!State.selectedNodes) return;
  //  if (agents.length >= State.maxNumAgents) return;
  //
  //  var selectedNodes = State.selectedNodes;
  //  var stairsNodes = selectedNodes.filter(function(node) {
  //    return !node.neighbors.reduce(function(sameFloorSoFar, neighborNode) {
  //      return sameFloorSoFar && (neighborNode.floor == node.floor);
  //    }, true)
  //  });
  //  var stairsPointVertices = stairsNodes.map(R.prop('position'));
  //
  //  if (stairsPointVertices.length == 0) return;
  //
  //  var colors = [
  //    new Color(181/255,  77/255, 243/255),
  //    new Color(206/255, 244/255,  62/255),
  //    new Color(0/255,  150/255, 250/255)
  //  ]
  //
  //  var position = geom.randomElement(stairsPointVertices).clone();
  //  var color = geom.randomElement(colors);
  //  State.entities.push({
  //    pointSize: 5,
  //    agent: true,
  //    position: position,
  //    prevPosition: position.dup(),
  //    color: color,
  //    targetNode: null,
  //  });
}

module.exports = agentSpawnSys;