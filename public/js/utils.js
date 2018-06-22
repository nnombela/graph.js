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

    // recursive extend, use extend function of destination property if exists, identity function otherwise
    function rExtend(dst, src) {
        return extend(dst, src, function(prop) {
            var dstVal = dst[prop], srcVal = src[prop];
            dst[prop] = dstVal && isFunction(dstVal.extend) ? dstVal.extend(srcVal) : srcVal
        })
    }

    function asArray(result) {
        return result === undefined || isArray(result) ? result : [result];
    }

    function compose(func1, func2, proto) {
        var isFunction1 = isFunction(func1), isFunction2 = isFunction(func2);
        var result = function() {
            var result = isFunction1 ? func1.apply(this, arguments) : undefined;
            // if func1 returns undefined then use same arguments (identity function)
            return isFunction2 ? func2.apply(this, asArray(result) || arguments) : result || arguments;
        };
        if (proto) {
            result.__proto__ = proto;  // yes functions are also objects and have a prototype
        }
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

    function uniqueId() {
        return Math.random().toString(36).substr(2, 10);
    }
    
    //----------   OOP

    var Class = extend(function() {}, {
        mixin: function(props) {
            return rMixin(this, props); // recursive mixin
        },
        extend: function(props) { // Class.extend is actually inherits
            if (!props) {
                return inherits(this);
            }
            var Constructor = isFunction(props) ? props : props.$constructor || this;
            var Child = inherits(this, Constructor);

            if (props.$statics) { // special $statics property
                extend(Child, props.$statics)
            }
            if (props.$mixins) { // special $mixins property
                asArray(props.$mixins).forEach(function(mixinProps) { Child.mixin(mixinProps) })
            }
            return Child.mixin(props)
        }
    });

    var Mergeable = extend(function() {}, {
        extend: function(obj) {
            // in case any is a function then compose otherwise create new object
            var instance = isFunction(this) || isFunction(obj) ? compose(this, obj, this) : Object.create(this);
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
                },
                $statics: {
                    values: values
                }
            });

            var instance = Class.extend(props);
            instance.members = values.map(function(elem, idx) {
                return instance[elem] = new instance(elem, idx)
            });
            return instance;
        }
    });

    var exports = typeof exports !== "undefined" ? exports : root;   // CommonJS module support

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
            Mergeable: Mergeable,
            uniqueId: uniqueId
        }
    });
})(this);







