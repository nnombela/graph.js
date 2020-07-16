//  graph.js 2.0
//  (c) 2019 nnombela@gmail.com.
//  Graph library
(function(root, OOP, FP) {
    // Enums
    const Types = OOP.Enum.create({Graphs: 'graphs', Graph: 'graph', Nodes: 'nodes', Node: 'node', Links: 'links', Link: 'link'}, {
        children() {
            return Types.members[this.ordinal + 1]
        },
        parent() {
            return Types.members[this.ordinal - 1]
        },
        isContainer() {
            return this.ordinal % 2 === 0
        }
    });

    const Direction = OOP.Enum.create({In: 'in', Out: 'out'}, {
        reverse() {
            return Direction.members[(this.ordinal + 1) % 2];
        }
    });

    const Duality =  OOP.Enum.create({Vertex: 'vertex', Edge: 'edge'}, {
        dual() {
            return Duality.members[(this.ordinal + 1) % 2];
        }
    });

    const MultilevelTypes = OOP.Enum.create({MultilevelContainer: 'mlc', MultilevelObject: 'mlo'}, {
        children() {
            return MultilevelTypes.members[this.ordinal + 1]
        },
        parent() {
            return MultilevelTypes.members[this.ordinal - 1]
        },
    });

    // Base Graph object
    const GraphObject = OOP.Class.extend({
        $statics: {
            Types, Direction, Duality,
            UNIQUE_ID_PATTERN: 'g000-1000-0000', // set this to undefined to generate uuidv4
            GlobalId: (id, type) => id ? `${type}#${id}` : id,
        },

        $constructor(id, props = {}) {
            this.id = id || props.id || OOP.uniqueId(props.idPattern || GraphObject.UNIQUE_ID_PATTERN);
            this.initialize(props);
        },

        config: OOP.Extensible.create({name: 'default'}),

        initialize: OOP.Composable.create(function({owner}) {
            this.owner = owner;
        }),

        free: OOP.Pipable.create(function() {
            this.owner && this.owner.free(this)
        }),
        globalId() {
            return GraphObject.GlobalId(this.id, this.type());
        },
        type() {
            return this.owner && this.owner.type().children()
        },
        factory() {
            return GraphFactory.getFactoryByConfig(this.config);
        },
        toString() {
            return this.globalId()
        },
        index() {
            return this.owner ? this.owner.indexOf(this) : -1;
        },
        belongsTo(type) {
            return type === undefined || this.type() === type ? this.owner : this.owner.belongsTo(type);
        },

        // ---- JSON
        toJSON: OOP.Composable.create(function() {
            return { id: this.id }
        }),

        fromJSON: OOP.Pipable.create(function(json, pool) {
            pool[this.globalId()] = this;
        }),

        // ---- Binding helper methods
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
        _fromJsonBound(json, pool, name) {
            const boundId = GraphObject.GlobalId(json[name + 'Id'], this.type());
            if (boundId && pool[boundId]) {
                this._bind('_' + name, pool[boundId]);
            }
        }
    });

    const Iterable = {
        Iterator: OOP.Class.extend({
            $constructor(container) {
                this.container = container;
                this.cursor = -1;
            },
            current() {
                return this.container.get(this.cursor);
            },
            next() {
                return this.container.get(++this.cursor);
            },
            hasNext() {
                return this.cursor + 1 < this.container.size();
            },
            index() {
                return this.cursor;
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
            set(gobj, value) {
                this.array[gobj.index()] = value;
                return this;
            }
        }),
        accessor() {
            return new this.Accessor(this);
        }
    };

    // Base Graph Container
    const GraphContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],

        initialize() {
            this._container = []
        },
        container() {
            return this._container
        },
        free(child) {
            if (child) {
                this.remove(child);
            } else {
                this.forEach(child => this.remove(child))
            }
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
        forEach(func) {
            this._container.forEach(func, this);
        },
        map(func) {
            return this._container.map(func, this);
        },
        indexOf(child) {
            return this._container.indexOf(child);
        },
        find(func) {
            return this._container.find(func, this);
        },
        contains(child) {
            return this.indexOf(child) !== -1;
        },
        add(child) {
            if (child.type() !== this.type().children()) {
                throw new Error('Graph object: ' + child + ' is not the right type and could not be added to graph container: ' + this);
            }
            if (child.owner && child.owner !== this) {
                throw new Error('Graph object: ' + child + ' is not free and could not be added to graph container: ' + this)
            }
            child.owner = this;
            this._container.push(child);
            return this;
        },
        newChild(id, props) {
            return this.factory().create(this.type().children(), id, props);
        },
        addNew(id, props) {
            const child = this.newChild(id, props);
            this.add(child);
            return child;
        },
        remove(child) {
            if (child.owner && child.owner !== this) {
                throw new Error('Graph object: ' + child + ' does not belong to this container: ' + this)
            }
            const idx = this.indexOf(child);
            if (idx === 0) {
                this._container.shift()
            } else if (idx === this.size() - 1) {
                this._container.pop()
            } else  if (idx !== -1) {
                this._container.splice(idx, 1)
            }
            child.owner = null;
            return this;
        },
        toJSON() {
            return this.map(elem => elem.toJSON())
        },
        fromJSON(json, pool) {
            json.container.forEach(jsonChild => {
                const child = this.newChild(jsonChild.id, {lazy: true});
                child.fromJSON(jsonChild, pool);
                this.add(child)
            });
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
        graphContainer(enumerator) {
            return enumerator === undefined ? this : this[enumerator.ordinal];
        },
        container(enumerator) {
            return enumerator === undefined ? this[0].container().concat(this[1].container()) : this[enumerator.ordinal].container();
        },
        get(index) {
            const size0 = this[0].size();
            return index < size0 ? this[0].get(index) : this[1].get(index - size0);
        },
        indexOf(gobj) {
            const indexOf0 = this[0].indexOf(gobj);
            return indexOf0 === -1 ? indexOf0 : this[1].indexOf(gobj);
        },
        forEach(func) {
            this[0].forEach(func,  this);
            this[1].forEach(func, this);
        },
        map(func) {
            return this.container().map(func, this)
        },
        find(func) {
            const find0 = this[0].find(func, this);
            return find0 ? find0 : this[1].find(func,  this);
        },
        size() {
            return this[0].size() + this[1].size();
        },
        empty() {
            return this[0].empty() && this[1].empty();
        },
        add(gobj, enumerator) {
            return this.graphContainer(enumerator || {ordinal: 0}).add(gobj);
        },
        addNew(id, enumerator) {
            return this.graphContainer(enumerator || {ordinal: 0}).addNew(id);
        },
        remove(gobj) {
            const idx = this[0].remove(gobj);
            return idx !== -1 ? idx : this[1].remove(gobj);
        },
        free() {
            this[0].free();
            this[1].free();
        },
        toJSON() {
            return {
                [this.names[0]] : this[0].toJSON(),
                [this.names[1]] : this[1].toJSON()
            };
        },
        fromJSON(json, pool) {
            const name0 = this.names[0], name1 = this.names[1];
            this[0].fromJSON({container: json.container[name0], name: name0, idx: 0}, pool);
            this[1].fromJSON({container: json.container[name1], name: name1, idx: 1}, pool);
        }
    });

    const MultilevelGraphObject = GraphObject.extend({
        config: { multilevel: true },

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
        level() {
            const owner = this.belongsTo();
            return owner ? owner.level() + 1 : 0;
        },
        free() {
            this._link && this._link.free();
            this._node && this._node.free();
            this._graph && this._graph.free();
        },
        link() {
            if (!this._link) {
                this._link = this.factory().createLink(this.id, {owner: this.owner && this.owner.links(), multilevel: this} );
            }
            return this._link;
        },
        node() {
            if (!this._node) {
                this._node = this.factory().createNode(this.id, {owner: this.owner && this.owner.nodes(), multilevel: this});
            }
            return this._node;
        },
        graph() {
            if (!this._graph) {
                this._graph = this.factory().createGraph(this.id, {owner : this.owner && this.owner.graphs(), multilevel: this} );
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
        config: { multilevel: true },

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
        newChild(id, props) {
            return this.factory().createMultilevelObject(id, props)
        },
        free() {
            this._links && this._links.free();
            this._nodes && this._nodes.free();
            this._graphs && this._graphs.free();
        },
        level() {
            return this.owner ? this.owner.level() + 1 : 0;
        },
        links() {
            if (!this._links) {
                this._links = this.factory().createLinks(this.id, {owner: this.owner && this.owner.node(), multilevel: this});
            }
            return this._links;
        },
        nodes() {
            if (!this._nodes) {
                this._nodes = this.factory().createNodes(this.id, {owner: this.owner && this.owner.graph(), multilevel: this});
            }
            return this._nodes;
        },
        graphs() {
            if (!this._graphs) {
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

    const MultilevelDelegateContainer = GraphObject.extend({
        $mixins: [Iterable, Accessible],
        config: { multilevel: true },

        createContainer() {
            return this.factory().createMultilevelContainer(this.id, {[this.type()] : this});
        },
        initialize({multilevel, lazy}) {
            if (multilevel) {
                this._multilevel = multilevel;
            } else if (!lazy) {
                this._multilevel = this.createContainer();
            }
        },
        multilevel() {
            return this._multilevel;
        },
        elem(multilevelObject) { // this method will be overridden for specific type
            const childrenType = this.type().children();
            return MultilevelGraphObject[childrenType.toString()].apply(multilevelObject)
        },
        free(child) {
            this.multilevel().free(child);
            return this;
        },
        container() {
            return this.multilevel().map(multilevelElem => this.elem(multilevelElem))
        },
        get(index) {
            return this.elem(this.multilevel().get(index));
        },
        indexOf(child) {
            return this.multilevel().indexOf(child.multilevel());
        },
        contains(child) {
            return this.multilevel().contains(child.multilevel());
        },
        size() {
            return this.multilevel().size();
        },
        empty() {
            return this.multilevel().empty();
        },
        callElemFunc(func) {
            return (elem, ...rest) => func.call(this, this.elem(elem), ...rest)
        },
        forEach(func) {
            this.multilevel().forEach(this.callElemFunc(func), this);
        },
        map(func) {
            return this.multilevel().map(this.callElemFunc(func), this);
        },
        find(func) {
            return this.multilevel().find(this.callElemFunc(func), this);
        },
        add(child) {
            this.multilevel().add(child.multilevel());
            return this;
        },
        remove(child) {
            this.multilevel().remove(child.multilevel());
            return this;
        },
        newChild(id, props) {
            const mlChild = this.multilevel().newChild(id, props);
            return this.elem(mlChild);
        },
        addNew(id, props) {
            return this.elem(this.multilevel().addNew(id, props));
        },
        toJSON() {
            return this.map(elem => elem.toJSON())
        },
        fromJSON(json, pool) {
            if (!this._multilevel) {
                const mlContainerGlobalId = GraphObject.GlobalId(this.id, MultilevelTypes.MultilevelContainer);
                this._multilevel = pool[mlContainerGlobalId] = pool[mlContainerGlobalId] || this.createContainer();
            }
            json.container.forEach(jsonChild => {
                const child = this.newChild(jsonChild.id, {lazy: true});
                child.fromJSON(jsonChild, pool);
                this.add(child)
            });
        }
    });

    const MultilevelDelegateObject = {
        config: { multilevel: true },

        createObject() {
            return this.factory().createMultilevelObject(this.id, {[this.type()] : this})
        },
        initialize({multilevel, lazy}) {
            if (multilevel) {
                this._multilevel = multilevel;
            } else if (!lazy) {
                this._multilevel = this.createObject();
            }
        },
        multilevel() {
            return this._multilevel
        },
        fromJSON(json, pool) {
            if (!this._multilevel) {
                const mlObjectGlobalId = GraphObject.GlobalId(this.id, MultilevelTypes.MultilevelObject);
                this._multilevel = pool[mlObjectGlobalId] = pool[mlObjectGlobalId] || this.createObject();
            }
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
        checkCanBeBound: OOP.Composable.create(function(pair) {
            if (!pair.owner) {
                throw new Error('Link ' + pair + ' is free, does not belong to a node');
            }
            if (pair.pair()) {
                throw new Error('Link ' + pair + ' is already bound');
            }
        }),
        bind(pair) {
            this.checkCanBeBound(pair);
            this._bind('_pair', pair);
            return this;
        },
        unbind() {
            this._unbind('_pair');
            return this;
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
        initialize() {
            this._links = this.factory().createLinks(this.id, {owner: this});
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
            this.links().fromJSON({container: json.links}, map);
        },
        free() {
            this.links().free();
        }
    });

// ----------- Node $mixins

    const NodeDirected = {
        config: { directed: true },

        links(direction) {
            return this._links.graphContainer(direction);
        },
        direction(links) {
            return this.links(Direction.In) === links ? Direction.In : this.links(Direction.Out) === links ? Direction.Out : undefined;
        },
        indexOf(links) {
            const direction = this.direction(links);
            return direction ? direction.ordinal : -1;
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
        initialize() {
            this._nodes = this.factory().createNodes(this.id, {owner: this})
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
            this.nodes().fromJSON({container: json.nodes} , map)
        }
    });

// --------------- Graph $mixins

    const GraphDual = {
        config: { dual: true },

        nodes(duality) {
            return duality ? this._nodes.graphContainer(duality) : this._nodes;
        },
        duality(nodes) {
            return this._nodes[0] === nodes? Duality.Edge : this._nodes[1] === nodes? Duality.Vertex : undefined;
        },
        indexOf(nodes) {
            const duality = this.duality(nodes);
            return duality ? duality.ordinal : -1;
        }
    };

    const GraphMultilevel = {
        inverse() {
            //this.multilevel().link().pair().multilevel().graph();
        },
        nextGraphs() {  // Graphs own by this graph
            const multilevel = this.nodes().multilevel();
            return multilevel.hasGraphs() ? multilevel.graphs() : undefined;
        },
        toJSON(json) {
            json.level = this.multilevel().level();
            const nextGraphs = this.nextGraphs();
            if (nextGraphs) {
                json.nextGraphs = nextGraphs.toJSON();
            }
            return json;
        },
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
                return GraphFactory[GraphFactory.configToName(config || {})];
            },
            getFactoryByName(fullname) {
                return GraphFactory[fullname]
            },
            configToName(config) {
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
            this.name = GraphFactory.configToName(config);
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
        },
        createMultilevelObject(id, props) {
            return new this.MultilevelObject(id, props)
        },
        createMultilevelContainer(id, props) {
            return new this.MultilevelContainer(id, props)
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
            $mixins: [MultilevelDelegateObject, LinkMultilevel]
        }),
        Links: MultilevelDelegateContainer.extend({
            $mixins: [LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [MultilevelDelegateObject, NodeMultilevel]
        }),
        Nodes: MultilevelDelegateContainer.extend({
            $mixins: [NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [MultilevelDelegateObject, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateContainer.extend({
            $mixins: [GraphsMultilevel]
        }),
        MultilevelObject: MultilevelGraphObject,
        MultilevelContainer: MultilevelGraphContainer
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
            $mixins: [LinkDirected, MultilevelDelegateObject, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, MultilevelDelegateObject, LinksMultilevel],
            Container: MultilevelDelegateContainer.extend({
                $mixins: [LinksDirected, MultilevelDelegateObject, LinksMultilevel]
            })
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, MultilevelDelegateObject, NodeMultilevel]
        }),
        Nodes: MultilevelDelegateContainer.extend({
            $mixins: [Directed, MultilevelDelegateObject, NodesMultilevel]
        }),
        Graph: Graph.extend({
            $mixins: [Directed, MultilevelDelegateObject, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateContainer.extend({
            $mixins: [Directed, MultilevelDelegateObject, GraphsMultilevel]
        }),
        MultilevelObject: MultilevelGraphObject.extend({
            $mixins: [Directed]
        }),
        MultilevelContainer: MultilevelGraphContainer.extend({
            $mixins: [Directed]
        })
    });

    GraphFactory.register({name: 'default', dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [Dual, MultilevelDelegateObject, LinkMultilevel]
        }),
        Links: MultilevelDelegateContainer.extend({
            $mixins: [Dual, MultilevelDelegateObject, LinksMultilevel]
        }),
        Node: Node.extend({
            $mixins: [NodeDual, MultilevelDelegateObject, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [NodesDual, MultilevelDelegateObject, NodesMultilevel],
            Container: MultilevelDelegateContainer.extend({
                $mixins: [NodesDual, MultilevelDelegateObject, NodesMultilevel]
            })
        }),
        Graph: Graph.extend({
            $mixins: [GraphDual, MultilevelDelegateObject, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateContainer.extend({
            $mixins: [Dual, MultilevelDelegateObject, GraphsMultilevel]
        }),
        MultilevelObject: MultilevelGraphObject.extend({
            $mixins: [Dual]
        }),
        MultilevelContainer: MultilevelGraphContainer.extend({
            $mixins: [Dual]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true, multilevel: true}, {
        Link: Link.extend({
            $mixins: [LinkDirected, Dual, MultilevelDelegateObject, LinkMultilevel]
        }),
        Links: DuoGraphContainer.extend({
            $mixins: [LinksDirected, Dual, MultilevelDelegateObject, LinksMultilevel],
            Container: MultilevelDelegateContainer.extend({
                $mixins: [LinksDirected, Dual, MultilevelDelegateObject, LinksMultilevel]
            })
        }),
        Node: Node.extend({
            $mixins: [NodeDirected, NodeDual, MultilevelDelegateObject, NodeMultilevel]
        }),
        Nodes: DuoGraphContainer.extend({
            $mixins: [Directed, NodesDual, MultilevelDelegateObject, NodesMultilevel],
            Container: MultilevelDelegateContainer.extend({
                $mixins: [Directed, NodesDual, MultilevelDelegateObject, NodesMultilevel]
            })
        }),
        Graph: Graph.extend({
            $mixins: [Directed, GraphDual, MultilevelDelegateObject, GraphMultilevel]
        }),
        Graphs: MultilevelDelegateContainer.extend({
            $mixins: [Directed, Dual, MultilevelDelegateObject, GraphsMultilevel]
        }),
        MultilevelObject: MultilevelGraphObject.extend({
            $mixins: [Directed, Dual]
        }),
        MultilevelContainer: MultilevelGraphContainer.extend({
            $mixins: [Directed, Dual]
        })
    });

    const Exports = typeof exports !== "undefined" ? exports : root;   // CommonJS module support

    Exports.G = GraphFactory;


})(this, this.OOP, this.FP);







