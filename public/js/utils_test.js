var Parent = OOP.Class.extend({
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: OOP.composite(function() {
        console.log("Parent initialize");
    }),
    config: OOP.composite({ a: 'a' })
});


var Child = Parent.extend({
//    constructor: function() {
//        console.log("Child constructor");
//        this.super_.constructor.call(this);
//    },

    initialize: function() {
        console.log("Child initialize");
    },
    config: { b: 'b' }
});


var parent = new Parent();

console.log('---------------');

var child = new Child();


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

var Colors = OOP.enumeration(['white', 'black'], {
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
        this.super_('constructor', x, y);
        this.radius = radius;
    },
    toString: function(str) {
        return this.super_('toString') + ':' + this.radius + ', ' + this.color.val();
    }
});

x = {};
x.foo = "foo";
x.toJSON = function() { return "bar"; };
var json1 = JSON.stringify(x);

console.log('JSON: ' + json1);

