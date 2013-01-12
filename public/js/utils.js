(function() {
    var root = this;

    var Class = extend(function() {}, {
        augment: function(props) {  // This is also called mixin
            recursiveExtend(this.prototype, props);
            return this;
        },
        extend: function(props) {
            if (!props || props instanceof Function) {
                return inherits(this, props);
            }

            var Child = props.hasOwnProperty('constructor')? inherits(this, props.constructor) : inherits(this);
            if (props.statics) recursiveExtend(Child, props.statics);
            if (props.augments) props.augments.forEach(function(props) { Child.augment(props) });

            return Child.augment(props);
        }
    });

    var Composite = function(obj) {
        return extend(obj, {
            // Extend object with an extend method that will extend object or function, in case of object it will use
            // the prototype chain, in case of function the compose
            extend: function(obj) {
                var instance = (obj instanceof Function)? recursiveExtend(compose(this, obj), this): Object.create(this);
                return recursiveExtend(instance, obj);
            }
        })
    };

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    extend(exports, {
        FP: {
            extend: extend,
            inherits: inherits,
            compose: compose
        },
        OOP: {
            Class: Class,
            Enumeration: Enumeration,
            Composite: Composite
        }
    });

    //----------------------------------

    var SLICE = Array.prototype.slice;

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

    function recursiveExtend(dst, src) {
        return extend(dst, src, function(prop) {
            if (prop === 'constructor') {  // don't want to mess with the constructor property
                return undefined;
            }
            var dstVal = dst[prop], srcVal = src[prop];
            return dstVal && dstVal.extend? dstVal.extend(srcVal) : srcVal;  // if dstVal has an extend property then use it to create the extended object
        });
    }

    function compose(func1, func2) {
        return function() {
            return func2.apply(this, func1.apply(this, arguments) || arguments);
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
            super_: { value: function(name) {
                var val = Parent.prototype[name];
                return val && val.apply? val.apply(this, SLICE.call(arguments, 1)) : val;
            }, enumerable: false}
        });

        Child.parent = Parent;

        return Child;
    }

    function mixin(constructor, props) {
        return extend(constructor.prototype, props, function(prop) {
            return props.hasOwnProperty(prop)? src[prop] : undefined;
        });
    }

    function Enumeration(array, props) {
        props = extend(props || {}, {
            constructor: function(value, index) {
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

        var Enum = Class.extend(props);

        var index = -1;
        Enum.values = array.map(function(elem) {
            return Enum[elem] = new Enum(elem, ++index)
        });
        return Enum;
    }

}).call(this);







