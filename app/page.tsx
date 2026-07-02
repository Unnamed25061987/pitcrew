import LiveLeaderboard from "./components/dashboard/LiveLeaderboard";
import WeatherRadar from "./components/dashboard/WeatherRadar";

export default function Home() {
  return (
    <main className="bg-[#0B0C10] min-h-screen text-white p-6">
      
      {/* En-tête du Pit Wall */}
      <div className="mb-6 flex justify-between items-end border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-[#66FCF1] tracking-widest uppercase">PIT WALL COMMAND CENTER</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">Status: EN LIGNE | Télémétrie Globale</p>
        </div>
      </div>

      {/* 
        GRID DE LA PAGE PRINCIPALE :
        - Sur grands écrans (xl) : 3 colonnes. Le Leaderboard prend 2 colonnes (2/3), la météo prend 1 colonne (1/3).
        - Sur écrans normaux/petits (lg, md, sm) : 1 seule colonne, empilé verticalement.
      */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* SECTION TIMING (Gauche) */}
        <div className="xl:col-span-2 space-y-6">
          <LiveLeaderboard />
        </div>

        {/* SECTION MÉTÉO (Droite) */}
        <div className="xl:col-span-1 h-full">
          <div className="sticky top-6">
            <WeatherRadar />
          </div>
        </div>

      </div>

    </main>
  );
}