(function() {
    var G = this.G || {};

    var json = {};

    json.stringify = function(gobj, space) {
        var result =  {};
        result.factory = gobj.factory().name;
        result.type = gobj.type().val();
        result.value = gobj.toJSON();

        return JSON.stringify(result, null, space);
    };

    json.parse = function(str) {
        var obj = JSON.parse(str);
        var factory = G.getFactoryByName(obj.factory);

        var gobj = factory.create(G.Types[obj.type]);
        gobj.fromJSON(obj.value, Object.create(null));

        return gobj;
    };

    var exports = typeof exports !== "undefined"? exports : G;   // CommonJS module support

    exports.json = G.json = json;


}).call(this);