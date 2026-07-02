"use client";

import React, { useState, useRef, useEffect } from 'react';

// Typage des messages
interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
}

export default function AiTerminal() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: '>>> MODULE IA GEMINI INITIALISÉ. \n>>> EN ATTENTE DE VOS INSTRUCTIONS.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas quand un message s'ajoute
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Simulation d'un contexte de course envoyé à l'IA
      const fakeContext = "Voiture #7: P1. Essence à 45%. Prochain arrêt prévu dans 15 tours. Drapeau Jaune actuel.";

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, fleetContext: fakeContext })
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: `ERREUR SYSTÈME: ${data.error}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: "ERREUR RÉSEAU: Impossible de joindre le serveur IA." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1F2833] h-[500px] flex flex-col rounded-lg border border-gray-700 shadow-xl overflow-hidden">
      
      {/* En-tête */}
      <div className="bg-[#15171e] p-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-[#66FCF1] font-bold text-sm tracking-wider flex items-center">
          <span className="mr-2">🤖</span> TERMINAL IA STRATÈGE
        </h3>
        {isLoading && <span className="text-xs text-[#ffaa00] animate-pulse">TRAITEMENT...</span>}
      </div>

      {/* Zone des messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-[#0B0C10] font-mono text-sm space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-500 mb-1">
              {msg.sender === 'user' ? 'INGÉNIEUR' : 'IA GEMINI'}
            </span>
            <div className={`p-3 rounded max-w-[85%] whitespace-pre-wrap ${
              msg.sender === 'user' 
                ? 'bg-[#1f7bb6] text-white border border-[#2891d6]' 
                : 'bg-[#1a383d] text-[#00ff66] border border-[#45A29E]'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <form onSubmit={handleSend} className="p-3 bg-[#15171e] border-t border-gray-800 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Demandez une analyse de stratégie..."
          disabled={isLoading}
          className="flex-1 bg-[#0B0C10] border border-gray-600 rounded p-2 text-white font-mono text-sm focus:border-[#45A29E] outline-none disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="bg-[#45A29E] text-black font-bold px-4 py-2 rounded hover:bg-[#66FCF1] transition disabled:opacity-50"
        >
          ENVOYER
        </button>
      </form>
    </div>
  );
}