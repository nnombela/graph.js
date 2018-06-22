//  graph_json.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  Graph Json library
(function(G) {
    var json = {};

    json.stringify = function(gobj, replacer, space) {
        var result =  {};
        result.factory = gobj.factory().name;
        result.type = gobj.type().val();
        result.value = gobj;

        return JSON.stringify(result, replacer, space || "  ");
    };

    json.parse = function(str, reviver) {
        var obj = JSON.parse(str, reviver);

        var factory = G.getFactoryByName(obj.factory);
        var gobj = factory.create(G.Types[obj.type]);

        gobj.fromJSON(obj.value, Object.create(null));

        return gobj;
    };

    G.JSON = json;
    
})(G);