
describe("G default", function() {

    var factory = G.getFactory();

    var graph = factory.createGraph('graph1');


    var node1 = factory.createNode('node1');
    var node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    var link1 = factory.createLink('link1');
    node1.links().add(link1);

    var link2 = node2.links().addNew('link2');

    link1.bind(link2);


    it("stringify - parse", function() {
        var stringify = G.JSON.stringify(graph);
        console.log("graph: " + stringify);

        var graph2 = G.JSON.parse(stringify);

        var stringify2 = G.JSON.stringify(graph);

        console.log("graph2: " + stringify2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe("G default, directed=true", function() {

    var factory = G.getFactory({directed: true});

    var graph = factory.createGraph('graph1');


    var node1 = factory.createNode('node1');
    var node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    var link1 = factory.createLink('link1');
    node1.links(G.Direction.in).add(link1);

    var link2 = node2.links().addNew('link2');

    link1.bind(link2);


    it("stringify - parse", function() {
        var stringify = G.JSON.stringify(graph);
        console.log("graph: " + stringify);

        var graph2 = G.JSON.parse(stringify);

        var stringify2 = G.JSON.stringify(graph);

        console.log("graph2: " + stringify2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

