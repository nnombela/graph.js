var factory = G.getFactory();

console.log('Factory name: ' + factory.name);

console.log("node children type " + G.Types.node.children().val());

var graph = factory.createGraph('graph1');


var node1 = factory.createNode('node1');
var node2 = factory.createNode('node2');

graph.nodes().add(node1).add(node2).addNew();

var link1 = factory.createLink('link1');


node1.links().add(link1);
var link2 = node2.links().addNew();

link1.bind(link2);

var stringify = G.json.stringify(graph, "  ");
console.log("----");
console.log("Original: " + stringify);

var graph2 = G.json.parse(stringify);

console.log("----");
console.log("New: " + G.json.stringify(graph2, "  "));
