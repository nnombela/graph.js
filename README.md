Ain't Another Graph Library, JavaScript Implementation

##Three main hierarchical entities:

* **Link**: A Link binds two Nodes
* **Node**: A Node have collections of Links
* **Graph**: A Graph have collections of Nodes

##And each entity has its corresponding collection:

* **Links**: Collection of Links
* **Nodes**: Collection of Nodes
* **Graphs**: Collection of Graphs

##Hierarchical entity order

Finally all entities are ordered hierarchically as follows: **Graphs** -> **Graph** -> **Nodes** -> **Node** -> **Links** -> **Link**

##Three main aspects, each one for each type of entity:
* **Direction**: Link aspect. Direction splits collection of Links into to classes: [**in**, **out**] Links
* **Duality**: Node aspect. Duality splits collection of Nodes into to classes: [**hvert**, **hedge**], hyper-vertex and hyper-edge Nodes
* **Multilevel**: Graph aspect. Multilevel organizes connected graphs into a multilevel hierarchical structure.