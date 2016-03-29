//  utils.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  A few FP and OOP utility functions and objects

(function(root) {
    //----------   FP

    var toString = Object.prototype.toString,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        slice = Array.prototype.slice;

    function isArray(o) {
        return toString.call(o) === '[object Array]';
    }

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    function extend(dst, src, exec) {
        exec = exec || function(prop) {  dst[prop] = src[prop] };

        for (var prop in src) {
            if (hasOwnProperty.call(src, prop)) {
                exec(prop)
            }
        }
        return dst;
    }

    function rExtend(dst, src) {
        return extend(dst, src, function(prop) {
            var dstVal = dst[prop], srcVal = src[prop];
            dst[prop] = dstVal && isFunction(dstVal.extend) ? dstVal.extend(srcVal) : srcVal
        })
    }


    function compose(func1, func2, proto) {
        function lift(result) {
            return result === undefined || isArray(result) ? result : [result];
        }
        var result = function() {
            var result = func1.apply(this, arguments);
            return func2.apply(this, lift(result) || arguments); // if func1 returns undefined then use same arguments
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
            $super: {
                value: function(name) {
                    var val = Parent.prototype[name];
                    return val && isFunction(val.apply)? val.apply(this, slice.call(arguments, 1)) : val;
                },
                enumerable: false
            }
        });

        Child.$parent = Parent;

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

    //----------   OOP

    var Class = extend(function() {}, {
        mixin: function(props) {
            return rMixin(this, props); // recursive mixin
        },
        extend: function(props) {
            if (!props) {
                return inherits(this);
            }

            var Constructor = isFunction(props)? props : props.$constructor || this;

            var Child = inherits(this, Constructor);

            extend(Child, props.$statics || {});

            (props.$mixins || []).forEach(function(props) {
                Child.mixin(props)
            });

            return Child.mixin(props);
        }
    });

    var Mergeable = extend(function() {}, {
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
                $constructor: function(value, index) {
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
            Mergeable: Mergeable
        }
    });
})(this);







