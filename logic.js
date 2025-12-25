/* =========================================
   LOGIC.JS - NAVEGACIÓN TV (VERSIÓN CORREGIDA VERTICAL)
   ========================================= */

// --- 1. CONFIGURACIÓN GLOBAL ---
document.addEventListener('DOMContentLoaded', () => {
    // Enfocar buscador al inicio
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();
    
    // Enfocar selector si es una serie
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) seasonSelect.focus();
});


// --- 2. MOTOR DE NAVEGACIÓN (FLECHAS) ---
document.addEventListener('keydown', (e) => {
    const KEY = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, BACK: 461, ESC: 27 };
    const active = document.activeElement;

    // CASO A: Estamos en el Buscador
    if (active.tagName === 'INPUT') {
        if (e.keyCode === KEY.DOWN) {
            e.preventDefault();
            // Ir a la primera imagen de la primera lista
            const firstImg = document.querySelector('.movie-img');
            if (firstImg) focusElement(firstImg);
        }
        return; 
    }

    // CASO B: Estamos en una Carátula, Select o Checkbox
    if (active.classList.contains('movie-img') || active.tagName === 'SELECT' || active.tagName === 'LABEL') {
        
        if (e.keyCode === KEY.RIGHT) {
            e.preventDefault();
            focusNextElement(active);
        } else if (e.keyCode === KEY.LEFT) {
            e.preventDefault();
            focusPrevElement(active);
        } else if (e.keyCode === KEY.UP) {
            e.preventDefault();
            focusUpList(active); // Nueva lógica robusta
        } else if (e.keyCode === KEY.DOWN) {
            e.preventDefault();
            focusDownList(active); // Nueva lógica robusta
        } else if (e.key === 'Enter') {
            active.click();
        }
    }

    // Cerrar con ESC o VOLVER
    if (e.keyCode === KEY.ESC || e.keyCode === KEY.BACK || e.key === 'Escape') {
        closeVideoModal();
        closeSeriesIframe();
    }
});


// --- 3. FUNCIONES DE MOVIMIENTO (CORREGIDAS) ---

function focusElement(el) {
    if (el) {
        el.focus();
        // Centrar elemento en pantalla suavemente
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

function focusNextElement(current) {
    // Buscar siguiente hermano en la misma lista (LI)
    const parentLi = current.closest('li');
    if (parentLi && parentLi.nextElementSibling) {
        const nextItem = parentLi.nextElementSibling.querySelector('[tabindex="0"]');
        if (nextItem) focusElement(nextItem);
    } 
}

function focusPrevElement(current) {
    // Buscar hermano anterior en la misma lista
    const parentLi = current.closest('li');
    if (parentLi && parentLi.previousElementSibling) {
        const prevItem = parentLi.previousElementSibling.querySelector('[tabindex="0"]');
        if (prevItem) focusElement(prevItem);
    }
}

// NUEVO: Salto Vertical Robusto
function focusDownList(current) {
    const currentList = current.closest('ul');
    if (!currentList) return;

    // 1. Obtener TODAS las listas de la web en orden
    // Esto ignora si están dentro de divs o sueltas. Simplemente las busca todas.
    const allLists = Array.from(document.querySelectorAll('ul'));
    const currentIndex = allLists.indexOf(currentList);

    // 2. Si hay una lista siguiente, saltar a su primer elemento
    if (currentIndex !== -1 && currentIndex < allLists.length - 1) {
        const nextList = allLists[currentIndex + 1];
        // Buscar el primer elemento seleccionable de esa lista
        const target = nextList.querySelector('[tabindex="0"]'); 
        if (target) focusElement(target);
    }
}

function focusUpList(current) {
    const currentList = current.closest('ul');
    if (!currentList) return;

    const allLists = Array.from(document.querySelectorAll('ul'));
    const currentIndex = allLists.indexOf(currentList);

    // 1. Si hay una lista anterior, ir a ella
    if (currentIndex > 0) {
        const prevList = allLists[currentIndex - 1];
        const target = prevList.querySelector('[tabindex="0"]');
        if (target) focusElement(target);
    } 
    // 2. Si es la primera lista (index 0), subir al Buscador
    else {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            focusElement(searchInput);
            // Scroll arriba del todo para ver el título
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}


// --- 4. LÓGICA DE VIDEO Y SERIES (SIN CAMBIOS) ---

function openVideoModal(url) {
    if (!url) return;
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    iframe.src = url;
    modal.style.display = "block";
    iframe.focus();
    
    if (iframe.requestFullscreen) iframe.requestFullscreen();
    else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
}

function closeVideoModal() {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    iframe.src = "";
    modal.style.display = "none";
    const firstImg = document.querySelector('.movie-img');
    if(firstImg) firstImg.focus();
}

function filterMovies() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const images = document.querySelectorAll('.movie-img');
    images.forEach(img => {
        const title = img.alt.toLowerCase();
        if (img.parentElement.tagName === 'LI') {
            img.parentElement.style.display = title.includes(query) ? 'block' : 'none';
        } else {
            img.style.display = title.includes(query) ? 'block' : 'none';
        }
    });
}

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
        const uniqueId = `${window.CURRENT_SERIES_ID}-S${seasonNum}-E${index+1}`;
        const isChecked = localStorage.getItem(uniqueId) === 'true';

        li.innerHTML = `
            <input type="checkbox" id="${uniqueId}" ${isChecked ? 'checked' : ''}>
            <label tabindex="0" data-link="${ep.link}" for="${uniqueId}">${ep.name}</label>
        `;
        list.appendChild(li);

        li.querySelector('input').addEventListener('change', function() {
            localStorage.setItem(uniqueId, this.checked);
        });

        const label = li.querySelector('label');
        const playEpisode = () => {
            const iframe = document.getElementById('VideoFrame');
            const closeBtn = document.getElementById('closeButton');
            if (ep.link) {
                iframe.src = ep.link;
                closeBtn.style.display = 'flex';
                iframe.focus();
            } else { alert("Enlace no disponible"); }
        };
        label.addEventListener('click', playEpisode);
        label.addEventListener('keydown', (e) => { if (e.key === 'Enter') playEpisode(); });
    });
}

function closeSeriesIframe() {
    const iframe = document.getElementById('VideoFrame');
    const closeBtn = document.getElementById('closeButton');
    iframe.src = "";
    closeBtn.style.display = 'none';
    const firstEpisode = document.querySelector('.episode-list label');
    if(firstEpisode) firstEpisode.focus();
}

document.addEventListener('contextmenu', event => event.preventDefault());