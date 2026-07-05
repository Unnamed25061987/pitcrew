const fs = require('fs');
const path = require('path');

// 🚀 Assure-toi que c'est l'URL exacte que tu utilises sur ton navigateur
const URL_VERCEL = "https://pitcrew-topaz.vercel.app/api/timing";

const dossierArchives = path.join(__dirname, 'archives_course');

if (!fs.existsSync(dossierArchives)) {
    fs.mkdirSync(dossierArchives);
}

async function aspirerDonnees() {
    try {
        // On se fait passer pour Chrome pour que Vercel nous laisse passer
        const response = await fetch(URL_VERCEL, { 
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // On lit la réponse en TEXTE brut d'abord, pour éviter le crash JSON
        const textData = await response.text();

        try {
            // On essaie de convertir le texte en JSON
            const data = JSON.parse(textData);
            
            const date = new Date();
            const heure = `${date.getHours()}h${date.getMinutes().toString().padStart(2, '0')}`;
            const leaderLap = data.cars && data.cars[0] && data.cars[0].lap ? data.cars[0].lap.lap_number : 'X';
            
            const nomFichier = `course_tour_${leaderLap}_${heure}.json`;
            const cheminFichier = path.join(dossierArchives, nomFichier);

            fs.writeFileSync(cheminFichier, JSON.stringify(data, null, 2));
            console.log(`✅ [${date.toLocaleTimeString()}] JSON sauvegardé : ${nomFichier}`);

        } catch (e) {
            // SI ÇA PLANTE, ON AFFICHE LE DÉBUT DU FICHIER HTML POUR COMPRENDRE
            console.log(`\n❌ [${new Date().toLocaleTimeString()}] Vercel a renvoyé une page HTML au lieu du JSON.`);
            console.log(`Statut HTTP: ${response.status}`);
            console.log("Extrait de la réponse :");
            console.log(textData.substring(0, 150) + "...\n");
        }
    } catch (erreur) {
        console.log(`⚠️ Erreur réseau vers Vercel : ${erreur.message}`);
    }
}

console.log("🔴 DÉMARRAGE DE LA BOÎTE NOIRE (via Vercel)...");
console.log(`Cible : ${URL_VERCEL}\n`);

aspirerDonnees();
setInterval(aspirerDonnees, 60000);