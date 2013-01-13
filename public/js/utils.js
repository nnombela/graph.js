(function() {
    var root = this;
    var SLICE = Array.prototype.slice;

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

    /* By adding (extending) a method "extend" to the Object (or Function) we make it recursive extensible */
    var Extensible = function(obj) {
        return extend(obj, {
            extend: function(obj) {
                var instance; // create a new composed object using the prototype chain and composing the function
                if (this instanceof Function && obj instanceof Function) {
                    instance = compose(this, obj);
                    instance.__proto__ = this;  // There is no Function.create(this)
                } else {
                    instance = Object.create(this);
                }
                return recursiveExtend(instance, obj);
            }
        })
    };

    var Enumeration = function(array, props) {
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
    };

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    return extend(exports, {
        FP: {
            extend: extend,
            inherits: inherits,
            compose: compose,
            mixin: mixin
        },
        OOP: {
            Class: Class,
            Enumeration: Enumeration,
            Extensible: Extensible
        }
    });

    //----------------------------------   Functions

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

            // if dstVal exist and has an createExtended function then use it to create the extended object
            return dstVal && dstVal.extend? dstVal.extend(srcVal) : srcVal;
        });
    }

    function compose(func1, func2) {
        return function() {
            var f1 = func1.apply(this, arguments);
            var args = f1 === undefined? arguments : Array.isArray(f1)? f1 : [f1];
            return func2.apply(this, args);
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
            _super: { value: function(name) {
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

}).call(this);







