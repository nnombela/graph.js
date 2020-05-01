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
            GlobalId: (id, type = '') => id ? type + '#' + id : undefined,
        },

        $constructor(id, props = {}) {
            this.id = id || props.id || OOP.uniqueId(props.idPattern || GraphObject.UNIQUE_ID_PATTERN);
            this.initialize(props);
        },

        config: OOP.Extensible.create({name: 'default'}),

        initialize: OOP.Extensible.create(function({owner}) {
            this.owner = owner;
        }),

        free: OOP.Extensible.create(function() {
            const owner = this.owner;
            if (owner) {
                this.owner = null;
                owner.free(this);
            }
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
        toJSON: OOP.Extensible.create(function() {
            return { id: this.id }
        }),

        fromJSON: OOP.Extensible.create(function(json, map) {
            map[this.globalId()] = this;
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
            this.container = container;
        },
        free() {
            this.forEach(child => this.remove(child))
        },
        get(index) {
            return this.container[index];
        },
        size() {
            return this.container.length;
        },
        empty() {
            return this.size() === 0;
        },
        forEach(func, thisArg) {
            this.container.forEach(func, thisArg || this);
        },
        map(func, thisArg) {
            return this.container.map(func, thisArg || this);
        },
        indexOf(child) {
            return this.container.indexOf(child);
        },
        find(func, thisArg) {
            return this.container.find(func, thisArg || this);
        },
        contains(gobj) {
            return this.indexOf(gobj) !== -1;
        },
        add(gobj) {
            if (gobj.type() !== this.type().children()) {
                throw new Error('This graph object ' + gobj + ' could not be added to ' + this + ' graph container');
            }
            gobj.initialize({owner: this});
            this.container.push(gobj);
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
                this.container.splice(idx, 1);
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
            if (this.link && link || this.node && node || this.graph && graph) {
                throw new Error('Trying to initialize and object ' + this +' already initialized')
            }
            this.link = this.link || link;
            this.node = this.node || node;
            this.graph = this.graph || graph;
        },
        type() {
            return MultilevelTypes.MultilevelObject
        },
        level() {
            return this.owner ? this.owner.level() + 1 : 0;
        },
        free() {
            this.link && this.link.free();
            this.node && this.node.free();
            this.graph && this.graph.free();
        },
        getLink() {
            if (!this.link) {
                this.link = this.factory().createLink(this.id, {owner: this.owner && this.owner.getLinks(), multilevel: this} );
            }
            return this.link;
        },
        getNode() {
            if (!this.node) {
                this.node = this.factory().createNode(this.id, {owner: this.owner && this.owner.getNodes(), multilevel: this});
            }
            return this._node;
        },
        getGraph() {
            if (!this.graph) {
                this.graph = this.factory().createGraph(this.id, {owner : this.owner && this.owner.getGraphs(), multilevel: this} );
            }
            return this.graph;
        }
    });

    const MultilevelGraphContainer = GraphContainer.extend({
        initialize({links, nodes, graphs}) {
            if (this.links && links || this.nodes && nodes || this.graphs && graphs) {
                throw new Error('Trying to initialize and object ' + this +' already initialized')
            }
            this.links = this.links || links;
            this.nodes = this.nodes || nodes;
            this.graphs = this.graphs || graphs;
        },
        type() {
            return MultilevelTypes.MultilevelContainer
        },
        newChild(id) {
            return new MultilevelGraphObject(id);
        },
        free() {
            this.links && this.links.free();
            this.nodes && this.nodes.free();
            this.graphs && this.graphs.free();
        },
        level() {
            return this.owner ? this.owner.level() + 1 : 0;
        },
        getLinks() {
            if (!this.links) {
                this.links = this.factory().createLinks(this.id, {owner: this.owner && this.owner.getNode(), multilevel: this});
            }
            return this.links;
        },
        getNodes() {
            if (!this.nodes) {
                this.nodes = this.factory().createNodes(this.id, {owner: this.owner && this.owner.getGraph(), multilevel: this});
            }
            return this.nodes;
        },
        getGraphs() {
            if (!this.graphs) {
                this.graphs = this.factory().createGraphs(this.id, {owner: null, multilevel: this});
            }
            return this.graphs;
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
                this.multilevel = multilevel;
            } else if (!lazy) {
                this.multilevel = this.createMultilevel()
            }
        },
        free() {
            this.multilevel.free();
        },
        elem(multilevelElem) { // this method will be overridden for specific type
            const childrenType = this.type().children();
            return MultilevelGraphObject[childrenType.toString()].apply(multilevelElem)
        },
        get(index) {
            return this.elem(this.multilevel.get(index));
        },
        size() {
            return this.multilevel.size();
        },
        empty() {
            return this.multilevel.empty();
        },
        forEach(func, thisArg) {
            this.multilevel.forEach(function(elem, index, array) {
                return func.call(this, this.elem(elem), index, array)
            }, thisArg || this);
        },
        map(func, thisArg) {
            return this.multilevel.map(function(elem, index, array) {
                return func.call(this, this.elem(elem), index, array)
            }, thisArg || this);
        },
        indexOf(child) {
            return this.multilevel.indexOf(child.multilevel);
        },
        find(func, thisArg) {
            return this.multilevel.find(function(elem, index, array) {
                return func.call(this, this.elem(elem), index, array)
            }, thisArg || this);
        },
        contains(gobj) {
            return this.multilevel.contains(gobj.multilevel)
        },
        add(gobj) {
            this.multilevel.add(gobj.multilevel);
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
            return this.multilevel.remove(gobj.multilevel)
        },
        toJSON(json) {
            return this.map(elem => elem.toJSON(json))
        },
        fromJSON(json, map) {
            const globalMultilevelId = GraphObject.GlobalId(this.id, MultilevelTypes.MultilevelContainer);
            this.multilevel = map[globalMultilevelId] = map[globalMultilevelId] || this.createMultilevel();
            json.container.forEach(child => {
                const obj = this.newChild(child.id, {lazy: true});
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
                this.multilevel = multilevel;
            } else if (!lazy) {
                this.multilevel = this.createMultilevel();
            }
        },
        fromJSON(json, map) {
            const globalMultilevelId = GraphObject.GlobalId(this.id, MultilevelTypes.MultilevelObject);
            this.multilevel = map[globalMultilevelId] = map[globalMultilevelId] || this.createMultilevel();
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
            this.pair = pair;
        },
        type() {
            return Types.Link;
        },
        checkCanBeBound: OOP.Extensible.create(function(pair) {
            if (!pair.node()) {
                throw new Error('Link ' + pair + ' is free, does not belong to a node');
            }
            if (pair.pair) {
                throw new Error('Link ' + pair + ' is already bound');
            }
        }),
        bind(pair) {
            this.checkCanBeBound(pair);
            this._bind('pair', pair);
        },
        isBound() {
            return this.pair;
        },
        unbind() {
            this._unbind('pair')
        },
        node() {
            return this.belongsTo(Types.Node);
        },
        linked() {
            return this.pair && this.pair.node()
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
            const inverseNode = this.node().inverse(); // this.node.multilevel.link.linked()
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
            return multilevel && multilevel.link;
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
        initialize(props) {
            this.links = this.factory().createLinks(this.id, FP.extend(props, {owner: this}));
        },
        type() {
            return Types.Node;
        },
        graph() {
            return this.belongsTo(Types.Graph);
        },
        toJSON(json) {
            json.links = this.links.toJSON(json);
            return json
        },
        fromJSON(json, map) {
            this.links.fromJSON({container: json.links}, map);
        },
        free() {
            this.links.free();
        }
    });

// ----------- Node $mixins

    const NodeDirected = {
        config: { directed: true },

        getLinks(direction) {
            return this.links.container(direction);
        },
        direction(links) {
            return this.getLinks(Direction.In) === links ? Direction.In : this.getLinks(Direction.Out) === links ? Direction.Out : undefined;
        },
        indexOf(links) {
            const direction = this.direction(links);
            return direction ? direction.ordinal : -1;
        }
    };

    const NodeMultilevel = {
        inverse() {
            const mlLink = this.multilevel.link;
            return mlLink && mlLink.isBound() ? mlLink.pair.multilevel.getNode() : undefined;
        }
    };

    const NodeDual = {
        config: { dual: true },

        duality() {
            return this.owner ? this.owner.duality() : undefined;
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
            const duality = this.duality();
            return duality ? this.owner.getNodes(duality.dual()) : undefined;
        },
        duality() {
            return this.owner ? this.owner.duality(this) : undefined;
        },
        type() {
            return Types.Nodes
        }
    };

    const NodesMultilevel = {
        elem(multilevel) {
            return multilevel && multilevel.node;
        },
        type() {
            return Types.Nodes
        }
    };

// ----------------- Graph

    const Graph = GraphObject.extend( {
        initialize(props) {
            this.nodes = this.factory().createNodes(this.id, FP.extend(props, {owner: this}))
        },
        type() {
            return Types.Graph;
        },
        toJSON(json) {
            json.nodes = this.nodes.toJSON(json);
            return json
        },
        fromJSON(json, map) {
            this.nodes.fromJSON({container: json.nodes} , map)
        }
    });

// --------------- Graph $mixins

    const GraphDual = {
        config: { dual: true },

        getNodes(duality) {
            return duality ? this.nodes.container(duality) : this.nodes;
        },
        duality(nodes) {
            return this.nodes[0] === nodes ? Duality.Edge : this.nodes[1] === nodes? Duality.Vertex : undefined;
        },
        indexOf(nodes) {
            const duality = this.duality(nodes);
            return duality ? duality.ordinal : -1;
        }
    };

    const GraphMultilevel = {
        inverse() {
            //this.multilevel.link.pair.multilevel.graph;
        },
        prevGraphs() {
            return this.owner;
        },
        nextGraphs() {  // Graphs own by this graph
            return this.nodes().multilevel.graphs();
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







