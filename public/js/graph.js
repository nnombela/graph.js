//  graph.js 2.0
//  (c) 2019 nnombela@gmail.com.
//  Graph library
(function(root, OOP, FP) {
    // Enums
    const Types = OOP.Enum.create(['Graphs', 'Graph', 'Nodes', 'Node', 'Links', 'Link'], {
        // labels
        Graphs: 'graphs', Graph: 'graph', Nodes: 'nodes', Node: 'node', Links: 'links', Link: 'link',
        children () {
            return Types.members[this.ordinal + 1]
        },
        parent () {
            return Types.members[this.ordinal - 1]
        },
    })

    const Direction = OOP.Enum.create(['In', 'Out'], {
        // labels
        In: 'in', Out: 'out',
        reverse() {
            return Direction.members[(this.ordinal + 1) % 2];
        }
    });

    const Duality =  OOP.Enum.create(['Vertex', 'Edge'], {
        // labels
        Vertex: 'vertex', Edge: 'edge',
        dual() {
            return Duality.members[(this.ordinal + 1) % 2];
        }
    });

    // Graph objects
    const GraphObject = OOP.Class.extend({
        $statics: {
            Types, Direction, Duality,
            UNIQUE_ID_PATTERN: 'g000-100000000000' // set this to undefined to generate uuidv4
        },

        $constructor(id, owner) {
            this.id = id || OOP.uniqueId(GraphObject.UNIQUE_ID_PATTERN);
            this.initialize.call(this, owner);
        },

        config: OOP.Extensible.create({name: 'default'}),

        initialize: OOP.Extensible.create(function(owner) {
            if (this._owner) {
                throw new Error(this + ' is already initialized with ' + this._owner);
            }
            this._owner = owner;
        }),

        free: OOP.Extensible.create(function() {
            const owner = this.belongsTo();
            this._owner = null;
            owner ? owner.free(this) : undefined;
        }),

        type() {
            const owner = this.belongsTo();
            return owner && owner.type().children()
        },
        factory() {
            return GraphFactory.getFactoryByConfig(this.config);
        },
        toString() {
            return this.type() + '#' + this.id;
        },
        index() {
            const owner = this.belongsTo();
            return owner ? owner.indexOf(this) : -1;
        },
        indexOf() {
            return -1;
        },
        belongsTo(type) {
            return type === undefined || this.type() === type ? this._owner : this._owner.belongsTo(type);
        },


        // ---- JSON
        toJSON: OOP.Extensible.create(function() {
            return { id: this.id }
        }),

        fromJSON: OOP.Extensible.create(function(json, map) {
            if (json.id) {
                this.id = json.id;
                map[json.id] = this;
            }
        }),

        // ---- Private helper methods

        _bind(prop, that) { // "this" is implicit
            if (this[prop] === null && that[prop] === null) {
                this[prop] = that;
                that[prop] = this;

            } else if (this[prop] !== that) { // it is already bound
                throw new Error(this + ' object is already bound to ' + this[prop]);
            } else if (that[prop] !== this) { // it is already bound
                throw new Error(that + ' object is already bound to ' + that[thatProp]);
            }
        },
        _unbind(prop) {
            const that = this[prop];
            if (that == null || that[prop] !== this) {
                throw new Error(prop + ' property can not be unbind');
            }
            that[prop] = null;
            this[prop] = null;
        },
        _toJsonBind(json, name) {
            const value = this['_' + name];
            if (value) {
                json[name + 'Id'] = value.id;
            }
            return json;
        },
        _fromJsonBound(json, map, name) {
            const bound = json[name + 'Id'];
            if (bound && map[bound]) {
                this._bind('_' + name, map[bound]);
            }
        }
    });

    const Iterable = {
        Iterator: OOP.Class.extend({
            $constructor(container) {
                this.container = container;
                this._cursor = -1;
            },
            current() {
                return this.container.get(this._cursor);
            },
            next() {
                return this.container.get(++this._cursor);
            },
            hasNext() {
                return this._cursor + 1 < this.container.size();
            },
            index() {
                return this._cursor;
            }
        }),
        iterator() {
            return new this.Iterator(this);
        }
    };

    const Accessible = {
        Accessor: OOP.Class.extend({
            $constructor(container) {
                this.container = container;
                this.array = [];
            },
            get(gobj) {
                return this.array[gobj.index()];
            },
            members(gobj, value) {
                this.array[gobj.index()] = value;
            }
        }),
        accessor() {
            return new this.Accessor(this);
        }
    };

    const GraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],

        initialize() {
            this._children = [];
        },
        free() {
            this.forEach(child => this.remove(child))
        },
        get(index) {
            return this._children[index];
        },
        size() {
            return this._children.length;
        },
        empty() {
            return this.size() === 0;
        },
        forEach(func, thisArg) {
            this._children.forEach(func, thisArg || this);
        },
        indexOf(child) {
            return this._children.indexOf(child);
        },
        find(func, thisArg) {
            return this._children.find(func, thisArg || this);
        },
        contains(gobj) {
            return this.indexOf(gobj) !== -1;
        },
        add(gobj) {
            if (gobj.type() !== this.type().children()) {
                throw new Error('This graph object ' + gobj + ' could not be added to ' + this + ' graph container');
            }
            gobj.initialize(this);
            this._children.push(gobj);
            return this;
        },
        newChild(id) {
            return this.factory().create(this.type().children(), id);
        },
        addNew(id) {
            const gobj = this.newChild(id);
            this.add(gobj);
            return gobj;
        },
        remove(gobj) {
            const idx = this.indexOf(gobj);
            if (idx !== -1) {
                this._children.splice(idx, 1);
                gobj.free();
            }
            return idx;
        },
        toJSON() {
            return this._children.map(elem => elem.toJSON())
        },
        fromJSON(json, map) {
            json.forEach(child => this.addNew().fromJSON(child, map));
        }
    });


    const DuoGraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],
        Container: GraphContainer,
        names: ['0', '1'],

        initialize(owner) {
            this[0] = new this.Container(this.names[0] + '#' + this.id, owner);
            this[1] = new this.Container(this.names[1] + '#' + this.id, owner);
        },
        container(enumerator) {
            return enumerator !== undefined ? this[enumerator.ordinal !== undefined ? enumerator.ordinal : enumerator] : this;
        },
        get(index) {
            const size0 = this[0].size();
            return index < size0 ? this[0].get(index) : this[1].get(index - size0);
        },
        indexOf(gobj) {
            const indexOf0 = this[0].indexOf(gobj);
            return indexOf0 === -1 ? indexOf0 : this[1].indexOf(gobj);
        },
        forEach(func, thisArg) {
            this[0].forEach(func, thisArg || this);
            this[1].forEach(func, thisArg || this);
            return this;
        },
        find(func, thisArg) {
            const find0 = this[0].find(func, thisArg || this);
            return find0 ? find0 : this[1].find(func, thisArg || this);
        },
        size() {
            return this[0].size() + this[1].size();
        },
        empty() {
            return this[0].empty() && this[1].empty();
        },
        add(gobj, enumerator) {
            return this.container(enumerator || 0).add(gobj);
        },
        addNew(id, enumerator) {
            return this.container(enumerator || 0).addNew(id);
        },
        remove(gobj) {
            const idx = this[0].remove(gobj)
            return idx !== -1 ? idx : this[1].remove(gobj);
        },
        free() {
            this[0].free();
            this[1].free();
        },
        toJSON() {
            const json = Object.create(null);
            json[this.names[0]] = this[0].toJSON();
            json[this.names[1]] = this[1].toJSON();
            return json;
        },
        fromJSON(json, map) {
            this[0].fromJSON(json[this.names[0]], map);
            this[1].fromJSON(json[this.names[1]], map);
        }
    });

    const DelegateGraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],

        delegate() {
            throw new Error('delegate method not implemented')
        },
        free() {
            this.delegate().free();
        },
        get(index) {
            return this.delegate().get(index);
        },
        size() {
            return this.delegate().size();
        },
        empty() {
            return this.delegate().size() === 0;
        },
        forEach(func, thisArg) {
            this.delegate().forEach(func, thisArg || this);
        },
        indexOf(child) {
            return this.delegate().indexOf(child);
        },
        find(func, thisArg) {
            return this.delegate().find(func, thisArg || this);
        },
        contains(gobj) {
            return this.delegate().contains(gobj)
        },
        add(gobj) {
            return this.delegate().add(gobj.delegate())
        },
        newChild(id) {
            return this.delegate().newChild(id)
        },
        addNew(id) {
            return this.delegate().addNew(id)
        },
        remove(gobj) {
            return this.delegate().remove(gobj)
        },
        toJSON() {
            return this.delegate().toJSON()
        },
        fromJSON(json, map) {
            this.delegate().fromJSON(json, map)
        }
    })

    const MultilevelGraphObject = GraphObject.extend({
        free: function() {
            this._link && this._link.free()
            this._node && this._node.free()
            this._graph && this._graph.free()
        },
        link() {
            if (!this._link) {
                const owner = this.belongsTo();
                this._link = this.factory().createLink('link#' + this.id, owner && owner.links())
                this._link._multilevel = this;
            }
            return this._link;
        },
        node() {
            if (!this._node) {
                const owner = this.belongsTo();
                this._node = this.factory().createNode('node#' + this.id, owner && owner.nodes())
                this._node._multilevel = this;
            }
            return this._node;
        },
        graph() {
            if (!this._graph) {
                const owner = this.belongsTo();
                this._graph = this.factory().createGraph('graph#' + this.id, owner && owner.graphs());
                this._graph._multilevel = this;
            }
            return this._graph;
        },
        hasLink() {
            return this._link;
        },
        hasNode() {
            return this._node;
        },
        hasGraph() {
            return this._graph;
        }
    });

    const MultilevelGraphContainer = GraphContainer.extend({
        newChild(id) {
            return new MultilevelGraphObject(id);
        },
        free() {
            this._links && this._links.free()
            this._nodes && this._nodes.free()
            this._graphs && this._graphs.free()
        },
        links() {
            if (!this._links) {
                const owner = this.belongsTo();
                this._links = this.factory().createLinks('links#' + this.id, owner && owner.node())
                this._links._multilevel = this;
            }
            return this._links;
        },
        nodes() {
            if (!this._nodes) {
                const owner = this.belongsTo();
                this._nodes = this.factory().createNodes('nodes#' + this.id, owner && owner.graph());
                this._nodes._multilevel = this;
            }
            return this._nodes;
        },
        graphs() {
            if (!this._graphs) {
                const owner = this.belongsTo();
                // TODO not sure about ownership here
                this._graphs = this.factory().createGraphs('graphs#' + this.id, owner && owner.graph());
                this._graphs._multilevel = this;
            }
            return this._graphs;
        },
        hasLinks() {
            return this._links;
        },
        hasNodes() {
            return this._nodes;
        },
        hasGraphs() {
            return this._graphs;
        }
    });

// ---- Link

    const Link = GraphObject.extend({
        initialize() {
            this._pair = null;
        },
        type() {
            return Types.Link;
        },
        checkCanBeBound: OOP.Extensible.create(function(pair) {
            if (pair.from() === null) {
                throw new Error('Link ' + pair + ' has to be belong to a node');
            }
        }),
        bind(pair) {
            this.checkCanBeBound(pair);
            this._bind('_pair', pair);
        },
        unbind() {
            this._unbind('_pair')
        },
        from() {
            return this.belongsTo(Types.Node);
        },
        to() {
            return this._pair &&  this._pair.from()
        },
        pair() {
            return this._pair;
        },
        toJSON(json) {
            return this._toJsonBind(json, 'pair');
        },
        fromJSON(json, map) {
            this._fromJsonBound(json, map, 'pair');
        },
        free() {
            this.unbind();
        }
    });

// ----- Link $mixins

    const LinkDirected = {
        config: { directed: true },

        checkCanBeBound(pair) {
            if (this.direction().reverse() !== pair.direction()) {
                throw new Error('Trying to bind using incorrect direction: ' + pair.direction());
            }
        },
        reverse() {
            const node = this.from()
            return node && node.links(this.direction().reverse()).
                find(link => link.from() === node)
        },
        direction() {
            return this.belongsTo().direction();
        }
    };

    const LinkMultilevel = {
        checkCanBeBound(pair) {
            if (!pair.from().inverse().links().empty()) {
                throw new Error(pair + ' can not be multilevel bound');
            }
        },
        inverse() {
            const inverseNode = this.from().inverse(); // this.node().multilevel().link.to()
            return inverseNode ? inverseNode.links().get(this.index()) : null;
        },
        toJSON(json) {
            json.multilevelId = this.multilevel().id
        },
        fromJSON(json, map) {
            if (map[json.multilevelId]) {
                this._multilevel = map[json.multilevelId];
            } else {
                this._multilevel = new MultilevelGraphObject()
                this._multilevel._link = this;
                map[this._multilevel.id] = this._multilevel;
            }
        }
    };

// -------------- Links $mixins

    const LinksDirected = {
        config: { directed: true },

        names: ['ins', 'outs'],

        reverse() {
            return this.belongsTo().links(this.direction().reverse());
        },
        direction() {
            return this.belongsTo().direction(this);
        }
    };

    const LinksMultilevel = {
        get(index) {
            return this.multilevel().get(index).link();
        },
        inverse(direction) {
            return this.belongsTo().inverse().links(direction);
        },
        toJSON(json) {
            json.multilevelId = this.multilevel().id
        },
        fromJSON(json, map) {
            if (map[json.multilevelId]) {
                this._multilevel = map[json.multilevelId];
            } else {
                this._multilevel = new MultilevelGraphContainer()
                this._multilevel._links = this;
                map[this._multilevel.id] = this._multilevel;
            }
        }
    };

// --------------- Node

    const Node = GraphObject.extend({
        initialize() {
            this._links = this.factory().createLinks(undefined, this);
        },
        type() {
            return Types.Node;
        },
        graph() {
            return this.belongsTo(Types.Graph);
        },
        links() {
            return this._links;
        },
        toJSON(json) {
            json.links = this.links().toJSON(json);
            return json
        },
        fromJSON(json, map) {
            this.links().fromJSON(json.links, map);
        },
        free() {
            this.links().free();
        }
    });

// ----------- Node $mixins

    const NodeDirected = {
        config: { directed: true },

        links(direction) {
            return this._links.container(direction);
        },
        direction(links) {
            return this.links(Direction.In) === links ? Direction.In : this.links(Direction.Out) === links ? Direction.Out : undefined;
        },
        indexOf(links) {
            return this.direction(links) || -1;
        }
    };

    const NodeMultilevel = {
        inverse() {
            this.multilevel().link().pair().multilevel().node();
        },
        toJSON(json) {
            json.multilevelId = this.multilevel().id
        },
        fromJSON(json, map) {
            if (map[json.multilevelId]) {
                this._multilevel = map[json.multilevelId];
            } else {
                this._multilevel = new MultilevelGraphObject()
                this._multilevel._node = this;
                map[this._multilevel.id] = this._multilevel;
            }
        }
    };

    const NodeDual = {
        config: { dual: true },

        duality() {
            return this.belongsTo().duality();
        }
    };


// ---------------- Nodes $mixins

    const NodesDual = {
        config: { dual: true },

        names: ['vertices', 'edges'],

        dual() {
            return this.belongsTo().nodes(this.duality().dual());
        },
        duality() {
            return this.belongsTo().duality(this);
        }
    };

    const NodesMultilevel = {
        get(index) {
            return this.multilevel().get(index).node();
        },
        toJSON(json) {
            json.multilevelId = this.multilevel().id
        },
        fromJSON(json, map) {
            if (map[json.multilevelId]) {
                this._multilevel = map[json.multilevelId];
            } else {
                this._multilevel = new MultilevelGraphContainer()
                this._multilevel._nodes = this;
                map[this._multilevel.id] = this._multilevel;
            }
        }
    };

// ----------------- Graph

    const Graph = GraphObject.extend( {
        initialize() {
            this._nodes = this.factory().createNodes(undefined, this)
        },
        type() {
            return Types.Graph;
        },
        nodes() {
            return this._nodes;
        },
        toJSON(json) {
            json.nodes = this.nodes().toJSON(json);
            return json
        },
        fromJSON(json, map) {
            this.nodes().fromJSON(json.nodes , map)
        }
    });

// --------------- Graph $mixins

    const GraphDual = {
        config: { dual: true },

        nodes(duality) {
            return duality? this._nodes.container(duality) : this._nodes;
        },
        duality(nodes) {
            return this._nodes[0] === nodes? Duality.Edge : this._nodes[1] === nodes? Duality.Vertex : undefined;
        },
        indexOf(nodes) {
            const duality = this.duality(nodes);
            return duality? duality : -1;
        }
    };

    const GraphMultilevel = {
        get(index) {
            return this.multilevel().get(index).graph();
        },
        inverse() {
            //this.multilevel().link().pair().multilevel().graph();
        },
        nextGraphs() {  // Graphs own by this graph
            return this.nodes().multilevel().graphs();
        },
        prevGraph() { // Graph that owns this graph
            return this.multilevel().node().belongsTo()
        },
        level() {
            const prev = this.prevGraph();
            return prev ? prev.level() + 1 : 0;
        },
        toJSON: function(json) {
            json.multilevelId = this.multilevel().id
            const nextGraphs = this.nextGraphs();
            if (nextGraphs) {
                json.nextGraphs = nextGraphs.toJSON(json)
            }
            const prevGraph = this.prevGraph();
            if (prevGraph) {
                json.prevGraphId = prevGraph.id;
            }
            json.level = this.level();
            return json
        },
        fromJSON(json, map) {
            if (map[json.multilevelId]) {
                this._multilevel = map[json.multilevelId];
            } else {
                this._multilevel = new MultilevelGraphObject()
                this._multilevel._graph = this;
                map[this._multilevel.id] = this._multilevel;
            }
        }
    };

// -----------  Graphs

    const GraphsMultilevel = {
        type() {
            return Types.Graphs
        },
        toJSON(json) {
            json.multilevelId = this.multilevel().id
        },
        fromJSON(json, map) {
            if (map[json.multilevelId]) {
                this._multilevel = map[json.multilevelId];
            } else {
                this._multilevel = new MultilevelGraphContainer()
                this._multilevel._graphs = this;
                map[this._multilevel.id] = this._multilevel;
            }
        }
    };

// ----------------- Graph Factory

    const GraphFactory = OOP.Class.extend({
        $statics: {
            VERSION: '0.1',

            Types, Direction, Duality,

            register(config, props) {
                const factory = new GraphFactory(config, props);
                GraphFactory[factory.name] = factory;
                return factory;
            },
            getFactoryByConfig(config) {
                return GraphFactory[GraphFactory._configToName(config || {})];
            },
            getFactoryByName(fullname) {
                return GraphFactory[fullname]
            },
            _configToName(config) {
                let name = config.name || 'default';
                if (config.directed) {
                    name += '_directed';
                }
                if (config.dual) {
                    name += '_dual';
                }
                if (config.multilevel) {
                    name += '_multilevel';
                }
                return name;
            }
        },
        $constructor(config, props) {
            this.config = config;
            this.name = GraphFactory._configToName(config);
            FP.extend(this, props);
        },
        create(type, id, owner) {
            return new this[type.name](id, owner);
        },
        createLink(id, owner) {
            return new this.Link(id, owner)
        },
        createLinks(id, owner) {
            return new this.Links(id, owner)
        },
        createNode(id, owner) {
            return new this.Node(id, owner)
        },
        createNodes(id, owner) {
            return new this.Nodes(id, owner)
        },
        createGraph(id, owner) {
            return new this.Graph(id, owner)
        },
        createGraphs(id, owner) {
            return new this.Graphs(id, owner)
        }
    });

    const Directed = {
        config: { directed: true }
    };

    const Multilevel = {
        config: { multilevel: true },

        delegate () {
            return this.multilevel()
        },
        multilevel () {
            return this._multilevel;
        },
        free () {
            return this.multilevel().free()
        }
    };

    const Dual = {
        config: { dual: true }
    };

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Links: GraphContainer,
        Node: Node,
        Nodes: GraphContainer,
        Graph: Graph,
        Graphs: GraphContainer
    });

    GraphFactory.register({name: 'default', directed: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected],
            Container: {  // Existing Container has an extend() method so It is mergeable
                $mixins: [LinksDirected]
            }
        }),
        Node: Node.extend({
            $mixins: [NodeDirected]
        }),
        Nodes: GraphContainer.extend({
            $mixins: [Directed]
        }),
        Graph: Graph.extend({
            $mixins: [Directed]
        }),
        Graphs: GraphContainer.extend({
            $mixins: [Directed]
        })
    });

    GraphFactory.register({name: 'default', dual: true}, {
        Link: Link.extend({
            $mixins: [Dual]
        }),
        Links: GraphContainer.extend({
            $mixins: [Dual]
        }),
        Node: Node.extend({
            $mixins: [NodeDual]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [NodesDual],
            Container: {
                $mixins: [NodesDual]
            }
        }),
        Graph: Graph.extend({
            $mixins: [GraphDual]
        }),
        Graphs: GraphContainer.extend({
            $mixins: [Dual]
        })
    });

    GraphFactory.register({name: 'default', multilevel: true}, {
        Link: Link.extend({
            $mixins: [Multilevel, LinkMultilevel]
        }),
        Links: DelegateGraphContainer.extend({
            $mixins: [Multilevel, LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [Multilevel, NodeMultilevel]
        }),
        Nodes: DelegateGraphContainer.extend({
            $mixins: [Multilevel, NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [Multilevel, GraphMultilevel]
        }),
        Graphs: DelegateGraphContainer.extend({
            $mixins: [Multilevel, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Dual]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Dual],
            Container: {
                $mixins: [LinksDirected, Dual]
            }
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeDual]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [Directed, NodesDual],
            Container: {
                $mixins: [Directed, NodesDual]
            }
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphDual]
        }),
        Graphs: GraphContainer.extend({
            $mixins: [Directed, Dual]
        })
    });

    GraphFactory.register({name: 'default', directed: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Multilevel, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Multilevel, LinksMultilevel],
            Container: DelegateGraphContainer.extend({
                $mixins: [LinksDirected, Multilevel, LinksMultilevel]
            })
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, Multilevel, NodeMultilevel]
        }),
        Nodes: DelegateGraphContainer.extend({
            $mixins: [Directed, Multilevel, NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [Directed, Multilevel, GraphMultilevel]
        }),
        Graphs: DelegateGraphContainer.extend({
            $mixins: [Directed, Multilevel, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [Dual, Multilevel, LinkMultilevel]
        }),
        Links: DelegateGraphContainer.extend({
            $mixins: [Dual, Multilevel, LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [NodeDual, Multilevel, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [NodesDual, Multilevel, NodesMultilevel],
            Container: DelegateGraphContainer.extend({
                $mixins: [NodesDual, Multilevel, NodesMultilevel]
            })
        }),
        Graph: Graph.extend({
            $mixins: [GraphDual, Multilevel, GraphMultilevel]
        }),
        Graphs: DelegateGraphContainer.extend({
            $mixins: [Dual, Multilevel, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Dual, Multilevel, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Dual, Multilevel, LinksMultilevel],
            Container: DelegateGraphContainer.extend({
                $mixins: [LinksDirected, Dual, Multilevel, LinksMultilevel]
            })
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeDual, Multilevel, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [Directed, NodesDual, Multilevel, NodesMultilevel],
            Container: DelegateGraphContainer.extend({
                $mixins: [Directed, NodesDual, Multilevel, NodesMultilevel]
            })
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphDual, Multilevel, GraphMultilevel]
        }),
        Graphs: DelegateGraphContainer.extend({
            $mixins: [Directed, Dual, Multilevel, GraphsMultilevel]
        })
    });

    const Exports = typeof exports !== "undefined" ? exports : root;   // CommonJS module support

    Exports.G = GraphFactory;


})(this, this.OOP, this.FP);







