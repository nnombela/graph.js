
var G = this.G;

describe("G default", function() {

    var factory = G.getByConfig();

    var graph = factory.createGraph('graph1');


    var node1 = factory.createNode('node1');
    var node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    var link1 = factory.createLink('link1');
    node1.links().add(link1);

    var link2 = node2.links().addNew();

    link1.bind(link2);


    it("stringify - parse", function() {
        var stringify = G.JSON.stringify(graph);
        console.log("stringify: " + stringify);

        var graph2 = G.JSON.parse(stringify);

        var stringify2 = G.JSON.stringify(graph2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe("G default, directed=true", function() {

    var factory = G.getByConfig({directed: true});

    var D = G.Direction;

    var graph = factory.createGraph('graph2');


    var node1 = factory.createNode('node1');
    var node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    var link1 = factory.createLink('link1');
    node1.links(D.In).add(link1);
    var link3 = node1.links(D.Out).addNew();

    var link2 = node2.links(D.Out).addNew('link2');
    var link4 = node2.links(D.In).addNew();

    link1.bind(link2);
    link3.bind(link4);

    //link1.bindReverse(link3);
    //link2.bindReverse(link4);


    it("stringify - parse", function() {
        var stringify = G.JSON.stringify(graph);
        console.log("stringify: " + stringify);

        var graph2 = G.JSON.parse(stringify);

        var stringify2 = G.JSON.stringify(graph2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe("G default, dual=true", function() {

    var factory = G.getByConfig({dual: true});

    var D = G.Duality;

    var graph = factory.createGraph('graph2');


    var node1 = factory.createNode('node1');
    var node2 = new factory.Node('node2');

    graph.nodes(D.Vertex).add(node1).addNew();
    graph.nodes(D.Edge).add(node2);

    var link1 = factory.createLink('link1');
    node1.links().add(link1);

    var link3 = node1.links().addNew();

    var link2 = node2.links().addNew('link2');
    var link4 = node2.links().addNew();

    link1.bind(link2);
    link3.bind(link4);


    it("stringify - parse", function() {
        var stringify = G.JSON.stringify(graph);
        console.log("stringify: " + stringify);

        var graph2 = G.JSON.parse(stringify);

        var stringify2 = G.JSON.stringify(graph2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe("G default, multilevel=true", function() {

    var factory = G.getByConfig({multilevel: true});

    var top = factory.createGraph('top');

    var graphs = factory.createGraphs('graphs', top);

//
//
//    it("stringify - parse", function() {
//        expect(stringify).toEqual(stringify2);
//    });
});

