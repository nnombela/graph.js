
var G = this.G;

describe("Graph Aspects", function() {

    it("a Type member has a children and a parent", function() {
        expect(G.Types.Node.children()).toEqual(G.Types.Links);
        expect(G.Types.Node.parent()).toEqual(G.Types.Nodes);
    });

    it("a Type member container is a container", function() {
        expect(G.Types.Graphs.isContainer()).toEqual(true);
        expect(G.Types.Graph.isContainer()).toEqual(false);
    });

    it("a Direction member has a reverse", function() {
        expect(G.Direction.In.reverse()).toEqual(G.Direction.Out);
    });

    it("a Duality member has a dual", function() {
        expect(G.Duality.Vertex.dual()).toEqual(G.Duality.Edge);
    });
});


describe("Graph Default Factory", function() {
    const defaultFactory = G.getFactoryByConfig();

    it("Default Factory has 'default' name", function() {
        expect(defaultFactory.name).toBe("default");
    });

});

describe("Default Graph", function() {
    const factory = G.getFactoryByConfig();
    const graph = factory.createGraph('graph1');
    const node1 = factory.createNode('node1');
    const node2 = new factory.Node('node2');
    graph.nodes().add(node1).add(node2).addNew();

    const link1 = factory.createLink('link1');
    node1.links().add(link1);

    const link2 = node2.links().addNew();
    link1.bind(link2);

    it("Graph nodes contains nodes", function() {
        var nodes = graph.nodes();

        expect(nodes.size()).toBe(3);
        expect(nodes.contains(node1)).toBe(true);
        expect(nodes.contains(node2)).toBe(true);
    });

    it("Graph links contains links and are bound", function() {
        var links1 = node1.links();
        var links2 = node2.links();

        expect(links1.size()).toBe(1);
        expect(links1.contains(link1)).toBe(true);
        expect(links1.contains(link2)).toBe(false);

        expect(links2.size()).toBe(1);
        expect(links2.contains(link2)).toBe(true);

        expect(link1.pair()).toEqual(link2);
    });



});

