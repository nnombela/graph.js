//  utils.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  A few FP and OOP utility functions and objects

(function(root) {
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

    var Composable = extend(function() {}, {
        extend: function(obj) {
            var instance; // create a new composed object using the prototype chain and composing the function
            if (this instanceof Function && obj instanceof Function) {
                instance = compose(this, obj);
                instance.__proto__ = this;  // Unfortunately there is no Function.create(this), why?
            } else {
                instance = Object.create(this);
            }
            return recursiveExtend(instance, obj);
        },
        create: function(obj) {
            return extend(obj, this);
        }
    });

    var Enum = extend(function() {}, {
        create: function(values, props) {
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
                },
                toString: function() {
                    return this.value;
                }
            });

            var Enum = Class.extend(props);

            Enum.values = values;

            Enum.members = values.map(function(elem, idx) {
                return Enum[elem] = new Enum(elem, idx)
            });

            return Enum;
        }
    });

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
            Enum: Enum,
            Composable: Composable
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
            var args = f1 === undefined? arguments : [f1];
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

})(this);







