
describe("Parent - Child", function() {
    var log = [];

    var Parent = OOP.Class.extend({
        constructor: function() {
            log.push("Parent constructor");
            this.initialize();
        },
        initialize: OOP.Extendable.create(function() {
            log.push("Parent initialize");
        }),
        config: OOP.Extendable.create({ a: 'a' })
    });


    var Child = Parent.extend({
        constructor: function() {
            log.push("Child constructor");
            this._super('constructor');
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

        expect(log[0]).toBe('Child constructor');
        expect(log[1]).toBe('Parent constructor');
        expect(log[2]).toBe('Parent initialize');
        expect(log[3]).toBe('Child initialize');
        expect(child.config.a).toBe('a');
        expect(child.config.b).toBe('b');
    })
});


// --------------------------------------


describe("Point - Circle", function() {

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

    var Colors = OOP.Enum.create(['white', 'black'], {
        reverse: function() {
            return this === Colors['white']? Colors['black'] : Colors['white'];
        }
    });

    var Color = {
        color: Colors.white
    };

    var Circle = Point.extend( {
        mixins: [Color],

        statics: {
            createNew: function(x, y, radius) {
                return new Circle(x, y, radius);
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

    beforeEach(function() {
    });


    it("Point", function() {
        var point = new Point(10, 10);

        expect(point.toString()).toBe("(10, 10)");

    })

    it("Circle", function() {
        var circle = Circle.createNew(20, 20, 30);

        expect(circle.color).toEqual(Colors['white']);
        expect(circle.toString()).toBe("(20, 20):30, white");
    })


});