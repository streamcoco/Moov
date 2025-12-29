/* =========================================
   LOGIC.JS - AUTO-RESUME & SMART PLAYER
   ========================================= */

let currentSeriesData = null;
let currentSeasonIndex = null;
let currentEpisodeIndex = null;
let countdownInterval = null;

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    
    // A. LIMPIEZA DE UI (Seguridad)
    const isSeriesPage = document.querySelector('.back-arrow') || document.getElementById('seasonSelect');
    const logoutContainer = document.querySelector('.logout-container');
    if (isSeriesPage && logoutContainer) logoutContainer.remove(); 

    // B. ENFOQUE
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) seasonSelect.focus();

    // C. UI SERIES
    injectNextEpisodeUI();
});

// --- MENÚ TABS (Principal) ---
function switchCategory(targetId, element) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    document.querySelectorAll('.category-section').forEach(sec => sec.classList.remove('active-section'));
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) setTimeout(() => targetSection.classList.add('active-section'), 50);
}

// --- LÓGICA DE SERIES (CON AUTO-RESUME) ---
function initSeriesPlayer(seriesData) {
    currentSeriesData = seriesData;
    const selector = document.getElementById('seasonSelect');
    if (!selector) return;
    
    // Configurar listener del selector manual
    selector.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));

    // --- MAGIA: AUTO-RESUME (Continuar Viendo) ---
    // Esperamos a ver si hay usuario para cargar su progreso exacto
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                resumeFromLastPoint(user.uid, seriesData);
            } else {
                // Si no hay usuario (modo local), cargamos temp 1 cap 1 por defecto
                loadSeason("1", seriesData); 
                // Opcional: Podrías implementar resume con localStorage aquí si quisieras
                loadEpisodeDirectly(1, 0); 
            }
        });
    } else {
        loadSeason("1", seriesData);
    }
}

// Función que busca dónde te quedaste
function resumeFromLastPoint(uid, seriesData) {
    const sID = window.CURRENT_SERIES_ID || 'TEST_SERIES';
    const path = `users/${uid}/progress/${sID}`;

    firebase.database().ref(path).once('value').then((snapshot) => {
        const progress = snapshot.val() || {};
        
        let targetSeason = "1";
        let targetEpisodeIndex = 0;
        let found = false;

        // Iteramos temporadas en orden (1, 2, 3...)
        const seasons = Object.keys(seriesData).sort((a, b) => a - b);

        for (let s of seasons) {
            const episodes = seriesData[s];
            for (let i = 0; i < episodes.length; i++) {
                const epNum = i + 1;
                // Verificamos si este capitulo YA fue visto
                const isSeen = progress[`S${s}`] && progress[`S${s}`][`E${epNum}`];
                
                if (!isSeen) {
                    // ¡Encontramos el primero NO visto! Aquí nos quedamos.
                    targetSeason = s;
                    targetEpisodeIndex = i;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        // Si se vio TODO, volvemos al último capítulo disponible o al principio
        if (!found && seasons.length > 0) {
            // Opción: Quedarse en el último
            const lastS = seasons[seasons.length - 1];
            targetSeason = lastS;
            targetEpisodeIndex = seriesData[lastS].length - 1;
        }

        // 1. Ajustar el selector visualmente
        const selector = document.getElementById('seasonSelect');
        if(selector) selector.value = targetSeason;

        // 2. Cargar la lista de esa temporada
        loadSeason(targetSeason, seriesData);

        // 3. CARGAR EL VIDEO (Llenar la caja negra)
        loadEpisodeDirectly(targetSeason, targetEpisodeIndex);

    });
}

// Helper para disparar un episodio específico sin clic manual
function loadEpisodeDirectly(season, index) {
    // Pequeño timeout para asegurar que la lista DOM se generó
    setTimeout(() => {
        if (!currentSeriesData || !currentSeriesData[season]) return;
        const epData = currentSeriesData[season][index];
        if (epData) {
            playEpisodeInternal(epData, index);
            
            // Opcional: Hacer scroll en la lista hasta el capitulo activo
            const list = document.getElementById('episodeList');
            if(list && list.children[index]) {
                list.children[index].scrollIntoView({behavior: "smooth", block: "center"});
            }
        }
    }, 300);
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

        // SYNC
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

        // Clic manual
        const play = () => {
            playEpisodeInternal(ep, i);
            if(!box.checked) box.click(); // Marcar al hacer clic manual
        };

        lbl.onclick = play;
        lbl.onkeydown = (e) => { 
            if(e.key === 'Enter') play();
            if(e.key === ' ') { e.preventDefault(); box.click(); }
        };
    });
}

// Función Interna de Reproducción (Reutilizable)
function playEpisodeInternal(ep, index) {
    currentEpisodeIndex = index;
    const frame = document.getElementById('VideoFrame');
    const btn = document.getElementById('closeButton');
    const nextBtn = document.getElementById('manualNextBtn');
    const cont = document.querySelector('.iframe-container');
    
    if (ep.link) {
        frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        
        // Autoplay Logic
        let autoLink = ep.link;
        if (autoLink.includes('drive.google.com') && !autoLink.includes('autoplay=1')) {
            autoLink += (autoLink.includes('?') ? '&' : '?') + 'autoplay=1';
        }
        
        frame.src = autoLink;
        btn.style.display = 'flex';
        
        if(nextBtn) {
            nextBtn.style.display = 'block';
            document.getElementById('countdownOverlay').style.display = 'none';
        }

        frame.focus();
        
        // Nota: Al cargar automáticamente, NO marcamos como visto todavía (checkbox) 
        // para no marcar caps accidentalmente solo por entrar a la pagina.
        // Solo marcamos "visto" si el usuario hace clic manual o pasa al siguiente.

        if (cont.requestFullscreen) cont.requestFullscreen().catch(e=>{});
    } else { alert("No disponible"); }
}


// --- SIGUIENTE CAPÍTULO ---
function startNextEpisodeSequence() {
    let nextSeason = currentSeasonIndex;
    let nextEpIdx = currentEpisodeIndex + 1;
    let nextEpData = currentSeriesData[nextSeason][nextEpIdx];

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

    const overlay = document.getElementById('countdownOverlay');
    const nameLabel = document.getElementById('nextEpName');
    const timerLabel = document.getElementById('countdownTimer');
    const cancelBtn = overlay.querySelector('.btn-cancel');

    nameLabel.textContent = nextEpData.name;
    timerLabel.textContent = "5";
    overlay.style.display = 'flex';
    cancelBtn.focus();

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

    if (!currentSeriesData[nextSeason][nextEpIdx]) {
        nextSeason++;
        nextEpIdx = 0;
        const selector = document.getElementById('seasonSelect');
        selector.value = nextSeason;
        loadSeason(nextSeason, currentSeriesData);
    }

    // Al pasar al siguiente automáticamente, SÍ marcamos el anterior como visto
    // (Lógica opcional, pero recomendada)
    
    // Simular click para cargar y marcar
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

// UI HELPERS
function injectNextEpisodeUI() {
    const container = document.querySelector('.iframe-container');
    if (!container) return; 

    const nextBtn = document.createElement('button');
    nextBtn.id = 'manualNextBtn';
    nextBtn.className = 'next-episode-btn';
    nextBtn.innerHTML = 'Siguiente'; 
    nextBtn.onclick = startNextEpisodeSequence; 
    container.appendChild(nextBtn);

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
    
    // Enfocar el capítulo actual en la lista al salir
    const list = document.getElementById('episodeList');
    if(currentEpisodeIndex !== null && list && list.children[currentEpisodeIndex]) {
        list.children[currentEpisodeIndex].querySelector('label').focus();
    }
}

// WEB PRINCIPAL
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
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    if(m) { f.src = ""; m.style.display = "none"; }
}
function filterMovies() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.movie-img').forEach(img => {
        img.closest('li').style.display = img.alt.toLowerCase().includes(q) ? 'block' : 'none';
    });
}