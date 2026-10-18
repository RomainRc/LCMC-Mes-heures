const fs = require('node:fs');
const path = require('node:path');

// Le workflow prépare www avant la synchronisation Capacitor.
// Une fabrication partielle doit échouer au lieu de publier une interface sans sa correction Android.
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'capacitor.config.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
if (config.appId !== 'fr.lcmc.mesheures' || config.android?.adjustMarginsForEdgeToEdge !== 'disable') {
  throw new Error('Mise à jour incomplète : ajoute aussi capacitor.config.json depuis la nouvelle archive.');
}
if (!pkg.scripts?.['capacitor:sync:after']?.includes('node lcmc-system-bars.cjs')) {
  throw new Error('Mise à jour incomplète : ajoute aussi package.json pour activer la barre d’état Android.');
}
if (!fs.existsSync(path.join(__dirname, 'lcmc-system-bars.cjs'))) {
  throw new Error('Mise à jour incomplète : le fichier lcmc-system-bars.cjs est absent du dépôt.');
}
// Ce hook ajoute les images, la police et le pont Android à www.
const assets = [
  'lcmc-ui.css',
  'lcmc-system-bars.js',
  'lcmc-logo.png',
  'lcmc-header.jpg',
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
