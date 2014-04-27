Graph Library, JavaScript Implementation

##Three main hierarchical entities:

* **Link**, node elements, binds two nodes
* **Node**, graph elements, has collections of links
* **Graph**, has collections of nodes

##Each entity has its corresponding collection:
* **Links**, collection of links
* **Nodes**, collection of nodes
* **Graphs**, collection of graphs

##Hierarchical Type Order
**Graphs** -> **Graph** -> **Nodes** -> **Node** -> **Links** -> **Link**

##Three main aspects, each one for each entity:
* **Direction**, Link aspect, splits collection of links into to classes: [**in**, **out**] links
* **Duality**, Node aspect, splits collection of nodes into to classes: [**hvert**, **hedge**] hyper-vertex and hyper-edge nodes
* **Multilevel**, Graph aspect, organizes connected graphs into a multilevel hierarchical structure.