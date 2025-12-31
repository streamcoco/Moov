/* =========================================
   LOGIC.JS - CONTROLADOR PRINCIPAL DEL DASHBOARD
   Conectado a Vercel API para seguridad
   ========================================= */

// Variables globales para evitar errores de referencia
let currentSeriesData = null;
let currentSeasonIndex = null;
let currentEpisodeIndex = null;
let countdownInterval = null;

// 1. INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Limpieza de UI (Eliminar elementos residuales de otras vistas si existen)
    const isSeriesPage = document.querySelector('.back-arrow') || document.getElementById('seasonSelect');
    const logoutContainer = document.querySelector('.logout-container');
    
    // Si estamos en una sub-página de series, a veces queremos quitar el botón de logout duplicado
    if (isSeriesPage && logoutContainer) {
        logoutContainer.remove(); 
    }

    // B. Enfocar el buscador al iniciar (Mejor experiencia en TV/PC)
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();

    // C. Inicializadores auxiliares
    injectNextEpisodeUI();
});

/* =========================================
   2. SISTEMA DE PESTAÑAS (CATEGORÍAS)
   ========================================= */
function switchCategory(targetId, element) {
    // Quitar clase 'active' de todos los íconos del menú
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    
    // Activar el ícono seleccionado
    element.classList.add('active');
    
    // Scroll suave para asegurar que el ícono esté visible
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    // Ocultar todas las secciones de películas
    document.querySelectorAll('.category-section').forEach(sec => sec.classList.remove('active-section'));
    
    // Mostrar la sección seleccionada con una pequeña animación
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        setTimeout(() => targetSection.classList.add('active-section'), 50);
    }
}

/* =========================================
   3. REPRODUCCIÓN SEGURA (CONEXIÓN CON API VERCEL)
   ========================================= */
async function playSecureMovie(movieID) {
    // A. Verificar si el usuario está logueado en Firebase
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert("Por seguridad, debes iniciar sesión nuevamente.");
            return;
        }
    }

    // B. Feedback visual (cambiar cursor a "cargando")
    document.body.style.cursor = 'wait';

    try {
        // C. Solicitar el link a tu API en Vercel
        // La ruta relativa /api/get-video funciona automáticamente en Vercel
        const response = await fetch(`/api/get-video?id=${movieID}`);
        const data = await response.json();

        if (data.status === 'ok') {
            // D. ¡Éxito! Abrimos el reproductor con el link seguro
            openVideoModal(data.url);
        } else {
            console.error("Error API:", data.message);
            alert("Lo sentimos, este video no está disponible por el momento.");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Error de conexión. Verifica tu internet o intenta más tarde.");
    } finally {
        // Restaurar el cursor
        document.body.style.cursor = 'default';
    }
}

/* =========================================
   4. CONTROL DEL REPRODUCTOR (MODAL)
   ========================================= */
function openVideoModal(url) {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    
    if(modal && iframe) { 
        // Permisos para pantalla completa y autoplay
        iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        
        let finalLink = url;

        // Ajuste automático para Google Drive (Autoplay)
        if (finalLink.includes('drive.google.com') && !finalLink.includes('autoplay=1')) {
            finalLink += (finalLink.includes('?') ? '&' : '?') + 'autoplay=1';
        }

        // Cargar video y mostrar modal
        iframe.src = finalLink; 
        modal.style.display = "block"; // Esto activa el CSS de pantalla completa
        iframe.focus(); 
        
        // Intentar poner en pantalla completa automáticamente
        if (modal.requestFullscreen) {
            modal.requestFullscreen().catch(err => {
                // Algunos navegadores bloquean esto si no es por interacción directa, es normal.
                console.log("Fullscreen automático bloqueado, usuario debe activarlo manual.");
            });
        }
    }
}

function closeVideoModal() {
    const modal = document.getElementById("myModal");
    const iframe = document.getElementById("videoFrame");
    
    // Salir de pantalla completa si está activa
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
    }

    if(modal) { 
        iframe.src = ""; // IMPORTANTE: Esto detiene el sonido del video
        modal.style.display = "none"; 
    }
}

/* =========================================
   5. FILTRO DE BÚSQUEDA (SEARCH BAR)
   ========================================= */
function filterMovies() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    
    // Seleccionar todas las secciones y todas las películas
    const sections = document.querySelectorAll('.category-section');
    const allItems = document.querySelectorAll('.movie-list li, .marvel-movie-list li, .dreamworks-movie-list li, .series-list li');

    if (query.length > 0) {
        // --- MODO BÚSQUEDA ---
        // 1. Mostrar todas las secciones para buscar en ellas
        sections.forEach(sec => {
            sec.style.display = 'block'; 
            sec.style.opacity = '1';
            sec.style.animation = 'none';
        });

        // 2. Filtrar items
        allItems.forEach(li => {
            const img = li.querySelector('img');
            // Buscamos coincidencia en el atributo ALT de la imagen
            if (img && img.alt.toLowerCase().includes(query)) {
                li.style.display = 'block'; // Mostrar si coincide
            } else {
                li.style.display = 'none';  // Ocultar si no coincide
            }
        });

    } else {
        // --- MODO NORMAL (RESTAURAR) ---
        // 1. Dejar que el CSS controle las secciones de nuevo (tab activa)
        sections.forEach(sec => {
            sec.style.display = ''; 
            sec.style.opacity = '';
            sec.style.animation = '';
        });

        // 2. Mostrar todas las películas dentro de su sección activa
        allItems.forEach(li => {
            li.style.display = 'block';
        });
    }
}

/* =========================================
   6. FUNCIONES AUXILIARES (Placeholders)
   Evitan errores si algún código antiguo las llama
   ========================================= */
function injectNextEpisodeUI() { 
    // Esta función se usa en las páginas individuales de series, 
    // aquí en el dashboard principal no hace nada, pero debe existir para no romper scripts compartidos.
}