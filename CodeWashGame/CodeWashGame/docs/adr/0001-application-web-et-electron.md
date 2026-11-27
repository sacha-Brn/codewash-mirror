# ADR 0001 : Partager une application React entre le navigateur et Electron

- **Statut :** Acceptée (décrit l'implémentation actuelle)
- **Date :** 2026-11-27

## Contexte

Level Up RPG doit fonctionner comme application web et comme application de
bureau portable Windows. Le dépôt contient une interface React construite avec
Vite et un processus principal Electron. Maintenir des interfaces distinctes
pour ces deux plateformes dupliquerait les comportements du jeu et rendrait
leur cohérence plus difficile à préserver.

Le jeu utilise également des fonctionnalités du navigateur, notamment le
stockage local, l'audio et la reconnaissance vocale. La version de bureau doit
donc conserver une interface de type navigateur, sans donner d'accès direct à
Node.js à cette interface.

## Décision

- Conserver une seule application React pour l'interface et les comportements
  du jeu sur les deux plateformes.
- Utiliser Vite pour produire le bundle statique de l'application.
- Exécuter ce bundle dans un navigateur pour la version web et charger le
  fichier compilé `dist/index.html` depuis Electron pour la version de bureau.
- Utiliser des chemins relatifs pour les ressources (`base: './'`) afin que
  l'application compilée puisse être chargée depuis les fichiers locaux
  d'Electron.
- Confier à Electron la création et la gestion de sa fenêtre. Désactiver
  l'intégration Node.js du renderer et activer l'isolation du contexte.
- Utiliser les API du navigateur pour le stockage local et les fonctionnalités
  multimédias, sans imposer de serveur à la version actuelle du jeu.

## Solutions envisagées

1. **Maintenir des interfaces distinctes pour le navigateur et le bureau.**
   Cela permettrait des implémentations propres à chaque plateforme, mais
   dupliquerait les écrans et les comportements du jeu.
2. **Faire dépendre le renderer Electron des API Node.js.** Certaines
   intégrations de bureau pourraient être simplifiées, mais l'interface du jeu
   serait couplée à Electron et la séparation entre renderer et processus de
   bureau serait affaiblie.
3. **Déplacer l'état du jeu vers un service distant.** Cela pourrait permettre
   des comptes partagés et des sauvegardes dans le cloud, mais ajouterait des
   besoins de déploiement, de réseau et de maintenance qui ne sont pas
   nécessaires au projet actuel.

## Conséquences

### Avantages

- Les versions navigateur et bureau partagent la même implémentation du jeu.
- La version web peut être développée et prévisualisée sans lancer Electron.
- Le renderer Electron n'a pas d'accès direct à Node.js.
- L'application actuelle peut fonctionner sans service backend.

### Compromis et contraintes

- La compatibilité des API du navigateur doit être vérifiée pour chaque
  plateforme. Par exemple, la reconnaissance vocale est facultative et ne doit
  pas être considérée comme disponible partout.
- Les chemins relatifs des ressources font partie du contrat de packaging
  d'Electron. Modifier le chemin de base de Vite nécessite donc de valider la
  version de bureau empaquetée ainsi que la version web.
- Le stockage local est propre au navigateur ou au profil Electron utilisé. Il
  ne fournit ni synchronisation dans le cloud ni sauvegarde automatique.
- Les API de plateforme et le stockage persistant sont utilisés depuis le
  renderer. Les tests et refactorisations futurs devraient isoler ces accès
  aux entrées-sorties afin de pouvoir les remplacer.

## Vérification

- `npm run build` produit le bundle statique utilisé par les deux plateformes.
- `npm run electron:build` construit l'application Electron.
- Vérifier séparément dans le navigateur et dans Electron les API du
  navigateur, la persistance des données et le chargement des ressources.

## Références

- `vite.config.js` — chemin de base relatif de Vite.
- `src/main.jsx` — point d'entrée de l'application React.
- `electron/main.cjs` — cycle de vie de la fenêtre Electron et paramètres de
  sécurité du renderer.
- `src/App.jsx` — état du jeu, stockage local et utilisation de la
  reconnaissance vocale.
