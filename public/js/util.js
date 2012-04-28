(function() {
    var root = this;

    var Class = {
        extend: function(props) {
            var Class = this;
            if (props instanceof Object) {
                if (props.hasOwnProperty('constructor')) {
                    Class = inherits(Class, props.constructor)
                }
                if (props.statics) extend(Class, props.statics);
                extend(Class.prototype, props);
            }
            return Class;
        }
    };

    var Composer = function(obj) {
        var Composer = this;
        if (obj instanceof Function) {
            Composer = extend(compose(Composer, obj), Composer)
        }
        return extend(Composer, obj)
    };

    Composer.extend = Composer;

    return extend(root, {
        FP: {
            extend: extend,
            inherits: inherits
        },
        OOP: {
            Class: Class,
            Composer: Composer
        }
    });


    //----------------------------------

    function extendExec(dst, src, exec) {
        for (var prop in src) {
            if (src.hasOwnProperty(prop) && prop !== 'constructor') {
                dst[prop] = exec(dst[prop], src[prop]);
            }
        }
        return dst;
    }

    function extend(dst, src) {
        return extendExec(dst, src, function(dstVal, srcVal) {
            return dstVal && dstVal.extend? destVal.extend(srcVal) : srcVal;
        });
    }

    function compose(func1, func2) {
        return function() {
            var result1 = func1.apply(this, arguments);
            return func2.apply(this, [result1].concat(arguments));
        };
    }

    function inherits(Parent, Constructor) {
        Constructor = Constructor || Parent;

        var Child = function() {
            return Constructor.apply(this, arguments);
        };

        extend(Child, Parent);

        Child.prototype = Object.create(Parent.prototype, {
            constructor: { value: Child, enumerable: false },
            super_: { value: Parent.prototype, enumerable: false}
        });

        Child.parent = Parent;

        return Child;
    }



}).call(this);

var Parent = OOP.inherits(Object, {
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: function() {
        console.log("Parent initialize");
    },
    config: { a: 'a' }
});


var Child = Parent.createChild({
    constructor: function() {
        console.log("Child constructor");
        this.super_.constructor.call(this);
    },

    initialize: function() {
        console.log("Child initialize");
        this.super_.initialize.call(this);
    },
    config: { b: 'b' }
});


var parent = new Parent();

console.log('---------------');

var child = new Child();







