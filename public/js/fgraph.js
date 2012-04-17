(function() {
    var root = this;

    var NOT_IMPLEMENTED_ERROR_FUNC = function() {
        throw new Error("Not implemented");
    };

    var GraphObject = inherits(Object, {
        staticProperties: {
            Types: enumeration(['graph', 'nodes', 'node', 'links', 'link'], {
                children: function() {
                    var values = this.constructor.values;
                    return values[values.indexOf(this) + 1];
                }
            })
        },

        initialize: function(owner, label) {
            this.owner = owner;
            if (label !== undefined) {
                this._label = label;
            }
        },

        type: NOT_IMPLEMENTED_ERROR_FUNC,

        factory: function() {
            return this.owner.factory();
        },
        label: function() {
            return this._label !== undefined? this._label : this.owner?
                    this.owner.label() + '::' + this.type().val() + ':' + this.index() : '';
        },
        index: function() {
            return this.owner? this.owner.indexOf(this) : -1;
        },
        belongsTo: function(type) {
            return type === undefined || this.type() === type? this : this.owner.belongsTo(type);
        },
        free: function() {
            this.owner.free(this);
            return this;
        }
    });

    var GraphContainer = inherits(GraphObject, {
        Accessor: inherits(Object, {
            initialize: function(length) {
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
            initialize: function(array) {
                this.array = array;
                this.cursor = -1;
            },
            current: function() {
                return this.children[this.cursor];
            },
            next: function() {
                return this.children[++this.cursor];
            },
            hasNext: function() {
                return this.cursor + 1 < this.array.length;
            },
            index: function() {
                return this.cursor;
            }
        }),

        initialize: function() {
            this.children = [];
        },
        get: function(index) {
            return this.children[index];
        },
        size: function() {
            return this.children.length;
        },
        iterator: function() {
            return new this.Iterator(this.children);
        },
        accessor: function() {
            return new this.Accessor(this.children.length);
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
                gobj.owner = this;
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
            return this;
        },
        free: function(gobj) {
            return gobj? this.remove(gobj) : this.super_.free();
        }
    });

// ---- Link
    var Link = inherits(GraphObject, {
        initialize: function() {
            this._pair = null;
        },

        type: function() {
            return GraphObject.Types.link;
        },
        bind: function(pair) {
            _bind('_pair', this._pair);
        },
        unbind: function() {
            _unbind('_pair', this._pair)
        },
        node: function() {
            return this.owner.owner;
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

    var Directed = {
        staticProperties: {
            Direction: enumeration(['in', 'out'], {
                reverse: function() {
                    var D = this.constructor;
                    return this === D.in? D.out : D.in;
                }
            })
        },

        initialize: function() {
            this._reverse = null;
        },

        reverse: function() {
            return this._reverse;
        },
        bindReverse: function(pair) {
            _bind('_reverse', this._reverse);
        },
        unbindReverse: function() {
            _unbind('_reverse', this._reverse)
        },

        direction: function() {
            return this.owner.direction();
        }
    };

    var Fractal = {
        initialize: function() {
            this._down = null;
            this._inverse = null;
        },

        inverse: function() {
            return this._inverse;
        },
        bindInverse: function(pair) {
            _bind('_inverse', this._inverse);
        },
        unbindInverse: function() {
            _unbind('_inverse', this._inverse)
        },

        down: function() {
            return this._down;
        },
        ordinal: function() {
            return this.owner.ordinal();
        }
    };

    var DiLink = inherits(Link, Directed);
    var FracLink = inherits(Link, Fractal);
    var FracDiLink = inherits(DiLink, Fractal);


// -------------- Links

    var Links = inherits(GraphContainer, {
        type: function() {
            return GraphObject.Types.links;
        }
    });

    var DiLinks = inherits(Links, Directed);
    var FracLinks = inherits(Links, Fractal);
    var FracDiLinks = inherits(DiLinks, Fractal);


// --------------- Node

    var Node = inherits(GraphObject, {
        constructor: function() {
        },
        type: function() {
            return GraphObject.Types.node;
        }
    });

// ---------------- Nodes

    var Nodes = inherits(GraphContainer, {
        type: function() {
            return GraphObject.Types.nodes;
        }
    });


// ----------------- Graph
    var Graph = inherits(GraphObject, {
        initialize: function() {
            _nodes = new Nodes();
        },
        type: function() {
            return GraphObject.Types.graph;
        },
        nodes: function(duality) {

        }
    });


// ----------------- Graph Factory

    var GraphFactory =  {
        VERSION: '0.1',

        Categories: enumeration(['directed', 'dual', 'fractal']),

        getFactory: function(categories) {
            return {
                Types: GraphObject.Types,
                Link: Link,
                Links: Links,
                Node: Node,
                Nodes: Nodes,
                Graph: Graph
            }
        }
    };


    //-------- Helper functions

    function extend(dest, source) {
        for (var prop in source) {   // enumerable properties
            dest[prop] = source[prop];
        }
        return dest;
    }

    function inherits(Parent, props) {
        var Child = function() {
            Parent.apply(this, arguments);
            if (props.hasOwnProperty('initialize')) {
                return props.initialize.apply(this, arguments);
            }
        };

        extend(Child, Parent); // copy static class properties from Parent

        if (props.hasOwnProperty('staticProperties')) {   // Add new ones
            extend(Child, props.staticProperties);
        }

        Child.Parent = Parent;
        Child.super_= Parent.prototype;

        Child.prototype = Object.create(Parent.prototype, {
            constructor: { value: Child, enumerable: false }
        });

        extend(Child.prototype, props);

        return Child;
    }

    function enumeration(array, props) {
        props = extend(props || {}, {
            initialize: function(value) {
                this.value = value;
            },
            val: function() {
                return this.value;
            }
        });

        var Enum = inherits(Object, props);

        Enum.values = array.map(function(elem) {
            return Enum[elem] = new Enum(elem)
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





