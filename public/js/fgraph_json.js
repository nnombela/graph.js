(function() {
    var root = this;

    var json = {};

    json.stringify = function(gobj, space) {
        var result =  {};
        result.factoryName = gobj.factory().name;
        result[gobj.type().val()] = gobj.toJSON();
        return JSON.stringify(result, null, space);
    };

    json.parse = function(obj) {

    };

    var exports = typeof exports !== "undefined"? exports : root;   // CommonJS module support

    exports.G.json = json;


}).call(this);