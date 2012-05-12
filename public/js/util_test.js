var Parent = OOP.Class.extend({
    constructor: function() {
        console.log("Parent constructor");
        this.initialize();
    },
    initialize: OOP.composite(function() {
        console.log("Parent initialize");
    }),
    config: OOP.composite({ a: 'a' })
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