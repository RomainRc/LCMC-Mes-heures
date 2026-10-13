const fs = require('node:fs');
const path = require('node:path');

// Le workflow prépare www avant la synchronisation Capacitor.
// Ce hook y ajoute les images et la police de l'interface, sans toucher au projet Android.
const assets = [
  'lcmc-ui.css',
  'lcmc-logo.png',
  'lcmc-hero.png',
  'lcmc-earth.png',
  'lcmc-nunito.woff2',
  'OFL-Nunito.txt'
];
for (const name of assets) {
  if (!fs.existsSync(path.join(__dirname, name))) {
    throw new Error(`Fichier manquant : ${name}. Ajoute tous les fichiers de la mise à jour à la racine du dépôt.`);
  }
}
const destination = path.join(__dirname, 'www');
fs.mkdirSync(destination, { recursive: true });
for (const name of assets) fs.copyFileSync(path.join(__dirname, name), path.join(destination, name));
console.log('Interface LCMC : images et police embarquées.');
