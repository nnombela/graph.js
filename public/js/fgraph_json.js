(function(G) {
    var json = {};

    json.stringify = function(gobj, space) {
        var result =  {};
        result.factoryName = gobj.factory().name;
        result.type = gobj.type().val();
        result.value = gobj.toJSON();
        return JSON.stringify(result, null, space);
    };

    json.parse = function(obj) {
        var factory = G.getFactoryByName(obj.factoryName);
        factory.create(G.Types[obj.type], obj.value.label)
    };

    var exports = typeof exports !== "undefined"? exports : this;   // CommonJS module support

    exports.json = G.json = json;


}).call(this, G);