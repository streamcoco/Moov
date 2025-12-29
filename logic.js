/* =========================================
   LOGIC.JS - LIMPIO Y OPTIMIZADO
   ========================================= */

let currentSeriesData = null;
let currentSeasonIndex = null;
let currentEpisodeIndex = null;
let countdownInterval = null;

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    // Enfocar buscador solo si existe (Pantalla Principal)
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    // Enfocar selector si existe (Series)
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) seasonSelect.focus();

    // Inyectar UI de Siguiente Capítulo (Solo si hay video container)
    injectNextEpisodeUI();
});

// HTML INYECTADO (Botón Fantasma Rectangular - Siguiente)
function injectNextEpisodeUI() {
    const container = document.querySelector('.iframe-container');
    if (!container) return; // Si no hay container, no hacemos nada

    // 1. Botón "Siguiente"
    const nextBtn = document.createElement('button');
    nextBtn.id = 'manualNextBtn';
    nextBtn.className = 'next-episode-btn';
    nextBtn.innerHTML = 'Siguiente'; 
    nextBtn.onclick = startNextEpisodeSequence; 
    container.appendChild(nextBtn);

    // 2. Overlay
    const overlay = document.createElement('div');
    overlay.id = 'countdownOverlay';
    overlay.className = 'countdown-overlay';
    overlay.innerHTML = `
        <div class="countdown-content">
            <h3>Siguiente Capítulo en</h3>
            <div id="countdownTimer" class="countdown-timer">5</div>
            <div id="nextEpName" class="episode-name">Cargando...</div>
            <div class="countdown-actions">
                <button class="countdown-btn btn-cancel" onclick="cancelCountdown()">Cancelar</button>
            </div>
        </div>
    `;
    container.appendChild(overlay);
}

// 2. NAVEGACIÓN TECLADO
document.addEventListener('keydown', (e) => {
    const KEY = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, BACK: 461, ESC: 27 };
    const active = document.activeElement;
    
    // Overlay Activo
    const overlay = document.getElementById('countdownOverlay');
    if (overlay && overlay.style.display === 'flex') {
        if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK) cancelCountdown();
        if (e.keyCode === KEY.ENTER) playNextNow();
        return;
    }

    // Video Activo
    const videoFrame = document.getElementById("VideoFrame");
    if (videoFrame && videoFrame.getAttribute('src')) {
        if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK) {
            closeSeriesIframe();
            e.preventDefault();
            return;
        }
        const nextBtn = document.getElementById('manualNextBtn');
        if (nextBtn && nextBtn.style.display === 'block') {
             if ([KEY.UP, KEY.DOWN, KEY.LEFT, KEY.RIGHT].includes(e.keyCode)) {
                 nextBtn.focus();
             }
        }
        return;
    }

    // Navegación General
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

// 3. LÓGICA CORE DE SERIES
function initSeriesPlayer(seriesData) {
    currentSeriesData = seriesData;
    const selector = document.getElementById('seasonSelect');
    if (!selector) return;
    
    loadSeason(selector.value, seriesData);
    selector.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));
}

function loadSeason(season, data) {
    currentSeasonIndex = parseInt(season);
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
            <label tabindex="0">${ep.name}</label>
        `;
        list.appendChild(li);

        const box = li.querySelector('input');
        const lbl = li.querySelector('label');

        // SYNC FIREBASE
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    const path = `users/${user.uid}/progress/${sID}/S${season}/E${i+1}`;
                    firebase.database().ref(path).on('value', (snap) => {
                        box.checked = !!snap.val();
                        updateVis(box, lbl);
                    });
                    box.onclick = () => firebase.database().ref(path).set(box.checked);
                } else {
                    useLocal(box, lbl, localKey);
                }
            });
        } else {
            useLocal(box, lbl, localKey);
        }

        const play = () => {
            currentEpisodeIndex = i;
            const frame = document.getElementById('VideoFrame');
            const btn = document.getElementById('closeButton');
            const nextBtn = document.getElementById('manualNextBtn');
            const cont = document.querySelector('.iframe-container');
            
            if (ep.link) {
                // AUTOPLAY SETUP
                frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
                let autoLink = ep.link;
                if (autoLink.includes('drive.google.com') && !autoLink.includes('autoplay=1')) {
                    autoLink += (autoLink.includes('?') ? '&' : '?') + 'autoplay=1';
                }
                
                frame.src = autoLink;
                btn.style.display = 'flex';
                
                // Mostrar botón siguiente y ocultar overlay anterior
                if(nextBtn) {
                    nextBtn.style.display = 'block';
                    document.getElementById('countdownOverlay').style.display = 'none';
                }

                frame.focus();
                
                if(!box.checked) box.click(); // Marcar visto

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

// 4. SECUENCIA DE SIGUIENTE CAPÍTULO
function startNextEpisodeSequence() {
    let nextSeason = currentSeasonIndex;
    let nextEpIdx = currentEpisodeIndex + 1;
    let nextEpData = currentSeriesData[nextSeason][nextEpIdx];

    // Salto de temporada
    if (!nextEpData) {
        if (currentSeriesData[nextSeason + 1]) {
            nextSeason++;
            nextEpIdx = 0;
            nextEpData = currentSeriesData[nextSeason][nextEpIdx];
        }
    }

    if (!nextEpData) {
        alert("¡Último capítulo disponible!");
        return;
    }

    // Preparar UI
    const overlay = document.getElementById('countdownOverlay');
    const nameLabel = document.getElementById('nextEpName');
    const timerLabel = document.getElementById('countdownTimer');
    const cancelBtn = overlay.querySelector('.btn-cancel');

    nameLabel.textContent = nextEpData.name;
    timerLabel.textContent = "5";
    overlay.style.display = 'flex';
    cancelBtn.focus();

    // Timer
    let timeLeft = 5;
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        timerLabel.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            playNextNow();
        }
    }, 1000);
}

function playNextNow() {
    if (countdownInterval) clearInterval(countdownInterval);
    document.getElementById('countdownOverlay').style.display = 'none';

    let nextSeason = currentSeasonIndex;
    let nextEpIdx = currentEpisodeIndex + 1;

    // Verificar si hay que cambiar temporada
    if (!currentSeriesData[nextSeason][nextEpIdx]) {
        nextSeason++;
        nextEpIdx = 0;
        const selector = document.getElementById('seasonSelect');
        selector.value = nextSeason;
        loadSeason(nextSeason, currentSeriesData);
    }

    // Trigger del siguiente video
    setTimeout(() => {
        const list = document.getElementById('episodeList');
        const targetLabel = list.children[nextEpIdx].querySelector('label');
        if (targetLabel) targetLabel.click();
    }, 100);
}

function cancelCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    document.getElementById('countdownOverlay').style.display = 'none';
    const nextBtn = document.getElementById('manualNextBtn');
    if(nextBtn) nextBtn.focus();
}

// 5. HELPERS
function useLocal(box, lbl, key) {
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
    const nextBtn = document.getElementById('manualNextBtn');
    
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    frame.src = "";
    btn.style.display = 'none';
    if(nextBtn) nextBtn.style.display = 'none';
    
    const overlay = document.getElementById('countdownOverlay');
    if(overlay) overlay.style.display = 'none';
    
    const first = document.querySelector('.episode-list label');
    if(first) first.focus();
}

// 6. FUNCIONES WEB PRINCIPAL (PELÍCULAS)
function openVideoModal(url) {
    const m = document.getElementById("myModal");
    const f = document.getElementById("videoFrame");
    if(m && f) { 
        f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        let autoLink = url;
        if (autoLink.includes('drive.google.com') && !autoLink.includes('autoplay=1')) {
            autoLink += (autoLink.includes('?') ? '&' : '?') + 'autoplay=1';
        }

        f.src = autoLink; 
        m.style.display = "block"; 
        f.focus(); 
        if (m.requestFullscreen) m.requestFullscreen();
    }
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