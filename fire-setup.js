/* =========================================
   FIRE-SETUP.JS - CONEXIÓN CON FIREBASE
   ========================================= */

// 1. TUS CREDENCIALES (Adaptadas de lo que enviaste)
const firebaseConfig = {
  apiKey: "AIzaSyBrpNF63OVWiihw8WLyoiCe09eaJneLjV8",
  authDomain: "moov-8b8af.firebaseapp.com",
  projectId: "moov-8b8af",
  storageBucket: "moov-8b8af.firebasestorage.app",
  messagingSenderId: "224071106064",
  appId: "1:224071106064:web:d838c77a4d1d7cdf32d495",
  measurementId: "G-PT2Y6EL8ZN"
};

// 2. INICIALIZAR FIREBASE (De forma segura para HTML clásico)
// Verificamos si la librería ya cargó para evitar errores en la TV
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Conexión a Firebase: EXITOSA");
    }
} else {
    console.error("ERROR CRÍTICO: No se han cargado los scripts de Firebase en el HTML.");
}

// 3. EXPORTAR REFERENCIAS (Para usarlas en login y app)
// Si firebase cargó, creamos los atajos 'auth' y 'db'
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.database() : null;