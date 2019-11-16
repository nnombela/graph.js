Ain't Another Graph Library, JavaScript Implementation

##Three main entities:

* **Link**: A *Link* binds two *Nodes*
* **Node**: A *Node* have collections of *Links*
* **Graph**: A *Graph* have collections of Nodes

##And each entity has its corresponding entity collection:

* **Links**: is a collection of *Links*
* **Nodes**: is a collection of *Nodes*
* **Graphs**: is a collection of *Graphs*

##Hierarchical entity order

Entities and entity collections are ordered hierarchically as follows: **Graphs** -> **Graph** -> **Nodes** -> **Node** -> **Links** -> **Link**

##Three main aspects, each one split each main entity
* **Direction**: *Link* aspect. Direction splits collection of *Links* into 2 classes: [**In**, **Out**] *Links*.
* **Duality**: *Node* aspect. Duality splits collection of *Nodes* into 2 classes: [**Vertex**, **Edge**] *Nodes*.
* **Multilevel**: *Graph* aspect. Multilevel splits connected *Graphs* into an N multilevel hierarchical tree structure.