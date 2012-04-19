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
            this._owner = owner;
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
        initialize: function(left, right) {
            this._left = left;
            this._right = right;
            this._containers = [left, right];
        },
        container: function(enumerated) {
            return this._containers[enumerated.idx()];
        },
        get: function(index) {
            var leftSize = this._left.size();
            return index < leftSize? this._left.get(index) : this._right.get(index - leftSize);
        },
        indexOf: function(gobj) {
            var leftIndexOf = this._left.indexOf(gobj);
            return leftIndexOf === -1? leftIndexOf : this._right.indexOf(gobj);
        },
        forEach: function(func) {
            this._left.forEach(func);
            this._right.forEach(func);
            return this;
        },
        find: function(func) {
            var result = this._left.find(func);
            return result? result : this._right.find(func);

        },
        size: function() {
            return this._left.size() + this._right.size();
        },
        add: function(gobj, enumerated) {
            return this.container(enumerated).add(gobj);
        },
        addNew: function(enumerated) {
            return enumerated? this.container(enumerated).addNew() : this._left.addNew();
        },
        remove: function(gobj, enumerated) {
            if (enumerated) {
                return this.container(enumerated).remove(gobj);
            } else {
                var idx = this._left.remove(gobj);
                return idx !== -1? idx : this._right.remove(gobj);
            }
        },
        free: function() {
            GraphContainer.super_.free.call(this);
            this._left.free();
            this._right.free();
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
            _bind('_pair', this._pair);
        },
        unbind: function() {
            _unbind('_pair', this._pair)
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
            _bind('_reverse', this._reverse);
        },
        unbindReverse: function() {
            _unbind('_reverse', this._reverse)
        },

        direction: function() {
            return this._owner.direction();
        }
    });

    var LinkFractal = {
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
            return this._owner.ordinal();
        }
    };

    var FracLink = inherits(Link, LinkFractal);
    var FracDiLink = inherits(DiLink, LinkFractal);


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

        initialize: function(direction) {
            this._direction = direction;
        },

        reverse: function() {
            return this._reverse;
        },


        direction: function() {
            return this._dirction;
        }
    });

    var LinksFractal = {
        inverse: function(direction) {
            return this._owner.inverse().links(direction);
        },

        ordinal: function() {
            return this._owner.ordinal();
        }
    };

    var FracLinks = inherits(Links, LinksFractal);
    var FracDiLinks = inherits(DiLinks, LinksFractal);


// --------------- Node

    var Node = inherits(GraphObject, {
        initialize: function() {
            this._links = new Links(this);
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
        initialize: function() {
            var left = new DiLinks(this), right = new DiLinks(this);
            left.bindReverse(right);
            this._links = new DuoGraphContainer(left, right);
        },
        links: function(direction) {
            return direction? this._links.container(direction) : this._links;
        }
    });

    var Dual = {
        statics: {
            Duality: Duality
        },

        initialize: function() {
            this._dual = null;
        },

        dual: function() {
            return this._dual;
        },

        duality: function() {
            return this._owner.direction();
        }
    };

    var DualNode = inherits(Node, {

    });

// ---------------- Nodes

    var Nodes = inherits(GraphContainer, {
        initialize: function() {
        },
        type: function() {
            return Types.nodes;
        },


    });




// ----------------- Graph
    var Graph = inherits(GraphObject, {
        initialize: function() {
            _nodes = new Nodes();
        },
        type: function() {
            return Types.graph;
        },
        nodes: function(duality) {

        },

    });


// ----------------- Graph Factory

    var GraphFactory =  {
        VERSION: '0.1',

        Categories: enumeration(['directed', 'dual', 'fractal']),

        getFactory: function(categories) {
            return {
                Types: Types,
                Direction: Direction,
                Duality: Duality,

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
        var Child = (function(){
            if (props.hasOwnProperty('constructor')) {
                return props.constructor;
            } else {
                return function() {
                    Parent.apply(this, arguments);  // call Parent constructor
                    if (props.hasOwnProperty('initialize')) { // then do initialization if necessary
                        props.initialize.apply(this, arguments);
                    }
                };
            }
        })();

        extend(Child, Parent); // copy static class properties from Parent

        if (props.hasOwnProperty('statics')) {   // Add new ones
            extend(Child, props.statics);
        }

        Child.Parent = Parent;
        Child.super_= Parent.prototype;

        Child.prototype = Object.create(Parent.prototype, {
            constructor: { value: Child, enumerable: false }
        });

        delete props.constructor;  // avoid copying constructor property
        extend(Child.prototype, props);
        props.constructor = Child;  // restore or create default constructor property

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





