var Parent = OOP.Class.extend({
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: OOP.Extensible(function() {
        console.log("Parent initialize");
    }),
    config: OOP.Extensible({ a: 'a' })
});


var Child = Parent.extend({
    constructor: function() {
        console.log("Child constructor");
        this._super('constructor');
    },

    initialize: function() {
        console.log("Child initialize");
    },
    config: { b: 'b' }
});


var parent = new Parent();

console.log('---------------');

var child = new Child();

console.log('---------------');

// --------------------------------------

var Point = OOP.Class.extend({
    statics: {
        createNew: function(x, y) {
            return new Point(x, y);
        }
    },
    constructor: function(x, y) {
        this.x = x;
        this.y = y;
    },
    toString: function() {
        return '(' + this. x + ', ' + this.y + ')';
    }
});

var Colors = OOP.Enumeration(['white', 'black'], {
    reverse: function() {
        return this === Colors['white']? Colors['black'] : Colors['white'];
    }
});

var Color = {
    color: Colors.white
};

var Circle = Point.extend( {
    augments: [Color],

    statics: {
        createNew: function(x, y) {
            return new Circle(x, y);
        }
    },
    constructor: function(x, y, radius) {
        this._super('constructor', x, y);
        this.radius = radius;
    },
    toString: function(str) {
        return this._super('toString') + ':' + this.radius + ', ' + this.color.val();
    }
});

x = {};
x.foo = "foo";
x.toJSON = function() { return { bar: "BAR" }; };
var json1 = JSON.stringify(x);

console.log('JSON: ' + json1);

