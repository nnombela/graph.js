(function() {
    // dependencies
    var root = this, OOP = this.OOP, FP = this.FP;

    var Types = OOP.Enum.create(['graphs', 'graph', 'nodes', 'node', 'links', 'link'], {
        children: function() {
            return Types.values[this.idx() + 1];
        },
        parent: function() {
            return Types.values[this.idx() - 1];
        },
        capitalize: function() {
            return this.val().charAt(0).toUpperCase() + this.val().slice(1);
        }
    });

    var Direction = OOP.Enum.create(['in', 'out'], {
        reverse: function() {
            return this === Direction['in']? Direction['out'] : Direction['in'];
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

        initialize: OOP.Composable.create(function(owner) {
            this._owner = owner;
        }),

        config: OOP.Composable.create({name: 'default'}),

        type: function() {
            return this._owner.type().children();
        },

        factory: function() {
            return GraphFactory.getFactory(this.config);
        },
        label: function() {
            return this._label? this._label : this._createLabel();
        },
        toString: function() {
            return this.label();
        },
        index: function() {
            return this._owner? this._owner.indexOf(this) : -1;
        },
        belongsTo: function(type) {
            return type === undefined || this.type() === type? this._owner : this._owner.belongsTo(type);
        },
        free: function() {
            if (this._owner) this._owner.free(this);
            return this;
        },

        // ---- JSON
        toJSON: OOP.Composable.create(function() {
            var json = {};
            if (this._label) {
                json.label = this._label;
            }
            return json;
        }),

        fromJSON: OOP.Composable.create(function(json, map) {
            if (json.label) {
                this._label = json.label;
            }
            map[this.label()] = this;
        }),

        // ---- Private methods
        _createLabel: function() {
            return this._owner? this._owner.label() + ":" + this.type().val() + '[' + this._owner.indexOf(this) + ']': this.type().val();
        },

        _bind: function(thisProp, that, thatProp) { // "this" is implicit
            thatProp = thatProp || thisProp; // if not given thatProp will be thisProp, sometimes have same name sometimes have dual names
            if (this[thisProp] === null && that[thatProp] === null) {
                this[thisProp] = that;
                that[thatProp] = this;
            } else if (this[thisProp] !== that || that[thatProp] !== this) { // it is already bound
                throw new Error('Not able to bind objects ( ' + this + ', ' + that + ')')
            }
        },
        _unbind: function(thisProp, thatProp) {
            thatProp = thatProp || thisProp; // if not given thatProp will be thisProp
            var that = this[thisProp];
            if (that !== null && that[thatProp] === this) {
                that[thatProp] = null;
                this[thisProp] = null;
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

        initialize: function() {
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
            if (!gobj.belongsTo() &&  gobj.type() === this.type().children() ) {
                gobj.initialize(this);
                this._children.push(gobj);
                return this;
            } else {
                throw new Error('This graph object ' + gobj + ' could not be added to ' + this + ' graph container');
            }
        },
        addNew: function(label) {
            var gobj = this.factory().create(this.type().children(), label, this);
            this._children.push(gobj);
            return gobj;
        },
        remove: function(gobj) {
            var idx = this.indexOf(gobj);
            if (idx !== -1) {
                this._children.splice(idx, 1);
                gobj.initialize(null)
            }
            return idx;
        },
        free: function(gobj) {
            return gobj? this.remove(gobj) : this._super("free");
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
        remove: function(gobj, enumerator) {
            if (enumerator) {
                return this.container(enumerator).remove(gobj);
            } else {
                var idx = this[0].remove(gobj);
                return idx !== -1? idx : this[1].remove(gobj);
            }
        },
        free: function(gobj) {
            if (gobj) {
                return this.remove(gobj);
            } else {
                this[0].free();
                this[1].free();
                return this._super('free');
            }
        },
        toJSON: function() {
            return {'0': this[0].toJSON(), '1': this[1].toJSON() };
        },
        fromJSON: function(json, map) {
            if (json['0']) {
                this[0].fromJSON(json['0'], map);
            }
            if (json['1']) {
                this[1].fromJSON(json['1'], map);
            }
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
            if (this._pair) {
                json.pair = this._pair.label();
            }
            return json
        },
        fromJSON: function(json, map) {
            if (json.pair && map[json.pair]) {
                this.bind(map[json.pair]);
            }
        }
    });

// ----- Link augments

    var LinkDirectability = {
        statics: {
            Direction: Direction
        },

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
            this._bind('_reverse', reverse);
        },
        unbindReverse: function() {
            this._unbind('_reverse')
        },

        direction: function() {
            return this._owner.direction();
        },
        toJSON: function(json) {
            if (this._reverse) {
                json.reverse = this._reverse.label();
            }
            return json
        },
        fromJSON: function(json, map) {
            if (json.reverse && map[json.reverse]) {
                this.bindReverse(map[json.reverse]);
            }
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
        bindDown: function(down) {
            this._bind('_down', down, '_up');
        },
        unbindDown: function() {
            this._unbind('_down', '_up')
        },

        down: function() {
            return this._down;
        },
        toJSON: function(json) {
            if (this._inverse) {
                json.inverse = this._inverse.label();
            }
            if (this._down) {
                json.down = this._down.label();
            }
            return json
        },
        fromJSON: function(json, map) {
            if (json.inverse && map[json.inverse]) {
                this.bindInverse(map[json.inverse]);
            }
            if (json.down && map[json.down]) {
                this.bindDown(map[json.down]);
            }
        }
    };

// -------------- Links augments

    var LinksDirectability = {
        reverse: function() {
            return this._owner.links(this.direction().reverse());
        },
        direction: function() {
            return this._owner.direction(this);
        },
        toJSON: function(json) {
            return json['0'] && json['1']?  { 'in': json[0], 'out': json[1] } : json;
        },
        fromJSON: function(json, map) {
            if (json['in'] && json['out']) {
                this['0'].fromJSON(json['in'], map);
                this['1'].fromJSON(json['out'], map);
            }
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
        indexOf: function(links) {
            return this._links === links? 0 : -1;
        },
        toJSON: function(json) {
            json.links = this.links().toJSON();
            return json
        },
        fromJSON: function(json, map) {
            this.links().fromJSON(json.links, map);
        }
    });

// ----------- Node augments

    var NodeDirectability = {
        links: function(direction) {
            return direction? this._links.container(direction) : this._links;
        },
        direction: function(links) {
            return this._links.container(Direction.in) === links? Direction.in :
                    this._links.container(Direction.out) === links? Direction.out : Direction['undefined'];
        },
        indexOf: function(links) {
            return this.direction(links).idx();
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
        },
        bindDown: function(down) {
            this._bind('_down', down, '_up');
        },
        unbindDown: function() {
            this._unbind('_down', '_up')
        },
        bindUp: function(up) {
            this._bind('_up', up, '_down');
        },
        unbindUp: function() {
            this._unbind('_up', '_down')
        },
        toJSON: function(json) {
            if (this._up) {
                json.up = this._up.label();
            }
            if (this._down) {
                json.down = this._down.label();
            }
            return json;
        },
        fromJSON: function(json, map) {
            if (json.inverse && map[json.inverse]) {
                this.bindInverse(map[json.inverse]);
            }
            if (json.down && map[json.down]) {
                this.bindDown(map[json.down]);
            }
            if (json.up && map[json.up]) {
                this.bindUp(map[json.up]);
            }
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


// ---------------- Nodes augments

    var NodesDuality = {
        dual: function() {
            return this._owner.nodes(this.duality().dual());
        },
        duality: function() {
            return this._owner.duality(this);
        },
        toJSON: function(json) {
            return { 'hvert': json[0], 'hedge': json[1] }
        },
        fromJSON: function(json, map) {
            if (json['hvert']) {
                this['hvert'].fromJSON(json['hvert'], map);
            }
            if (json['hedge']) {
                this['hedge'].fromJSON(json['hedge'], map);
            }
        }
    };

    var NodesFractality = {
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
        indexOf: function(nodes) {
            return this._nodes === nodes? 0 : -1;
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

    var GraphDuality = {
        nodes: function(duality) {
            return duality? this._nodes.container(duality) : this._nodes;
        },
        duality: function(nodes) {
            return this._nodes.container(Duality.hedge) === nodes? Duality.hedge :
                this._nodes.container(Duality.hvert) === links? Duality.hvert : undefined;
        },
        indexOf: function(nodes) {
            return this.duality(nodes).idx();
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
        root: function() {
            var root = this;

            while(!root.isRoot()) {
                root = root.next();
            }
            return root;
        },
        // graphs: function() {}  use belongsTo() instead
        isRoot: function() {
            return this._up === null;
        },
        ordinal: function() {
            return this.isRoot()? 0: this.next().ordinal() + 1;
        },
        bindUp: function(up) {
            this._bind('_up', up, '_down');
        },
        unbindUp: function() {
            this._unbind('_up', '_down')
        },
        toJSON: function(json) {
            if (this._up) {
                json.up = this._up.label();
            }
            return json;
        },
        fromJSON: function(json, map) {
            if (json.up && map[json.up]) {
                this.bindUp(map[json.up]);
            }
        }
    };

// -----------  Graphs

    var Graphs = GraphContainer.extend({
        type: function() {
            return Types.graphs;
        }
    });

    var GraphsFractality = {
        root: function() {


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
                if (config.fractal) {
                    fullname += '_fractal';
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

    var Fractal = {
        config: {fractal: true}
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
            augments: [Directed, LinkDirectability]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, LinksDirectability],
            Container: {  // Existing Container has an extend() method so It will compose with this
                augments: [Directed, LinksDirectability]
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
            augments: [Dual, NodeDuality]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Dual],
            Container: {
                augments: [Dual, NodesDuality]
            }
        }),
        Graph: Graph.extend({
            augments: [Dual, GraphDuality]
        }),
        Graphs: Graphs.extend({
            augments: [Dual]
        })
    });

    GraphFactory.register({name: 'default', fractal: true}, {
        Link: Link.extend({
            augments: [Fractal, LinkFractality]
        }),
        Links: GraphContainer.extend({
            augments: [Fractal, LinksFractality]
        }),
        Node: Node.extend({
            augments: [Fractal, NodeFractality]
        }),
        Nodes: GraphContainer.extend({
            augments: [Fractal, NodesFractality]
        }),
        Graph: Graph.extend({
            augments: [Fractal, GraphFractality]
        }),
        Graphs: Graphs.extend({
            augments: [Fractal]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true}, {
        Link: Link.extend({
            augments: [Directed, Dual, LinkDirectability]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, Dual],
            Container: {
                augments: [Directed, Dual, LinksDirectability]
            }
        }),
        Node: Node.extend({
            augments: [Directed, Dual, NodeDirectability, NodeDuality]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Directed, Dual],
            Container: {
                augments: [Directed, Dual, NodesDuality]
            }
        }),
        Graph: Graph.extend({
            augments: [Directed, Dual, GraphDuality]
        }),
        Graphs: Graphs.extend({
            augments: [Directed, Dual]
        })
    });

    GraphFactory.register({name: 'default', directed:true, fractal: true}, {
        Link: Link.extend({
            augments: [Directed, Fractal, LinkDirectability, LinkFractality]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, Fractal, LinksFractality],
            Container: {
                augments: [Directed, Fractal, LinksDirectability, LinksFractality]
            }
        }),
        Node: Node.extend({
            augments: [Directed, Fractal, NodeDirectability, NodeFractality]
        }),
        Nodes: GraphContainer.extend({
            augments: [Directed, Fractal, NodesFractality]
        }),
        Graph: Graph.extend({
            augments: [Directed, Fractal, GraphFractality]
        }),
        Graphs: Graphs.extend({
            augments: [Directed, Fractal]
        })
    });

    GraphFactory.register({name: 'default', dual:true, fractal: true}, {
        Link: Link.extend({
            augments: [Dual, Fractal, LinkFractality]
        }),
        Links: GraphContainer.extend({
            augments: [Dual, Fractal, LinksFractality]
        }),
        Node: Node.extend({
            augments: [Dual, Fractal, NodeDuality, NodeFractality]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Dual, Fractal, NodesFractality],
            Container: {
                augments: [Dual, Fractal, NodesDuality, NodesFractality]
            }
        }),
        Graph: Graph.extend({
            augments: [Dual, Fractal, GraphFractality]
        }),
        Graphs: Graphs.extend({
            augments: [Dual, Fractal]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual:true, fractal: true}, {
        Link: Link.extend({
            augments: [Directed, Dual, Fractal, LinkDirectability, LinkFractality]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, Dual, Fractal, LinksFractality],
            Container: {
                augments: [Directed, Dual, Fractal, LinksDirectability, LinksFractality]
            }
        }),
        Node: Node.extend({
            augments: [Directed, Dual, Fractal, NodeDirectability, NodeDuality, NodeFractality]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Directed, Dual, Fractal, NodesFractality],
            Container: {
                augments: [Directed, Dual, Fractal, NodesDuality, NodesFractality]
            }
        }),
        Graph: Graph.extend({
            augments: [Directed, Dual, Fractal, GraphDuality, GraphFractality]
        }),
        Graphs: Graphs.extend({
            augments: [Directed, Dual, Fractal]
        })
    });

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    exports.G = GraphFactory;


}).call(this);







