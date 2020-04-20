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
        isContainer() {
            return this.ordinal % 2 === 0
        }
    });

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

    const MultilevelTypes = OOP.Enum.create(['MultilevelContainer', 'MultilevelObject'], {
        // labels
        MultilevelContainer: 'mlc', MultilevelObject: 'mlo',
        children () {
            return MultilevelTypes.members[this.ordinal + 1]
        },
        parent () {
            return MultilevelTypes.members[this.ordinal - 1]
        },
    });

    // Base Graph object
    const GraphObject = OOP.Class.extend({
        $statics: {
            Types, Direction, Duality,
            UNIQUE_ID_PATTERN: 'g000-1000-0000', // set this to undefined to generate uuidv4
            GlobalId: (id, type) => id ? type + '#' + id : undefined,
        },

        $constructor(id, props = {}) {
            this.id = id || props.id || OOP.uniqueId(props.idPattern || GraphObject.UNIQUE_ID_PATTERN);
            this.initialize(props);
        },

        config: OOP.Extensible.create({name: 'default'}),

        initialize: OOP.Extensible.create(function({owner}) {
            this._owner = owner;
        }),

        free: OOP.Extensible.create(function() {
            const owner = this.belongsTo();
            this._owner = null;
            owner && owner.free(this);
        }),
        globalId() {
            return GraphObject.GlobalId(this.id, this.type());
        },
        type() {
            const owner = this.belongsTo();
            return owner && owner.type().children()
        },
        factory() {
            return GraphFactory.getFactoryByConfig(this.config);
        },
        toString() {
            return this.globalId()
        },
        index() {
            const owner = this.belongsTo();
            return owner ? owner.indexOf(this) : -1;
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
                map[this.globalId()] = this;
            }
        }),

        // ---- Private helper methods
        _bind(prop, that) { // "this" is implicit
            if (this[prop] && this[prop] !== that) {
                throw new Error(this + ' object is already bound @' + prop + ' property to ' + this[prop]);
            }
            if (that[prop] && that[prop] !== this) {
                throw new Error(that + ' object is already bound @' + prop + ' property to ' + that[prop]);
            }
            this[prop] = that;
            that[prop] = this;
        },
        _unbind(prop) {
            const that = this[prop];
            if (that == null || that[prop] !== this) {
                throw new Error(this + 'object @' +  prop + ' property can not be unbind');
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
            const boundId = GraphObject.GlobalId(json[name + 'Id'], this.type());
            if (boundId && map[boundId]) {
                this._bind('_' + name, map[boundId]);
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

    // Base Graph Container
    const GraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],

        initialize({container = []}) {
            this._container = container;
        },
        free() {
            this.forEach(child => this.remove(child))
        },
        get(index) {
            return this._container[index];
        },
        size() {
            return this._container.length;
        },
        empty() {
            return this.size() === 0;
        },
        forEach(func, thisArg) {
            this._container.forEach(func, thisArg || this);
        },
        map(func, thisArg) {
            return this._container.map(func, thisArg || this);
        },
        indexOf(child) {
            return this._container.indexOf(child);
        },
        find(func, thisArg) {
            return this._container.find(func, thisArg || this);
        },
        contains(gobj) {
            return this.indexOf(gobj) !== -1;
        },
        add(gobj) {
            if (gobj.type() !== this.type().children()) {
                throw new Error('This graph object ' + gobj + ' could not be added to ' + this + ' graph container');
            }
            gobj.initialize({owner: this});
            this._container.push(gobj);
            return this;
        },
        newChild(id, props) {
            return this.factory().create(this.type().children(), id, props);
        },
        addNew(id, props) {
            const gobj = this.newChild(id, props);
            this.add(gobj);
            return gobj;
        },
        remove(gobj) {
            const idx = this.indexOf(gobj);
            if (idx !== -1) {
                this._container.splice(idx, 1);
                gobj.free();
            }
            return idx;
        },
        toJSON() {
            return this.map(elem => elem.toJSON())
        },
        fromJSON(json, map) {
            json.container.forEach(child => this.addNew(child.id, child).fromJSON(child, map));
        }
    });


    const DuoGraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],
        Container: GraphContainer,
        names: ['0', '1'],

        initialize(props) {
            this[0] = new this.Container(this.id + ':0', props);
            this[1] = new this.Container(this.id + ':1', props);
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
        map(func, thisArg) {
            return this[0].map(func, thisArg).concat(this[1].map(func, thisArg))
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
            const idx = this[0].remove(gobj);
            return idx !== -1 ? idx : this[1].remove(gobj);
        },
        free() {
            this[0].free();
            this[1].free();
        },
        toJSON(json) {
            json[this.names[0]] = this[0].toJSON();
            json[this.names[1]] = this[1].toJSON();
            return json;
        },
        fromJSON(json, map) {
            const name0 = this.names[0], name1 = this.names[1];
            this[0].fromJSON({container: json.container[name0], name: name0, idx: 0}, map);
            this[1].fromJSON({container: json.container[name1], name: name1, idx: 1}, map);
        }
    });

    const MultilevelGraphObject = GraphObject.extend({
        initialize({link, node, graph}) {
            if (this._link && link || this._node && node || this._graph && graph) {
                throw new Error('Trying to initialize and object ' + this +' already initialized')
            }
            this._link = this._link || link;
            this._node = this._node || node;
            this._graph = this._graph || graph;
        },
        type() {
            return MultilevelTypes.MultilevelObject
        },
        free() {
            this._link && this._link.free();
            this._node && this._node.free();
            this._graph && this._graph.free();
        },
        link() {
            if (!this._link) {
                const owner = this.belongsTo();
                this._link = this.factory().createLink(this.id, {owner: owner && owner.links(), multilevel: this} );
            }
            return this._link;
        },
        node() {
            if (!this._node) {
                const owner = this.belongsTo();
                this._node = this.factory().createNode(this.id, {owner: owner && owner.nodes(), multilevel: this});
            }
            return this._node;
        },
        graph() {
            if (!this._graph) {
                const owner = this.belongsTo();
                this._graph = this.factory().createGraph(this.id, {owner : owner && owner.graphs(), multilevel: this} );
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
        initialize({links, nodes, graphs}) {
            if (this._links && links || this._nodes && nodes || this._graphs && graphs) {
                throw new Error('Trying to initialize and object ' + this +' already initialized')
            }
            this._links = this._links || links;
            this._nodes = this._nodes || nodes;
            this._graphs = this._graphs || graphs;
        },
        type() {
            return MultilevelTypes.MultilevelContainer
        },
        newChild(id) {
            return new MultilevelGraphObject(id);
        },
        free() {
            this._links && this._links.free();
            this._nodes && this._nodes.free();
            this._graphs && this._graphs.free();
        },
        links() {
            if (!this._links) {
                const owner = this.belongsTo();
                this._links = this.factory().createLinks(this.id, {owner: owner && owner.node(), multilevel: this});
            }
            return this._links;
        },
        nodes() {
            if (!this._nodes) {
                const owner = this.belongsTo();
                this._nodes = this.factory().createNodes(this.id, {owner: owner && owner.graph(), multilevel: this});
            }
            return this._nodes;
        },
        graphs() {
            if (!this._graphs) {
                // const owner = this.belongsTo(); // TODO not sure about ownership here
                this._graphs = this.factory().createGraphs(this.id, {owner: null, multilevel: this});
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

    const MultilevelDelegateGraphContainer = GraphObject.extend({
        config: { multilevel: true },
        $mixins: [Iterable, Accessible],

        createMultilevel() {
            return new MultilevelGraphContainer(this.id, {[this.type()] : this});
        },
        initialize({multilevel, lazy}) {
            if (multilevel) {
                this._multilevel = multilevel;
            } else if (!lazy) {
                this._multilevel = this.createMultilevel()
            }
        },
        multilevel() {
            return this._multilevel
        },
        free() {
            this.multilevel().free();
        },
        elem(multilevelElem) { // this method will be overridden for specific type
            const childrenType = this.type().children();
            return MultilevelGraphObject[childrenType.toString()].apply(multilevelElem)
        },
        get(index) {
            return this.elem(this.multilevel().get(index));
        },
        size() {
            return this.multilevel().size();
        },
        empty() {
            return this.multilevel().empty();
        },
        forEach(func, thisArg) {
            this.multilevel().forEach(function(elem, index, array) {
                return func.call(this, this.elem(elem), index, array)
            }, thisArg || this);
        },
        map(func, thisArg) {
            return this.multilevel().map(function(elem, index, array) {
                return func.call(this, this.elem(elem), index, array)
            }, thisArg || this);
        },
        indexOf(child) {
            return this.multilevel().indexOf(child.multilevel());
        },
        find(func, thisArg) {
            return this.multilevel().find(function(elem, index, array) {
                return func.call(this, this.elem(elem), index, array)
            }, thisArg || this);
        },
        contains(gobj) {
            return this.multilevel().contains(gobj.multilevel())
        },
        add(gobj) {
            this.multilevel().add(gobj.multilevel());
            return this;
        },
        newChild(id, props) {
            return this.factory().create(this.type().children(), id, props);
        },
        addNew(id, props) {
            const gobj = this.newChild(id, props);
            this.add(gobj);
            return gobj;
        },
        remove(gobj) {
            return this.multilevel().remove(gobj.multilevel())
        },
        toJSON(json) {
            return this.map(elem => elem.toJSON(json))
        },
        fromJSON(json, map) {
            const globalMultilevelId = GraphObject.GlobalId(this.id, MultilevelTypes.MultilevelContainer);
            this._multilevel = map[globalMultilevelId] = map[globalMultilevelId] || this.createMultilevel();
            json.container.forEach(child => {
                const obj = this.newChild(child.id, {lazy: json.lazy});
                obj.fromJSON(child, map);
                this.add(obj)
            });
        }
    });

    const Multilevel = {
        config: { multilevel: true },

        createMultilevel() {
            return new MultilevelGraphObject(this.id, {[this.type()] : this});
        },
        initialize({multilevel, lazy}) {
            if (multilevel) {
                this._multilevel = multilevel;
            } else if (!lazy) {
                this._multilevel = this.createMultilevel();
            }
        },
        multilevel() {
            return this._multilevel
        },
        fromJSON(json, map) {
            const globalMultilevelId = GraphObject.GlobalId(this.id, MultilevelTypes.MultilevelObject);
            this._multilevel = map[globalMultilevelId] = map[globalMultilevelId] || this.createMultilevel();
        }
    };

    const Directed = {
        config: { directed: true }
    };

    const Dual = {
        config: { dual: true }
    };

// ---- Link

    const Link = GraphObject.extend({
        initialize({pair}) {
            this._pair = pair;
        },
        type() {
            return Types.Link;
        },
        checkCanBeBound: OOP.Extensible.create(function(pair) {
            if (!pair.node()) {
                throw new Error('Link ' + pair + ' is free, does not belong to a node');
            }
            if (pair.pair()) {
                throw new Error('Link ' + pair + ' is already bound');
            }
        }),
        bind(pair) {
            this.checkCanBeBound(pair);
            this._bind('_pair', pair);
        },
        unbind() {
            this._unbind('_pair')
        },
        node() {
            return this.belongsTo(Types.Node);
        },
        linked() {
            return this._pair && this._pair.node()
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
            const node = this.node();
            const linked = this.linked();
            return linked && node && node.links(this.direction().reverse()).
                find(link => link.linked() === linked)

        },
        direction() {
            return this.belongsTo().direction();
        }
    };

    const LinkMultilevel = {
        checkCanBeBound(pair) {
            if (!pair.node().inverse().links().empty()) {
                throw new Error(pair + ' can not be multilevel bound');
            }
        },
        inverse() {
            const inverseNode = this.node().inverse(); // this.node().multilevel().link.linked()
            return inverseNode ? inverseNode.links().get(this.index()) : null;
        }
    };

// -------------- Links $mixins

    const Links = {
        type() {
            return Types.Links
        }
    };

    const LinksDirected = {
        config: { directed: true },

        names: ['ins', 'outs'],

        reverse() {
            return this.belongsTo().links(this.direction().reverse());
        },
        direction() {
            return this.belongsTo().direction(this);
        },
        type() {
            return Types.Links
        }
    };

    const LinksMultilevel = {
        elem(multilevel) {
            return multilevel && multilevel.link();
        },
        inverse(direction) {
            return this.belongsTo().inverse().links(direction);
        },
        type() {
            return Types.Links
        }
    };

// --------------- Node

    const Node = GraphObject.extend({
        initialize({lazy}) {
            this._links = this.factory().createLinks(this.id, {owner: this, lazy});
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
            this.links().fromJSON({container: json.links, lazy: json.lazy}, map);
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
        }
    };

    const NodeDual = {
        config: { dual: true },

        duality() {
            return this.belongsTo().duality();
        }
    };


// ---------------- Nodes $mixins

    const Nodes = {
        type() {
            return Types.Nodes
        }
    };

    const NodesDual = {
        config: { dual: true },

        names: ['vertices', 'edges'],

        dual() {
            return this.belongsTo().nodes(this.duality().dual());
        },
        duality() {
            return this.belongsTo().duality(this);
        },
        type() {
            return Types.Nodes
        }
    };

    const NodesMultilevel = {
        elem(multilevel) {
            return multilevel && multilevel.node();
        },
        type() {
            return Types.Nodes
        }
    };

// ----------------- Graph

    const Graph = GraphObject.extend( {
        initialize({lazy}) {
            this._nodes = this.factory().createNodes(this.id, {owner: this, lazy})
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
            this.nodes().fromJSON({container: json.nodes, lazy: json.lazy} , map)
        }
    });

// --------------- Graph $mixins

    const GraphDual = {
        config: { dual: true },

        nodes(duality) {
            return duality ? this._nodes.container(duality) : this._nodes;
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
        inverse() {
            //this.multilevel().link().pair().multilevel().graph();
        },
        prevGraphs() {
            return this.multilevel().belongsTo().graphs();
        },
        nextGraphs() {  // Graphs own by this graph
            return this.nodes().multilevel().graphs();
        },
        level() {
            const previous = this.prevGraphs();
            return previous && previous.length > 0 ? previous[0].level() + 1 : 0;
        }
    };

// -----------  Graphs

    const Graphs = {
        type() {
            return Types.Graphs;
        }
    };

    const GraphsMultilevel = {
        elem(multilevel) {
            return multilevel && multilevel.graph();
        },
        type() {
            return Types.Graphs
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
        create(type, id, props) {
            return new this[type.name](id, props);
        },
        createLink(id, props) {
            return new this.Link(id, props)
        },
        createLinks(id, props) {
            return new this.Links(id, props)
        },
        createNode(id, props) {
            return new this.Node(id, props)
        },
        createNodes(id, props) {
            return new this.Nodes(id, props)
        },
        createGraph(id, props) {
            return new this.Graph(id, props)
        },
        createGraphs(id, props) {
            return new this.Graphs(id, props)
        }
    });

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Links: GraphContainer.extend( {
            $mixins: [Links]
        }),
        Node: Node,
        Nodes: GraphContainer.extend( {
            $mixins: [Nodes]
        }),
        Graph: Graph,
        Graphs: GraphContainer.extend( {
            $mixins: [Graphs]
        })
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
        Links: MultilevelDelegateGraphContainer.extend({
            $mixins: [LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [Multilevel, NodeMultilevel]
        }),
        Nodes: MultilevelDelegateGraphContainer.extend({
            $mixins: [NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [Multilevel, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateGraphContainer.extend({
            $mixins: [GraphsMultilevel]
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
            Container: MultilevelDelegateGraphContainer.extend({
                $mixins: [LinksDirected, Multilevel, LinksMultilevel]
            })
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, Multilevel, NodeMultilevel]
        }),
        Nodes: MultilevelDelegateGraphContainer.extend({
            $mixins: [Directed, Multilevel, NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [Directed, Multilevel, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateGraphContainer.extend({
            $mixins: [Directed, Multilevel, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [Dual, Multilevel, LinkMultilevel]
        }),
        Links: MultilevelDelegateGraphContainer.extend({
            $mixins: [Dual, Multilevel, LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [NodeDual, Multilevel, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [NodesDual, Multilevel, NodesMultilevel],
            Container: MultilevelDelegateGraphContainer.extend({
                $mixins: [NodesDual, Multilevel, NodesMultilevel]
            })
        }),
        Graph: Graph.extend({
            $mixins: [GraphDual, Multilevel, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateGraphContainer.extend({
            $mixins: [Dual, Multilevel, GraphsMultilevel]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Dual, Multilevel, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Dual, Multilevel, LinksMultilevel],
            Container: MultilevelDelegateGraphContainer.extend({
                $mixins: [LinksDirected, Dual, Multilevel, LinksMultilevel]
            })
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeDual, Multilevel, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [Directed, NodesDual, Multilevel, NodesMultilevel],
            Container: MultilevelDelegateGraphContainer.extend({
                $mixins: [Directed, NodesDual, Multilevel, NodesMultilevel]
            })
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphDual, Multilevel, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateGraphContainer.extend({
            $mixins: [Directed, Dual, Multilevel, GraphsMultilevel]
        })
    });

    const Exports = typeof exports !== "undefined" ? exports : root;   // CommonJS module support

    Exports.G = GraphFactory;


})(this, this.OOP, this.FP);







