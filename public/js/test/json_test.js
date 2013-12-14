var factory = G.getFactory();

console.log('Factory name: ' + factory.name);

console.log("children type for type node: " + G.Types.node.children().val());

var graph = factory.createGraph('graph1');


var node1 = factory.createNode('node1');
var node2 = new factory.Node('node2');

graph.nodes().add(node1).add(node2).addNew();

var link1 = factory.createLink('link1');
node1.links().add(link1);

var link2 = node2.links().addNew('link2');

link1.bind(link2);

var stringify = G.JSON.stringify(graph);
console.log("----");
console.log("Original: " + stringify);

var graph2 = G.JSON.parse(stringify);

console.log("----");
console.log("New: " + G.JSON.stringify(graph2, "  "));
