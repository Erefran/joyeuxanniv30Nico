# BLN30 — App weekend anniversaire Berlin (17-19 juillet)

## Contexte du projet
PWA (Progressive Web App) mobile-first pour un groupe d'amis (~8 personnes) en weekend à Berlin
pour l'anniversaire surprise de Nico. Carte interactive Google Maps avec programme par jour,
mode Explorer, itinéraires, cycle jour/nuit animé, musique, easter eggs.

**Stack** : HTML/CSS/JS vanilla, pas de framework, pas de build step. Google Maps JavaScript API
(Maps + Places + Directions). PWA avec manifest.json + service worker.

**Repo GitHub** : erefran/joyeuxanniv30Nico
**URL live** : https://erefran.github.io/joyeuxanniv30Nico/
**Déploiement** : GitHub Pages, branche main, racine du repo.

## ⚠️ Points critiques à connaître avant de toucher au code

1. **`.nojekyll` doit rester à la racine du repo** — sans lui, GitHub Pages essaie de builder
   le site avec Jekyll et ça échoue silencieusement (le déploiement passe en "Failing" et le
   site ne se met plus à jour du tout, sans erreur visible côté utilisateur). C'est LA cause
   du bug le plus long à diagnostiquer aujourd'hui — vérifier ce fichier en premier si jamais
   "les changements ne s'appliquent pas" à nouveau.

2. **Le conteneur de la carte utilise un wrapper** (`#mapWrap` > `#map`). Ne pas mettre
   `position:fixed` directement sur `#map` — Google Maps écrase ce style en `position:relative`
   via un style inline dès qu'il s'initialise, ce qui casse le plein écran. La taille plein écran
   doit toujours venir du wrapper parent (`#mapWrap{position:fixed;inset:0}`) avec `#map` en
   `width:100%;height:100%`.

3. **La clé Google Maps API** est déjà dans `app.js` (`GOOGLE_MAPS_API_KEY`), restreinte par
   référent HTTP à `erefran.github.io/joyeuxanniv30Nico/*` dans Google Cloud Console. Toute
   URL de test doit passer par ce domaine réel (le `file://` local ou un autre domaine de
   preview ne fonctionneront pas pour la carte/photos/itinéraires — c'est normal, pas un bug).

4. **Le service worker (`sw.js`) fait du "network-first"** pour `index.html` (toujours vérifier
   la dernière version en ligne avant de servir le cache) — c'est un fix volontaire suite à un
   bug de cache vécu plus tôt. Ne pas repasser en "cache-first" sur ce fichier précis.
   Attention aussi : ne jamais mettre en cache une réponse avec un statut différent de 200
   (les fichiers audio streamés en 206 Partial Content plantent `Cache.put()`).

## Structure des fichiers

```
index.html   → structure HTML + tout le CSS (design tokens, glassmorphism, pins, sheet, slider)
data.js      → PLACES (39 lieux) + PROGRAM (étapes par jour) + FLEX_BONUS + LOADER_MSGS
app.js       → toute la logique (carte, cycle jour/nuit, render, itinéraires, sheet, musique, easter egg)
manifest.json, sw.js, icon-192.png, icon-512.png → PWA
audio/sisyphos-teaser.mp3 → teaser 30s (Augusto Taito) utilisé sur toutes les fiches "club"
.nojekyll    → vide, obligatoire (voir point critique #1)
```

## Modèle de données (`data.js`)

- `PLACES` : objet `{ id: { name, emoji, cat, lat, lng, pid, desc, why, music? } }`
  - `pid` = Google Place ID (peut être `null` pour un lieu sans fiche Google dédiée)
  - `cat` = une de : hotel, airport, brunch, breakfast, patisserie, cafe, restaurant, bar, club, culture, shopping, sunset
  - `desc` = texte fun/descriptif ; `why` = bloc "pourquoi c'est cool" (peut inclure anecdote historique)
  - `music:true` sur les clubs → affiche le bouton play du teaser audio
- `PROGRAM` : `{ ven: [...], sam: [...], dim: [...] }`, chaque jour = liste d'étapes
  `{ label, options: [{id, validated?:true}] }`. Une étape peut avoir plusieurs options
  (alternatives non tranchées) ; `validated:true` = lieu confirmé (tagué vert sur le Notion
  source), affiché en style "primary" (plein) vs "option" (pointillé) sur la carte.
- `FLEX_BONUS` : lieux flexibles non liés à un jour précis (ex : expo Forest Seasons, dispo ven OU sam)

**Source de vérité côté contenu** : le Notion de Kelly. Si de nouveaux retours arrivent des amis,
il faudra probablement re-synchroniser `PLACES`/`PROGRAM` avec les dernières modifications Notion —
demander à l'utilisatrice l'état à jour plutôt que de supposer.

## Fonctionnalités déjà implémentées

- Carte Google Maps stylée (sombre, épurée), pins emoji flottants en bulles glassmorphism
- Cycle jour/nuit : bouton soleil/lune (topbar) ouvre un slider caché qui "voyage" dans la
  journée — dégradé de couleur sur la carte (jour → crépuscule dès 17h30 → nuit à 20h),
  petit soleil/lune qui se déplace sur un arc SVG en haut de l'écran, pins bar/club/sunset qui
  apparaissent en fondu le soir et pins brunch/petit-déj qui s'estompent. Relâcher le slider
  revient à l'heure réelle (recalculée toutes les 60s si pas en mode preview).
- Deux modes : **Programme** (par jour, étapes numérotées avec options) et **Explorer**
  (tous les lieux, filtrable par catégorie)
- Bouton itinéraire (bulle bas-gauche) : trace/efface le parcours du jour entre les lieux
  "validated" du programme, avec badges Ampelmann (marche) / rond U-Bahn (transport) et
  tracé progressif animé
- Fiche lieu (bottom sheet, swipe pour agrandir) façon Google Maps : photos (skeleton loading),
  note, prix, statut ouvert/fermé, adresse, bloc "pourquoi c'est cool", bloc itinéraire
  "depuis ma position" (géolocalisation réelle + 3 modes marche/transport/vélo avec temps
  calculés via Directions API), réactions emoji (stockées en localStorage), bouton musique
  sur les clubs (lit `audio/sisyphos-teaser.mp3`)
- Easter egg : Konami code clavier OU 5 taps rapides sur le titre → confettis + avatar
  placeholder à lunettes (voir TODO ci-dessous pour la vraie photo)
- PWA installable (icône écran d'accueil iOS/Android), offline pour la coquille de l'app

## Bugs corrigés aujourd'hui (pour référence, éviter de les réintroduire)

1. Carte invisible (écran noir) → fix du wrapper `#mapWrap` (voir point critique #2)
2. Déploiement GitHub Pages qui échouait silencieusement → ajout de `.nojekyll`
3. Erreur de cache sur le fichier audio (statut 206) → `sw.js` ne met en cache que les
   réponses 200
4. Swipe de la bottom sheet inutilisable sur mobile Safari → zone tactile élargie
   (`.grab-zone` avec padding, au lieu d'un trait de 4px) + hauteur d'ouverture par défaut
   augmentée (64% au lieu de 42%, pour voir photos + "pourquoi c'est cool" sans avoir à glisser)

## TODO — à reprendre avec Claude Code

- [x] **Fix scroll bottom sheet mobile** — `.sheet-scroll` (flex:1) se dimensionnait sur les
      100vh entiers du `#sheet` (hauteur fixe, translateY gère juste le reveal) au lieu de la
      portion réellement visible à l'écran (`_sheetH`), donc le scroll interne se bloquait avant
      la fin réelle du contenu. Fix : `setH()` (app.js) clamp désormais `sheetScroll.style.maxHeight`
      sur `_sheetH - sheetHeader.offsetHeight` à chaque changement de hauteur (drag ou snap).
- [x] **Feature photos/Drive retirée** — bouton 📸, lien `GDRIVE_FOLDER_URL`, upload direct via
      Apps Script (`PHOTO_UPLOAD_URL`) : tout a été annulé et retiré du code à la demande de
      l'utilisatrice. Pas de trace à réintroduire sans nouvelle demande explicite.
- [ ] **Vérifier que le fix du swipe/scroll mobile fonctionne réellement** (dernière modif non
      encore confirmée par l'utilisatrice au moment du transfert)
- [ ] **Photo de Nico** pour l'easter egg Konami — variable `NICO_PHOTO_URL` dans `app.js`,
      actuellement vide (placeholder emoji + lunettes SVG utilisé en attendant)
- [ ] **Lieu caché insolite** (easter egg supplémentaire, pas de la bouffe) — pas encore décidé,
      pas encore intégré au code
- [ ] **Infos/bulles historiques enrichies** avec illustrations — pour l'instant seulement du
      texte glissé dans le champ `why` de certains lieux (Mauerpark, Tempelhofer Feld,
      Haus Schwarzenberg) ; l'utilisatrice veut une vraie UI dédiée avec photos d'archives
      libres de droit, pas encore construite
- [ ] **Re-synchroniser avec Notion** une fois les retours des amis reçus — actuellement
      `PLACES`/`PROGRAM` reflètent le Notion tel qu'il était le 13 juillet
- [ ] Kelly a mentionné avoir d'autres modifications à donner directement à cette prochaine
      session — les récupérer auprès d'elle en début de session plutôt que de deviner

## Préférences de travail de Kelly

- Communique en français, tutoiement
- Aime itérer vite avec un vrai aperçu visuel avant de valider une direction
- Direction artistique validée : dark mode par défaut, glassmorphism, accent vert acide
  (#CCFF00), touches Berlin discrètes plutôt qu'un habillage lourd (Ampelmann pour la marche,
  rond U-Bahn pour les transports)
- Veut que git push vers GitHub se fasse automatiquement après chaque validation, pour
  arrêter le cycle manuel zip/upload
