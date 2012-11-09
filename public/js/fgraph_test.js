var factory = G.getFactory();

console.log('Factory name: ' + factory.name);

console.log("node children type " + G.Types.node.children().val());

var graph = factory.createGraph('graph1');


var node1 = factory.createNode('node1');
var node2 = factory.createNode('node2');

graph.nodes().add(node1).add(node2).addNew();

var link1 = factory.createLink();
var link2 = factory.createLink();


node1.links().add(link1);
node2.links().add(link2);

link1.bind(link2);

console.log("" + G.json.stringify(graph, "  "));