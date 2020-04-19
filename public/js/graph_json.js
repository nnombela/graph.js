//  graph_json.js 0.9
//  (c) 2013 nnombela@gmail.com.
//  Graph Json library
(function(G) {
    G.JSON = {
        stringify (gobj, replacer, space) {
            return JSON.stringify(
                {
                    factoryName: gobj.factory().name,
                    typeName: gobj.type().name,
                    value: gobj
                },
                replacer, space || '  ')
        },
        parse (str, reviver) {
            const obj = JSON.parse(str, reviver);
            const factory = G.getFactoryByName(obj.factoryName);
            const value = obj.value;
            value.lazy = true;
            const gobj = factory.create(G.Types[obj.typeName], value.id, value);
            gobj.fromJSON(value, Object.create(null));
            return gobj;
        }
    };
})(G);