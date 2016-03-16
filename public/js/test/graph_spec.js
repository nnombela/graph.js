describe("G Types", function() {

    it("children", function() {
        expect(G.Types.Node.children()).toEqual(G.Types.Links);
    });
});


describe("G Default Factory", function() {
    var factory = G.getFactory();

    it("Factory name", function() {
        expect(factory.fullname).toBe("default");
    });

});

describe("Default Graph", function() {
    var factory = G.getFactory();

    var graph = factory.createGraph('graph1');

    var node1 = factory.createNode('node1');
    var node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    var link1 = factory.createLink('link1');

    node1.links().add(link1);
    var link2 = node2.links().addNew();

    link1.bind(link2);

    it("nodes", function() {
        var nodes = graph.nodes();

        expect(nodes.size()).toBe(3);
        expect(nodes.contains(node1)).toBe(true);
        expect(nodes.contains(node2)).toBe(true);
    });

    it("links", function() {
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

