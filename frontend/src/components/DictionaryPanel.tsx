"use client";

import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface TermDefinition {
  name: string;
  description: string;
  useCase: string;
  type?: string;
}

interface DictionaryPanelProps {
  activeTerm: string | null;
  definitions: Record<string, TermDefinition>;
  hoverInfo: any;
  isVisible: boolean;
  onToggle: () => void;
}

const DictionaryPanel: React.FC<DictionaryPanelProps> = ({ 
  activeTerm, 
  definitions, 
  hoverInfo, 
  isVisible, 
  onToggle 
}) => {
  if (!isVisible) {
    return (
      <div className="h-8 border-t border-gray-600 bg-gray-700 flex items-center justify-center">
        <button
          onClick={onToggle}
          className="text-xs text-gray-300 hover:text-white flex items-center gap-1"
          title="Show Dictionary"
        >
          <BookOpen size={14} />
          <span>Show Dictionary</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-48 border-t border-gray-600 bg-gray-800">
      <div className="p-2 bg-gray-700 border-b border-gray-600 flex items-center justify-between">
        <span className="text-sm font-medium">Code Dictionary</span>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
          title="Hide Dictionary"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-3 h-40 overflow-auto">
        {hoverInfo ? (
          <div className="text-sm">
            <div className="text-green-400 font-semibold mb-1">{hoverInfo.name}</div>
            {hoverInfo.type && <div className="text-blue-400 text-xs mb-1">Type: {hoverInfo.type}</div>}
            <div className="text-gray-300 mb-2">{hoverInfo.description}</div>
            {hoverInfo.useCase && (
              <pre className="text-xs bg-gray-700 p-2 rounded overflow-x-auto text-cyan-300">
                {hoverInfo.useCase}
              </pre>
            )}
          </div>
        ) : !activeTerm ? (
          <p className="text-gray-400 text-sm">Hover over any code element to see its explanation</p>
        ) : (
          definitions[activeTerm] && (
            <div className="text-sm">
              <div className="text-green-400 font-semibold mb-1">{definitions[activeTerm].name}</div>
              {definitions[activeTerm].type && (
                <div className="text-blue-400 text-xs mb-1">Type: {definitions[activeTerm].type}</div>
              )}
              <div className="text-gray-300 mb-2">{definitions[activeTerm].description}</div>
              <pre className="text-xs bg-gray-700 p-2 rounded overflow-x-auto text-cyan-300">
                {definitions[activeTerm].useCase}
              </pre>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DictionaryPanel;