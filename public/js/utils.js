//  utils.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  A few FP and OOP utility functions and objects

(function(root) {
    var slice = Array.prototype.slice;

    var Class = extend(function() {}, {
        mixin: function(props) {
            return rMixin(this, props);
        },
        extend: function(props) {
            if (!props) {
                return inherits(this);
            }

            var Constructor = isFunction(props)? props :
                props.hasOwnProperty('constructor')? props.constructor :  this;

            var Child = inherits(this, Constructor);

            extend(Child, props.statics || {});

            (props.mixins || []).forEach(function(props) {
                Child.mixin(props)
            });

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

    //----------   Functions

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    function ownProperty(obj, prop) {
        return obj.hasOwnProperty(prop)? obj[prop] : undefined;
    }

    function extend(dst, src, exec) {
        exec = exec || function(prop) {
          return ownProperty(src, prop)
        };

        for (var prop in src) {
            var value = exec(prop);

            if (value !== undefined) {
                dst[prop] = value;
            }
        }
        return dst;
    }

    // recursive extend
    function rExtend(dst, src) {
        return extend(dst, src, function(prop) {
            if (prop === 'constructor') {
                return undefined;  // don't mess with constructor property
            }

            var dstVal = dst[prop];
            var srcVal = ownProperty(src, prop);

            return  dstVal && isFunction(dstVal.extend) && srcVal? dstVal.extend(srcVal) : srcVal;
        });
    }

    function compose(func1, func2, proto) {
        var result = function() {
            var result1 = func1.apply(this, arguments);
            // if func1 returns undefined then use same arguments
            var args = result1 === undefined? arguments : [result1];
            return func2.apply(this, args);
        };
        result.__proto__ = proto || Function.prototype;  // yes functions are also objects and have a prototype
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







