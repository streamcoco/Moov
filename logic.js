/* =========================================
   LOGIC.JS - MOOV (Sincronización Real + TV)
   ========================================= */

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en web.html (Buscador)
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    // Si estamos en una serie (Botón volver o Selector)
    const backBtn = document.querySelector('.back-arrow');
    const seasonSelect = document.getElementById('seasonSelect');
    
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
    
    // Detectar si hay video reproduciéndose
    const modal = document.getElementById("myModal");
    const videoFrame = document.getElementById("VideoFrame");
    const isVideoPlaying = (modal && modal.style.display === "block") || (videoFrame && videoFrame.getAttribute('src') !== "");

    // Salir del video
    if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK) {
        e.preventDefault();
        closeVideoModal();
        closeSeriesIframe();
        return;
    }

    if (isVideoPlaying) return; // Si hay video, no mover foco

    // Navegación TV
    const isNavKey = [KEY.UP, KEY.DOWN, KEY.LEFT, KEY.RIGHT].includes(e.keyCode);
    if (isNavKey) {
        e.preventDefault(); 
        if (e.keyCode === KEY.DOWN) moveFocus(1);
        if (e.keyCode === KEY.UP) moveFocus(-1);
        // Flecha derecha marca el checkbox si estamos en él
        if (e.keyCode === KEY.RIGHT && active.tagName === 'INPUT') active.click(); 
    } else if (e.keyCode === KEY.ENTER) {
        if(active.tagName !== 'A') active.click();
    }
});

function moveFocus(direction) {
    const focusable = Array.from(document.querySelectorAll('a, button, input, select, [tabindex="0"]'))
                           .filter(el => el.offsetParent !== null); // Solo elementos visibles
    const index = focusable.indexOf(document.activeElement);
    let nextIndex = index + direction;
    
    if (nextIndex >= 0 && nextIndex < focusable.length) {
        focusable[nextIndex].focus();
        focusable[nextIndex].scrollIntoView({block: "center", behavior: "smooth"});
    }
}


// --- 3. LÓGICA DE SERIES (SINCRONIZACIÓN EN TIEMPO REAL) ---

function initSeriesPlayer(seriesData) {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect) return;
    
    // Cargar temporada inicial
    loadSeason(seasonSelect.value, seriesData);
    
    // Al cambiar de temporada en el selector
    seasonSelect.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));
}

function loadSeason(seasonNum, data) {
    const list = document.getElementById('episodeList');
    list.innerHTML = ''; // Limpiar lista visual
    const episodes = data[seasonNum];
    if (!episodes) return;

    const seriesID = window.CURRENT_SERIES_ID || 'UNKNOWN_SERIES';

    episodes.forEach((ep, index) => {
        const li = document.createElement('li');
        const localId = `${seriesID}-S${seasonNum}-E${index+1}`; // ID para LocalStorage
        
        li.innerHTML = `
            <input type="checkbox" id="check-${index}" tabindex="-1"> 
            <label tabindex="0" data-link="${ep.link}">
                ${ep.name}
            </label>
        `;
        list.appendChild(li);

        const checkbox = li.querySelector('input');
        const label = li.querySelector('label');

        // --- EL CEREBRO DE LA SINCRONIZACIÓN ---
        // Usamos 'onAuthStateChanged' para esperar a que Firebase cargue el usuario
        // sin importar cuánto tarde el internet.
        
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    // === MODO NUBE (Usuario Conectado) ===
                    // console.log("Usuario detectado, usando Nube para:", seriesID);
                    
                    const dbPath = `users/${user.uid}/series_progress/${seriesID}/S${seasonNum}/E${index+1}`;

                    // 1. ESCUCHAR CAMBIOS (Lectura en tiempo real)
                    // Si marcas en el celular, se marca solo en la TV al instante
                    firebase.database().ref(dbPath).on('value', (snapshot) => {
                        const val = snapshot.val();
                        if (val !== null) { // Si hay dato en nube
                            checkbox.checked = val;
                            updateStyle(checkbox, label);
                        }
                    });

                    // 2. GUARDAR CAMBIOS (Escritura)
                    checkbox.onclick = function() {
                        firebase.database().ref(dbPath).set(this.checked);
                    };

                } else {
                    // === MODO LOCAL (Sin usuario / Falló Internet) ===
                    useLocalStorage(checkbox, label, localId);
                }
            });
        } else {
            // Si Firebase no cargó por alguna razón, usar local
            useLocalStorage(checkbox, label, localId);
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
                
                // Marcar visto automáticamente al dar Play
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    // Disparar evento para que se guarde (Nube o Local)
                    if(checkbox.onclick) checkbox.onclick();
                    updateStyle(checkbox, label);
                }
                
                if (container.requestFullscreen) container.requestFullscreen();
                else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            } else { 
                alert("Próximamente"); 
            }
        };

        label.addEventListener('click', playEpisode);
        label.addEventListener('keydown', (e) => { if (e.key === 'Enter') playEpisode(); });
        
        // Tecla Espacio para marcar/desmarcar manual
        label.addEventListener('keydown', (e) => { 
            if (e.key === ' ') { 
                e.preventDefault();
                checkbox.click(); // Esto disparará el onclick definido arriba
            }
        });
    });
}

// Función auxiliar para Modo Local
function useLocalStorage(checkbox, label, localId) {
    // Cargar
    const isChecked = localStorage.getItem(localId) === 'true';
    checkbox.checked = isChecked;
    updateStyle(checkbox, label);

    // Guardar
    checkbox.onclick = function() {
        localStorage.setItem(localId, this.checked);
        updateStyle(checkbox, label);
    };
}

// Actualizar estilo visual (tachado)
function updateStyle(checkbox, label) {
    label.style.textDecoration = checkbox.checked ? "line-through" : "none";
    label.style.opacity = checkbox.checked ? "0.6" : "1";
}

// Cerrar reproductor
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

// --- FUNCIONES HEREDADAS PARA WEB PRINCIPAL (Películas) ---
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
