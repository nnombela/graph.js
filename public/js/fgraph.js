(function() {
    var root = this;

    var Types = enumeration(['graph', 'nodes', 'node', 'links', 'link'], {
        children: function() {
            return Types.values[Types.values.indexOf(this) + 1];
        }
    });

    var Direction = enumeration(['in', 'out'], {
        reverse: function() {
            return this === Direction['in']? Direction['out'] : Direction['out'];
        }
    });

    var Duality =  enumeration(['hvert', 'hedge'], {
        dual: function() {
            return this === Duality['hvert']? Duality['hedge'] : Duality['hvert'];
        }
    });


    var GraphObject = OOP.Class.extend({
        statics: {
            Types: Types
        },

        constructor: function() {
            this.initialize(arguments);
        },

        initialize: OOP.composite(function(label) {
            this._label = label;
            this._owner = null;
        }),

        type: function() {
            return this._owner.children();
        },

        factory: function() {
            return this._owner.factory();
        },
        label: function() {
            return this._label? this._label : this._owner?
                    this._owner.label() + '::' + this.type().val() + ':' + this.index() : this.type().val();
        },
        index: function() {
            return this._owner? this._owner.indexOf(this) : -1;
        },
        belongsTo: function(type) {
            return type === undefined || this.type() === type? this : this._owner.belongsTo(type);
        },
        free: function() {
            if (this._owner) this._owner.free(this);
            this._owner = null;
            return this;
        }
    });

    var Iterability = {
        Iterator: OOP.Class.extend({
            constructor: function(container) {
                this.container = container;
                this._cursor = -1;
            },
            current: function() {
                return this.container.get(this._cursor);
            },
            next: function() {
                return this.container.get(++this._cursor);
            },
            hasNext: function() {
                return this._cursor + 1 < this.container.size();
            },
            index: function() {
                return this._cursor;
            }
        }),
        iterator: function() {
            return new this.Iterator(this);
        }
    };

    var Accessibility = {
        Accessor: OOP.Class.extend({
            constructor: function(container) {
                this.container = container;
                this.array = [];
            },
            get: function(gobj) {
                return this.array[gobj.index()];
            },
            set: function(gobj, value) {
                this.array[gobj.index()] = value;
            }
        }),
        accessor: function() {
            return new this.Accessor(this);
        }
    };

    var GraphContainer = GraphObject.extend({
        initialize: function() {
            this._children = [];
        },

        get: function(index) {
            return this._children[index];
        },
        size: function() {
            return this._children.length;
        },
        forEach: function(func) {
            this._children.forEach(func);
            return this;
        },
        indexOf: function(child) {
            return this._children.indexOf(child);
        },
        find: function(func) {
            return this._children.find(func);
        },
        contains: function(gobj) {
            return this.indexOf(gobj) !== -1;
        },
        add: function(gobj) {
            if (this.type().children() === gobj.type()) {
                gobj._owner = this;
                this._children.push(gobj);
                return this;
            } else {
                throw new Error('Incorrect type: ' + gobj.type().val());
            }
        },
        addNew: function() {
            return this.add(new this.factory().create(this.type().children()))
        },
        remove: function(gobj) {
            var idx = this.indexOf(gobj);
            if (idx !== -1) {
                this._children.splice(idx, 1);
            }
            return idx;
        },
        free: function(gobj) {
            return gobj? this.remove(gobj) : GraphObject.super_.free.call();
        }
    }).extend(Iterability).extend(Accessibility);

    var DuoGraphContainer = GraphObject.extend({
        initialize: function(label, config) {
            var keys = Object.keys(config);
            this['0'] = this[keys[0]] = config[keys[0]];
            this['1'] = this[keys[1]] = config[keys[1]];
        },

        container: function(name) {
            return this[name];
        },
        get: function(index) {
            var size0 = this[0].size();
            return index < size0? this[0].get(index) : this[1].get(index - size0);
        },
        indexOf: function(gobj) {
            var indexOf0 = this[0].indexOf(gobj);
            return indexOf0 === -1? indexOf0 : this[1].indexOf(gobj);
        },
        forEach: function(func) {
            this[0].forEach(func);
            this[1].forEach(func);
            return this;
        },
        find: function(func) {
            var result = this[0].find(func);
            return result? result : this[1].find(func);

        },
        size: function() {
            return this[0].size() + this[1].size();
        },
        add: function(gobj, name) {
            return this[name].add(gobj);
        },
        addNew: function(name) {
            return name? this[name].addNew() : this[0].addNew();
        },
        remove: function(gobj, name) {
            if (name) {
                return this[name].remove(gobj);
            } else {
                var idx = this[0].remove(gobj);
                return idx !== -1? idx : this[1].remove(gobj);
            }
        },
        free: function() {
            DuoGraphContainer.super_.free.call(this);
            this[0].free();
            this[1].free();
            return this;
        }
    }).augment(Iterability).augment(Accessibility);

// ---- Link
    var Link = GraphObject.extend({
        initialize: function() {
            this._pair = null;
        },
        factory: function() {
            return GraphFactory.getFactory();
        },
        type: function() {
            return Types.link;
        },
        bind: function(pair) {
            this._bind('_pair', pair);
        },
        unbind: function() {
            this._unbind('_pair')
        },
        node: function() {
            return this._owner._owner;
        },
        to: function() {
            return this._pair.node();
        },
        pair: function() {
            return this._pair;
        },
        // ---- Private methods
        _bind: function(prop, pair) {
            if (this[prop] === null && pair[prop] === null) {
                this[prop] = pair;
                pair[prop] = this;
            } else if (this[prop] !== pair || pair[prop] !== this) {
                throw new Error('Not able to bind links ( ' + this.label() + ', ' + pair.label() + ')')
            }
        },
        _unbind: function(prop) {
            var pair = this[prop];
            if (pair !== null) {
                pair[prop] = null;
                this[prop] = null;
            }
        }
    });

    var LinkDirectability = {
        statics: {
            Direction: Direction
        },

        initialize: function() {
            this._reverse = null;
        },

        reverse: function() {
            return this._reverse;
        },
        bindReverse: function(pair) {
            this._bind('_reverse', pair);
        },
        unbindReverse: function() {
            this._unbind('_reverse')
        },

        direction: function() {
            return this._owner.direction();
        }
    };

    var LinkFractality = {
        initialize: function() {
            this._down = null;
            this._inverse = null;
        },

        inverse: function() {
            return this._inverse;
        },
        bindInverse: function(pair) {
            this._bind('_inverse', pair);
        },
        unbindInverse: function() {
            this._unbind('_inverse')
        },

        down: function() {
            return this._down;
        },
        ordinal: function() {
            return this._owner.ordinal();
        }
    };

    var DiLink = inherits(Link, {
        factory: function() {
            return this;
        }
    }).extend(LinkDirectability);

    var FracLink = inherits(Link, {
        factory: function() {
            return this;
        }
    }).extend(LinkFractality);

    var FracDiLink = inherits(Link, {
        factory: function() {
            return this;
        }
    }).extend(LinkDirectability).extend(LinkFractality);


// -------------- Links

    var LinksDirectability = {
        statics: {
            Direction: Direction
        },
        initialize: function(owner, direction) {
            this._direction = direction;
        },
        index: function() {
            this._direction.idx();
        },
        reverse: function() {
            return this._owner.links(this._direction.reverse());
        },

        direction: function() {
            return this._direction;
        }
    };


    var LinksFractality = {
        inverse: function(direction) {
            return this._owner.inverse().links(direction);
        },

        ordinal: function() {
            return this._owner.ordinal();
        }
    };

    var Links = GraphContainer;

    var DiLinks = inherits(GraphContainer, {

    }).extend(LinksDirectability);

    var FracLinks = inherits(GraphContainer, {

    }).extend(LinksFractality);

    var FracDiLinks = inherits(GraphContainer, {

    }).extend(LinksDirectability).extend(LinksFractality);

// --------------- Node

    var Node = GraphObject.extend({
        initialize: function() {
            this._links = this.factory().Links();
        },
        type: function() {
            return Types.node;
        },
        graph: function() {
            return this._owner._owner;
        },
        links: function() {
            return this._links;
        },
        indexOf: function(links) {
            return this._links === links? 0 : -1;
        }
    });

    var NodeDirectability = {
        statics: {
            Direction: Direction
        },
        links: function(direction) {
            return direction? this._links.container(direction.val()) : this._links;
        }
    };

    var NodeFractality = {
        initialize: function() {
            this._inverse = null;
            this._down = null;
            this._up = null;
        },
        inverse: function() {
            return this._inverse;
        },
        down: function() {
            return this._down;
        },
        up: function() {
            return this._up;
        }
    };

    var NodeDuality = {
        statics: {
            Duality: Duality
        },
        duality: function() {
            return this._owner.duality();
        }
    };


    var DiNode = inherits(Node, {
        _createLinks: function() {
            var config = { 'in': new DiLinks(this, Direction['in']), 'out': new DiLinks(this, Direction['out']) };
            return new DuoGraphContainer(config);
        },
        factory: function() {
            return this;
        }
    }).extend(NodeDirectability);

    var DualNode = inherits(Node, {
        factory: function() {
            return this;
        }
    }).extend(NodeDuality);

    var DualDiNode = inherits(Node, {
        _createLinks: function() {
            var config = { 'in': new DiLinks(this, Direction['in']), 'out': new DiLinks(this, Direction['out']) };
            return new DuoGraphContainer(config);
        },
        factory: function() {
            return this;
        }
    }).extend(NodeDirectability).extend(NodeDuality);

    var FracNode = inherits(Node, {
        _createLinks: function()  {
            return new FracLinks(this);
        },
        factory: function() {
            return this;
        }
    }).extend(NodeFractality);

    var FracDiNode = inherits(Node, {
        _createLinks: function() {
            var config = { 'in': new FracDiLinks(this, Direction['in']), 'out': new FracDiLinks(this, Direction['out']) };
            return new DuoGraphContainer(config);
        },
        factory: function() {
            return this;
        }
    }).extend(NodeDirectability).extend(NodeFractality);

    var FracDualNode = inherits(DualNode, {
        _createLinks: function()  {
            return new FracLinks(this);
        },
        factory: function() {
            return this;
        }
    }).extend(NodeFractality);

    var FracDualDiNode = inherits(Node, {
        _createLinks: function() {
            var config = { 'in': new FracDiLinks(this, Direction['in']), 'out': new FracDiLinks(this, Direction['out']) };
            return new DuoGraphContainer(config);
        },
        factory: function() {
            return this;
        }
    }).extend(NodeDirectability).extend(NodeDuality).extend(NodeFractality);



// ---------------- Nodes

    var NodesDuality = {
        statics: {
            Duality: Duality
        },
        initialize: function(owner, duality) {
            this._duality = duality;
        },
        dual: function() {
            return this._owner.nodes(this._duality.dual());
        },
        duality: function() {
            return this._duality;
        }
    };

    var NodesFractality = {
        ordinal: function() {
            return this._owner.ordinal();
        }
    };


    var Nodes = GraphContainer;

    var DualNodes = inherits(GraphContainer, {
        factory: function() {
            return this;
        }
    }).extend(NodesDuality);

    var FracNodes = inherits(GraphContainer, {
        factory: function() {
            return this;
        }
    }).extend(NodesFractality);

    var FracDualNodes = inherits(GraphContainer, {
        factory: function() {
            return this;
        }
    }).extend(NodesDuality).extend(NodesFractality);



// ----------------- Graph
    var Graph = GraphObject.extend( {
        initialize: function() {
            this._nodes = new this.factory().Nodes()
        },
        type: function() {
            return Types.graph;
        },
        nodes: function() {
            return this._nodes;
        },
        indexOf: function(nodes) {
            return this._nodes === nodes? 0 : -1;
        }
    });

    var GraphDuality = {
        nodes: function(duality) {
            return duality? this._nodes.container(duality) : this._nodes;
        }
    };

    var GraphFractality = {
        initialize: function() {
            this._up = null;
        },
        up: function() {
            return this._up;
        },
        next: function() {
            return this._up.graph();
        }
    };

    var DualGraph = inherits(Graph, {
        _createNodes: function() {
            var config = { 'hvert': new DualNodes(this, Duality['hvert']), 'hedge': new DualNodes(this, Duality['hedge']) };
            return new DuoGraphContainer(config);
        },
        factory: function() {
            return this;
        }
    }).extend(GraphDuality);

    var FracGraph = inherits(Graph, {
        _createNodes: function() {
            return new FracNodes(this);
        },
        factory: function() {
            return this;
        }
    }).extend(GraphFractality);

    var FracDualGraph = inherits(DualGraph, {
        _createNodes: function() {
            var config = { 'hvert': new FracDualNodes(this, Duality['hvert']), 'hedge': new FracDualNodes(this, Duality['hedge']) };
            return new DuoGraphContainer(config);
        },
        factory: function() {
            return this;
        }
    }).extend(GraphFractality);


// ----------------- Graph Factory

    var GraphFactory = OOP.Class.extend({
        statics: {
            VERSION: '0.1',

            Config: enumeration(['directed', 'dual', 'fractal']),

            Types: Types,
            Direction: Direction,
            Duality: Duality,

            register: function(config, props) {
                var factory = new GraphFactory(config, props);
                GraphFactory[factory.name] = factory;
                return factory;
            },
            getFactory: function(config) {
                return GraphFactory[GraphFactory._configToName(config || {})];
            },
            _configToName: function(config) {
                var name = config.name || 'default';
                if (config.directed) {
                    name += '_directed';
                }
                if (config.dual) {
                    name += '_dual';
                }
                if (config.fractal) {
                    name += '_fractal';
                }
                return name;
            }
        },
        create: function(Type) {
            return new Type(this);
        },

        constructor: function(config, props) {
            this.config = config;
            this.name = GraphFactory._configToName(config);
            extend(this, props);
        }
    });

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Links: Links,
        Node: Node,
        Nodes: Nodes,
        Graph: Graph
    });

    GraphFactory.register({name: 'default', directed: true}, {
        createLink: function()  { return new DiLink(this) },
        createLinks: function() {
            var config = { 'in': new DiLinks(this, Direction['in']), 'out': new DiLinks(this, Direction['out']) };
            return new DuoGraphContainer(config);
        },
        createNode: function()  { return new DiNode(this)   },
        createNodes: function() { return new Nodes(this)  },
        createGraph: function() { return new Graph(this)  },

        Link: DiLink,
        Node: DiNode,
        Graph: Graph
    });

    GraphFactory.register({name: 'default', dual: true}, {
        Link: Link,
        Node: DualNode,
        Graph: DualGraph
    });

    GraphFactory.register({name: 'default', fractal: true}, {
        Link: FracLink,
        Node: FracNode,
        Graph: FracGraph
    });

    GraphFactory.register({name: 'default', directed:true, dual: true}, {
        Link: DiLink,
        Node: DualDiNode,
        Graph: DualGraph
    });

    GraphFactory.register({name: 'default', directed:true, fractal: true}, {
        Link: FracDiLink,
        Node: FracDiNode,
        Graph: FracGraph
    });

    GraphFactory.register({name: 'default', dual:true, fractal: true}, {
        Link: FracLink,
        Node: FracDualNode,
        Graph: FracDualGraph
    });

    GraphFactory.register({name: 'default', directed: true, dual:true, fractal: true}, {
        Link: FracDiLink,
        Node: FracDualDiNode,
        Graph: FracDualGraph
    });

    return root.G = GraphFactory;


}).call(this);

var factory = G.getFactory();

console.log('Factory name: ' + factory.name);

console.log("children type " + Graph.Types.node.children().val());


factory.create(G.graph);

var graph = new factory.createGraph();

var node1 = new factory.Node();
var node2 = new factory.Node();

graph.nodes().add(node1).add(node2);

var link1 = new factory.Link();
var link2 = new factory.Link();


node1.links().add(link1);
node2.links().add(link2);

link1.bind(link2);







