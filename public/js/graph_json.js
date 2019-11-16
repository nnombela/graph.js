//  graph_json.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  Graph Json library
(function(G) {
    var json = {};

    json.stringify = function(gobj, replacer, space) {
        return JSON.stringify(
            {
                factoryName: gobj.factory().name,
                type: gobj.type().val(),
                value: gobj
            },
            replacer,
            space || '  ')
    }

    json.parse = function(str, reviver) {
        var obj = JSON.parse(str, reviver);
        var factory = G.getFactoryByName(obj.factoryName);
        var gobj = factory.create(G.Types[obj.type]);

        gobj.fromJSON(obj.value, Object.create(null));

        return gobj;
    };

    G.JSON = json;
    
})(G);