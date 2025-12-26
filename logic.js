/* =========================================
   LOGIC.JS - CEREBRO FINAL (TV + FULLSCREEN + NAV)
   ========================================= */

// --- 1. INICIALIZACIÓN Y CONFIGURACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en la web principal, enfocar el buscador
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.focus();
    }
    
    // Si estamos en una serie, enfocar el botón "Volver" o el selector
    const backBtn = document.querySelector('.back-arrow');
    const seasonSelect = document.getElementById('seasonSelect');
    
    if (backBtn) {
        backBtn.focus(); // Enfocar el botón volver primero para facilidad
    } else if (seasonSelect) {
        seasonSelect.focus();
    }
});

// --- 2. MOTOR DE NAVEGACIÓN (FLECHAS DEL CONTROL) ---
document.addEventListener('keydown', (e) => {
    // Códigos de teclas estándar y de TV (WebOS/Tizen)
    const KEY = { 
        UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, 
        ENTER: 13, BACK: 461, ESC: 27 
    };

    const active = document.activeElement;

    // A) Si estamos escribiendo en el Buscador
    if (active.tagName === 'INPUT') {
        if (e.keyCode === KEY.DOWN) {
            e.preventDefault();
            // Bajar a la primera imagen disponible
            const firstImg = document.querySelector('.movie-img');
            if (firstImg) focusElement(firstImg);
        }
        return; 
    }

    // B) Navegación General (Portadas, Botones, Selects, Episodios)
    // Detectamos cualquier elemento navegable (tabindex="0")
    if (active.getAttribute('tabindex') === "0" || active.tagName === 'SELECT' || active.tagName === 'A') {
        
        if (e.keyCode === KEY.RIGHT) {
            e.preventDefault();
            focusNextElement(active);
        } else if (e.keyCode === KEY.LEFT) {
            e.preventDefault();
            focusPrevElement(active);
        } else if (e.keyCode === KEY.UP) {
            e.preventDefault();
            focusUpList(active);
        } else if (e.keyCode === KEY.DOWN) {
            e.preventDefault();
            focusDownList(active);
        } else if (e.key === 'Enter') {
            // Si es un enlace o botón, dejar que el navegador actúe. 
            // Si es una label de episodio o imagen, forzar click.
            if(active.tagName !== 'A') {
                active.click();
            }
        }
    }

    // C) Cerrar videos con ESC o VOLVER
    if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK || e.key === 'Escape') {
        closeVideoModal();
        closeSeriesIframe();
    }
});


// --- 3. FUNCIONES DE MOVIMIENTO INTELIGENTE ---

function focusElement(el) {
    if (el) {
        el.focus();
        // Centrar suavemente en la pantalla (Vital para TV)
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

function focusNextElement(current) {
    // 1. Si estamos en una lista de items (LI)
    const parentLi = current.closest('li');
    if (parentLi && parentLi.nextElementSibling) {
        const nextItem = parentLi.nextElementSibling.querySelector('[tabindex="0"]');
        if (nextItem) return focusElement(nextItem);
    }
    // 2. Si estamos en la barra superior (Botón volver -> Título -> Nada)
    if (current.classList.contains('back-arrow')) {
        // No hay nada a la derecha en la top-bar navegable, bajamos al selector
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) return focusElement(seasonSelect);
    }
}

function focusPrevElement(current) {
    const parentLi = current.closest('li');
    if (parentLi && parentLi.previousElementSibling) {
        const prevItem = parentLi.previousElementSibling.querySelector('[tabindex="0"]');
        if (prevItem) return focusElement(prevItem);
    }
}

function focusDownList(current) {
    // Si estamos en el botón "Volver", bajar al selector de temporada
    if (current.classList.contains('back-arrow')) {
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) return focusElement(seasonSelect);
    }

    // Si estamos en el selector de temporada, bajar a la lista de episodios
    if (current.id === 'seasonSelect') {
        const firstEp = document.querySelector('.episode-list li label');
        if (firstEp) return focusElement(firstEp);
    }

    // Lógica general de listas (Web Principal)
    const currentList = current.closest('ul');
    if (currentList) {
        const allLists = Array.from(document.querySelectorAll('ul'));
        const currentIndex = allLists.indexOf(currentList);
        
        // Saltar a la siguiente lista disponible
        if (currentIndex !== -1 && currentIndex < allLists.length - 1) {
            const nextList = allLists[currentIndex + 1];
            const target = nextList.querySelector('[tabindex="0"]');
            if (target) focusElement(target);
        }
    }
}

function focusUpList(current) {
    // Si estamos en la lista de episodios, subir al selector
    if (current.closest('.episode-list')) {
        const seasonSelect = document.getElementById('seasonSelect');
        if (seasonSelect) return focusElement(seasonSelect);
    }

    // Si estamos en el selector, subir al botón "Volver"
    if (current.id === 'seasonSelect') {
        const backBtn = document.querySelector('.back-arrow');
        if (backBtn) return focusElement(backBtn);
    }

    // Lógica general de listas (Web Principal)
    const currentList = current.closest('ul');
    if (currentList) {
        const allLists = Array.from(document.querySelectorAll('ul'));
        const currentIndex = allLists.indexOf(currentList);

        if (currentIndex > 0) {
            // Ir a la lista anterior
            const prevList = allLists[currentIndex - 1];
            const target = prevList.querySelector('[tabindex="0"]');
            if (target) focusElement(target);
        } else {
            // Si es la primera lista, subir al buscador
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                focusElement(searchInput);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }
}


// --- 4. REPRODUCTOR DE PELÍCULAS (WEB.HTML) ---

function openVideoModal(url) {
    if (!url) return;
    const modal = document.getElementById("myModal"); // El contenedor principal
    const iframe = document.getElementById("videoFrame");
    
    iframe.src = url;
    modal.style.display = "block";
    
    // Enfocamos el iframe para que reciba las teclas
    iframe.focus();

    // PANTALLA COMPLETA AL CONTENEDOR (Para que la X se vea encima)
    if (modal.requestFullscreen) modal.requestFullscreen();
    else if (modal.webkitRequestFullscreen) modal.webkitRequestFullscreen(); // Safari/Chrome
    else if (modal.msRequestFullscreen) modal.msRequestFullscreen(); // IE/Edge
}

function closeVideoModal() {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    
    // Salir de pantalla completa si está activa
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
    
    iframe.src = "";
    modal.style.display = "none";
    
    // Devolver foco a la web
    const firstImg = document.querySelector('.movie-img');
    if(firstImg) focusElement(firstImg);
}

// Filtro de búsqueda
function filterMovies() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const images = document.querySelectorAll('.movie-img');
    images.forEach(img => {
        const title = img.alt.toLowerCase();
        // Ocultar el LI padre para que la lista se reacomode
        if (img.parentElement.tagName === 'LI') {
            img.parentElement.style.display = title.includes(query) ? 'block' : 'none';
        } else {
            img.style.display = title.includes(query) ? 'block' : 'none';
        }
    });
}


// --- 5. REPRODUCTOR DE SERIES (GOT, PB, ETC) ---

function initSeriesPlayer(seriesData) {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect) return;
    
    // Cargar temporada inicial
    loadSeason(seasonSelect.value, seriesData);
    
    // Evento cambio de temporada
    seasonSelect.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));
}

function loadSeason(seasonNum, data) {
    const list = document.getElementById('episodeList');
    list.innerHTML = '';
    const episodes = data[seasonNum];
    if (!episodes) return;

    episodes.forEach((ep, index) => {
        const li = document.createElement('li');
        // ID único para guardar progreso
        const uniqueId = `${window.CURRENT_SERIES_ID}-S${seasonNum}-E${index+1}`;
        const isChecked = localStorage.getItem(uniqueId) === 'true';

        li.innerHTML = `
            <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
            <label tabindex="0" data-link="${ep.link}" for="${uniqueId}">
                ${ep.name}
            </label>
        `;
        list.appendChild(li);

        // Guardar check
        li.querySelector('input').addEventListener('change', function() {
            localStorage.setItem(uniqueId, this.checked);
        });

        // Reproducir al hacer click o enter
        const label = li.querySelector('label');
        
        const playEpisode = () => {
            const iframeContainer = document.querySelector('.iframe-container'); // Contenedor
            const iframe = document.getElementById('VideoFrame');
            const closeBtn = document.getElementById('closeButton');
            
            if (ep.link) {
                iframe.src = ep.link;
                closeBtn.style.display = 'flex'; // Flex para centrar la X
                iframe.focus();
                
                // PANTALLA COMPLETA AL CONTENEDOR (Incluye botón X)
                if (iframeContainer.requestFullscreen) iframeContainer.requestFullscreen();
                else if (iframeContainer.webkitRequestFullscreen) iframeContainer.webkitRequestFullscreen();
                
            } else { 
                alert("Enlace no disponible aún"); 
            }
        };

        label.addEventListener('click', playEpisode);
        label.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') playEpisode(); 
        });
    });
}

function closeSeriesIframe() {
    const iframe = document.getElementById('VideoFrame');
    const closeBtn = document.getElementById('closeButton');
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

    iframe.src = "";
    closeBtn.style.display = 'none';
    
    // Devolver foco a la lista
    const firstEpisode = document.querySelector('.episode-list label');
    if(firstEpisode) focusElement(firstEpisode);
}

// Bloqueo clic derecho global
document.addEventListener('contextmenu', event => event.preventDefault());