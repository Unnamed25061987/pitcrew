import React, { useState } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Exemples de composants Widgets (à développer ensuite)
const FuelWidget = () => <div className="h-full bg-green-900 flex items-center justify-center font-bold text-2xl text-white rounded">⛽ 84%</div>;
const TimingWidget = () => <div className="h-full bg-blue-900 flex items-center justify-center font-bold text-2xl text-white rounded">⏱️ 1:24.305</div>;
const WeatherWidget = () => <div className="h-full bg-gray-800 flex items-center justify-center font-bold text-2xl text-white rounded">☀️ 24°C Piste</div>;

export default function DragDropGrid() {
  // Définition initiale de la position et de la taille des widgets
  const [layout, setLayout] = useState([
    { i: 'fuel', x: 0, y: 0, w: 3, h: 2 },
    { i: 'timing', x: 3, y: 0, w: 6, h: 4 },
    { i: 'weather', x: 9, y: 0, w: 3, h: 2 },
  ]);

  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
    // Ici, tu pourrais sauvegarder le 'newLayout' dans la base de données 
    // pour que l'ingénieur retrouve son interface à sa prochaine connexion.
  };

  return (
    <div className="p-4 bg-[#0B0C10] min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl text-[#66FCF1] font-bold">🏁 TABLEAU DE BORD INGÉNIEUR</h1>
        <span className="text-gray-400 text-sm">Organisez vos modules par glisser-déposer</span>
      </div>

      {/* Le moteur Drag & Drop */}
      <GridLayout 
        className="layout" 
        layout={layout} 
        cols={12} // Divise l'écran en 12 colonnes
        rowHeight={60} 
        width={1200} // Largeur fixe pour l'exemple (utiliser ResponsiveGridLayout en prod)
        onLayoutChange={onLayoutChange}
        isDraggable={true}
        isResizable={true}
      >
        <div key="fuel" className="border border-gray-600 rounded cursor-move">
          <FuelWidget />
        </div>
        <div key="timing" className="border border-gray-600 rounded cursor-move">
          <TimingWidget />
        </div>
        <div key="weather" className="border border-gray-600 rounded cursor-move">
          <WeatherWidget />
        </div>
      </GridLayout>
    </div>
  );
}