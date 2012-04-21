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


    var GraphObject = inherits(Object, {
        statics: {
            Types: Types
        },

        initialize: function(owner, label) {
            this._owner = owner? owner : null;
            if (label !== undefined) {
                this._label = label;
            }
        },

        type: function() {
            return this._owner.children();
        },

        factory: function() {
            return this._owner.factory();
        },
        label: function() {
            return this._label !== undefined? this._label : this._owner?
                    this._owner.label() + '::' + this.type().val() + ':' + this.index() : this.type().val();
        },
        index: function() {
            return this._owner? this._owner.indexOf(this) : -1;
        },
        belongsTo: function(type) {
            return type === undefined || this.type() === type? this : this._owner.belongsTo(type);
        },
        free: function() {
            this._owner.free(this);
            return this;
        }
    });

    var GraphContainer = inherits(GraphObject, {
        initialize: function() {
            this.children = [];
        },

        Accessor: inherits(Object, {
            initialize: function(container) {
                this.container = container;
                this.obj = {};
            },
            get: function(gobj) {
                return this.obj[gobj.label()];
            },
            set: function(gobj, value) {
                this.obj[gobj.label()] = value;
            }
        }),
        Iterator: inherits(Object, {
            initialize: function(container) {
                this.container = container;
                this.cursor = -1;
            },
            current: function() {
                return this.container.get(this.cursor);
            },
            next: function() {
                return this.container.get(++this.cursor);
            },
            hasNext: function() {
                return this.cursor + 1 < this.container.size();
            },
            index: function() {
                return this.cursor;
            }
        }),

        get: function(index) {
            return this.children[index];
        },
        size: function() {
            return this.children.length;
        },
        iterator: function() {
            return new this.Iterator(this);
        },
        accessor: function() {
            return new this.Accessor(this);
        },
        forEach: function(func) {
            this.children.forEach(func);
            return this;
        },
        indexOf: function(child) {
            return this.children.indexOf(child);
        },
        find: function(func) {
            return this.children.find(func);
        },
        contains: function(gobj) {
            return this.indexOf(gobj) !== -1;
        },
        add: function(gobj) {
            if (this.type().children() === gobj.type()) {
                gobj._owner = this;
                this.children.push(gobj);
                return this;
            } else {
                throw new Error('Incorrent type: ' + gobj.type().val());
            }
        },
        addNew: function() {
            return this.add(new this.factory().create(this.type().children()))
        },
        remove: function(gobj) {
            var idx = this.indexOf(gobj);
            if (idx !== -1) {
                this.children.splice(idx, 1);
            }
            return idx;
        },
        free: function(gobj) {
            return gobj? this.remove(gobj) : GraphObject.super_.free.call();
        }
    });

    var DuoGraphContainer = inherits(GraphContainer, {
        initialize: function(container0, container1) {
            this['0'] = container0;
            this['1'] = container1;
        },
        container: function(index) {
            return this[index];
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
        add: function(gobj, index) {
            return this[index].add(gobj);
        },
        addNew: function(index) {
            return index? this[index].addNew() : this[0].addNew();
        },
        remove: function(gobj, index) {
            if (index) {
                return this[index].remove(gobj);
            } else {
                var idx = this[0].remove(gobj);
                return idx !== -1? idx : this[1].remove(gobj);
            }
        },
        free: function() {
            GraphContainer.super_.free.call(this);
            this[0].free();
            this[1].free();
            return this;
        }
    });

// ---- Link
    var Link = inherits(GraphObject, {
        initialize: function() {
            this._pair = null;
        },

        type: function() {
            return Types.link;
        },
        bind: function(pair) {
            this._bind('_pair', this._pair);
        },
        unbind: function() {
            this._unbind('_pair', this._pair)
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
            } else {
                throw new Error('Not able to bind links ( ' + this.label() + ', ' + pair.label() + ')')
            }
        },
        _unbind: function(prop, pair) {
            pair[prop] = null;
            this[prop] = null;
        }
    });

    var DiLink = inherits(Link, {
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
            this._bind('_reverse', this._reverse);
        },
        unbindReverse: function() {
            this._unbind('_reverse', this._reverse)
        },

        direction: function() {
            return this._owner.direction();
        }
    });

    var LinkFractality = {
        initialize: function() {
            this._down = null;
            this._inverse = null;
        },

        inverse: function() {
            return this._inverse;
        },
        bindInverse: function(pair) {
            this._bind('_inverse', this._inverse);
        },
        unbindInverse: function() {
            this._unbind('_inverse', this._inverse)
        },

        down: function() {
            return this._down;
        },
        ordinal: function() {
            return this._owner.ordinal();
        }
    };

    var FracLink = inherits(Link, LinkFractality);
    var FracDiLink = inherits(DiLink, LinkFractality);


// -------------- Links

    var Links = inherits(GraphContainer, {
        type: function() {
            return Types.links;
        }
    });

    var DiLinks = inherits(Links, {
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
    });

    var LinksFractality = {
        inverse: function(direction) {
            return this._owner.inverse().links(direction);
        },

        ordinal: function() {
            return this._owner.ordinal();
        }
    };

    var FracLinks = inherits(Links, LinksFractality);

    var FracDiLinks = inherits(DiLinks, LinksFractality);

// --------------- Node

    var Node = inherits(GraphObject, {
        _createLinks: function() {
            return new Links(this);
        },
        initialize: function() {
            this._links = this._createLinks();
        },
        type: function() {
            return Types.node;
        },
        graph: function() {
            return this._owner._owner;
        },
        links: function() {
            return this._links;
        }
    });

    var DiNode = inherits(Node, {
        _createLinks: function() {
            return new DuoGraphContainer(new DiLinks(this, Direction['in']), new DiLinks(this, Direction['out']));
        },
        links: function(direction) {
            return direction? this._links.container(direction) : this._links;
        }
    });


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

    var DualNode = inherits(Node, NodeDuality);

    var DualDiNode = inherits(DiNode, NodeDuality);

    var FracNode = inherits(Node, NodeFractality).extend({
        _createLinks: function()  {
            return new FracLinks(this);
        }
    });

    var FracDiNode = inherits(DiNode, NodeFractality).extend({
        _createLinks: function()  {
            return new DuoGraphContainer(this, FracDiLinks);
        }
    });

    var FracDualNode = inherits(DualNode, NodeFractality).extend({
        _createLinks: function()  {
            return new FracLinks(this);
        }
    });

    var FracDualDiNode = inherits(DualDiNode, NodeFractality).extend({
        _createLinks: function()  {
            return new DuoGraphContainer(this, FracDiLinks);
        }
    });


// ---------------- Nodes

    var Nodes = inherits(GraphContainer, {
        type: function() {
            return Types.nodes;
        }
    });

    var DualNodes = inherits(Nodes, {
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
    });

    var NodesFractality = {
        ordinal: function() {
            return this._owner.ordinal();
        }
    };

    var FracNodes = inherits(Nodes, NodesFractality);

    var FracDualNodes = inherits(DualNodes, NodesFractality);


// ----------------- Graph
    var Graph = inherits(GraphObject, {
        createNodes: function() {
            return new Nodes(this);
        },
        initialize: function() {
            this._nodes = this.createNodes(arguments);
        },
        type: function() {
            return Types.graph;
        },
        nodes: function() {
            return this._nodes;
        }
    });

    var DualGraph = inherits(Graph, {
        createNodes: function() {
            return new DuoGraphContainer(new DualNodes(this, Duality['hvert']), new DualNodes(this, Duality['hedge']));
        },
        nodes: function(duality) {
            return duality? this._nodes.container(duality) : this._nodes;
        }
    });

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

    var FracGraph = inherits(Graph, GraphFractality).extend({
        createNodes: function() {
            return new FracNodes(this);
        }
    });

    var FracDualGraph = inherits(DualGraph, GraphFractality).extend({
        createNodes: function() {
            return new DuoGraphContainer(new FracDualNodes(this, Duality['hvert']), new FracDualNodes(this, Duality['hedge']));
        }
    });


// ----------------- Graph Factory

    var GraphFactoryProps = {
        VERSION: '0.1',
        Config: enumeration(['directed', 'dual', 'fractal']),
        Types: Types,
        Direction: Direction,
        Duality: Duality
    };

    var GraphFactory = inherits(Object, {
        statics: {
            VERSION: '0.1',

            Config: enumeration(['directed', 'dual', 'fractal']),

            register: function(config, props) {
                var factory = new GraphFactory(config, props);
                GraphFactory[factory.name] = factory;
                return factory;
            },
            getFactory: function(config) {
                return GraphFactory[GraphFactory._configToKey(config)];
            },
            _configToName: function(config) {
                var name = '_' + (config.name || 'default');
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

        Types: Types,
        Direction: Direction,
        Duality: Duality,

        constructor: function(config, props) {
            this.config = config;
            this.name = this._configToName(config);
            extend(this, props);
        }
    });

    GraphFactory.register({name: 'default'}, {
        Link: Link,
        Node: Node,
        Graph: Graph
    });

    GraphFactory.register({name: 'default', directed: true}, {
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


    //-------- Helper functions

    function extend(dest, source) {
        for (var prop in source) {   // enumerable properties
            dest[prop] = source[prop];
        }
        return dest;
    }

    function clone(obj) {
        return extend({}, obj);
    }

    function extendIf(dest, source, test) {
        for (var prop in source) {
            if (test(prop)) {
                dest[prop] = source[prop];
            }
        }
        return dest;
    }

    function inherits(Parent, props) {
        var constructor = props.hasOwnProperty('constructor')? props.constructor : undefined;
        var initialize = props.hasOwnProperty('initialize')? props.initialize : undefined;

        var Child = function() {
            if (constructor) {
                constructor.apply(this, arguments);
            } else {
                Parent.apply(this, arguments);  // call Parent r
                if (initialize) { // then call initialization if exits
                    initialize.apply(this, arguments);
                }
            }
        };

        extend(Child, Parent); // copy static class properties from Parent

        if (props.hasOwnProperty('statics')) {   // Add new ones
            extend(Child, props.statics);
        }

        Child.Parent = Parent;
        Child.super_= Parent.prototype;
        Child.extend = function(props) {
            return extend(Child.prototype, props);
        };

        Child.prototype = Object.create(Parent.prototype, {
            constructor: { value: Child, enumerable: false }
        });

        extendIf(Child.prototype, props, function(prop) {
            return props.hasOwnProperty(prop) && prop !== 'constructor' && prop !== 'initialize';
        });

        return Child;
    }

    function enumeration(array, props) {
        props = extend(props || {}, {
            initialize: function(value, index) {
                this.value = value;
                this.index = index;
            },
            val: function() {
                return this.value;
            },
            idx: function() {
                return this.index;
            }
        });

        var Enum = inherits(Object, props);

        var index = -1;
        Enum.values = array.map(function(elem) {
            return Enum[elem] = new Enum(elem, ++index)
        });
        return Enum;
    }

    // ----------------------------


    return root.Graph = GraphFactory;


}).call(this);

var G = Graph.getFactory();

console.log("children type " + G.Types.node.children().val());

var links = new G.Links();

var link1 = new G.Link();
var link2 = new G.Link();

links.add(link1).add(link2);

var it = links.iterator();

console.log("iter index " + it.array.length);

console.log("Link1 label " + link1.label());





