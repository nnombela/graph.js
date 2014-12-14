//  utils.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  A few FP and OOP utility functions and objects

(function(root) {
    var slice = Array.prototype.slice;

    var Class = extend(function() {}, {
        mixin: function(props) {  // This is also called mixin
            return rExtend(this.prototype, props);
        },
        extend: function(props) {
            if (!props || props instanceof Function) {
                return inherits(this, props);
            }

            var Child = props.hasOwnProperty('constructor')?
              inherits(this, props.constructor) : inherits(this);

            if (props.statics) {
                rExtend(Child, props.statics);
            }

            if (props.mixins) {
                props.mixins.forEach(function(props) {
                    Child.mixin(props)
                });
            }

            return Child.mixin(props);
        }
    });

    var Extendable = extend(function() {}, {
        extend: function(obj) {
            // in case both are functions then compose them with this as proto
            var instance = isFunction(this) && isFunction(obj)?
              compose(this, obj, this) : Object.create(this);

            return rExtend(instance, obj);
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
            rExtend: rExtend,
            inherits: inherits,
            compose: compose,
            mixin: mixin,
            rMixin: rMixin
        },
        OOP: {
            Class: Class,
            Enum: Enum,
            Extendable: Extendable
        }
    });

    //----------------------------------   Functions

    function isFunction(obj) {
        return typeof obj === 'function' || false;
    }

    function extend(dst, src, exec) {
        exec = exec || function(prop) {
          return src.hasOwnProperty(prop)? src[prop] : undefined;
        };

        for (var prop in src) {
            var value = exec(prop, dst, src);

            if (value !== undefined) {
                dst[prop] = value;
            }
        }
        return dst;
    }

    // recursive extend
    function rExtend(dst, src) {
        return extend(dst, src, function(prop) {
            if (src.hasOwnProperty(prop) && prop !== 'constructor') {   // don't mess constructor property
                var dstVal = dst[prop], srcVal = src[prop];
                // if dstVal exist and has an extend() function then use it to create the extended object
                return dstVal && isFunction(dstVal.extend)? dstVal.extend(srcVal) : srcVal;
            }
            return undefined;
        });
    }

    function compose(func1, func2, proto) {
        var result = function() {
            var f1 = func1.apply(this, arguments);
            var args = f1 === undefined? arguments : [f1];
            return func2.apply(this, args);
        };
        result.__proto__ = proto || Function.prototype;
        return result;
    }

    function inherits(Parent, Constructor) {
        Constructor = Constructor || Parent;

        var Child = function() {
            return Constructor.apply(this, arguments);
        };

        extend(Child, Parent);

        Child.prototype = Object.create(Parent.prototype, {
            constructor: {
                value: Child,
                enumerable: false
            },
            _super: {
                value: function(name) {
                    var val = Parent.prototype[name];
                    return val && isFunction(val.apply)? val.apply(this, slice.call(arguments, 1)) : val;
                },
                enumerable: false
            }
        });

        Child.parent = Parent;

        return Child;
    }

    function mixin(dst, props) {
        extend(dst.prototype, props);
        return dst;
    }

    // recursive mixin
    function rMixin(dst, props) {
        rExtend(dst.prototype, props);
        return dst;
    }

})(this);







