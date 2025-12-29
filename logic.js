/* =========================================
   LOGIC.JS - MOOV (Firebase Sync + TV Nav)
   ========================================= */

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en web.html
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    // Si estamos en una serie (GAeng.html, etc)
    const backBtn = document.querySelector('.back-arrow');
    const seasonSelect = document.getElementById('seasonSelect');
    
    // Enfocar elementos clave al entrar
    if (backBtn) {
        backBtn.focus();
    } else if (seasonSelect) {
        seasonSelect.focus();
    }
});

// --- 2. MOTOR DE NAVEGACIÓN (FLECHAS) ---
document.addEventListener('keydown', (e) => {
    const KEY = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, BACK: 461, ESC: 27 };
    const active = document.activeElement;
    
    // Si hay un modal de video activo, ignorar navegación (dejar al browser)
    const modal = document.getElementById("myModal");
    const videoFrame = document.getElementById("VideoFrame");
    const isVideoPlaying = (modal && modal.style.display === "block") || (videoFrame && videoFrame.getAttribute('src') !== "");

    // Salir del video con ESC o BACK
    if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK) {
        e.preventDefault();
        closeVideoModal();
        closeSeriesIframe();
        return;
    }

    if (isVideoPlaying) return;

    // Navegación TV (Spatial)
    const isNavKey = [KEY.UP, KEY.DOWN, KEY.LEFT, KEY.RIGHT].includes(e.keyCode);
    if (isNavKey) {
        e.preventDefault(); 
        if (e.keyCode === KEY.DOWN) moveFocus(1);
        if (e.keyCode === KEY.UP) moveFocus(-1);
        if (e.keyCode === KEY.RIGHT && active.tagName === 'INPUT') active.click(); // Check con flecha
    } else if (e.keyCode === KEY.ENTER) {
        if(active.tagName !== 'A') active.click();
    }
});

// Función auxiliar para mover foco verticalmente
function moveFocus(direction) {
    const focusable = Array.from(document.querySelectorAll('a, button, input, select, [tabindex="0"]'))
                           .filter(el => el.offsetParent !== null); // Solo visibles
    const index = focusable.indexOf(document.activeElement);
    let nextIndex = index + direction;
    
    if (nextIndex >= 0 && nextIndex < focusable.length) {
        focusable[nextIndex].focus();
        focusable[nextIndex].scrollIntoView({block: "center", behavior: "smooth"});
    }
}


// --- 3. LOGICA DE SERIES CON FIREBASE (Híbrida) ---

function initSeriesPlayer(seriesData) {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect) return;
    
    // Cargar temporada inicial
    loadSeason(seasonSelect.value, seriesData);
    
    // Escuchar cambios de temporada
    seasonSelect.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));
}

function loadSeason(seasonNum, data) {
    const list = document.getElementById('episodeList');
    list.innerHTML = ''; // Limpiar lista
    const episodes = data[seasonNum];
    if (!episodes) return;

    // ID de la serie (definido en HTML)
    const seriesID = window.CURRENT_SERIES_ID || 'UNKNOWN_SERIES';
    
    // Verificar usuario de Firebase
    const user = (typeof firebase !== 'undefined' && firebase.auth().currentUser) ? firebase.auth().currentUser : null;

    episodes.forEach((ep, index) => {
        const li = document.createElement('li');
        
        // ID Único para LocalStorage (Respaldo)
        const localId = `${seriesID}-S${seasonNum}-E${index+1}`;
        
        // Estructura HTML
        li.innerHTML = `
            <input type="checkbox" id="check-${index}" tabindex="-1"> 
            <label tabindex="0" data-link="${ep.link}">
                ${ep.name}
            </label>
        `;
        list.appendChild(li);

        const checkbox = li.querySelector('input');
        const label = li.querySelector('label');

        // --- SINCRONIZACIÓN ---
        
        if (user) {
            // A) MODO NUBE (Firebase)
            const dbPath = `users/${user.uid}/series_progress/${seriesID}/S${seasonNum}/E${index+1}`;
            
            // Leer estado inicial
            firebase.database().ref(dbPath).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    checkbox.checked = snapshot.val();
                    if(checkbox.checked) label.style.textDecoration = "line-through";
                }
            });

            // Guardar al cambiar
            checkbox.addEventListener('change', () => {
                firebase.database().ref(dbPath).set(checkbox.checked);
                label.style.textDecoration = checkbox.checked ? "line-through" : "none";
            });

        } else {
            // B) MODO LOCAL (LocalStorage)
            const isChecked = localStorage.getItem(localId) === 'true';
            checkbox.checked = isChecked;
            if(isChecked) label.style.textDecoration = "line-through";

            checkbox.addEventListener('change', function() {
                localStorage.setItem(localId, this.checked);
                label.style.textDecoration = this.checked ? "line-through" : "none";
            });
        }

        // --- REPRODUCCIÓN ---
        const playEpisode = () => {
            const iframe = document.getElementById('VideoFrame');
            const closeBtn = document.getElementById('closeButton');
            const container = document.querySelector('.iframe-container');
            
            if (ep.link) {
                iframe.src = ep.link;
                closeBtn.style.display = 'flex';
                iframe.focus();
                
                // Marcar visto al reproducir
                if(!checkbox.checked) checkbox.click(); 
                
                if (container.requestFullscreen) container.requestFullscreen();
                else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            } else { 
                alert("Próximamente"); 
            }
        };

        label.addEventListener('click', playEpisode);
        label.addEventListener('keydown', (e) => { if (e.key === 'Enter') playEpisode(); });
        
        // Marcar con Barra Espaciadora
        label.addEventListener('keydown', (e) => { 
            if (e.key === ' ') { 
                e.preventDefault();
                checkbox.click();
            }
        });
    });
}

function closeSeriesIframe() {
    const iframe = document.getElementById('VideoFrame');
    const closeBtn = document.getElementById('closeButton');
    if (document.fullscreenElement) document.exitFullscreen().catch(e=>{});
    iframe.src = "";
    closeBtn.style.display = 'none';
    
    const activeEp = document.querySelector('.episode-list label');
    if(activeEp) activeEp.focus();
}

// Bloqueo clic derecho
document.addEventListener('contextmenu', event => event.preventDefault());

// Funciones heredadas para la web principal (web.html)
function openVideoModal(url) {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    if(modal && iframe) {
        iframe.src = url;
        modal.style.display = "block";
        iframe.focus();
        if (modal.requestFullscreen) modal.requestFullscreen();
    }
}
function closeVideoModal() {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    if(modal) {
        if (document.fullscreenElement) document.exitFullscreen().catch(e=>{});
        iframe.src = "";
        modal.style.display = "none";
        const img = document.querySelector('.movie-img');
        if(img) img.focus();
    }
}
function filterMovies() {
    const input = document.getElementById('search-input');
    if(!input) return;
    const query = input.value.toLowerCase();
    document.querySelectorAll('.movie-img').forEach(img => {
        const title = img.alt.toLowerCase();
        const li = img.closest('li');
        if(li) li.style.display = title.includes(query) ? 'block' : 'none';
    });
}