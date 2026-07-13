/* ================================================================
   CONFIG
   ================================================================ */
const GOOGLE_MAPS_API_KEY = "AIzaSyBjbBuou1tQQ3b4xxG3lOVl5hsDNuCCdEo";
const GDRIVE_FOLDER_URL = "";     // ⬅️ colle ici le lien du dossier Drive partagé quand il existe
const NICO_PHOTO_URL = "";        // ⬅️ colle ici l'URL d'une photo de Nico pour l'easter egg Konami

const DUSK_START = 17 * 60 + 30;  // 17:30
const NIGHT_START = 20 * 60;      // 20:00
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
let previewing = false;         // true pendant qu'on tient le slider
let currentMinutes = nowMinutes();
let realTimeTimer = null;
let userPos = null;             // géoloc mise en cache
const legCache = {}, detailCache = {}, dirCache = {};
let audioEl = null, playingId = null;
let tapCount = 0, tapTimer = null;

function nowMinutes(){ const d = new Date(); return d.getHours()*60 + d.getMinutes(); }

/* Style Google Maps sombre/épuré (base permanente — l'overlay fait le reste) */
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#17171a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6f6f76" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#101013" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1c221c", visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#242429" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ visibility: "on", color: "#26262c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1114" }] }
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
  };
}

function pinHTML(place, badge, styleClass, fi){
  const numHtml = badge != null ? `<span class="pin-num">${badge}</span>` : "";
  return `<div class="pin ${styleClass}" data-fi="${fi % 4}">
    <div class="pin-bubble">${place.emoji}${numHtml}</div><div class="pin-tip"></div>
  </div>`;
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
  geocoder = new google.maps.Geocoder();

  let fi = 0;
  for (const id of Object.keys(PLACES)){
    const p = PLACES[id];
    const mk = new HTMLMarker(new google.maps.LatLng(p.lat, p.lng), pinHTML(p, null, "option", fi++), () => openSheet(id));
    mk.setMap(map);
    markers[id] = mk;
  }

  audioEl = new Audio("audio/sisyphos-teaser.mp3");
  audioEl.addEventListener("ended", () => setMusicPlaying(null));

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
    render();
  }));
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

  // sun/moon + slider
  const sunBtn = document.getElementById("sunBtn"), sunPanel = document.getElementById("sunPanel"), slider = document.getElementById("sunSlider");
  sunBtn.addEventListener("click", () => {
    const opening = !sunPanel.classList.contains("open");
    sunPanel.classList.toggle("open", opening);
    if (opening){ slider.value = currentMinutes; updateSunTimeLabel(currentMinutes); }
  });
  slider.addEventListener("input", () => {
    previewing = true;
    const t = parseInt(slider.value, 10);
    applyTime(t, true);
  });
  const endPreview = () => {
    previewing = false;
    currentMinutes = nowMinutes();
    applyTime(currentMinutes, true);
    sunPanel.classList.remove("open");
  };
  slider.addEventListener("touchend", endPreview);
  slider.addEventListener("mouseup", endPreview);

  document.getElementById("routeFab").addEventListener("click", toggleDayRoute);

  // sheet drag
  const sheet = document.getElementById("sheet"), grab = document.getElementById("grabHandle"), backdrop = document.getElementById("backdrop");
  let dragging=false, startY=0, startH=0;
  const PEEK=()=>window.innerHeight*0.42, FULL=()=>window.innerHeight*0.86;
  window._sheetH = 0;
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
    if (window._sheetH < PEEK()*0.5) closeSheet();
    else if (window._sheetH < (PEEK()+FULL())/2) setH(PEEK(), true);
    else setH(FULL(), true);
  }
  grab.addEventListener("touchstart", e=>dragStart(e.touches[0].clientY), {passive:true});
  grab.addEventListener("touchmove", e=>dragMove(e.touches[0].clientY), {passive:true});
  grab.addEventListener("touchend", dragEnd);
  grab.addEventListener("mousedown", e=>{
    dragStart(e.clientY);
    const mv=ev=>dragMove(ev.clientY), up=()=>{dragEnd(); window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
  });
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

function applyTime(t, animate){
  updateSunTimeLabel(t);
  const k = Math.max(0, Math.min(1, (t - DUSK_START) / (NIGHT_START - DUSK_START)));

  // couleurs : jour (neutre) -> crépuscule (orange/violet) -> nuit (bleu marine profond)
  const day1=[40,46,64], dusk1=[255,140,60], night1=[10,10,28];
  const day2=[20,22,32], dusk2=[130,40,120], night2=[2,2,10];
  let c1, c2, op;
  if (t < DUSK_START){ c1=day1; c2=day2; op=0.10; }
  else if (t < NIGHT_START){
    c1 = [ lerp(day1[0],dusk1[0],k), lerp(day1[1],dusk1[1],k), lerp(day1[2],dusk1[2],k) ];
    c2 = [ lerp(day2[0],dusk2[0],k), lerp(day2[1],dusk2[1],k), lerp(day2[2],dusk2[2],k) ];
    op = lerp(0.10, 0.5, k);
    // en fin de fenêtre crépuscule, on glisse vers les teintes nuit
    if (k > 0.7){
      const k2 = (k-0.7)/0.3;
      c1 = [ lerp(c1[0],night1[0],k2), lerp(c1[1],night1[1],k2), lerp(c1[2],night1[2],k2) ];
      c2 = [ lerp(c2[0],night2[0],k2), lerp(c2[1],night2[1],k2), lerp(c2[2],night2[2],k2) ];
      op = lerp(op, 0.55, k2);
    }
  } else { c1=night1; c2=night2; op=0.55; }

  const root = document.documentElement.style;
  root.setProperty("--overlay-c1", `rgba(${c1[0]|0},${c1[1]|0},${c1[2]|0},1)`);
  root.setProperty("--overlay-c2", `rgba(${c2[0]|0},${c2[1]|0},${c2[2]|0},1)`);
  root.setProperty("--overlay-op", op.toFixed(2));
  document.documentElement.classList.toggle("night", t >= NIGHT_START || t < 300);

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
  sunDot.textContent = (t >= NIGHT_START || t < 300) ? "🌙" : (t >= DUSK_START ? "🌇" : "☀️");
  document.getElementById("sunBtn").textContent = (t >= NIGHT_START || t < 300) ? "🌙" : (t >= DUSK_START ? "🌇" : "☀️");

  updateCategoryVisibility(t);
}

function updateCategoryVisibility(t){
  const kNight = Math.max(0, Math.min(1, (t - DUSK_START) / (NIGHT_START - DUSK_START)));
  for (const [id, p] of Object.entries(PLACES)){
    const mk = markers[id]; if (!mk || !mk.el) continue;
    let dim = false;
    if (NIGHT_CATS.has(p.cat)) dim = (t < DUSK_START); // masqué avant 17h30, apparaît ensuite
    else if (DAY_CATS.has(p.cat)) dim = (t >= NIGHT_START); // masqué après 20h
    // fondu progressif via opacity custom plutôt que tout ou rien :
    const bubble = mk.el.querySelector(".pin-bubble");
    if (!bubble) continue;
    if (NIGHT_CATS.has(p.cat)) bubble.style.opacity = mk.el.classList.contains("dim") ? "" : lerp(0.12, 1, kNight);
    else if (DAY_CATS.has(p.cat)) bubble.style.opacity = mk.el.classList.contains("dim") ? "" : lerp(1, 0.12, kNight);
    mk.el.classList.toggle("dim", false); // le fondu progressif remplace le tout-ou-rien
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

function getUserPos(){
  return new Promise((resolve, reject) => {
    if (userPos) return resolve(userPos);
    if (!navigator.geolocation) return reject("no-geo");
    navigator.geolocation.getCurrentPosition(
      pos => { userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; resolve(userPos); },
      err => reject(err),
      { timeout: 8000 }
    );
  });
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
  catch(e){ box.innerHTML = `<div class="itin-note">Géolocalisation refusée ou indisponible — active-la dans les réglages de ton navigateur.</div>`; return; }

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
  document.querySelectorAll(".eq-wrap").forEach(e => e.style.display = e.dataset.pid === id ? "inline-flex" : "none");
}
function toggleMusic(id){
  if (playingId === id){ audioEl.pause(); setMusicPlaying(null); return; }
  audioEl.currentTime = 0; audioEl.play().catch(()=>{});
  setMusicPlaying(id);
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
function openSheet(id){
  const p = PLACES[id];
  clearItinLines();
  document.querySelectorAll(".pin").forEach(el => el.classList.remove("active"));
  const mk = markers[id];
  if (mk && mk.el){ mk.el.classList.add("tapping"); setTimeout(()=>mk.el.classList.remove("tapping"),350); mk.el.classList.add("active"); }

  const body = document.getElementById("sheetScroll");
  const react = getReactions(id);
  const reactEmojis = ["❤️","🔥","🕺","😂"];

  body.innerHTML = `
    <div class="peek-row">
      <div class="peek-emoji">${p.emoji}</div>
      <div style="flex:1;">
        <div class="peek-title">${p.name}</div>
        <div class="peek-sub"><span id="shRating-${id}">…</span><span class="dots" id="shPrice-${id}"></span></div>
      </div>
    </div>
    <div class="expand-hint">⌃ glisse vers le haut pour tout voir</div>
    <div class="photos" id="shPhotos-${id}"><div class="photo"></div><div class="photo"></div><div class="photo"></div></div>
    <div class="info-grid" id="shInfo-${id}"></div>
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
  window._setSheetH(window._PEEK(), true);
  map.panTo({ lat: p.lat, lng: p.lng });

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
    let statusHtml = "";
    if (d.opening_hours){
      const open = typeof d.opening_hours.isOpen === "function" ? d.opening_hours.isOpen() : null;
      if (open === true) statusHtml = `<div class="info-pill status-open">● Ouvert</div>`;
      else if (open === false) statusHtml = `<div class="info-pill status-closed">● Fermé</div>`;
    }
    infoEl.innerHTML = statusHtml + (d.formatted_address ? `<div class="info-pill addr">📍 ${d.formatted_address}</div>` : "");
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
  };
  if (detailCache[p.pid]) return applyDetails(detailCache[p.pid]);
  placesSvc.getDetails({ placeId:p.pid, fields:["photos","rating","user_ratings_total","opening_hours","formatted_address","price_level"] }, (d, status) => {
    if (status === "OK" && d){ detailCache[p.pid]=d; applyDetails(d); }
    else { document.getElementById(`shRating-${id}`).textContent=""; }
  });
}
function closeSheet(){ window._setSheetH(0, true); clearItinLines(); document.querySelectorAll(".pin").forEach(el => el.classList.remove("active")); }
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
