
var OOP = this.OOP;

describe("Parent - Child", function() {
    var log = [];

    var Parent = OOP.Class.extend({
        $constructor: function() {
            log.push("Parent constructor");
            this.initialize();
        },
        initialize: OOP.Extensible.create(function() {
            log.push("Parent initialize");
        }),
        config: OOP.Extensible.create({ a: 'a' })
    });


    var Child = Parent.extend({
        $constructor: function() {
            log.push("Child constructor");
            this.$super('constructor');
        },

        initialize: function() {
            log.push("Child initialize");
        },
        config: { b: 'b' }
    });

    beforeEach(function() {
        log = [];
    });

    it("Parent", function() {
        var parent = new Parent();

        expect(log[0]).toBe('Parent constructor');
        expect(log[1]).toBe('Parent initialize');
        expect(parent.config.a).toBe('a');
    });

    it("Child", function() {
        var child = new Child();

        expect(log).toEqual([
            'Child constructor',
            'Parent constructor',
            'Parent initialize',
            'Child initialize'
        ]);

        expect(child.config.a).toBe('a');
        expect(child.config.b).toBe('b');
    })
});


// --------------------------------------


describe("Point - Circle", function() {

    var Point = OOP.Class.extend({
        $statics: {
            create: function(x, y) {
                return new Point(x, y);
            }
        },
        $constructor: function(x, y) {
            this.x = x;
            this.y = y;
        },
        toString: function() {
            return '(' + this. x + ', ' + this.y + ')';
        }
    });

    var Colors = OOP.Enum.create(['White', 'Black'], {
        White: 'white',
        Black: 'black',
        reverse: function() {
            return Colors.members[(this.ordinal + 1) % 2];
        }
    });

    var WhiteColor = {
        color: Colors.White
    };

    var Circle = Point.extend( {
        $mixins: [WhiteColor],

        $statics: {
            create: function(x, y, radius) {
                return new Circle(x, y, radius);
            }
        },
        $constructor: function(x, y, radius) {
            this.$super('$constructor', x, y);
            this.radius = radius;
        },
        toString: function() {
            return this.$super('toString') + ':' + this.radius + ' in ' + this.color;
        }
    });

    beforeEach(function() {
    });

    it("has a black color when reversed", function() {
        expect(Colors.White.reverse()).toBe(Colors.Black);
    });

    it("has black and white possible colors", function() {
        expect(Colors.members).toEqual([Colors.White, Colors.Black]);
        expect(Colors.names).toEqual(['White', 'Black']);
    });


    it("Point", function() {
        var point = new Point(10, 10);

        expect(point.toString()).toBe("(10, 10)");
    });

    it("Circle", function() {
        var circle = Circle.create(20, 20, 30);

        expect(circle.color.reverse()).toEqual(Colors.Black);
        expect(circle.toString()).toBe("(20, 20):30 in white");
    })


});