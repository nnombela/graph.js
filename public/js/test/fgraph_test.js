var factory = G.getFactory();

console.log('Factory name: ' + factory.name);

console.log("children type for type node: " + G.Types.node.children().val());

var graph = factory.createGraph('graph1');


var node1 = factory.createNode('node1');
var node2 = new factory.Node('node2');

graph.nodes().add(node1).add(node2).addNew();

var link1 = factory.createLink('link1');


node1.links().add(link1);
var link2 = node2.links().addNew();

link1.bind(link2);
