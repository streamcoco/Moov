/* =========================================
   LOGIC.JS - OPTIMIZADO PARA TV (WEBOS/TIZEN)
   ========================================= */

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Intentar enfocar el buscador al inicio
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.focus();
    } else {
        // Fallback: enfocar el primer elemento navegable que encuentre
        const firstEl = document.querySelector('[tabindex="0"]');
        if (firstEl) firstEl.focus();
    }
});

// --- 2. MOTOR DE NAVEGACIÓN "SPATIAL" ---
document.addEventListener('keydown', (e) => {
    // Mapeo de teclas estándar y controles remotos
    const KEY = { 
        UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, 
        ENTER: 13, BACK: 461, RETURN: 8, ESC: 27 
    };

    // Detectar si es una tecla de navegación válida
    const isNavKey = [KEY.UP, KEY.DOWN, KEY.LEFT, KEY.RIGHT].includes(e.keyCode);
    
    // Si hay un modal abierto, interceptar todo
    const modal = document.getElementById("myModal");
    const iframeSeries = document.getElementById('VideoFrame');
    const isModalOpen = (modal && modal.style.display === "block") || (iframeSeries && iframeSeries.getAttribute('src'));

    // CERRAR REPRODUCTORES (ESC o VOLVER)
    if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK || e.keyCode === KEY.RETURN || e.key === 'Escape') {
        e.preventDefault();
        closeVideoModal();
        closeSeriesIframe();
        return;
    }

    // Si el video está activo, no hacemos navegación de grilla, dejamos al navegador del TV controlar el player
    if (isModalOpen) { 
        return; 
    }

    // Si no es tecla de navegación ni enter, salir
    if (!isNavKey && e.keyCode !== KEY.ENTER) return;

    const active = document.activeElement;

    // A) NAVEGACIÓN EN BUSCADOR (INPUT)
    if (active.tagName === 'INPUT') {
        if (e.keyCode === KEY.DOWN || e.keyCode === KEY.ENTER) {
            e.preventDefault();
            // Saltar a la primera lista de películas disponible
            jumpToFirstList();
        }
        return; 
    }

    // B) NAVEGACIÓN EN GRILLA (Listas y Botones)
    if (isNavKey) {
        e.preventDefault(); // ESTO ES CRUCIAL PARA EVITAR QUE APAREZCA EL CURSOR MOUSE
        
        switch (e.keyCode) {
            case KEY.RIGHT:
                moveHorizontal(active, 1);
                break;
            case KEY.LEFT:
                moveHorizontal(active, -1);
                break;
            case KEY.UP:
                moveVertical(active, -1);
                break;
            case KEY.DOWN:
                moveVertical(active, 1);
                break;
        }
    } else if (e.keyCode === KEY.ENTER) {
        // Forzar clic en elementos que no sean enlaces nativos
        if (active.tagName !== 'A') {
            active.click();
        }
    }
});


// --- 3. FUNCIONES DE MOVIMIENTO (CORE) ---

function focusElement(el) {
    if (el) {
        el.focus();
        // Scroll optimizado para TV: 'nearest' evita saltos verticales bruscos al mover horizontalmente
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

function moveHorizontal(current, direction) {
    // Identificar el contenedor padre inmediato (UL o LI padre)
    // Buscamos el contexto de lista horizontal
    const listContainer = current.closest('ul') || current.closest('.episode-list');
    
    if (listContainer) {
        // Obtener todos los elementos enfocables dentro de ESTA lista
        const items = Array.from(listContainer.querySelectorAll('[tabindex="0"]:not([style*="display: none"])'));
        const currentIndex = items.indexOf(current);

        if (currentIndex !== -1) {
            const nextIndex = currentIndex + direction;
            if (nextIndex >= 0 && nextIndex < items.length) {
                focusElement(items[nextIndex]);
            }
        }
    } else {
        // Caso especial: Botones sueltos (Back arrow, select)
        // Si estamos en back arrow y vamos a la derecha -> Season Select
        if (current.classList.contains('back-arrow') && direction > 0) {
            const seasonSelect = document.getElementById('seasonSelect');
            if (seasonSelect) focusElement(seasonSelect);
        }
        // Si estamos en Season Select y vamos a la izquierda -> Back Arrow
        if (current.id === 'seasonSelect' && direction < 0) {
            const backBtn = document.querySelector('.back-arrow');
            if (backBtn) focusElement(backBtn);
        }
    }
}

function moveVertical(current, direction) {
    // Definir las "Zonas" navegables verticalmente
    // 1. Buscador / Botón Volver (Top)
    // 2. Selectores (Season Select)
    // 3. Listas de Películas / Series (ULs)
    
    // Estrategia: Buscar el siguiente contenedor mayor
    
    // Si vamos hacia ABAJO
    if (direction > 0) {
        // Caso especial: De Botón Volver -> Selector o Lista
        if (current.classList.contains('back-arrow')) {
            const seasonSelect = document.getElementById('seasonSelect');
            if (seasonSelect) return focusElement(seasonSelect);
            else return jumpToFirstList();
        }
        
        // Caso especial: De Selector -> Lista de episodios
        if (current.id === 'seasonSelect') {
            const firstEp = document.querySelector('.episode-list label');
            if (firstEp) return focusElement(firstEp);
        }

        // Navegación general entre listas (ULs)
        const currentUl = current.closest('ul');
        if (currentUl) {
            const allLists = Array.from(document.querySelectorAll('ul:not([style*="display: none"])'));
            const currentIndex = allLists.indexOf(currentUl);
            
            if (currentIndex !== -1 && currentIndex < allLists.length - 1) {
                // Ir a la siguiente lista
                const nextList = allLists[currentIndex + 1];
                // Enfocar el primer elemento visible de la siguiente lista
                const target = nextList.querySelector('[tabindex="0"]');
                if (target) focusElement(target);
            }
        }
    } 
    // Si vamos hacia ARRIBA
    else {
        // Caso especial: De lista de episodios -> Selector
        if (current.closest('.episode-list')) {
            const currentUl = current.closest('ul');
            // Si es el primer elemento, subir al selector
            const items = Array.from(currentUl.querySelectorAll('[tabindex="0"]'));
            if (items.indexOf(current) === 0 || direction === -1) { // Simplificado: siempre subir
                const seasonSelect = document.getElementById('seasonSelect');
                if (seasonSelect) return focusElement(seasonSelect);
            }
        }

        // De Selector -> Botón Volver
        if (current.id === 'seasonSelect') {
            const backBtn = document.querySelector('.back-arrow');
            if (backBtn) return focusElement(backBtn);
        }

        // Navegación general entre listas
        const currentUl = current.closest('ul');
        if (currentUl) {
            const allLists = Array.from(document.querySelectorAll('ul:not([style*="display: none"])'));
            const currentIndex = allLists.indexOf(currentUl);

            if (currentIndex > 0) {
                // Ir a la lista anterior
                const prevList = allLists[currentIndex - 1];
                const target = prevList.querySelector('[tabindex="0"]');
                if (target) focusElement(target);
            } else {
                // Estamos en la primera lista, subir al Buscador
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                     // Si no hay buscador (ej. series), subir al botón volver
                     const backBtn = document.querySelector('.back-arrow');
                     if (backBtn) focusElement(backBtn);
                }
            }
        }
    }
}

function jumpToFirstList() {
    // Buscar la primera imagen o elemento de lista disponible
    const firstList = document.querySelector('ul');
    if (firstList) {
        const target = firstList.querySelector('[tabindex="0"]');
        if (target) focusElement(target);
    }
}


// --- 4. REPRODUCTOR Y UTILIDADES (Mantenido intacto funcionalidad) ---

function openVideoModal(url) {
    if (!url) return;
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    
    iframe.src = url;
    modal.style.display = "block";
    iframe.focus();

    if (modal.requestFullscreen) modal.requestFullscreen();
    else if (modal.webkitRequestFullscreen) modal.webkitRequestFullscreen(); 
    else if (modal.msRequestFullscreen) modal.msRequestFullscreen();
}

function closeVideoModal() {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
    }
    
    iframe.src = "";
    modal.style.display = "none";
    
    // Recuperar foco en la lista (importante para no perder navegación)
    const activeSlide = document.querySelector('.movie-img'); 
    if(activeSlide) focusElement(activeSlide);
}

function filterMovies() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const images = document.querySelectorAll('.movie-img');
    images.forEach(img => {
        const title = img.alt.toLowerCase();
        // Manejo para LI padres
        if (img.parentElement.tagName === 'LI' || img.parentElement.tagName === 'A') {
            const container = img.closest('li');
            container.style.display = title.includes(query) ? 'block' : 'none';
        } else {
            img.style.display = title.includes(query) ? 'block' : 'none';
        }
    });
}

// --- 5. LOGICA DE SERIES (Mantenido) ---

function initSeriesPlayer(seriesData) {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect) return;
    
    loadSeason(seasonSelect.value, seriesData);
    seasonSelect.addEventListener('change', (e) => loadSeason(e.target.value, seriesData));
}

function loadSeason(seasonNum, data) {
    const list = document.getElementById('episodeList');
    list.innerHTML = '';
    const episodes = data[seasonNum];
    if (!episodes) return;

    episodes.forEach((ep, index) => {
        const li = document.createElement('li');
        const uniqueId = `${window.CURRENT_SERIES_ID || 'series'}-S${seasonNum}-E${index+1}`;
        const isChecked = localStorage.getItem(uniqueId) === 'true';

        li.innerHTML = `
            <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
            <label tabindex="0" data-link="${ep.link}" for="${uniqueId}">
                ${ep.name}
            </label>
        `;
        list.appendChild(li);

        li.querySelector('input').addEventListener('change', function() {
            localStorage.setItem(uniqueId, this.checked);
        });

        const label = li.querySelector('label');
        const playEpisode = () => {
            const iframeContainer = document.querySelector('.iframe-container');
            const iframe = document.getElementById('VideoFrame');
            const closeBtn = document.getElementById('closeButton');
            
            if (ep.link) {
                iframe.src = ep.link;
                closeBtn.style.display = 'flex';
                iframe.focus();
                if (iframeContainer.requestFullscreen) iframeContainer.requestFullscreen();
                else if (iframeContainer.webkitRequestFullscreen) iframeContainer.webkitRequestFullscreen();
            } else { 
                alert("Enlace no disponible"); 
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
        document.exitFullscreen().catch(err => console.log(err));
    }

    iframe.src = "";
    closeBtn.style.display = 'none';
    
    // Devolver foco a la lista de episodios
    const firstEpisode = document.querySelector('.episode-list label');
    if(firstEpisode) focusElement(firstEpisode);
}

// Bloqueo clic derecho
document.addEventListener('contextmenu', event => event.preventDefault());
