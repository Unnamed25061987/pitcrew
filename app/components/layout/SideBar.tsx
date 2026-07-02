"use client";
import React from 'react';

export default function SideBar() {
  return (
    <div className="w-64 bg-[#15171e] border-r border-gray-800 flex flex-col justify-between h-screen sticky top-0">
      
      {/* En-tête / Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-black text-white tracking-widest">
          PIT<span className="text-[#66FCF1]">CREW</span> <span className="text-sm font-normal text-gray-500">V2</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Engine Race Pro</p>
      </div>

      {/* Menu principal */}
      <nav className="flex-1 px-4 space-y-2">
        <NavItem active icon="🏁" text="Dashboard Live" />
        <NavItem icon="🏎️" text="Flotte & Télémétrie" />
        <NavItem icon="🧠" text="IA Stratège" />
        <NavItem icon="☁️" text="Radar Météo" />
        <NavItem icon="⚙️" text="Configuration" />
      </nav>

      {/* Bas de la barre (SaaS : Équipe & Licence) */}
      <div className="p-4 border-t border-gray-800">
        <div className="bg-[#1F2833] rounded p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#2d3748] transition">
          <div className="w-8 h-8 rounded-full bg-[#45A29E] flex items-center justify-center text-black font-bold">
            EC
          </div>
          <div>
            <p className="text-sm font-bold text-white">Écurie Client</p>
            <p className="text-xs text-[#00ff66]">Licence PRO (Active)</p>
          </div>
        </div>
      </div>

    </div>
  );
}

// On explique à TypeScript à quoi s'attendre
interface NavItemProps {
  active?: boolean;
  icon: string;
  text: string;
}

// Petit sous-composant pour les boutons du menu
function NavItem({ active = false, icon, text }: NavItemProps) {
  return (
    <a href="#" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? "bg-[#1f7bb6] text-white font-bold" 
        : "text-gray-400 hover:bg-[#1a1c23] hover:text-white"
    }`}>
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{text}</span>
    </a>
  );
}