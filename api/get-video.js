export default function handler(req, res) {
    // --- 1. SEGURIDAD CORS ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // --- 2. BASE DE DATOS DE PELÍCULAS ---
    const library = {
        // --- DISNEY ---
        "ratatouille": "https://drive.google.com/file/d/1anoTicImOI9qebeG3CIRX-zQbgZCMc9Z/preview",
        "moana": "https://drive.google.com/file/d/1zUzqCKq7jVIB9UqcN0Z0hcQAmEhnmv1x/preview",
        "tierraosos1": "https://drive.google.com/file/d/1CmEXCMfEYnceKDYyuc5NZBIrnTUWAJB0/preview",
        "tierraosos2": "https://drive.google.com/file/d/1qsoro8N9XczNCEPJy52O_yL1p1xpMoCQ/preview",
        "tarzan": "https://drive.google.com/file/d/1hR3gjtsfQ6OxORyHeS1NenwnfG40QHt-/preview",
        "luca": "https://drive.google.com/file/d/1Exrr3q3622V_9rhPVeA1tW8G8NWWilCs/preview",
        "reyleon1": "https://drive.google.com/file/d/1LKGQ62EyN6PUDYpri5WJcGULqZruexTH/preview",
        "reyleon2": "https://drive.google.com/file/d/145GNxnnc5_zX_VfwRov6vP1Y2L4pEORZ/preview",
        "reyleon3": "https://drive.google.com/file/d/1bjgJL6TtZr9GiqdZLtkZby7F5CZB5LZt/preview",
        "bellabestia": "https://drive.google.com/file/d/1DT--BK14YtML-_-p9H2_7Z0oQOhPXU59/preview",
        "bellabestia_la": "https://drive.google.com/file/d/1UhZNx1XOMfQ6wybD5Lym7Nq4vAOZC7Tc/preview",
        "wish": "https://drive.google.com/file/d/1JKs8J6fx5czK0bqh2vQDyebTk27vIvdV/preview",
        "winnie1": "https://drive.google.com/file/d/1crVi4T3wWjinhGPfX87zVad1NOnFI1ix/preview",
        "tigger": "https://drive.google.com/file/d/1IUi7iiI3_b9fkjxFUmXM8XlRix2WzQ1u/preview",
        "piglet": "https://drive.google.com/file/d/1elxAMqx3yDvq2uTwlentmdf8ktBUIqRn/preview",
        "winnie2": "https://drive.google.com/file/d/1h64Jy44rYz9xvsC9vGXEk_He5_DynMXB/preview",
        "rito": "https://drive.google.com/file/d/1FmmOw-oGeuqabp1HwhZ5lOWRFjbY9Yq_/preview",
        "paddington": "https://drive.google.com/file/d/11GeysEnxY5E2EK7UOf-2mK0R1E6Rhst9/preview",
        "damavagabundo": "https://drive.google.com/file/d/10TZk5_laDqyKzKvPOY5y-YETCuvQ4HIl/preview",
        "blancanieves_cazador": "https://drive.google.com/file/d/1o-pTVQlFUPice65aM2kdPxN-jJUwkoWW/preview",
        "blancanieves": "https://drive.google.com/file/d/1d6dndsNiowSVjBqxGxQ-IK_OhHMkA-QD/preview",
        "ballerina": "https://drive.google.com/file/d/1GE2AOp4OKzdUZNS2sHuGBuZ1vn7XB3r0/preview",
        "101dalmatas": "https://drive.google.com/file/d/19FqqN-qoJhhSOGo8X8yQUmFTW2-_LHDH/preview",
        "dumbo": "https://drive.google.com/file/d/1MS_wDo56YGYY2iS4_sVne61Uv1pkqjn0/preview",
        "alicia": "https://drive.google.com/file/d/1uGe_fbubzqs_hb3TwEUkNneCJZPN_qqk/preview",
        "cenicienta": "https://drive.google.com/file/d/1qaliN4sV-MUkvmrRWH5HDFNLtLA9aINP/preview",
        "damavagabundo_la": "https://drive.google.com/file/d/1L-REDsIGm4RuD72a-wVEQE6eavrLV0ew/preview",
        "mascotas": "https://drive.google.com/file/d/1JuFUjOhsPWmONlcOEcDHsGhagRsyRhM9/preview",
        "bambi": "https://drive.google.com/file/d/1sr0XlARAv79bBxi0e3kmzRNmM_lpnVXi/preview",
        "zootopia": "https://drive.google.com/file/d/1ferF8NgdghKBxtTMPxxv2eB_0qcs-8lm/preview",
        "elementos": "https://drive.google.com/file/d/1BlzCvLo5ZLtIpYXwUO2kN6zr_gca3t5O/preview",
        "dory": "https://drive.google.com/file/d/1bZFfhZTMy5fuMc4vzr7fwJLBsRY42Znh/preview",
        "aladdin": "https://drive.google.com/file/d/1HLOYZiWbhGHrbNMogMZGSkgTS4fPxOgx/preview",
        "aristogatos": "https://drive.google.com/file/d/1CBIFEJIEz9gELjthYG8VTMj7_53fg1dL/preview",
        "notredame": "https://drive.google.com/file/d/1OV78RuX2AflmgpjylOkRZ-cDhiHJT182/preview",
        "hercules": "https://drive.google.com/file/d/1v1GTHAVPrbdlE48d4cb1g8jt_nhV5sJZ/preview",
        "belladurmiente": "https://drive.google.com/file/d/10eIe3z5oK_9jsJR2UD2Ud8wvdAvMTCdB/preview",
        "zorrosabueso": "https://drive.google.com/file/d/1ATheuarUF2UqSVUGHJwS2gzZJFPr3zon/preview",
        "libroselva": "https://drive.google.com/file/d/1HCtOJv_nXouwNLtMpjqV_A4i5a3p4Tda/preview",
        "princesasapo": "https://drive.google.com/file/d/1HWWWYI_DsSkGDy-cKVydu4-zREIojLpC/preview",
        "espadapiedra": "https://drive.google.com/file/d/1RbdufCTO0GOUoM2JA5UB9voNCkjsJNex/preview",

        // --- DREAMWORKS ---
        "shrek1": "https://drive.google.com/file/d/1cVzZ8JVLAlfN94U-rC8MzzS17ezCF7cG/preview",
        "shrek2": "https://drive.google.com/file/d/14_zkCbfZuDCJD4rOfE6QfCs0tmhZeA3p/preview",
        "shrek3": "https://drive.google.com/file/d/1C0sWxYcPIUI8M3D5aOKT68bJXxqQ6I7W/preview",
        "shrek4": "https://drive.google.com/file/d/1jk2nGUVwZLPXXMJorNHOgj9odyPq5JoB/preview",
        "spirit": "https://drive.google.com/file/d/1d5ituRMpdw-4JhBlrtqUOGBO-Y1Ldfap/preview",

        // --- MARVEL ---
        "deadpool_wolverine": "https://drive.google.com/file/d/1B83ukiMNllWQ2vRAY5TUJqvj6tniKC--/preview",
        "blackpanther1": "https://drive.google.com/file/d/1kiUpsd7ptCQXPTmoo6EwIxeqqoFL2wN0/preview",
        "blackpanther2": "https://drive.google.com/file/d/1QZsZeq_0QDmKjsBHetlurjvcV7wB8-kz/preview"
        // NOTA: Los otros de Marvel tenian link vacio en tu codigo original
    };

    // --- 3. LÓGICA DE BÚSQUEDA ---
    const { id } = req.query;

    if (library[id]) {
        return res.status(200).json({ status: 'ok', url: library[id] });
    } else {
        return res.status(404).json({ status: 'error', message: 'Video no encontrado en la base de datos' });
    }
}
