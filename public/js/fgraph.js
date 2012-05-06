(function() {
    var root = this;

    var Types = OOP.enumeration(['graph', 'nodes', 'node', 'links', 'link'], {
        children: function() {
            return Types.values[Types.values.indexOf(this) + 1];
        }
    });

    var Direction = OOP.enumeration(['in', 'out'], {
        reverse: function() {
            return this === Direction['in']? Direction['out'] : Direction['out'];
        }
    });

    var Duality =  OOP.enumeration(['hvert', 'hedge'], {
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

        config: OOP.composite({name: 'default'}),

        type: function() {
            return this._owner.children();
        },

        factory: function() {
            return GraphFactory.getFactory(this.config);
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
        augments: [Iterability, Accessibility],

        initialize: function(owner) {
            this._owner = owner;
            this._children = [];
        },
        factory: function() {
            return this._owner.factory();
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
    });


    var DuoGraphContainer = GraphObject.extend({
        augments: [Iterability, Accessibility],

        factory: function() {
            return this._owner.factory();
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
    });

// ---- Links

    var Link = GraphObject.extend({
        initialize: function() {
            this._pair = null;
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

// ----
    var Directed = {
        config: {directed: true}
    };

    var Fractal = {
        config: {fractal: true}
    };

    var Dual = {
        config: {dual: true}
    };
// -----
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
        }
    };

// -------------- Links

    var LinksDirectability = {
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
        }
    };


// --------------- Node

    var Node = GraphObject.extend({
        initialize: function() {
            this._links = this.factory().createLinks(this);
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


// ---------------- Nodes

    var NodesDuality = {
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


// ----------------- Graph
    var Graph = GraphObject.extend( {
        initialize: function() {
            this._nodes = this.factory().createNodes(this)
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
        },
        ordinal: function() {
            return this._up? this._up.ordinal() - 1 : 0;
        }
    };

// ----------------- Graph Factory

    var GraphFactory = OOP.Class.extend({
        statics: {
            VERSION: '0.1',

            Config: OOP.enumeration(['directed', 'dual', 'fractal']),

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
        constructor: function(config, props) {
            this.config = config;
            this.name = GraphFactory._configToName(config);
            FP.extend(this, props);
        },

        create: function(type, arg) {
            return new this[type.val().toUpperCase()](arg);
        },

        createLink: function(label) {
            return new this.Link(label)
        },
        createLinks: function(owner) {
            return new this.Links(owner)
        },
        createNode: function(label) {
            return new this.Node(label)
        },
        createNodes: function(owner) {
            return new this.Nodes(owner)
        },
        createGraph: function(label) {
            return new this.Graph(label)
        }
    });

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Links: GraphContainer,
        Node: Node,
        Nodes: GraphContainer,
        Graph: Graph
    });

    GraphFactory.register({name: 'default', directed: true}, {
        Link: Link.extend({
            augments: [Directed, LinkDirectability]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed],
            Container: GraphContainer.extend({
                augments: [Directed, LinksDirectability]
            }),
            initialize: function(owner) {
                this['0'] = this['in'] = new this.Container(owner);
                this['1'] = this['out'] = new this.Container(owner);
            }
        }),
        Node: Node.extend({
            augments: [Directed, NodeDirectability]
        }),
        Nodes: GraphContainer.extend({
            augments: [Directed]
        }),
        Graph: Graph.extend({
            augments: [Directed]
        })
    });



    GraphFactory.register({name: 'default', dual: true}, {
        Link: null,
        Links: null,
        Node: null,
        Nodes: null,
        Graph: null
    });

    GraphFactory.register({name: 'default', fractal: true}, {
        Link: null,
        Links: null,
        Node: null,
        Nodes: null,
        Graph: null
    });

    GraphFactory.register({name: 'default', directed:true, dual: true}, {
        Link: null,
        Links: null,
        Node: null,
        Nodes: null,
        Graph: null
    });

    GraphFactory.register({name: 'default', directed:true, fractal: true}, {
        Link: null,
        Links: null,
        Node: null,
        Nodes: null,
        Graph: null
    });

    GraphFactory.register({name: 'default', dual:true, fractal: true}, {
        Link: null,
        Links: null,
        Node: null,
        Nodes: null,
        Graph: null
    });

    GraphFactory.register({name: 'default', directed: true, dual:true, fractal: true}, {
        Link: null,
        Links: null,
        Node: null,
        Nodes: null,
        Graph: null
    });

    return root.G = GraphFactory;


}).call(this);

var factory = G.getFactory();

console.log('Factory name: ' + factory.name);

console.log("children type " + G.Types.node.children().val());

var graph = factory.createGraph("graph1");

//
//var node1 = new factory.Node();
//var node2 = new factory.Node();
//
//graph.nodes().add(node1).add(node2);
//
//var link1 = new factory.Link();
//var link2 = new factory.Link();
//
//
//node1.links().add(link1);
//node2.links().add(link2);
//
//link1.bind(link2);
//






