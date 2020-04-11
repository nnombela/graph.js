const G = this.G;

describe('G default', function() {

    const factory = G.getFactoryByConfig();

    const graph = factory.createGraph('graph1');

    const node1 = factory.createNode('node1');
    const node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    const link1 = factory.createLink('link1');
    node1.links().add(link1);

    const link2 = node2.links().addNew();

    link1.bind(link2);

    it('stringify - parse', function() {
        const stringify = G.JSON.stringify(graph);
        console.log('stringify: ' + stringify);

        const graph2 = G.JSON.parse(stringify);

        const stringify2 = G.JSON.stringify(graph2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe('G default, directed=true', function() {

    const factory = G.getFactoryByConfig({directed: true});

    const D = G.Direction;

    const graph = factory.createGraph('graph2');

    const node1 = factory.createNode('node1');
    const node2 = new factory.Node('node2');

    graph.nodes().add(node1).add(node2).addNew();

    const link1 = factory.createLink('link1');
    node1.links(D.In).add(link1);
    const link3 = node1.links(D.Out).addNew();

    const link2 = node2.links(D.Out).addNew('link2');
    const link4 = node2.links(D.In).addNew();

    link1.bind(link2);
    link3.bind(link4);

    //link1.bindReverse(link3);
    //link2.bindReverse(link4);

    it('stringify - parse', function() {
        const stringify = G.JSON.stringify(graph);
        console.log('stringify: ' + stringify);

        const graph2 = G.JSON.parse(stringify);

        const stringify2 = G.JSON.stringify(graph2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe('G default, dual=true', function() {

    const factory = G.getFactoryByConfig({dual: true});

    const D = G.Duality;

    const graph = factory.createGraph('graph2');

    const node1 = factory.createNode('node1');
    const node2 = new factory.Node('node2');

    graph.nodes(D.Vertex).add(node1).addNew();
    graph.nodes(D.Edge).add(node2);

    const link1 = factory.createLink('link1');
    node1.links().add(link1);

    const link3 = node1.links().addNew();

    const link2 = node2.links().addNew('link2');
    const link4 = node2.links().addNew();

    link1.bind(link2);
    link3.bind(link4);

    it('stringify - parse', function() {
        const stringify = G.JSON.stringify(graph);
        console.log('stringify: ' + stringify);

        const graph2 = G.JSON.parse(stringify);

        const stringify2 = G.JSON.stringify(graph2);

        expect(graph.nodes().size()).toBe(graph2.nodes().size());

        expect(stringify).toEqual(stringify2);
    });
});

describe('G default, multilevel=true', function() {

    const factory = G.getFactoryByConfig({multilevel: true});

    const graph = factory.createGraph('graph3');

    const node1 = factory.createNode('node1');

    graph.nodes().add(node1).addNew();

    it('stringify - parse', function() {
        const stringify = G.JSON.stringify(graph);
        console.log('stringify: ' + stringify);

        const graph2 = G.JSON.parse(stringify);
        const stringify2 = G.JSON.stringify(graph2);

        //expect(stringify).toEqual(stringify2);
        expect(stringify).toContain('Graph');
    });
});

