/* =========================================
   LOGIC.JS - FINAL (SYNC FIX + TV + MOBILE)
   ========================================= */

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    // Enfocar buscador si existe
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    // Enfocar controles de serie
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) seasonSelect.focus();
});

// 2. NAVEGACIÓN TV (Desactiva cursor)
document.addEventListener('keydown', (e) => {
    const KEY = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, BACK: 461, ESC: 27 };
    const active = document.activeElement;
    
    // Ignorar si hay video
    const videoFrame = document.getElementById("VideoFrame");
    if (videoFrame && videoFrame.getAttribute('src')) {
        if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK) {
            closeSeriesIframe();
            e.preventDefault();
        }
        return;
    }

    // Movimiento flechas
    if ([KEY.UP, KEY.DOWN, KEY.LEFT, KEY.RIGHT].includes(e.keyCode)) {
        e.preventDefault();
        if (e.keyCode === KEY.DOWN) moveFocus(1);
        if (e.keyCode === KEY.UP) moveFocus(-1);
        if (e.keyCode === KEY.RIGHT && active.tagName === 'INPUT') active.click(); 
    } else if (e.keyCode === KEY.ENTER && active.tagName !== 'A') {
        active.click();
    }
});

function moveFocus(dir) {
    const els = Array.from(document.querySelectorAll('a, button, input, select, [tabindex="0"]'))
                     .filter(el => el.offsetParent !== null);
    const idx = els.indexOf(document.activeElement);
    if (idx + dir >= 0 && idx + dir < els.length) {
        els[idx + dir].focus();
        els[idx + dir].scrollIntoView({block: "center", behavior: "smooth"});
    }
}

// 3. SINCRONIZACIÓN DE SERIES (CORE FIX)
function initSeriesPlayer(seriesData) {
    const selector = document.getElementById('seasonSelect');
    if (!selector) return;
    
    loadSeason(selector.value, seriesData);
    selector.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));
}

function loadSeason(season, data) {
    const list = document.getElementById('episodeList');
    list.innerHTML = '';
    const eps = data[season];
    if (!eps) return;

    const sID = window.CURRENT_SERIES_ID || 'TEST_SERIES';

    eps.forEach((ep, i) => {
        const li = document.createElement('li');
        const localKey = `${sID}-S${season}-E${i+1}`;
        
        li.innerHTML = `
            <input type="checkbox" id="ch-${i}" tabindex="-1"> 
            <label tabindex="0" data-link="${ep.link}">${ep.name}</label>
        `;
        list.appendChild(li);

        const box = li.querySelector('input');
        const lbl = li.querySelector('label');

        // --- MAGIA DE SYNC ---
        // 1. Intentar con Firebase (Nube)
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    console.log("Conectado a Nube como:", user.email);
                    const path = `users/${user.uid}/progress/${sID}/S${season}/E${i+1}`;
                    
                    // Leer
                    firebase.database().ref(path).on('value', (snap) => {
                        box.checked = !!snap.val();
                        updateVis(box, lbl);
                    }, (error) => {
                        console.error("Error leyendo DB (¿Reglas?):", error);
                    });

                    // Escribir
                    box.onclick = () => firebase.database().ref(path).set(box.checked);
                } else {
                    useLocal(box, lbl, localKey); // Sin usuario -> Local
                }
            });
        } else {
            useLocal(box, lbl, localKey); // Sin Firebase -> Local
        }

        // Reproducir
        const play = () => {
            const frame = document.getElementById('VideoFrame');
            const btn = document.getElementById('closeButton');
            const cont = document.querySelector('.iframe-container');
            
            if (ep.link) {
                frame.src = ep.link;
                btn.style.display = 'flex';
                frame.focus();
                
                // Autocompletar al ver
                if(!box.checked) { box.click(); }

                if (cont.requestFullscreen) cont.requestFullscreen();
                else if (cont.webkitRequestFullscreen) cont.webkitRequestFullscreen();
            } else { alert("No disponible"); }
        };

        lbl.onclick = play;
        lbl.onkeydown = (e) => { 
            if(e.key === 'Enter') play();
            if(e.key === ' ') { e.preventDefault(); box.click(); }
        };
    });
}

function useLocal(box, lbl, key) {
    console.log("Usando Modo Local para:", key);
    box.checked = localStorage.getItem(key) === 'true';
    updateVis(box, lbl);
    box.onclick = () => {
        localStorage.setItem(key, box.checked);
        updateVis(box, lbl);
    };
}

function updateVis(box, lbl) {
    lbl.style.textDecoration = box.checked ? "line-through" : "none";
    lbl.style.opacity = box.checked ? "0.6" : "1";
}

function closeSeriesIframe() {
    const frame = document.getElementById('VideoFrame');
    const btn = document.getElementById('closeButton');
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    frame.src = "";
    btn.style.display = 'none';
    const first = document.querySelector('.episode-list label');
    if(first) first.focus();
}

// Funciones Web Principal
function openVideoModal(url) {
    const m = document.getElementById("myModal");
    const f = document.getElementById("videoFrame");
    if(m && f) { f.src = url; m.style.display = "block"; f.focus(); }
}
function closeVideoModal() {
    const m = document.getElementById("myModal");
    const f = document.getElementById("videoFrame");
    if(m) { f.src = ""; m.style.display = "none"; }
}
function filterMovies() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.movie-img').forEach(img => {
        img.closest('li').style.display = img.alt.toLowerCase().includes(q) ? 'block' : 'none';
    });
}
