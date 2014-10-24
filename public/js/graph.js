//  graph.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  Graph library
(function(root) {
    // dependencies
    var OOP = root.OOP, FP = root.FP;

    var Types = OOP.Enum.create(['graphs', 'graph', 'nodes', 'node', 'links', 'link'], {
        children: function() {
            return Types.members[this.idx() + 1];
        },
        parent: function() {
            return Types.members[this.idx() - 1];
        },
        capitalize: function() {
            return this.val().charAt(0).toUpperCase() + this.val().slice(1);
        }
    });

    var Direction = OOP.Enum.create(['in', 'out'], {
        reverse: function() {
            return this === Direction['in']? Direction['out'] :  Direction['in'];
        }
    });

    var Duality =  OOP.Enum.create(['hvert', 'hedge'], {
        dual: function() {
            return this === Duality['hvert']? Duality['hedge'] : Duality['hvert'];
        }
    });

    var GraphObject = OOP.Class.extend({
        statics: {
            Types: Types
        },

        constructor: function(label, owner) {
            if (label) {
                this._label = label;
            }
            this.initialize(owner);
        },

        config: OOP.Extendable.create({name: 'default'}),

        initialize: OOP.Extendable.create(function(owner) {
            if (!this._owner) {
                this._owner = owner;
            } else {
                throw new Error(this + ' is already initialized');
            }
        }),

        free: OOP.Extendable.create(function() {
            if (this._owner) {
                var owner = this._owner;
                this._owner = null;
                owner.free(this);
            }
        }),

        type: function() {
            return this._owner.type().children();
        },

        factory: function() {
            return GraphFactory.getFactory(this.config);
        },
        label: function() {
            return this._label? this._label : this.signature();
        },
        signature: function() {
            function prefix(owner) {
                var label = owner? owner.label() : undefined;
                return label? label.indexOf('#') != 0? '#' + label + ':' : label + ':' : '#';
            }
            function suffix(owner, owned) {
                var index = owner? owner.indexOf(owned) : -1;
                return index != -1? '[' + index + ']' : '';
            }
            return prefix(this._owner) + this.type().val() + suffix(this._owner, this);
        },
        toString: function() {
            return this.label();
        },
        index: function() {
            return this._owner? this._owner.indexOf(this) : -1;
        },
        indexOf: function() {
            return -1;
        },
        belongsTo: function(type) {
            return type === undefined || this.type() === type? this._owner : this._owner.belongsTo(type);
        },


        // ---- JSON
        toJSON: OOP.Extendable.create(function() {
            var json = Object.create(null);
            if (this._label) {
                json.label = this._label;
            }
            return json;
        }),

        fromJSON: OOP.Extendable.create(function(json, map) {
            if (json.label && json.label.indexOf('#') != 0) {
                this._label = json.label;
            }
            map[this.label()] = this;
        }),

        // ---- Private methods

        _bind: function(thisProp, that, thatProp) { // "this" is implicit
            thatProp = thatProp || thisProp; // if not given thatProp will be thisProp, sometimes have same name sometimes have dual names
            if (this[thisProp] === null && that[thatProp] === null) {
                this[thisProp] = that;
                that[thatProp] = this;
            } else if (this[thisProp] !== that || that[thatProp] !== this) { // it is already bound
                throw new Error('Objects are already bound ( ' + this + ', ' + that + ')')
            }
        },
        _unbind: function(thisProp, thatProp) {
            thatProp = thatProp || thisProp; // if not given thatProp will be thisProp
            var that = this[thisProp];
            if (that !== null && that[thatProp] === this) {
                that[thatProp] = null;
                this[thisProp] = null;
            }
        },
        _toJsonBind: function(json, name) {
            var _name = '_' + name;
            if (this[_name]) {
                json[name] = this[_name].label();
            }
            return json;
        },
        _fromJsonBound: function(json, map, name) {
            var bound = json[name];
            if (bound && map[bound]) {
                var _name = '_' + name;
                this._bind(_name, map[bound]);
            }
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
            members: function(gobj, value) {
                this.array[gobj.index()] = value;
            }
        }),
        accessor: function() {
            return new this.Accessor(this);
        }
    };

    var GraphContainer = GraphObject.extend({
        augments: [Iterability, Accessibility],

        initialize: function() {
            this._children = [];
        },

        free: function(owned) {
            if (owned) {
                this.remove(owned);
            } else {
                this.forEach(function(child) {
                    this.remove(child);
                })
            }
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
            if (gobj.type() === this.type().children() ) {
                gobj.initialize(this);
                this._children.push(gobj);
                return this;
            } else {
                throw new Error('This graph object ' + gobj + ' could not be added to ' + this + ' graph container');
            }
        },
        newChild: function(label) {
            return this.factory().create(this.type().children(), label, null);
        },
        addNew: function(label) {
            var gobj = this.newChild(label);
            this.add(gobj);
            return gobj;
        },
        remove: function(gobj) {
            var idx = this.indexOf(gobj);
            if (idx !== -1) {
                this._children.splice(idx, 1);
                gobj.free();
            }
            return idx;
        },

        toJSON: function() {
            return this._children.map(function(elem) {
                return elem.toJSON()
            })
        },
        fromJSON: function(json, map) {
            var container = this;
            json.forEach(function(child) {
                container.addNew().fromJSON(child, map);
            });
        }
    });


    var DuoGraphContainer = GraphObject.extend({
        augments: [Iterability, Accessibility],

        Container: GraphContainer,

        names: ['0', '1'],

        initialize: function(owner) {
            this[0] = new this.Container(undefined, owner);
            this[1] = new this.Container(undefined, owner);
        },

        factory: function() {
            return this._owner.factory();
        },
        container: function(enumerator) {
            return this[enumerator.idx()];
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
        add: function(gobj, enumerator) {
            return this.container(enumerator).add(gobj);
        },
        addNew: function(label, enumerator) {
            return enumerator? this.container(enumerator).addNew(label) : this[0].addNew(label);
        },
        remove: function(gobj) {
            var idx = this[0].remove(gobj);
            return idx !== -1? idx : this[1].remove(gobj);
        },
        free: function(owned) {
            if (owned) {
                return this.remove(owned);
            } else {
                this[0].free();
                this[1].free();
            }
        },
        toJSON: function() {
            var json = Object.create(null);
            json[this.names[0]] = this[0].toJSON();
            json[this.names[1]] = this[1].toJSON();
            return json;
        },
        fromJSON: function(json, map) {
            this[0].fromJSON(json[this.names[0]], map);
            this[1].fromJSON(json[this.names[1]], map);
        }
    });

// ---- Link

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
        toJSON: function(json) {
            return this._toJsonBind(json, 'pair');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'pair');
        },
        free: function() {
            this.unbind();
        }
    });

// ----- Link augments

    var LinkDirected = {
        config: {directed: true},

        initialize: function() {
            this._reverse = null;
        },

        bind: function(pair) {
            if (this.direction().reverse() == pair.direction()) {
                this._bind('_pair', pair);
                // TODO: find reverse and bind in case
            } else {
                throw new Error('Incorrect direction: ' + pair.direction());
            }
        },
        reverse: function() {
            return this._reverse;
        },
        bindReverse: function(reverse) {
            if (this.belongsTo().reverse() === reverse.belongsTo()) {
                this._bind('_reverse', reverse);
            } else {
                throw new Error("This " + this + " can not be reverse bound with that " + reverse)
            }
        },
        unbindReverse: function() {
            this._unbind('_reverse')
        },

        direction: function() {
            return this._owner.direction();
        },
        toJSON: function(json) {
            return this._toJsonBind(json, 'reverse');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'reverse');
        },
        free: function() {
            this.unbindReverse();
        }
    };

    var LinkMultilevel = {
        config: { multilevel: true },

        initialize: function() {
            this._downNode = null;
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
        bindDownNode: function(downNode) {
            this._bind('_downNode', downNode, '_upLink');
        },
        unbindDownNode: function() {
            this._unbind('_downNode', '_upLink')
        },
        downNode: function() {
            return this._downNode;
        },
        toJSON: function(json) {
            this._toJsonBind(json, 'inverse');
            return this._toJsonBind(json, 'downNode');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'inverse');
            this._fromJsonBound(json, map, 'downNode');
        },
        free: function() {
            this.unbindInverse();
            var downNode = this.downNode();
            this.unbindDownNode();
            downNode.free();
        }
    };

// -------------- Links augments

    var LinksDirected = {
        config: {directed: true},

        names: Direction.values,

        reverse: function() {
            return this._owner.links(this.direction().reverse());
        },
        direction: function() {
            return this._owner.direction(this);
        }
    };

    var LinksMultilevel = {
        config: { multilevel: true },

        inverse: function(direction) {
            return this._owner.inverse().links(direction);
        },

        add: function(link, downNode) {
            this._super("add", link);
            if (downNode) {
                link.bindDownNode(downNode);
            } else {
                var downNodes = this._owner.downGraph().nodes();
                downNodes.add(downNodes.newChild(), link, undefined);
            }
            return link;
        }
    };

// --------------- Node

    var Node = GraphObject.extend({
        initialize: function() {
            this._links = this.factory().createLinks(undefined, this);
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
        toJSON: function(json) {
            json.links = this.links().toJSON();
            return json
        },
        fromJSON: function(json, map) {
            this.links().fromJSON(json.links, map);
        },
        free: function() {
            this.links().free();
            return this._super('free');
        }
    });

// ----------- Node augments

    var NodeDirected = {
        config: {directed: true},

        links: function(direction) {
            return direction? this._links.container(direction) : this._links;
        },
        direction: function(links) {
            return this._links[0] === links? Direction['in'] : this._links[1] === links? Direction['out'] : undefined;
        },
        indexOf: function(links) {
            var direction = this.direction(links);
            return direction? direction : -1;
        }
    };

    var NodeMultilevel = {
        config: { multilevel: true },

        initialize: function() {
            this._inverse = null;
            this._downGraph = null;
            this._upLink = null;
        },
        inverse: function() {
            return this._inverse;
        },
        downGraph: function() {
            return this._downGraph;
        },
        upLink: function() {
            return this._upLink;
        },
        bindInverse: function(inverse) {
            this._bind('_inverse', inverse);
        },
        unbindInverse: function() {
            this._unbind('_inverse')
        },
        bindDownGraph: function(downGraph) {
            this._bind('_downGraph', downGraph, '_upNode');
        },
        unbindDownGraph: function() {
            this._unbind('_downGraph', '_upNode')
        },
        bindUpLink: function(upLink) {
            this._bind('_upLink', upLink, '_downNode');
        },
        unbindUpLink: function() {
            this._unbind('_upLink', '_downNode')
        },
        toJSON: function(json) {
            this._toJsonBind(json, 'inverse');
            this._toJsonBind(json, 'upLink');
            return this._toJsonBind(json, 'downGraph');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'inverse');
            this._fromJsonBound(json, map, 'upLink');
            this._fromJsonBound(json, map, 'downGraph');
        },
        free: function() {
            this.unbindInverse();
            var downGraph = this.downGraph();
            var upLink = this.upLink();
            this.unbindDownGraph();
            this.unbindUpLink();
            downGraph.free();
            upLink.free();
        }
    };

    var NodeDual = {
        config: {dual: true},

        duality: function() {
            return this._owner.duality();
        }
    };


// ---------------- Nodes augments

    var NodesDual = {
        config: {dual: true},

        names: Duality.values,

        dual: function() {
            return this._owner.nodes(this.duality().dual());
        },
        duality: function() {
            return this._owner.duality(this);
        }
    };

    var NodesMultilevel = {
        config: { multilevel: true },

        add: function(node, upLink, downGraph) {
            this._super("add", node);

            if (upLink) {
                this.bindUpLink(upLink);
            } else {
                var upLinks = this._owner.upNode().links();
                upLinks.add(upLinks.newChild(), node);
            }

            if (downGraph) {
                this.bindDownGraph(downGraph);
            } else {
                var downGraphs = this._owner.graphs();
                downGraphs.add(downGraphs.newChild(), node);
            }

            return node;
        },


        up: function(duality) {
            return this._owner.up().nodes(duality);
        }
    };

// ----------------- Graph

    var Graph = GraphObject.extend( {
        initialize: function() {
            this._nodes = this.factory().createNodes(undefined, this)
        },
        type: function() {
            return Types.graph;
        },
        nodes: function() {
            return this._nodes;
        },
        toJSON: function(json) {
            json.nodes = this.nodes().toJSON();
            return json
        },
        fromJSON: function(json, map) {
            this.nodes().fromJSON(json.nodes , map)
        }
    });

// --------------- Graph augments

    var GraphDual = {
        config: {dual: true},

        nodes: function(duality) {
            return duality? this._nodes.container(duality) : this._nodes;
        },
        duality: function(nodes) {
            return this._nodes[0] === nodes? Duality.hedge : this._nodes[1] === nodes? Duality.hvert : undefined;
        },
        indexOf: function(nodes) {
            var duality = this.duality(nodes);
            return duality? duality : -1;
        }
    };

    var GraphMultilevel = {
        config: { multilevel: true },

        initialize: function() {
            this._upNode = null;
            this._graphs = null
        },
        upNode: function() {
            return this._upNode;
        },
        graphs: function() {  // Graphs own by this graph
            return this._graphs;
        },
        next: function() {
            return this._owner._owner;
        },
        level: function() {
            return this.next()? this.next().level() + 1 : 0;
        },
        bindUpNode: function(upNode) {
            this._bind('_upNode', upNode, '_downGraph');
        },
        unbindUpNode: function() {
            this._unbind('_upNode', '_downGraph')
        },
        toJSON: function(json) {
            return this._toJsonBind(json, 'upNode');
        },
        fromJSON: function(json, map) {
            this._fromJsonBound(json, map, 'upNode');
        },
        free: function() {
            var upNode = this.upNode();
            this.unbindUpNode();
            upNode.free();
        }
    };

// -----------  Graphs

    var Graphs = GraphContainer.extend({
        type: function() {
            return Types['graphs'];
        }
    });

    var GraphsMultilevel = {
        initialize: function(owner) {
            owner._graphs = this;
        },
        config: { multilevel: true },

        add: function(graph, upNode) {
            this._super("add", graph);

            if (upNode) {
                this.bindUpNode(upNode);
            } else {
                var upNodes = this._owner.nodes();
                upNodes.add(upNodes.newChild(), undefined, graph);
            }
            return graph;
        }
    };

// ----------------- Graph Factory

    var GraphFactory = OOP.Class.extend({
        statics: {
            VERSION: '0.1',

            Types: Types,
            Direction: Direction,
            Duality: Duality,

            register: function(config, props) {
                var factory = new GraphFactory(config, props);
                GraphFactory[factory.fullname] = factory;
                return factory;
            },
            getFactory: function(config) {
                return GraphFactory[GraphFactory._configToFullname(config || {})];
            },
            getFactoryByFullname: function(fullname) {
                return GraphFactory[fullname]
            },
            _configToFullname: function(config) {
                var fullname = config.name || 'default';
                if (config.directed) {
                    fullname += '_directed';
                }
                if (config.dual) {
                    fullname += '_dual';
                }
                if (config.multilevel) {
                    fullname += '_multilevel';
                }
                return fullname;
            }
        },
        constructor: function(config, props) {
            this.config = config;
            this.fullname = GraphFactory._configToFullname(config);
            FP.extend(this, props);
        },

        create: function(type, label, owner) {
            return new this[type.capitalize()](label, owner);
        },

        createLink: function(label, owner) {
            return new this.Link(label, owner)
        },
        createLinks: function(label, owner) {
            return new this.Links(label, owner)
        },
        createNode: function(label, owner) {
            return new this.Node(label, owner)
        },
        createNodes: function(label, owner) {
            return new this.Nodes(label, owner)
        },
        createGraph: function(label, owner) {
            return new this.Graph(label, owner)
        },
        createGraphs: function(label, owner) {
            return new this.Graphs(label, owner)
        }
    });

    var Directed = {
        config: {directed: true}
    };

    var Multilevel = {
        config: { multilevel: true }
    };

    var Dual = {
        config: {dual: true}
    };

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Links: GraphContainer,
        Node: Node,
        Nodes: GraphContainer,
        Graph: Graph,
        Graphs: Graphs
    });

    GraphFactory.register({name: 'default', directed: true}, {
        Link: Link.extend({
            augments: [LinkDirected]
        }),
        Links: DuoGraphContainer.extend({
            augments: [LinksDirected],
            Container: {  // Existing Container has an extend() method so It is composable
                augments: [LinksDirected]
            }
        }),
        Node: Node.extend({
            augments: [NodeDirected]
        }),
        Nodes: GraphContainer.extend({
            augments: [Directed]
        }),
        Graph: Graph.extend({
            augments: [Directed]
        }),
        Graphs: Graphs.extend({
            augments: [Directed]
        })
    });

    GraphFactory.register({name: 'default', dual: true}, {
        Link: Link.extend({
            augments: [Dual]
        }),
        Links: GraphContainer.extend({
            augments: [Dual]
        }),
        Node: Node.extend({
            augments: [NodeDual]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [NodesDual],
            Container: {
                augments: [NodesDual]
            }
        }),
        Graph: Graph.extend({
            augments: [GraphDual]
        }),
        Graphs: Graphs.extend({
            augments: [Dual]
        })
    });

    GraphFactory.register({name: 'default', multilevel: true}, {
        Link: Link.extend({
            augments: [LinkMultilevel]
        }),
        Links: GraphContainer.extend({
            augments: [LinksMultilevel]
        }),
        Node: Node.extend({
            augments: [NodeMultilevel]
        }),
        Nodes: GraphContainer.extend({
            augments: [NodesMultilevel]
        }),
        Graph: Graph.extend({
            augments: [GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            augments: [GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true}, {
        Link: Link.extend({
            augments: [LinkDirected, Dual]
        }),
        Links: DuoGraphContainer.extend({
            augments: [LinksDirected, Dual],
            Container: {
                augments: [LinksDirected, Dual]
            }
        }),
        Node: Node.extend({
            augments: [NodeDirected, NodeDual]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Directed, NodesDual],
            Container: {
                augments: [Directed, NodesDual]
            }
        }),
        Graph: Graph.extend({
            augments: [Directed, GraphDual]
        }),
        Graphs: Graphs.extend({
            augments: [Directed, Dual]
        })
    });

    GraphFactory.register({name: 'default', directed: true, multilevel: true}, {
        Link: Link.extend({
            augments: [LinkDirected, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            augments: [LinksDirected, LinksMultilevel],
            Container: {
                augments: [LinksDirected, LinksMultilevel]
            }
        }),
        Node: Node.extend({
            augments: [NodeDirected, NodeMultilevel]
        }),
        Nodes: GraphContainer.extend({
            augments: [Directed, NodesMultilevel]
        }),
        Graph: Graph.extend({
            augments: [Directed, GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            augments: [Directed, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', dual: true, multilevel: true}, {
        Link: Link.extend({
            augments: [Dual, LinkMultilevel]
        }),
        Links: GraphContainer.extend({
            augments: [Dual, LinksMultilevel]
        }),
        Node: Node.extend({
            augments: [NodeDual, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [NodesDual, NodesMultilevel],
            Container: {
                augments: [NodesDual, NodesMultilevel]
            }
        }),
        Graph: Graph.extend({
            augments: [GraphDual, GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            augments: [Dual, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true, multilevel: true}, {
        Link: Link.extend({
            augments: [LinkDirected, Dual, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            augments: [LinksDirected, Dual, LinksMultilevel],
            Container: {
                augments: [LinksDirected, Dual, LinksMultilevel]
            }
        }),
        Node: Node.extend({
            augments: [NodeDirected, NodeDual, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Directed, NodesDual, NodesMultilevel],
            Container: {
                augments: [Directed, NodesDual, NodesMultilevel]
            }
        }),
        Graph: Graph.extend({
            augments: [Directed, GraphDual, GraphMultilevel]
        }),
        Graphs: Graphs.extend({
            augments: [Directed, Dual, GraphsMultilevel]
        })
    });

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    exports.G = GraphFactory;


})(this);







