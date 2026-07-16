/* ================================================================
   CONFIG
   ================================================================ */
console.log("BLN30 build 20260714g"); // sert à vérifier dans la console qu'on n'est pas sur une version en cache
const GOOGLE_MAPS_API_KEY = "AIzaSyBjbBuou1tQQ3b4xxG3lOVl5hsDNuCCdEo";
const GDRIVE_FOLDER_URL = "";     // ⬅️ colle ici le lien du dossier Drive partagé quand il existe
const NICO_PHOTO_URL = "";        // ⬅️ colle ici l'URL d'une photo de Nico pour l'easter egg Konami

const DAY_START = 7 * 60;         // 07:00 — bascule en mode clair
const DUSK_START = 16 * 60;       // 16:00 — coucher de soleil
const NIGHT_START = 20 * 60;      // 20:00 — nuit
const NIGHT_CATS = new Set(["bar", "club", "sunset"]);
const DAY_CATS = new Set(["brunch", "breakfast", "patisserie", "cafe"]);

/* ================================================================
   STATE
   ================================================================ */
let map, placesSvc, dirSvc, geocoder;
let markers = {};
let dayRouteLines = [], dayLegBadges = [];
let itinLines = [];
let mode = "prog", day = "ven", cat = "all";
let showAllRegardless = false;  // bouton "œil" en mode Programme : ignore le fondu horaire
let previewing = false;         // true pendant qu'on tient le slider
let currentMinutes = nowMinutes();
let realTimeTimer = null;
let userPos = null;             // géoloc mise en cache
let meMarker = null;            // pastille bleue "ma position"
const legCache = {}, detailCache = {}, dirCache = {};
let audioEl = null, playingId = null;
let tapCount = 0, tapTimer = null;

function nowMinutes(){ const d = new Date(); return d.getHours()*60 + d.getMinutes(); }

/* Style Google Maps sombre/épuré (base permanente — l'overlay fait le reste) */
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#232329" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9aa2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#141416" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#212b21", visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#37373f" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3d3d46" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#46464f" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ visibility: "on", color: "#32323a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#15181d" }] }
];

/* Style Google Maps clair — utilisé de 7h à 16h (mode jour) */
const MAP_STYLE_LIGHT = [
  { elementType: "geometry", stylers: [{ color: "#F2F2ED" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b6b72" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dbe9d8", visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#eeeee8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e3e3dc" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ visibility: "on", color: "#e6e6e0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe3ee" }] }
];

/* ================================================================
   HTML MARKER (emoji flottant dans une bulle glass)
   ================================================================ */
function makeHTMLMarkerClass(){
  return class HTMLMarker extends google.maps.OverlayView {
    constructor(pos, html, onClick){
      super();
      this.pos = pos;
      const div = document.createElement("div");
      div.innerHTML = html;
      this.el = div.firstElementChild;
      this.el.addEventListener("click", e => { e.stopPropagation(); onClick(); });
    }
    onAdd(){ this.getPanes().overlayMouseTarget.appendChild(this.el); }
    onRemove(){ this.el.remove(); }
    draw(){ const p = this.getProjection().fromLatLngToDivPixel(this.pos); if (p){ this.el.style.left = p.x+"px"; this.el.style.top = p.y+"px"; } }
    setVisible(v){ this.el.style.display = v ? "" : "none"; }
    setPosition(pos){ this.pos = pos; this.draw(); }
  };
}

/* Voile ciel (jour/crépuscule/nuit) rattaché au pane "overlayLayer" de Google Maps,
   qui est sous les pins (overlayMouseTarget) — sinon le voile peint par-dessus les
   pins et les rend délavés quelle que soit leur opacité JS.
   Le pane overlayLayer est décalé en interne via un transform (pour le pan fluide) :
   son origine locale (0,0) ne correspond PAS au coin haut-gauche du viewport visible.
   MapCanvasProjection n'a pas de méthode directe "container pixel → div pixel" ;
   on passe donc par LatLng (fromContainerPixelToLatLng puis fromLatLngToDivPixel),
   qui sont les deux seules conversions réellement documentées par l'API. */
function makeSkyOverlayClass(){
  return class SkyOverlay extends google.maps.OverlayView {
    constructor(el){ super(); this.el = el; this.el.style.position = "absolute"; }
    onAdd(){ this.getPanes().overlayLayer.appendChild(this.el); }
    onRemove(){ /* le noeud reste réutilisable, on ne le détruit pas */ }
    draw(){
      const proj = this.getProjection(); if (!proj) return;
      const mapDiv = this.getMap().getDiv();
      const tlLatLng = proj.fromContainerPixelToLatLng(new google.maps.Point(0, 0));
      const brLatLng = proj.fromContainerPixelToLatLng(new google.maps.Point(mapDiv.clientWidth, mapDiv.clientHeight));
      if (!tlLatLng || !brLatLng) return;
      const tl = proj.fromLatLngToDivPixel(tlLatLng);
      const br = proj.fromLatLngToDivPixel(brLatLng);
      this.el.style.left = tl.x + "px";
      this.el.style.top = tl.y + "px";
      this.el.style.width = (br.x - tl.x) + "px";
      this.el.style.height = (br.y - tl.y) + "px";
    }
  };
}

function pinHTML(place, badge, styleClass, fi){
  const numHtml = badge != null ? `<span class="pin-num">${badge}</span>` : "";
  return `<div class="pin ${styleClass}" data-fi="${fi % 4}">
    <div class="pin-bubble">${place.emoji}${numHtml}</div><div class="pin-tip"></div>
  </div>`;
}

/* Écarte visuellement les lieux trop proches (ex: Café Cinema à ~14m de Haus
   Schwarzenberg) pour que leurs pins ne se chevauchent pas complètement — seule
   la position du MARQUEUR est décalée, PLACES[id].lat/lng reste la vraie donnée
   (utilisée pour panTo, fitBounds, directions...). */
function spreadOverlappingPlaces(){
  const THRESH_KM = 0.03; // 30 m
  const SPREAD = 0.00035; // ~35-38 m de rayon d'écartement
  const ids = Object.keys(PLACES);
  const used = new Set();
  const offsets = {};
  for (let i = 0; i < ids.length; i++){
    const a = ids[i]; if (used.has(a)) continue;
    const cluster = [a];
    for (let j = i+1; j < ids.length; j++){
      const b = ids[j]; if (used.has(b)) continue;
      if (haversine(PLACES[a], PLACES[b]) < THRESH_KM) cluster.push(b);
    }
    if (cluster.length > 1){
      cluster.forEach(id => used.add(id));
      const cLat = cluster.reduce((s,id) => s + PLACES[id].lat, 0) / cluster.length;
      const cLng = cluster.reduce((s,id) => s + PLACES[id].lng, 0) / cluster.length;
      cluster.forEach((id, k) => {
        const angle = (2*Math.PI*k) / cluster.length;
        offsets[id] = {
          lat: cLat + SPREAD * Math.cos(angle),
          lng: cLng + SPREAD * Math.sin(angle) / Math.cos(cLat * Math.PI/180)
        };
      });
    }
  }
  return offsets;
}

/* ================================================================
   INIT
   ================================================================ */
function initApp(){
  const HTMLMarker = makeHTMLMarkerClass();
  window.HTMLMarker = HTMLMarker;
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 52.507, lng: 13.44 }, zoom: 12.3,
    styles: MAP_STYLE, disableDefaultUI: true, gestureHandling: "greedy", clickableIcons: false
  });
  placesSvc = new google.maps.places.PlacesService(map);
  dirSvc = new google.maps.DirectionsService();

  const SkyOverlay = makeSkyOverlayClass();
  const skyOverlay = new SkyOverlay(document.getElementById("skyOverlay"));
  skyOverlay.setMap(map);
  window.addEventListener("resize", () => skyOverlay.draw());
  geocoder = new google.maps.Geocoder();

  const markerOffsets = spreadOverlappingPlaces();
  let fi = 0;
  for (const id of Object.keys(PLACES)){
    const p = PLACES[id];
    const pos = markerOffsets[id] || p;
    const mk = new HTMLMarker(new google.maps.LatLng(pos.lat, pos.lng), pinHTML(p, null, "option", fi++), () => openSheet(id));
    mk.setMap(map);
    markers[id] = mk;
  }

  audioEl = new Audio("audio/sisyphos-teaser.mp3");
  audioEl.addEventListener("ended", () => setMusicPlaying(null));
  audioEl.addEventListener("error", () => {
    if (playingId !== null) setMusicPlaying(null);
    toast("🔇 Teaser audio introuvable — vérifie que audio/sisyphos-teaser.mp3 est bien en ligne");
  });

  bindUI();
  applyTime(currentMinutes, false);
  render();

  realTimeTimer = setInterval(() => {
    if (!previewing){ currentMinutes = nowMinutes(); applyTime(currentMinutes, false); }
  }, 60000);

  document.getElementById("map").addEventListener("click", closeSheet);

  document.getElementById("app_ready") || (function(){})();
  document.getElementById("loader").classList.add("hide");
}

/* ================================================================
   UI BINDINGS
   ================================================================ */
function bindUI(){
  document.querySelectorAll('#topbar .chip[data-mode]').forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.querySelectorAll('#topbar .chip[data-mode]').forEach(x => x.classList.toggle("active", x===b));
    document.getElementById("dayChips").style.display = mode === "prog" ? "" : "none";
    document.getElementById("catChips").style.display = mode === "explo" ? "" : "none";
    clearDayRoute();
    document.getElementById("routeFab").style.display = mode === "prog" ? "" : "none";
    document.getElementById("showAllBtn").style.display = mode === "prog" ? "" : "none";
    render();
  }));
  document.getElementById("showAllBtn").addEventListener("click", () => {
    showAllRegardless = !showAllRegardless;
    document.getElementById("showAllBtn").classList.toggle("on", showAllRegardless);
    render();
  });
  document.getElementById("recenterBtn").addEventListener("click", recenterOnMe);
  document.getElementById("dayChips").addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    day = b.dataset.day;
    document.querySelectorAll("#dayChips .chip").forEach(x => x.classList.toggle("active", x===b));
    document.getElementById("titleText").textContent = { ven:"Vendredi", sam:"Samedi", dim:"Dimanche" }[day];
    clearDayRoute();
    render();
  });
  document.getElementById("catChips").addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    cat = b.dataset.cat;
    document.querySelectorAll("#catChips .chip").forEach(x => x.classList.toggle("active", x===b));
    render();
  });

  // sun/moon + slider — le preview reste affiché après le relâchement ; on ne
  // revient à l'heure réelle qu'en tapant sur le soleil/lune ou sur "maintenant".
  const sunBtn = document.getElementById("sunBtn"), sunPanel = document.getElementById("sunPanel"), slider = document.getElementById("sunSlider");
  const nowBtn = document.getElementById("nowBtn");
  function revertToNow(closePanel){
    previewing = false;
    currentMinutes = nowMinutes();
    slider.value = currentMinutes;
    applyTime(currentMinutes, true);
    if (closePanel) sunPanel.classList.remove("open");
  }
  sunBtn.addEventListener("click", () => {
    const isOpen = sunPanel.classList.contains("open");
    if (isOpen){
      revertToNow(true);
    } else {
      sunPanel.classList.add("open");
      slider.value = currentMinutes;
      updateSunTimeLabel(currentMinutes);
    }
  });
  slider.addEventListener("input", () => {
    previewing = true;
    const t = parseInt(slider.value, 10);
    applyTime(t, true);
  });
  nowBtn.addEventListener("click", () => revertToNow(false));

  document.getElementById("routeFab").addEventListener("click", toggleDayRoute);

  // sheet drag — toute la zone d'en-tête (poignée + emoji/titre/note) sert de prise,
  // pas juste la petite barre du haut (trop dure à viser au doigt sur mobile).
  const sheet = document.getElementById("sheet"), sheetHeader = document.getElementById("sheetHeader"), backdrop = document.getElementById("backdrop");
  let dragging=false, startY=0, startH=0;
  const PEEK=()=>window.innerHeight*0.5, FULL=()=>window.innerHeight*0.86;
  window._sheetH = 0;
  window._peekH = PEEK(); // ajusté dynamiquement au contenu à chaque openSheet()
  function setH(h, anim){
    window._sheetH = Math.max(0, Math.min(FULL(), h));
    sheet.classList.toggle("animate", !!anim);
    sheet.style.transform = `translateY(${window.innerHeight - window._sheetH}px)`;
    backdrop.classList.toggle("show", window._sheetH > 10);
  }
  window._setSheetH = setH; window._PEEK = PEEK; window._FULL = FULL;
  function dragStart(y){ dragging=true; startY=y; startH=window._sheetH; sheet.classList.remove("animate"); }
  function dragMove(y){ if(!dragging) return; setH(startH + (startY - y), false); }
  function dragEnd(){
    if(!dragging) return; dragging=false;
    const peek = window._peekH || PEEK();
    if (window._sheetH < peek*0.5) closeSheet();
    else if (window._sheetH < (peek+FULL())/2) setH(peek, true);
    else setH(FULL(), true);
  }
  sheetHeader.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return; // ne pas amorcer le drag depuis un bouton (mute, etc.)
    sheetHeader.setPointerCapture(e.pointerId);
    dragStart(e.clientY);
  });
  sheetHeader.addEventListener("pointermove", e => dragMove(e.clientY));
  sheetHeader.addEventListener("pointerup", dragEnd);
  sheetHeader.addEventListener("pointercancel", dragEnd);
  backdrop.addEventListener("click", closeSheet);
  setH(0,false);

  // konami (clavier) + tap x5 sur le titre (mobile)
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let kIdx = 0;
  window.addEventListener("keydown", e => {
    kIdx = (e.key === KONAMI[kIdx]) ? kIdx+1 : 0;
    if (kIdx === KONAMI.length){ kIdx = 0; triggerEgg(); }
  });
  document.getElementById("titleText").addEventListener("click", () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(()=> tapCount=0, 900);
    if (tapCount >= 5){ tapCount = 0; triggerEgg(); }
  });
  document.getElementById("eggOverlay").addEventListener("click", () => document.getElementById("eggOverlay").classList.remove("show"));
}

/* ================================================================
   TEMPS — overlay ciel + arc soleil/lune + visibilité par catégorie
   ================================================================ */
function lerp(a,b,t){ return a+(b-a)*t; }
function updateSunTimeLabel(t){
  const h = Math.floor(t/60), m = t%60;
  document.getElementById("sunTime").textContent = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

let currentPeriod = null;       // "day" | "dusk" | "night" — pour ne toucher au DOM que sur changement
let currentMapStyleKey = null;  // "light" | "dark" — indépendant de currentPeriod (voir plus bas)

function lerp3(a, b, t){ return [ lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t) ]; }
function stops4(a, b, t){ return a.map((c, i) => lerp3(c, b[i], t)); }

/* Dégradé ciel à 4 arrêts (0/30/70/100%), interpolé entre 3 "ambiances" au fil du
   crépuscule : pâle (posé sur la carte encore claire) → vif (palette "Sunset Wedding
   Colors" fournie) → profond (bascule violette vers la nuit). La nuit réutilise
   exactement l'ambiance "profond" (même couleurs/opacité/blend) pour qu'il n'y ait
   AUCUNE coupure visible à 20h — juste une continuation. */
const SKY_DAY   = [[239,239,234],[233,235,231],[221,224,228],[213,217,226]];
const SKY_PALE  = [[224,214,236],[236,209,224],[255,213,204],[255,231,209]]; // 16h : à peine teinté
const SKY_VIVID = [[57,62,117],[142,88,138],[254,151,142],[255,217,158]];    // pic crépuscule : sa palette exacte
const SKY_DEEP  = [[35,29,64],[45,22,41],[38,17,26],[21,11,18]];             // fin de crépuscule → nuit, violet/prune foncé
const SKY_NIGHT = SKY_DEEP; // nuit = continuité directe de la fin du crépuscule

function applyTime(t, animate){
  updateSunTimeLabel(t);

  const period = (t >= DAY_START && t < DUSK_START) ? "day" : (t >= DUSK_START && t < NIGHT_START) ? "dusk" : "night";
  const kDusk = period === "dusk" ? (t - DUSK_START) / (NIGHT_START - DUSK_START) : (period === "day" ? 0 : 1);

  if (period !== currentPeriod){
    currentPeriod = period;
    document.documentElement.classList.remove("day", "dusk", "night");
    document.documentElement.classList.add(period);
  }

  // Le style de carte (clair/sombre) reste clair jusqu'à bien avancer dans le crépuscule
  // (72%) plutôt que de basculer d'un coup à 16h — sinon toute la fenêtre 16h-20h démarre
  // déjà assombrie et le fondu depuis le jour ne se voit pas.
  const wantDarkMap = period === "night" || (period === "dusk" && kDusk >= 0.72);
  const mapKey = wantDarkMap ? "dark" : "light";
  if (mapKey !== currentMapStyleKey){
    currentMapStyleKey = mapKey;
    if (map) map.setOptions({ styles: wantDarkMap ? MAP_STYLE : MAP_STYLE_LIGHT });
  }

  let stops, op, blend = "normal";
  if (period === "day"){
    stops = SKY_DAY; op = 0.05;
  } else if (period === "night"){
    stops = SKY_NIGHT; op = 0.74;
  } else if (kDusk < 0.55){
    stops = stops4(SKY_PALE, SKY_VIVID, kDusk/0.55);
    op = lerp(0.14, 0.58, kDusk/0.55);
  } else {
    stops = stops4(SKY_VIVID, SKY_DEEP, (kDusk-0.55)/0.45);
    op = lerp(0.58, 0.74, (kDusk-0.55)/0.45);
  }

  const root = document.documentElement.style;
  ["--overlay-c1","--overlay-c2","--overlay-c3","--overlay-c4"].forEach((varName, i) => {
    const c = stops[i];
    root.setProperty(varName, `rgba(${c[0]|0},${c[1]|0},${c[2]|0},1)`);
  });
  root.setProperty("--overlay-op", op.toFixed(2));
  root.setProperty("--overlay-blend", blend);

  // arc soleil/lune
  const path = document.getElementById("arcPath");
  const len = path.getTotalLength();
  const frac = Math.max(0, Math.min(1, t/1440));
  const pt = path.getPointAtLength(len*frac);
  let sunDot = document.getElementById("sunDot");
  if (!sunDot){
    sunDot = document.createElementNS("http://www.w3.org/2000/svg","text");
    sunDot.setAttribute("id","sunDot");
    sunDot.setAttribute("text-anchor","middle");
    document.getElementById("arcSvg").appendChild(sunDot);
  }
  sunDot.setAttribute("x", pt.x); sunDot.setAttribute("y", pt.y+7);
  const icon = period === "night" ? "🌙" : period === "dusk" ? "🌇" : "☀️";
  sunDot.textContent = icon;
  document.getElementById("sunBtn").textContent = icon;

  updateCategoryVisibility(t, period);
}

function updateCategoryVisibility(t, period){
  // Explorer : on veut tout voir peu importe l'heure. Programme : idem si le
  // bouton "œil" (showAllRegardless) a été activé — sinon fondu habituel.
  if (mode === "explo" || showAllRegardless){
    for (const id of Object.keys(PLACES)){
      const mk = markers[id]; if (!mk || !mk.el) continue;
      const bubble = mk.el.querySelector(".pin-bubble");
      if (bubble) bubble.style.opacity = ""; // revient à l'opacité par défaut du CSS (primary=1, option=.72)
    }
    return;
  }

  let kNight;
  if (period === "day") kNight = 0;
  else if (period === "night") kNight = 1;
  else kNight = (t - DUSK_START) / (NIGHT_START - DUSK_START); // dusk : transition progressive

  for (const [id, p] of Object.entries(PLACES)){
    const mk = markers[id]; if (!mk || !mk.el) continue;
    const bubble = mk.el.querySelector(".pin-bubble");
    if (!bubble) continue;
    if (NIGHT_CATS.has(p.cat)) bubble.style.opacity = lerp(0.12, 1, kNight);
    else if (DAY_CATS.has(p.cat)) bubble.style.opacity = lerp(1, 0.12, kNight);
  }
}

/* ================================================================
   RENDER — pins visibles selon mode / jour / catégorie
   ================================================================ */
function render(){
  clearDayRoute();
  if (mode === "explo") renderExplorer();
  else renderProgram();
  applyTime(previewing ? parseInt(document.getElementById("sunSlider").value,10) : currentMinutes, false);
}

function setPin(id, visible, styleClass, badge, fi){
  const mk = markers[id]; if (!mk) return;
  mk.setVisible(visible);
  if (!visible) return;
  mk.el.className = `pin ${styleClass}`;
  mk.el.dataset.fi = fi % 4;
  const bubble = mk.el.querySelector(".pin-bubble");
  const oldNum = bubble.querySelector(".pin-num"); if (oldNum) oldNum.remove();
  if (badge != null) bubble.insertAdjacentHTML("beforeend", `<span class="pin-num">${badge}</span>`);
}

function renderExplorer(){
  let fi = 0;
  for (const [id, p] of Object.entries(PLACES)){
    if (id === "hotel" || id === "airport"){ setPin(id, true, id==="hotel" ? "hotel" : "primary", null, fi++); continue; }
    const show = cat === "all" ? true : p.cat === cat;
    setPin(id, show, "primary", null, fi++);
  }
}

function renderProgram(){
  const steps = PROGRAM[day];
  const shown = new Set(["hotel"]);
  setPin("hotel", true, "hotel", null, 0);
  if (day === "ven"){ /* airport rendu via step 1 */ } else { markers.airport.setVisible(false); }

  let fi = 1;
  steps.forEach((step, i) => {
    step.options.forEach(opt => {
      shown.add(opt.id);
      setPin(opt.id, true, opt.validated ? "primary" : "option", i+1, fi++);
    });
  });
  // bonus flexible (Forest Seasons) sur ven/sam
  if (day !== "dim") FLEX_BONUS.forEach(id => { shown.add(id); setPin(id, true, "option", "★", fi++); });

  for (const id of Object.keys(PLACES)) if (!shown.has(id) && id !== "hotel") markers[id].setVisible(false);

  // fit bounds sur les pins visibles de ce jour
  const b = new google.maps.LatLngBounds();
  shown.forEach(id => b.extend({ lat: PLACES[id].lat, lng: PLACES[id].lng }));
  map.fitBounds(b, { top: 210, bottom: 120, left: 50, right: 50 });
}

/* ================================================================
   ROUTE DU JOUR (bouton FAB) — uniquement les pins "validated"
   ================================================================ */
function clearDayRoute(){
  dayRouteLines.forEach(l=>l.setMap(null)); dayRouteLines=[];
  dayLegBadges.forEach(el=>el.remove()); dayLegBadges=[];
  document.getElementById("routeFab").classList.remove("on");
}
function toggleDayRoute(){
  const fab = document.getElementById("routeFab");
  if (fab.classList.contains("on")){ clearDayRoute(); return; }
  fab.classList.add("on");
  const seq = PROGRAM[day].map(s => s.options.find(o=>o.validated)).filter(Boolean).map(o=>o.id);
  if (day === "ven") seq.unshift("airport");
  for (let i=0;i<seq.length-1;i++) drawDayLeg(seq[i], seq[i+1], i);
}
function haversine(a,b){
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function drawDayLeg(fromId, toId, idx){
  const from = PLACES[fromId], to = PLACES[toId];
  const key = `${fromId}>${toId}`;
  if (legCache[key]){ paintLeg(legCache[key], idx); return; }
  const walkable = haversine(from, to) < 1.3;
  dirSvc.route({
    origin: {lat:from.lat,lng:from.lng}, destination: {lat:to.lat,lng:to.lng},
    travelMode: walkable ? google.maps.TravelMode.WALKING : google.maps.TravelMode.TRANSIT
  }, (res, status) => {
    if (status !== "OK" || !res.routes[0]) return;
    const leg = res.routes[0].legs[0];
    const data = { mode: walkable?"walk":"transit", mins: Math.round(leg.duration.value/60), path: res.routes[0].overview_path };
    legCache[key] = data;
    paintLeg(data, idx);
  });
}
function paintLeg(data, idx){
  if (!document.getElementById("routeFab").classList.contains("on")) return;
  animatePolyline(data.path, dayRouteLines, 900 + idx*150);
  const mid = data.path[Math.floor(data.path.length/2)];
  const proj = map.getProjection ? null : null;
  const ov = new google.maps.OverlayView();
  ov.onAdd = function(){
    const div = document.createElement("div");
    const icon = data.mode==="walk"
      ? '<svg class="ampelmann" viewBox="0 0 24 24" fill="var(--acid)"><circle cx="12" cy="4" r="2.6"/><path d="M12 7c-2 0-3.3 1-3.6 2.6L7 15h2.2l.9-4 1.3 1.5V21h1.6v-6l1.3-1.5.9 4H17l-1.4-5.4C15.3 8 14 7 12 7z"/></svg>'
      : '<div class="u-roundel">U</div>';
    div.innerHTML = `<div class="leg-badge" style="animation-delay:${0.6+idx*0.15}s">${icon}<span>${data.mins} min</span></div>`;
    this.el = div.firstElementChild;
    this.getPanes().overlayMouseTarget.appendChild(this.el);
  };
  ov.draw = function(){ const p = this.getProjection().fromLatLngToDivPixel(mid); if (p && this.el){ this.el.style.left=p.x+"px"; this.el.style.top=p.y+"px"; } };
  ov.onRemove = function(){ if (this.el) this.el.remove(); };
  ov.setMap(map);
  dayLegBadges.push({ remove: () => ov.setMap(null) });
}

/* Anime un tracé "qui se dessine" en révélant le path progressivement */
function animatePolyline(fullPath, storeArr, duration){
  const halo = new google.maps.Polyline({ path:[], map, strokeColor: getComputedStyle(document.documentElement).getPropertyValue('--overlay-op') > 0.4 ? "#0B0B0D" : "#FFFFFF", strokeOpacity:0.7, strokeWeight:8, zIndex:4 });
  const line = new google.maps.Polyline({ path:[], map, strokeColor:"#CCFF00", strokeOpacity:0.95, strokeWeight:4, zIndex:5 });
  storeArr.push(halo, line);
  const start = performance.now();
  function step(now){
    const t = Math.min(1, (now-start)/duration);
    const n = Math.max(2, Math.floor(fullPath.length * t));
    const partial = fullPath.slice(0, n);
    halo.setPath(partial); line.setPath(partial);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ================================================================
   ITINÉRAIRE DEPUIS MA POSITION (dans la sheet)
   ================================================================ */
function clearItinLines(){ itinLines.forEach(l=>l.setMap(null)); itinLines=[]; }

function getUserPos(force){
  return new Promise((resolve, reject) => {
    if (userPos && !force) return resolve(userPos);
    if (!navigator.geolocation) return reject("no-geo");
    navigator.geolocation.getCurrentPosition(
      pos => { userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; resolve(userPos); },
      err => reject(err),
      { timeout: 8000 }
    );
  });
}

/* Bouton "recentrer sur moi" : géolocalisation navigateur pure, aucune clé/API
   Google en plus n'est nécessaire (Maps ne fait qu'afficher le point une fois
   qu'on a la position). force=true : on ignore le cache pour avoir une position
   à jour à chaque tap, contrairement à l'itinéraire qui réutilise la même fixe. */
async function recenterOnMe(){
  try {
    const pos = await getUserPos(true);
    const latLng = new google.maps.LatLng(pos.lat, pos.lng);
    map.panTo(latLng);
    map.setZoom(15);
    if (meMarker) meMarker.setPosition(latLng);
    else {
      meMarker = new window.HTMLMarker(latLng, `<div class="me-pin"><div class="me-dot"></div></div>`, () => {});
      meMarker.setMap(map);
    }
  } catch(e){
    const denied = e && e.code === 1;
    toast(denied ? "📍 Localisation bloquée — Réglages Safari > ce site > Position > Autoriser" : "📍 Localisation indisponible pour le moment");
  }
}

const MODES = [
  { key:"WALKING", icon:"🚶", label:"Marche" },
  { key:"TRANSIT", icon:"🚇", label:"Transport" },
  { key:"BICYCLING", icon:"🚴", label:"Vélo" }
];

async function openItinerary(placeId){
  const box = document.getElementById(`itinBox-${placeId}`);
  box.innerHTML = `<div class="itin-note">📍 Localisation…</div>`;
  let pos;
  try { pos = await getUserPos(); }
  catch(e){
    // Un navigateur ne réaffiche jamais la popup d'autorisation une fois refusée —
    // il faut expliquer où aller la réactiver à la main, avec un moyen de réessayer.
    const denied = e && e.code === 1; // GeolocationPositionError.PERMISSION_DENIED
    box.innerHTML = denied
      ? `<div class="itin-note">Localisation bloquée pour ce site. Sur iPhone (Safari) : appuie sur l'icône "AA" ou le cadenas dans la barre d'adresse → Réglages du site → Position → Autoriser.</div>
         <button class="itin-cta" onclick="openItinerary('${placeId}')">Réessayer</button>`
      : `<div class="itin-note">Géolocalisation indisponible pour le moment.</div>
         <button class="itin-cta" onclick="openItinerary('${placeId}')">Réessayer</button>`;
    return;
  }

  box.innerHTML = `
    <div class="itin-modes" id="itinModes-${placeId}">
      ${MODES.map(m=>`<button class="mode-btn loading" data-mode="${m.key}"><span class="mi">${m.icon}</span>…</button>`).join("")}
    </div>
    <div class="itin-note" id="itinNote-${placeId}">Sélectionne un mode pour tracer l'itinéraire</div>`;

  const dest = PLACES[placeId];
  MODES.forEach(m => {
    const ckey = `${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}>${placeId}>${m.key}`;
    const apply = (res) => {
      const btn = document.querySelector(`#itinModes-${placeId} [data-mode="${m.key}"]`);
      if (!btn) return;
      btn.classList.remove("loading");
      if (!res){ btn.innerHTML = `<span class="mi">${m.icon}</span>—`; btn.disabled = true; return; }
      btn.innerHTML = `<span class="mi">${m.icon}</span>${res.mins} min`;
      btn.addEventListener("click", () => selectItinMode(placeId, pos, m.key, res.path));
    };
    if (dirCache[ckey]) return apply(dirCache[ckey]);
    dirSvc.route({ origin: pos, destination:{lat:dest.lat,lng:dest.lng}, travelMode: google.maps.TravelMode[m.key] }, (res, status) => {
      if (status !== "OK" || !res.routes[0]) return apply(null);
      const leg = res.routes[0].legs[0];
      const data = { mins: Math.round(leg.duration.value/60), path: res.routes[0].overview_path };
      dirCache[ckey] = data; apply(data);
    });
  });
}

function selectItinMode(placeId, pos, modeKey, path){
  document.querySelectorAll(`#itinModes-${placeId} .mode-btn`).forEach(b => b.classList.toggle("active", b.dataset.mode===modeKey));
  clearItinLines();
  animatePolyline(path, itinLines, 800);
  const note = document.getElementById(`itinNote-${placeId}`);
  if (note) note.textContent = "Tracé sur la carte — ferme la fiche pour la voir en entier";
  map.panTo(pos);
}

/* ================================================================
   MUSIQUE (clubs)
   ================================================================ */
function setMusicPlaying(id){
  playingId = id;
  document.querySelectorAll(".music-btn").forEach(b => {
    const on = b.dataset.pid === id;
    b.textContent = on ? "⏸" : "▶";
  });
  document.querySelectorAll(".mute-btn").forEach(b => {
    const on = b.dataset.pid === id;
    b.textContent = on ? "🔊" : "🔇";
  });
  document.querySelectorAll(".eq-wrap").forEach(e => e.style.display = e.dataset.pid === id ? "inline-flex" : "none");
}
function playMusicFor(id){
  if (playingId === id) return; // déjà en lecture pour ce lieu
  audioEl.currentTime = 0;
  setMusicPlaying(id); // optimiste : le bouton passe en "pause" tout de suite
  audioEl.play().catch(() => {
    setMusicPlaying(null);
    toast("🔇 Lecture impossible — le navigateur a bloqué la lecture ou le fichier est introuvable");
  });
}
function stopMusic(){
  if (playingId !== null){ audioEl.pause(); setMusicPlaying(null); }
}
function toggleMusic(id){
  if (playingId === id) stopMusic();
  else playMusicFor(id);
}

/* ================================================================
   RÉACTIONS (localStorage)
   ================================================================ */
function getReactions(id){ try { return JSON.parse(localStorage.getItem("bln30-react-"+id) || "{}"); } catch(e){ return {}; } }
function bumpReaction(id, emoji){
  const r = getReactions(id); r[emoji] = (r[emoji]||0)+1;
  try { localStorage.setItem("bln30-react-"+id, JSON.stringify(r)); } catch(e){}
  return r;
}

/* ================================================================
   BOTTOM SHEET — card façon Google Maps
   ================================================================ */
let openPlaceId = null;

/* Ouvre le sheet à une hauteur calculée sur le contenu réel (photos + why-card
   visibles sans swipe), plutôt qu'un pourcentage fixe de l'écran. */
function openSheetToContent(){
  requestAnimationFrame(() => {
    const scroll = document.getElementById("sheetScroll");
    const whyEl = scroll.querySelector(".why-card");
    const anchor = whyEl ? (whyEl.offsetTop + whyEl.offsetHeight) : scroll.scrollHeight;
    const desired = Math.min(window._FULL(), Math.max(window._PEEK()*0.7, anchor + 40));
    window._peekH = desired;
    window._setSheetH(desired, true);
  });
}

/* Statut horaires enrichi : Ouvert / Ferme bientôt (< 60 min) / Fermé,
   calculé à partir des periods Google Places (plus fin que isOpen()). */
function getOpenStatus(oh){
  if (!oh || typeof oh.isOpen !== "function") return null;
  const open = oh.isOpen();
  if (open == null) return null;
  if (!open) return { label:"Fermé", cls:"status-closed" };
  const periods = oh.periods || [];
  const now = new Date();
  const day = now.getDay(), nowMins = now.getHours()*60 + now.getMinutes();
  for (const per of periods){
    if (!per.open || per.open.day !== day) continue;
    if (!per.close) return { label:"Ouvert", cls:"status-open" }; // ouvert 24h/24
    const closeMins = parseInt(per.close.time.slice(0,2),10)*60 + parseInt(per.close.time.slice(2),10);
    let diff = closeMins - nowMins;
    if (diff < 0) diff += 1440;
    if (diff <= 60) return { label:`Ferme bientôt · ${diff} min`, cls:"status-soon" };
  }
  return { label:"Ouvert", cls:"status-open" };
}

function toggleHours(id){
  const box = document.getElementById(`shHours-${id}`);
  if (box) box.classList.toggle("open");
}

function openSheet(id){
  openPlaceId = id;
  const p = PLACES[id];
  clearItinLines();
  document.querySelectorAll(".pin").forEach(el => el.classList.remove("active"));
  const mk = markers[id];
  if (mk && mk.el){ mk.el.classList.add("tapping"); setTimeout(()=>mk.el.classList.remove("tapping"),350); mk.el.classList.add("active"); }

  const peek = document.getElementById("sheetPeek");
  const body = document.getElementById("sheetScroll");
  const react = getReactions(id);
  const reactEmojis = ["❤️","🔥","🕺","😂"];

  peek.innerHTML = `
    <div class="peek-row">
      <div class="peek-emoji">${p.emoji}</div>
      <div style="flex:1;">
        <div class="peek-title">${p.name}</div>
        <div class="peek-sub"><span id="shRating-${id}">…</span><span class="dots" id="shPrice-${id}"></span></div>
      </div>
      ${p.music ? `<button class="mute-btn" data-pid="${id}" onclick="event.stopPropagation(); toggleMusic('${id}')">${playingId===id?'🔊':'🔇'}</button>` : ``}
    </div>
    <div class="expand-hint">⌃ glisse vers le haut pour tout voir</div>
  `;

  body.innerHTML = `
    <div class="photos" id="shPhotos-${id}"><div class="photo"></div><div class="photo"></div><div class="photo"></div></div>
    <div class="info-grid" id="shInfo-${id}"></div>
    <div class="hours-list" id="shHours-${id}"></div>
    <div class="why-card"><b>Pourquoi c'est cool —</b> ${p.why}</div>
    <div class="desc-card">${p.desc}</div>
    ${p.music ? `
    <div class="music-row">
      <button class="music-btn" data-pid="${id}" onclick="toggleMusic('${id}')">${playingId===id?'⏸':'▶'}</button>
      <div class="music-meta"><b>Teaser ambiance club</b>Augusto Taito — set qu'il joue justement là-bas</div>
      <span class="eq-wrap eq" data-pid="${id}" style="display:${playingId===id?'inline-flex':'none'}"><span></span><span></span><span></span></span>
    </div>` : ``}
    <div class="itin-card">
      <div class="itin-head">🧭 Itinéraire depuis ma position</div>
      <div id="itinBox-${id}"><button class="itin-cta" onclick="openItinerary('${id}')">Calculer l'itinéraire</button></div>
    </div>
    <div class="reactions">
      ${reactEmojis.map(e => `<button class="react-btn" onclick="reactClick('${id}','${e}')">${e}${react[e]?`<span class="react-count">${react[e]}</span>`:""}</button>`).join("")}
    </div>
    <div class="actions">
      <a class="btn btn-ghost" style="text-decoration:none;display:block;" href="${p.pid ? `https://www.google.com/maps/place/?q=place_id:${p.pid}` : `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}" target="_blank" rel="noopener">Google Maps ↗</a>
      <button class="btn btn-ghost btn-reaction" onclick="addPhoto('${id}')">📸 Souvenir</button>
    </div>
  `;
  document.getElementById("sheetScroll").scrollTop = 0;
  openSheetToContent();
  map.panTo({ lat: p.lat, lng: p.lng });

  if (p.music) playMusicFor(id);
  else if (playingId !== null) stopMusic();

  if (!p.pid){
    document.getElementById(`shRating-${id}`).textContent = "";
    document.getElementById(`shInfo-${id}`).innerHTML = `<div class="info-pill">📍 ${p.cat}</div>`;
    document.getElementById(`shPhotos-${id}`).innerHTML = `<div class="photo loaded" style="display:flex;align-items:center;justify-content:center;font-size:34px;">${p.emoji}</div>`;
    return;
  }

  const applyDetails = d => {
    document.getElementById(`shRating-${id}`).innerHTML = d.rating ? `★ ${d.rating} · ${(d.user_ratings_total||0).toLocaleString("fr")} avis` : "";
    const dotsN = d.price_level != null ? d.price_level : 1;
    document.getElementById(`shPrice-${id}`).innerHTML = [0,1,2].map(i=>`<span class="${i<=dotsN?'on':''}"></span>`).join("");
    const infoEl = document.getElementById(`shInfo-${id}`);
    const st = getOpenStatus(d.opening_hours);
    const statusHtml = st ? `<button class="info-pill ${st.cls} status-btn" onclick="toggleHours('${id}')">● ${st.label} ${d.opening_hours.weekday_text ? "⌄" : ""}</button>` : "";
    infoEl.innerHTML = statusHtml + (d.formatted_address ? `<div class="info-pill addr">📍 ${d.formatted_address}</div>` : "");
    const hoursEl = document.getElementById(`shHours-${id}`);
    if (hoursEl){
      if (d.opening_hours && d.opening_hours.weekday_text){
        hoursEl.innerHTML = d.opening_hours.weekday_text.map(t => `<div class="hours-row">${t}</div>`).join("");
      } else {
        hoursEl.remove();
      }
    }
    const ph = document.getElementById(`shPhotos-${id}`);
    ph.innerHTML = "";
    (d.photos||[]).slice(0,6).forEach(photo => {
      const div = document.createElement("div"); div.className="photo";
      const img = document.createElement("img"); img.loading="lazy"; img.src = photo.getUrl({maxHeight:300});
      div.appendChild(img);
      setTimeout(()=>div.classList.add("loaded"), 50);
      ph.appendChild(div);
    });
    if (!d.photos || !d.photos.length) ph.innerHTML = `<div class="photo loaded" style="display:flex;align-items:center;justify-content:center;font-size:34px;">${p.emoji}</div>`;
    if (openPlaceId === id) openSheetToContent(); // le contenu a grandi (adresse, statut...), on réajuste la hauteur
  };
  if (detailCache[p.pid]) return applyDetails(detailCache[p.pid]);
  placesSvc.getDetails({ placeId:p.pid, fields:["photos","rating","user_ratings_total","opening_hours","formatted_address","price_level"] }, (d, status) => {
    if (status === "OK" && d){ detailCache[p.pid]=d; applyDetails(d); }
    else { document.getElementById(`shRating-${id}`).textContent=""; }
  });
}
function closeSheet(){ openPlaceId = null; window._setSheetH(0, true); clearItinLines(); stopMusic(); document.querySelectorAll(".pin").forEach(el => el.classList.remove("active")); }
function reactClick(id, emoji){
  const r = bumpReaction(id, emoji);
  openSheet(id); // re-render pour mettre à jour les compteurs
  toast(`${emoji} ajouté !`);
}
function addPhoto(id){
  if (GDRIVE_FOLDER_URL) window.open(GDRIVE_FOLDER_URL, "_blank");
  else toast("📁 Dossier Drive pas encore connecté — bientôt !");
}

/* ================================================================
   TOAST
   ================================================================ */
let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 1800);
}

/* ================================================================
   EASTER EGG — Konami / 5 taps
   ================================================================ */
function triggerEgg(){
  const overlay = document.getElementById("eggOverlay");
  if (NICO_PHOTO_URL){
    const avatar = overlay.querySelector(".egg-avatar");
    avatar.style.backgroundImage = `url('${NICO_PHOTO_URL}')`;
    avatar.style.backgroundSize = "cover"; avatar.style.backgroundPosition = "center";
    avatar.querySelector("svg") && (avatar.textContent = "");
    avatar.insertAdjacentHTML("beforeend", avatar.dataset.glasses || "");
  }
  overlay.classList.add("show");
  burstConfetti();
}
function burstConfetti(){
  const colors = ['#CCFF00','#ffffff','#4d7cff','#ff6b6b','#ffcc00'];
  for (let i=0;i<50;i++){
    const c = document.createElement("div"); c.className="confetti";
    const size = 5+Math.random()*7;
    c.style.width=size+"px"; c.style.height=(size*0.4)+"px"; c.style.background=colors[i%colors.length];
    c.style.left=(20+Math.random()*60)+"vw"; c.style.transform=`rotate(${Math.random()*360}deg)`;
    document.body.appendChild(c);
    const dx=(Math.random()-0.5)*320, rot=(Math.random()-0.5)*900;
    c.animate([
      { transform:`translate(0,0) rotate(0deg)`, opacity:1 },
      { transform:`translate(${dx}px, ${window.innerHeight*0.9}px) rotate(${rot}deg)`, opacity:0 }
    ], { duration: 1500+Math.random()*700, easing:"cubic-bezier(.2,.6,.4,1)" }).onfinish = () => c.remove();
  }
}

/* ================================================================
   BOOT
   ================================================================ */
(function boot(){
  let mi = 0;
  const msgEl = document.getElementById("loaderMsg");
  const rot = setInterval(() => { mi=(mi+1)%LOADER_MSGS.length; msgEl.textContent = LOADER_MSGS[mi]; }, 1600);

  if (!GOOGLE_MAPS_API_KEY){
    setTimeout(() => { clearInterval(rot); document.getElementById("loader").classList.add("hide"); document.getElementById("setup").classList.add("show"); }, 1000);
    return;
  }
  window._initApp = () => { clearInterval(rot); initApp(); };
  const s = document.createElement("script");
  s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=_initApp&language=fr`;
  s.onerror = () => { clearInterval(rot); document.getElementById("loader").classList.add("hide"); document.getElementById("setup").classList.add("show"); };
  document.head.appendChild(s);

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();
