(function() {
    var root = this;

    var Types = OOP.enumeration(['graph', 'nodes', 'node', 'links', 'link'], {
        children: function() {
            var values = Types.values;
            return values[values.indexOf(this) + 1];
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

        constructor: function(label, owner) {
            this.initialize(label, owner);
        },

        initialize: OOP.composite(function(label, owner) {
            if (label) this._label = label;
            this._owner = owner;
        }),

        config: OOP.composite({name: 'default'}),

        type: function() {
            return this._owner.type().children();
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
            return type === undefined || this.type() === type? this._owner : this._owner.belongsTo(type);
        },
        free: function() {
            if (this._owner) this._owner.free(this);
            this._owner = null;
            return this;
        },
        toJSON: function() {
            return { label: this.label() }
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
            return gobj? this.remove(gobj) : this.super_("free");
        },
        toJSON: function(json) {
            return this._children;
        }
    });


    var DuoGraphContainer = GraphObject.extend({
        augments: [Iterability, Accessibility],

        Container: GraphContainer,

        initialize: function(label, owner) {
            this[0] = new this.Container(label + ':0', owner);
            this[1] = new this.Container(label + ':1', owner);
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
        addNew: function(enumerator) {
            return enumerator? this.container(type).addNew() : this[0].addNew();
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
                return this.super_('free');
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
        },
        toJSON: function(json) {
            json.pair = this.pair().label();
            return json
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
        },
        toJSON: function(json) {
            json.reverse = this.reverse().label();
            return json
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
        },
        toJSON: function(json) {
            json.inverse = this.inverse().label();
            json.down = this.down().label();
            return json
        }
    };

// -------------- Links augments

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
        initialize: function(label) {
            this._links = this.factory().createLinks(label + '::links', this);
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
        }
    });

// ----------- Node augments

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


// ---------------- Nodes augments

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

    var NodesFractality = {
        up: function(duality) {
            return this._owner.up().nodes(duality);
        }
    };

// ----------------- Graph

    var Graph = GraphObject.extend( {
        initialize: function(label) {
            this._nodes = this.factory().createNodes(label + '::nodes', this)
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

// --------------- Graph augments
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

        create: function(type, label, owner) {
            return new this[type.val().toUpperCase()](label, owner);
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
            })
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
            Container: GraphContainer.extend({
                augments: [Dual, NodesDuality]
            })
        }),
        Graph: Graph.extend({
            augments: [Dual, GraphDuality]
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
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual: true}, {
        Link: Link.extend({
            augments: [Directed, Dual, LinkDirectability]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, Dual],
            Container: GraphContainer.extend({
                augments: [Directed, Dual, LinksDirectability]
            })
        }),
        Node: Node.extend({
            augments: [Directed, Dual, NodeDirectability, NodeDuality]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Directed, Dual],
            Container: GraphContainer.extend({
                augments: [Directed, Dual, NodesDuality]
            })
        }),
        Graph: Graph.extend({
            augments: [Directed, Dual, GraphDuality]
        })
    });

    GraphFactory.register({name: 'default', directed:true, fractal: true}, {
        Link: Link.extend({
            augments: [Directed, Fractal, LinkDirectability, LinkFractality]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, Fractal, LinksFractality],
            Container: GraphContainer.extend({
                augments: [Directed, Fractal, LinksDirectability, LinksFractality]
            })
        }),
        Node: Node.extend({
            augments: [Directed, Fractal, NodeDirectability, NodeFractality]
        }),
        Nodes: GraphContainer.extend({
            augments: [Directed, Fractal, NodesFractality]
        }),
        Graph: Graph.extend({
            augments: [Directed, Fractal, GraphFractality]
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
            Container: GraphContainer.extend({
                augments: [Dual, Fractal, NodesDuality, NodesFractality]
            })
        }),
        Graph: Graph.extend({
            augments: [Dual, Fractal, GraphFractality]
        })
    });

    GraphFactory.register({name: 'default', directed: true, dual:true, fractal: true}, {
        Link: Link.extend({
            augments: [Directed, Dual, Fractal, LinkDirectability, LinkFractality]
        }),
        Links: DuoGraphContainer.extend({
            augments: [Directed, Dual, Fractal, LinksFractality],
            Container: GraphContainer.extend({
                augments: [Directed, Dual, Fractal, LinksDirectability, LinksFractality]
            })
        }),
        Node: Node.extend({
            augments: [Directed, Dual, Fractal, NodeDirectability, NodeDuality, NodeFractality]
        }),
        Nodes: DuoGraphContainer.extend({
            augments: [Directed, Dual, Fractal, NodesFractality],
            Container: GraphContainer.extend({
                augments: [Directed, Dual, Fractal, NodesDuality, NodesFractality]
            })
        }),
        Graph: Graph.extend({
            augments: [Directed, Dual, Fractal, GraphDuality, GraphFractality]
        })
    });

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    exports.G = GraphFactory;


}).call(this);







