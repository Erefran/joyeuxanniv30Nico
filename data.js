/* ================================================================
   DATA — lieux du weekend Berlin (17-19 juillet)
   Basé sur le Notion à jour. pid = Google Place ID (null si lieu sans fiche dédiée).
   ================================================================ */
const PLACES = {
  hotel: { name:"Generator Alexanderplatz", emoji:"🛎️", cat:"hotel", lat:52.523962, lng:13.417952, pid:"ChIJ2e5i1BtOqEcREset3Pdg7hM",
    desc:"Le QG du weekend. On y dépose les sacs, on y revient trop peu, on en repart toujours en retard.", why:"C'est votre camp de base — à 10 min à pied d'Alexanderplatz, U/S-Bahn juste à côté." },
  airport: { name:"BER — Aéroport de Berlin", emoji:"✈️", cat:"airport", lat:52.3649645, lng:13.5010472, pid:"ChIJUTAoz9NGqEcRCGpRR5dAFJA",
    desc:"Le point de départ officiel du weekend. Retrouvailles avec Nico et sa copine sur place.", why:"Prenez le train FEX ou RE direct jusqu'à Alexanderplatz (~30 min, zéro changement) plutôt qu'un taxi." },

  spreegold: { name:"Spreegold", emoji:"🥑", cat:"brunch", lat:52.5231605, lng:13.4092636, pid:"ChIJJdTMVw5OqEcRajmwtdn7TNU",
    desc:"Le brunch valeur sûre : gros menus, terrasse, zéro risque de mutinerie dans le groupe.", why:"À 5 min à pied d'Alexanderplatz — le plus simple pour démarrer sans traîner de bagages trop loin." },
  oday: { name:"Ở Đây Deli", emoji:"🥑", cat:"brunch", lat:52.5341591, lng:13.3986802, pid:"ChIJf_XI3DJRqEcRyUdJPgaOupc",
    desc:"Brunch vietnamien dans un décor de film Wong Kar-wai. Le French toast fait pleurer (de joie).", why:"Le plus 'niche' des trois — parfait si vous voulez éviter le brunch qu'on voit sur tout Instagram." },
  distrikt: { name:"Distrikt Coffee", emoji:"🥑", cat:"brunch", lat:52.531603, lng:13.3941146, pid:"ChIJ--YdvO9RqEcRWbP6iaXaoew",
    desc:"Grand espace lumineux, French toast culte, un des meilleurs cafés torréfiés de Mitte.", why:"Plus spacieux que la moyenne des brunchs berlinois — facile de caser un groupe de 8." },
  fatherc: { name:"Father Carpenter", emoji:"🥑", cat:"brunch", lat:52.5244875, lng:13.4065282, pid:"ChIJtRsiyuFRqEcRsw5mphvL8Jw",
    desc:"Le brunch star de Mitte, caché dans une cour. La file d'attente fait partie de l'expérience.", why:"LE spot brunch le plus connu de la ville — à tenter si vous êtes du matin et motivés pour la queue." },
  hosw: { name:"House of Small Wonder", emoji:"🥑", cat:"brunch", lat:52.5264072, lng:13.3944188, pid:"ChIJfSfTtelRqEcRC52WM-fWJi8",
    desc:"Escalier en colimaçon, jungle de plantes, brunch japonais. Vos stories vont chauffer.", why:"Le plus photogénique des cinq — si l'un de vous vit pour Instagram, c'est celui-là." },

  strom: { name:"Strom Café", emoji:"🥐", cat:"breakfast", lat:52.5286648, lng:13.4155323, pid:"ChIJbcZOiUxPqEcRgktUCLyNZLE",
    desc:"Café de quartier planqué dans une cour de la Backfabrik. Fermé dimanche — donc samedi ou jamais.", why:"Cuisine allemande/scandinave très tendance en ce moment — l'adresse qui fait 'tu connais Berlin toi'." },

  sofi: { name:"Sofi Bakery", emoji:"🧁", cat:"patisserie", lat:52.5262248, lng:13.400907, pid:"ChIJWdC0MkVRqEcRPBugdi5gyJo",
    desc:"La boulangerie la plus courtisée de Mitte, planquée dans une cour. Morning bun obligatoire.", why:"À 5 min de Haus Schwarzenberg — parfait à caler juste avant ou après la balade street art." },
  aera: { name:"Aera Bread", emoji:"🧁", cat:"patisserie", lat:52.5294154, lng:13.4019282, pid:"ChIJTXADhRJRqEcRXjyIabnMTnI",
    desc:"Tout est sans gluten et personne ne s'en rend compte. Murs bleu Vermeer, vraiment beau.", why:"À deux pas de Sofi — vous pouvez comparer les deux dans la même sortie." },
  albatross: { name:"Albatross Bakery", emoji:"🧁", cat:"patisserie", lat:52.4913781, lng:13.4166506, pid:"ChIJg2JtgUxOqEcRd1FPPyI0XCI",
    desc:"Croissant pumpkin cream et pain à la betterave. Ça semble bizarre, c'est excellent.", why:"Plutôt côté Kreuzberg — pratique si vous traînez dans ce coin-là un matin." },

  bonanza: { name:"Bonanza Coffee", emoji:"☕️", cat:"cafe", lat:52.5041653, lng:13.4203241, pid:"ChIJe-xsRDFOqEcR9oMD5MR9wCo",
    desc:"Roastery culte de Kreuzberg. Le café qui remet d'aplomb après une nuit au Sisyphos.", why:"Un des tous premiers spécialistes du café de spécialité à Berlin — référence absolue." },

  schwarzenberg: { name:"Haus Schwarzenberg", emoji:"🖼️", cat:"culture", lat:52.524261, lng:13.4026214, pid:"ChIJjZik3-BRqEcRYJNhq-6aGVU",
    desc:"Le passage street art que les touristes ratent. Gratuit, brut, parfait.", why:"Petite anecdote : c'est un des rares coins de Mitte jamais rénové depuis la chute du Mur — juste à côté, le musée Otto Weidt raconte l'histoire d'un atelier qui cachait des ouvriers aveugles juifs pendant la guerre." },
  darkmatter: { name:"Forest Seasons @ Dark Matter", emoji:"🖼️", cat:"culture", lat:52.4927414, lng:13.4926954, pid:"ChIJqc2JIkRPqEcRLdpX7ohXL0U",
    desc:"Forêt de lumière et de son dans une ancienne usine. Installation immersive, ~45 min de cycle.", why:"Option flexible vendredi OU samedi — et comme c'est juste à côté de Sisyphos, ça s'enchaîne parfaitement avant le club." },

  klunker: { name:"Klunkerkranich", emoji:"🌅", cat:"sunset", lat:52.482195, lng:13.4318524, pid:"ChIJBfIPPbtPqEcRMnne4FZmMfk",
    desc:"Un rooftop-jardin sur un parking de centre commercial. C'est Berlin résumé en un lieu.", why:"Arrivez avant 18h, pas de réservation possible et ça se remplit vite au coucher du soleil." },
  holzmarkt: { name:"Holzmarkt 25", emoji:"🌅", cat:"sunset", lat:52.5112292, lng:13.4266686, pid:"ChIJ8dE5ZzlOqEcRSOv8JF88prM",
    desc:"Village bohème au bord de la Spree, mi-utopie mi-chantier. Le resto Katerschmaus sur place est une pépite.", why:"Né de la scène du légendaire Bar25 — un des lieux fondateurs de la culture techno post-réunification." },

  cafecinema: { name:"Café Cinema", emoji:"🍸", cat:"bar", lat:52.52418, lng:13.40245, pid:"ChIJRyQVKOFRqEcRH0BD9bGM0Tk",
    desc:"Ouvert depuis la chute du Mur. Posters de ciné, cour aux guirlandes, cash only — comme à l'époque.", why:"Littéralement à l'entrée du passage Haus Schwarzenberg — le combo est tout tracé." },
  fahimi: { name:"Fahimi Bar", emoji:"🍸", cat:"bar", lat:52.499293, lng:13.4197463, pid:"ChIJxyZjojROqEcR2Tbn0upEemQ",
    desc:"Entrée planquée au-dessus de Kotti. Néons, béton, cocktails sérieux, vue sur le chaos de Kottbusser Tor.", why:"Le genre d'adresse qu'on ne trouve pas en cherchant 'bar Berlin' sur Google — parfaite pour votre mood." },
  velvet: { name:"Velvet", emoji:"🍸", cat:"bar", lat:52.4789825, lng:13.4384567, pid:"ChIJiTWu86NPqEcRDpAVl4UgmGA",
    desc:"Cocktails aux plantes sauvages cueillies autour de Berlin. Oui, vraiment.", why:"Carte qui change chaque semaine selon la cueillette — jamais le même verre deux fois." },
  straube: { name:"Schwarze Traube", emoji:"🍸", cat:"bar", lat:52.5024313, lng:13.4296153, pid:"ChIJFaheeUlOqEcRSwLnOkcqj7M",
    desc:"Minuscule, feutré, à la bougie. LA référence cocktails de Kreuzberg.", why:"Demandez-leur de composer selon vos goûts plutôt que de commander sur la carte — c'est leur spécialité." },
  pandoras: { name:"Pandoras", emoji:"🍸", cat:"bar", lat:52.4962747, lng:13.3960323, pid:"ChIJ_63vGOxPqEcR-OV_4Q2C8xk",
    desc:"Un bar dans une église en activité. Cosy, queer-friendly, ambiance chapelle détournée.", why:"⚠️ Ferme à 21h — c'est un spot apéro/fin d'aprem, pas d'after possible ici." },
  mobelolfe: { name:"Möbel Olfe", emoji:"🍸", cat:"bar", lat:52.499985, lng:13.417456, pid:"ChIJU4ZVEjNOqEcRIlxHkJd83OQ",
    desc:"Ancien magasin de meubles devenu bar queer culte. Bruyant, joyeux, berlinois.", why:"Institution du quartier depuis les années 2000 — jeudi soir est légendaire mais tous les soirs sont bien." },
  buckbreck: { name:"Buck & Breck", emoji:"🍸", cat:"bar", lat:52.5321302, lng:13.3989457, pid:"ChIJ6xA6OOVRqEcRAlUf8i6Osc8",
    desc:"Speakeasy de référence : sonnez, attendez, priez. 14 places assises.", why:"Un des tout premiers speakeasys de la ville — a lancé la mode il y a plus de 10 ans." },

  kink: { name:"Kink — dîner & bar", emoji:"🍜", cat:"restaurant", lat:52.5319735, lng:13.4115959, pid:"ChIJjzSUKqRRqEcRfEvjfuXRlIg",
    desc:"Salle de bal de 1841, néons au plafond, cocktails de laboratoire. Chic mais pas coincé.", why:"L'option retenue pour le dîner ET le bar vendredi soir — large pour un groupe de 8, ouvert jusqu'à 2h30." },
  schwestern: { name:"3 Schwestern", emoji:"🍜", cat:"restaurant", lat:52.5038607, lng:13.4243826, pid:"ChIJIxybZzZOqEcR7ktMKEAoufs",
    desc:"Resto dans un ancien hôpital devenu maison d'artistes. Concerts le week-end, cadre unique.", why:"Prix modérés pour le cadre — rare à Berlin d'avoir autant de charme sans exploser le budget." },
  katzorange: { name:"Katz Orange", emoji:"🍜", cat:"restaurant", lat:52.5314438, lng:13.3946245, pid:"ChIJQ2g8mO9RqEcRpOSC8NXG7io",
    desc:"Ancienne brasserie industrielle, cuisine léchée. Le cran au-dessus sans exploser le budget.", why:"Cuisine bien sourcée, produits de saison — le choix si vous voulez un dîner plus 'sérieux'." },
  ora: { name:"ORA", emoji:"🍜", cat:"restaurant", lat:52.5013623, lng:13.4159217, pid:"ChIJCwbEVjJOqEcRlFGm69_dBJk",
    desc:"Dîner dans une pharmacie du 19e siècle. Les remèdes sont désormais liquides et alcoolisés.", why:"Mobilier d'origine conservé — un des décors les plus uniques de Kreuzberg." },
  torbar: { name:"Brasserie Torbar", emoji:"🍜", cat:"restaurant", lat:52.5286255, lng:13.3934769, pid:"ChIJbUrkSO9RqEcReI6sG1NZRuI",
    desc:"Brasserie française, ambiance beautiful people. Le portefeuille le sentira passer.", why:"Plus cher que les autres options (~50-70€/pers) — à garder si vous voulez vraiment marquer le coup." },

  sisyphos: { name:"Sisyphos", emoji:"🪩", cat:"club", lat:52.4932271, lng:13.4919029, pid:"ChIJpwrS6d5OqEcRAwn8R8rChzU", music:true,
    desc:"LE club. Ancienne usine de biscuits pour chiens devenue village festif. Cash only, pas de photos.", why:"Souriez au videur (mais pas trop) — door policy plus souple que Berghain mais reste sélective en gros groupes." },
  aboutblank: { name:"://about blank", emoji:"🪩", cat:"club", lat:52.5025323, lng:13.4663728, pid:"ChIJfyco7vlOqEcRrrbiNuS8o5s", music:true,
    desc:"Queer-friendly, jardin magique, porte plus douce. Le plan B qui n'a rien d'un plan B.", why:"Communauté très soudée — l'un des clubs les plus aimés par les Berlinois eux-mêmes, pas que les touristes." },
  elseclub: { name:"Else", emoji:"🪩", cat:"club", lat:52.4949372, lng:13.462252, pid:"ChIJ4w5Jb_5OqEcR9FYTx1EIcrs", music:true,
    desc:"Conteneurs colorés au bord de la Spree. Festif dès le coucher du soleil.", why:"Ambiance plus légère et bariolée que la moyenne des clubs berlinois — bon compromis en groupe mixte." },
  katerblau: { name:"Kater Blau", emoji:"🪩", cat:"club", lat:52.5119258, lng:13.4253885, pid:"ChIJH9zrjDtOqEcR7NYKCwZJljc", music:true,
    desc:"Bohème, sur l'eau, after infini. On y entre pour une heure, on y reste huit.", why:"Sur le même site que Holzmarkt 25 — héritier direct de l'esprit Bar25 originel." },
  rso: { name:"RSO.Berlin", emoji:"🪩", cat:"club", lat:52.45989, lng:13.50548, pid:"ChIJfV8BVQxPqEcRCE_Pee7Qm2I", music:true,
    desc:"L'héritier du Griessmühle. Grand, brut, un des meilleurs sound systems de la ville.", why:"Le floor Robus est réputé pour avoir l'un des meilleurs systèmes son de tout Berlin." },
  oxi: { name:"OXI", emoji:"🪩", cat:"club", lat:52.5077644, lng:13.4747452, pid:"ChIJhVeIFjdPqEcRSKVs3xMl9PQ", music:true,
    desc:"3 dancefloors + un des meilleurs jardins open-air de Berlin. Porte plus cool que la moyenne.", why:"Ambiance plus jeune et gritty — bon spot si vous voulez tester l'underground sans la légende Sisyphos." },
  aeden: { name:"ÆDEN", emoji:"🪩", cat:"club", lat:52.4976865, lng:13.4498047, pid:"ChIJXRVOM81PqEcRheSDtW5ZAEg", music:true,
    desc:"Club-jardin au bord du canal. Vibe check à l'entrée : souriez, mais pas trop.", why:"Programmation techno/house/jazz assez large — un des plus éclectiques de la sélection." },

  mauerpark: { name:"Mauerpark", emoji:"🛍️", cat:"shopping", lat:52.5420022, lng:13.4021371, pid:"ChIJd-d5Rx1SqEcRgCz33OsCSZQ",
    desc:"Le dimanche berlinois : puces, vinyles, fripes, musiciens. Le karaoké commence à 15h — trop tard pour nous, snif.", why:"Fun fact : le parc est construit littéralement sur l'ancienne bande de la mort du Mur de Berlin — le no man's land est devenu un marché aux puces géant." },
  singblackbird: { name:"Sing Blackbird", emoji:"🛍️", cat:"shopping", lat:52.4923463, lng:13.4261977, pid:"ChIJ0zIj27VPqEcRVrh8xvyFOQ8",
    desc:"Fripes 70s-90s + café. Le combo dangereux pour le porte-monnaie.", why:"Sélection curatée plutôt que du vrac — plus cher que Mauerpark mais plus rapide à fouiller." },

  markthalle: { name:"Markthalle Neun", emoji:"🍜", cat:"restaurant", lat:52.502135, lng:13.4315988, pid:"ChIJvaZWgElOqEcRElWjL2P9AZg",
    desc:"Halle de 1891, stands de bouffe du monde entier. Chacun son stand, tout le monde est content.", why:"Une des dernières halles de marché historiques encore en activité à Berlin." },
  tempelhof: { name:"Tempelhofer Feld", emoji:"🖼️", cat:"culture", lat:52.4748569, lng:13.4005926, pid:"ChIJ65nY9-hPqEcRi3G7rJmOiYg",
    desc:"Un aéroport devenu le plus grand parc urbain d'Europe. Pique-nique sur la piste d'atterrissage.", why:"C'est ici qu'a atterri le Pont aérien de Berlin en 1948-49 — un des épisodes les plus dingues de la Guerre Froide, quand les Alliés ravitaillaient la ville par avion jour et nuit." },

  /* ===== Easter eggs — cat "secret" : jamais estompés par l'heure, jamais dans
     le Programme, visibles seulement en Explorer > Tout ===== */
  policestation: { name:"Centre officiel de récupération de Nicolas (after party)", emoji:"👮", cat:"secret", lat:52.5219, lng:13.4132, pid:null,
    desc:"Polizeipräsidium, Alexanderplatz, 10178 Berlin. Si quelqu'un manque à l'appel après une nuit un peu trop réussie, c'est probablement ici qu'il faut commencer à chercher.", why:"On ne sait jamais avec ce groupe." },
  onepiece: { name:"Le trésor de One Piece", emoji:"🏴‍☠️", cat:"secret", lat:52.5010, lng:13.4450, pid:null,
    popup:"🏴‍☠️<br><b>Yohoho !</b><br>Le vrai trésor, c'était les clubs qu'on a fermés en chemin." },
  hospital: { name:"Mise à jour Nico", emoji:"🏥", cat:"secret", lat:52.5259, lng:13.3778, pid:null,
    popup:"💀<br><b>Version 30.0 installée</b><br>Correctifs de NicoBIOS : Dos légèrement plus fragile, plus de sagesse, toujours autant de conneries." },
  savepoint: { name:"Point de sauvegarde", emoji:"💾", cat:"secret", lat:52.5145, lng:13.3501, pid:null,
    popup:"<b>💾 Sauvegarde en cours…</b><br><br>Nom : Nico le dingo<br>Classe : Techno Mage<br>PV : 72%<br>Mana : 12%<br>Charisme : 98<br>Fatigue : Incalculable<br>Inventaire : ✅ Portable ✅ Clés ✅ Carte bancaire ✅ chargeur oublié ✅ 3 tickets BGV<br>Statut : Boss de fin de weekend" }
};

/* ================================================================
   PROGRAM — étapes numérotées par jour. Chaque étape a un ou
   plusieurs "options" ; celle marquée validated:true est affichée
   pleine (primary), les autres en pointillé.
   ================================================================ */
const PROGRAM = {
  ven: [
    { label:"Atterrissage", options:[{id:"airport", validated:true}] },
    { label:"Brunch", options:[{id:"spreegold", validated:true}] },
    { label:"Street art", options:[{id:"schwarzenberg", validated:true}] },
    { label:"Un verre", options:[{id:"cafecinema", validated:true}] },
    { label:"Coucher de soleil", options:[{id:"klunker", validated:true},{id:"holzmarkt"}] },
    { label:"Dîner & bar", options:[{id:"kink", validated:true}] },
    { label:"Clubbing", options:[{id:"oxi"},{id:"aeden"},{id:"rso"}] }
  ],
  sam: [
    { label:"Petit-déj", options:[{id:"strom", validated:true}] },
    { label:"Déjeuner", options:[{id:"markthalle"},{id:"holzmarkt"}] },
    { label:"Apéro", options:[{id:"pandoras", validated:true}] },
    { label:"Dîner anniversaire", options:[{id:"schwestern", validated:true},{id:"katzorange"}] },
    { label:"LE club", options:[{id:"sisyphos", validated:true}] },
    { label:"Plan B club", options:[{id:"aboutblank"},{id:"elseclub"},{id:"rso"},{id:"katerblau"}] }
  ],
  dim: [
    { label:"Marché aux puces", options:[{id:"mauerpark", validated:true}] }
  ]
};

/* Lieux "bonus" en option flexible, affichés avec une étoile, pas liés à un jour précis */
const FLEX_BONUS = ["darkmatter"];

const LOADER_MSGS = [
  "On soudoie le videur du Sisyphos…",
  "Retrait de cash pour les clubs (carte refusée, évidemment)…",
  "Calibrage du coucher de soleil au Klunkerkranich…",
  "Vérification du dress code : noir, noir, ou noir…",
  "On réveille le DJ, il s'était couché à 14h…",
  "Synchronisation avec la course du soleil sur Berlin…"
];
