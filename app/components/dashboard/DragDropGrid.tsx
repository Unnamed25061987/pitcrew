"use client";

import React, { useState } from 'react';
import GridLayout from 'react-grid-layout'; 
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Importation de nos 4 widgets
import FuelWidget from './Widgets/FuelWidget';
import TimingWidget from './Widgets/TimingWidget';
import WeatherWidget from './Widgets/WeatherWidget';
import RadarWidget from './Widgets/RadarWidget';

// L'arme anti-TypeScript pour utiliser GridLayout en toute tranquillité
const Grid = GridLayout as any;

export default function DragDropGrid() {
  // Définition de l'emplacement et de la taille (w = largeur, h = hauteur) par défaut
  const [layout, setLayout] = useState<any[]>([
    { i: 'timing', x: 0, y: 0, w: 4, h: 4 },
    { i: 'fuel', x: 4, y: 0, w: 3, h: 4 },
    { i: 'weather', x: 7, y: 0, w: 3, h: 4 },
    { i: 'radar', x: 0, y: 4, w: 7, h: 6 }, // Le radar est placé en dessous avec une belle taille
  ]);

  const onLayoutChange = (newLayout: any) => {
    setLayout(newLayout);
  };

  return (
    <div className="bg-[#0B0C10]">
      
      {/* En-tête de la zone */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-[#66FCF1] font-bold tracking-wide">🏁 ESPACE INGÉNIEUR DE PISTE</h1>
        <span className="bg-[#1F2833] text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700">
          Mode Édition Drag & Drop Actif
        </span>
      </div>

      {/* Zone défilante pour protéger l'affichage sur les petits écrans */}
      <div className="overflow-x-auto pb-10">
        <div style={{ minWidth: "1200px" }}>
          <Grid 
            className="layout -mx-2" 
            layout={layout} 
            cols={12} 
            rowHeight={60} 
            width={1200} 
            onLayoutChange={onLayoutChange}
            isDraggable={true}
            isResizable={true}
            draggableHandle=".cursor-move"
          >
            {/* WIDGET 1 : CHRONOMÉTRAGE */}
            <div key="timing" className="p-2">
              <div className="cursor-move h-full w-full">
                <TimingWidget />
              </div>
            </div>
            
            {/* WIDGET 2 : ESSENCE */}
            <div key="fuel" className="p-2">
              <div className="cursor-move h-full w-full">
                <FuelWidget />
              </div>
            </div>
            
            {/* WIDGET 3 : MÉTÉO TÉLÉMÉTRIE */}
            <div key="weather" className="p-2">
              <div className="cursor-move h-full w-full">
                <WeatherWidget />
              </div>
            </div>

            {/* WIDGET 4 : RADAR SATELLITE */}
            <div key="radar" className="p-2">
              <div className="cursor-move h-full w-full">
                <RadarWidget />
              </div>
            </div>
            
          </Grid>
        </div>
      </div>
      
    </div>
  );
}