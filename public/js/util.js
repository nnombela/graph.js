(function() {
    var root = this;

    var Class = {
        extend: function(props) {
            var Class = this;
            if (props instanceof Object) {
                if (props.hasOwnProperty('constructor')) {
                    Class = inherits(Class, props.constructor)
                }
                if (props.statics) extendClass(Class, props.statics);
                extendClass(Class.prototype, props);
            }
            return Class;
        }
    };

    var Composer = function(obj) {
        var Composer = this;
        if (obj instanceof Function) {
            Composer = extend(compose(Composer, obj), Composer)
        }
        return extendClass(Composer, obj)
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

    function extend(dst, src, test, exec) {
        test = test || function() { return true };
        exec = exec || function(prop) { return src[prop] };

        for (var prop in src) {
            if (test(prop, dst, src)) {
                dst[prop] = exec(prop, dst, src)
            }
        }
        return dst;
    }

    function extendClass(dst, src) {
        return extend(dst, src,
            function(prop) {
                return prop !== 'constructor'
            },
            function(prop) {
                var dstVal = dst[prop], srcVal = src[prop];
                return dstVal && dstVal.extend? dstVal.extend(srcVal) : srcVal
            }
        );
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







