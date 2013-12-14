(function() {
    var G = this.G || {};

    var json = {};

    json.stringify = function(gobj, replacer, space) {
        var result =  {};
        result.factory = gobj.factory();
        result.type = gobj.type();
        result.value = gobj;

        return JSON.stringify(result, replacer, space || "  ");
    };

    json.parse = function(str, reviver) {
        var obj = JSON.parse(str, reviver);

        var factory = G.getFactoryByName(obj.factory.name);
        var gobj = factory.create(G.Types[obj.type]);

        gobj.fromJSON(obj.value, Object.create(null));

        return gobj;
    };

    G.JSON = json;


}).call(this);