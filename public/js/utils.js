//  utils.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  A few FP and OOP utility functions and objects

(function(root) {
    //----------   FP

    var toString = Object.prototype.toString;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var slice = Array.prototype.slice;

    function isObject(obj) {
        return obj === Object(obj);
    }

    function isArray(o) {
        return toString.call(o) === '[object Array]';
    }

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    function identity(value) {
        return value;
    }

    function _extend(extendingFn, dst, src) {
        for (var prop in src) {
            if (hasOwnProperty.call(src, prop)) {
                dst[prop] = extendingFn.call(dst[prop], src[prop])
            }
        }
        return dst;
    }

    function extend(dst, src) {
        return _extend(identity, dst, src)
    }

    // Recursive extend, will look for object that has the extend method to recursively extend
    function rExtend(dst, src) {
        return _extend(function (value) {
            return this && isFunction(this.extend) ? this.extend(value) : value;
        }, dst, src)
    }

    // a slightly different compose function, that treats void function that returns undefined as rather identity functions
    function compose(func1, func2, __proto__) {
        var result = function() {
            var result1 = func1.apply(this, arguments);
            return func2.apply(this, result1 === undefined ? arguments : [result1]);
        };
        if (__proto__) {
            result.__proto__ = __proto__;  // functions are also objects and might have a prototype
        }
        return result;
    }

    // inheritance is implement via inherit function, I wont migrate to es6 classes anytime soon
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

    // Recursive mixin
    function rMixin(dst, props) {
        rExtend(dst.prototype, props);
        return dst;
    }

    //
    const uuidV4Pattern = '10000000-1000-4000-8000-100000000000';

    function uniqueId(pattern) {
        return (pattern || uuidV4Pattern).replace(/[018]/g, c => {
            const r = window && window.crypto ? window.crypto.getRandomValues(new Uint8Array(1))[0] : Math.random() * 256 | 0;
            const v = c ^ (r & (15 >> (c / 4)));
            return v.toString(16)
        })
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
                props.$mixins.forEach(function(mixinProps) { Child.mixin(mixinProps) })
            }
            return Child.mixin(props)
        }
    });

    // Extensible objects implement extend method that uses prototypical inheritance on objects and compose on functions (which are also objects)
    // Extensible could have been called Composable
    var Extensible = extend(function() {}, {
        extend: function(obj) {
            // in case both are functions then compose otherwise create new object
            var instance = isFunction(this) && isFunction(obj) ? compose(this, obj, this) : Object.create(this);
            return rExtend(instance, obj);
        },
        create: function(obj) {
            return extend(obj, this);
        }
    });

    var Enum = extend(function() {}, {
        create: function(elems, props) {
            var extendedProps = extend(props || {}, {
                $constructor: function(name, label, ordinal) {
                    this.name = name;
                    this.label = label || name;
                    this.ordinal = ordinal;
                },
                toString: function() {
                    return this.label;
                },
                $statics: {
                    names: isObject(elems) ? Object.keys(elems) : elems
                }
            });
            var instance = Class.extend(extendedProps);
            instance.members = instance.names.map(function(name, ordinal) {
                return instance[name] = new instance(name, elems[name], ordinal)
            });
            return instance;
        }
    });

    var exports = typeof exports !== "undefined" ? exports : root;   // CommonJS module support

    return extend(exports, {
        FP: {
            identity: identity,
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
            Extensible: Extensible,
            uniqueId: uniqueId
        }
    });
})(this);







