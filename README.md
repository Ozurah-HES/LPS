# Introduction

Le projet choisi pour le cours d'algorithme concerne les labyrinthes.

L'application sera en mesure de générer des labyrinthes aléatoires. Une fois le labyrinthe créer, le logiciel va le résoudre en empruntant le chemin le plus court.

Un labyrinthe est caractérisé par une seule et unique entrée, de même pour la sortie.

# Fonctionnement

Le labyrinthe est réalisé en deux étapes :

- Génération du labyrinthe en lui-même
- Résolution du labyrinthe en passant par le chemin le plus court

Le labyrinthe généré prend la forme d'un cercle ou d'un donut.

# Algorithmes utilisés

Les algorithmes employés sont les suivants :

-   Pour la génération, l'algorithme de [recherche en profondeur](https://en.wikipedia.org/wiki/Maze_generation_algorithm#Randomized_depth-first_search), également nommé "retour-récursif"
-   Pour la résolution du labyrinthe, l'algorithme de recherche en largeur est utilisé

# Génération du labyrinthe

Le point de départ de l'algorithme est situé tout en haut du labyrinthe, celui-ci va utiliser une pile pour stocker l'historique des nœuds.

L'algo va sélectionner une case voisine libre au hasard et y ajouter un nouveau nœud (qui sera également ajouter à l'historique). Si aucune case voisine n'est libre, l'algo va revenir en arrière (en enlevant le dernier nœud de l'historique). Si l'historique est vide, l'algo se termine.

Une pile est utilisé, à chaque

# Résolution du labyrinthe

TODO

