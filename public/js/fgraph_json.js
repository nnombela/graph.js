(function() {
    var G = this.G || {};

    var json = {};

    json.stringify = function(gobj, replacer, space) {
        var result =  {};
        result.factory = gobj.factory().fullname;
        result.type = gobj.type().val();
        result.value = gobj;

        return JSON.stringify(result, replacer, space || "  ");
    };

    json.parse = function(str, reviver) {
        var obj = JSON.parse(str, reviver);

        var factory = G.getFactoryByFullname(obj.factory);
        var gobj = factory.create(G.Types[obj.type]);

        gobj.fromJSON(obj.value, Object.create(null));

        return gobj;
    };

    G.JSON = json;


}).call(this);