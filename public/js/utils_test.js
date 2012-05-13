var Parent = oop.Class.extend({
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: oop.composite(function() {
        console.log("Parent initialize");
    }),
    config: oop.composite({ a: 'a' })
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