"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { parseCodeToFlowchart, ParsedCode } from '@/lib/codeParser';
import mermaid from 'mermaid';
import { RefreshCw, Download, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';

interface FlowchartPanelProps {
  code: string;
  language: string;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

export const FlowchartPanel: React.FC<FlowchartPanelProps> = ({
  code,
  language,
  isVisible,
  onToggle,
  className = ""
}) => {
  const { socket, roomId } = useSocket();
  const [parsedCode, setParsedCode] = useState<ParsedCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUpdatingFromSocket, setIsUpdatingFromSocket] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null); 
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#60a5fa',
        primaryTextColor: '#e0e7ff',
        primaryBorderColor: '#3b82f6',
        lineColor: '#9ca3af',
        secondaryColor: '#374151',
        tertiaryColor: '#4b5563',
        background: '#1f2937',
        mainBkg: '#1f2937',
        secondBkg: '#374151',
        tertiaryBkg: '#4b5563',
        nodeBorder: '#9ca3af',
        clusterBkg: '#374151',
        clusterBorder: '#6b7280',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  const updateFromSocket = useCallback((updater: () => void) => {
    setIsUpdatingFromSocket(true);
    setTimeout(() => {
      updater();
      setIsUpdatingFromSocket(false);
    }, 0);
  }, []);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleFlowchartData = (flowchart: any) => {
      if (flowchart?.elements && flowchart?.mermaidCode) {
        updateFromSocket(() => {
          setParsedCode({
            elements: flowchart.elements,
            flowchart: flowchart.mermaidCode
          });
        });
      }
    };

    const handleFlowchartUpdateForward = ({ elements, mermaidCode }: any) => {
      updateFromSocket(() => {
        setParsedCode({
          elements: elements || [],
          flowchart: mermaidCode || ''
        });
      });
    };

    const handleFlowchartStateForward = ({ elements, mermaidCode }: any) => {
      updateFromSocket(() => {
        setParsedCode({
          elements: elements || [],
          flowchart: mermaidCode || ''
        });
      });
    };

    socket.on('flowchart-data', handleFlowchartData);
    socket.on('flowchart-update-forward', handleFlowchartUpdateForward);
    socket.on('flowchart-state-forward', handleFlowchartStateForward);

    socket.emit('request-flowchart-state', { roomId });

    return () => {
      socket.off('flowchart-data', handleFlowchartData);
      socket.off('flowchart-update-forward', handleFlowchartUpdateForward);
      socket.off('flowchart-state-forward', handleFlowchartStateForward);
    };
  }, [socket, roomId, updateFromSocket]);

  useEffect(() => {
    if (!code.trim()) {
      setParsedCode(null);
      setError(null);
      return;
    }

    if (isUpdatingFromSocket) return;

    const generateFlowchart = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        const result = parseCodeToFlowchart(code, language);
        
        if (!result.flowchart || result.elements.length === 0) {
          setError('No meaningful code elements found to generate a flowchart.');
          setParsedCode(null);
        } else {
          setParsedCode(result);
          if (socket && roomId) {
            socket.emit('flowchart-update', { 
              elements: result.elements, 
              mermaidCode: result.flowchart, 
              roomId 
            });
          }
        }
      } catch (err) {
        setError('Failed to generate flowchart. Please check your code syntax.');
        setParsedCode(null);
      } finally {
        setIsGenerating(false);
      }
    };

    const timeoutId = setTimeout(generateFlowchart, 750);
    return () => clearTimeout(timeoutId);
  }, [code, language, socket, roomId, isUpdatingFromSocket]);

  useEffect(() => {
    if (!parsedCode?.flowchart || !mermaidRef.current) {
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = '';
      }
      return;
    }

    const renderDiagram = async () => {
      try {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
        }
        
        const diagramId = `flowchart-diagram-${Date.now()}`;
        const { svg, bindFunctions } = await mermaid.render(diagramId, parsedCode.flowchart);
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          if (bindFunctions) {
            bindFunctions(mermaidRef.current);
          }
        }
      } catch (err) {
        setError('Failed to render flowchart diagram.');
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
        }
      }
    };

    renderDiagram();
  }, [parsedCode]);

  const downloadFlowchart = async () => {
    if (!mermaidRef.current) return;
    
    try {
      const svg = mermaidRef.current.querySelector('svg');
      if (!svg) return;

      const clonedSvg = svg.cloneNode(true) as SVGElement;
      const bbox = svg.getBBox();
      clonedSvg.setAttribute('width', (bbox.width + 20).toString());
      clonedSvg.setAttribute('height', (bbox.height + 20).toString());
      clonedSvg.setAttribute('style', 'background: #ffffff;');

      const style = document.createElement('style');
      style.textContent = `
        text { font-family: 'Inter', sans-serif; fill: #1f2937; }
        .node rect, .node polygon, .node circle, .node path { fill: #e0e7ff; stroke: #60a5fa; stroke-width: 2px; }
        .edgePath .path { stroke: #9ca3af; stroke-width: 2px; }
        .label { color: #1f2937; }
      `;
      clonedSvg.prepend(style);
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = 'flowchart.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(svgUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
      };
      
      img.src = svgUrl;
    } catch (err) {
      console.error('Error downloading flowchart:', err);
    }
  };

  const refreshFlowchart = () => {
    setParsedCode(null);
    setError(null);
    if (code.trim()) {
      const result = parseCodeToFlowchart(code, language);
      setParsedCode(result);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col border-l border-gray-700 bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} ${className}`}
    >
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Flowchart</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshFlowchart}
            disabled={isGenerating}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Refresh Flowchart"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={downloadFlowchart}
            disabled={!parsedCode}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Download as PNG"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggle}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Hide Flowchart"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flowchart-container">
        {isGenerating && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
              <p className="text-gray-400">Generating flowchart...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg">
              <p>{error}</p>
            </div>
          </div>
        )}

        {!isGenerating && !error && !parsedCode && code.trim() && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No flowchart generated yet. Try refreshing.</p>
          </div>
        )}

        {!isGenerating && !error && !code.trim() && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Write some code to generate a flowchart.</p>
          </div>
        )}

        {!isGenerating && !error && parsedCode && (
          <div 
            ref={mermaidRef}
            className="mermaid flex justify-center items-center min-h-full"
          />
        )}
      </div>
    </div>
  );
};