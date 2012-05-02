(function() {
    var root = this;

    var Class = extend(function() {}, {
        augment: function(props) {
            recursiveExtend(this.prototype, props,
                    function(prop) { return prop !== 'constructor' });  // avoid overridden constructor property
            return this;
        },
        extend: function(props) {
            if (props instanceof Function) {
                return inherits(this, props);
            }
            var Constructor = props.hasOwnProperty('constructor')? props.constructor : this;
            var Child = inherits(this, Constructor);
            if (props.statics) recursiveExtend(Child, props.statics);
            return Child.augment(props);
        }
    });

    var composite = function(obj) {
        return extend(obj, {
            extend: function(obj) {
                var instance = (obj instanceof Function)? compose(this, obj): {};
                return recursiveExtend(recursiveExtend(instance, this), obj);
            }
        })
    };



    return extend(root, {
        extend: extend,
        inherits: inherits,
        compose: compose,
        Class: Class,
        composite: composite
    });


    //----------------------------------

    function extend(dst, src, exec) {
        exec = exec || function(prop) { return src[prop] };

        for (var prop in src) {
            var value = exec(prop, dst, src);

            if (value !== undefined) {
                dst[prop] = value;
            }
        }
        return dst;
    }

    function recursiveExtend(dst, src, test) {
        return extend(dst, src, function(prop) {
            if (!test || test(prop)) {
                var dstVal = dst[prop], srcVal = src[prop];
                return dstVal && dstVal.extend? dstVal.extend(srcVal) : srcVal
            }
            return undefined;
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

var Parent = Class.extend({
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: composite(function() {
        console.log("Parent initialize");
    }),
    config: composite({ a: 'a' })
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







