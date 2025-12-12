
import React, { useEffect, useRef } from 'react';
import { EqSettings } from '../types';

interface AudioEngineProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  color?: string; 
  eqSettings: EqSettings;
}

// Global Singletons to ensure context consistency across re-renders
let globalCtx: AudioContext | null = null;
const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

const getGlobalContext = () => {
    if (!globalCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        globalCtx = new AudioContextClass();
    }
    return globalCtx;
};

const AudioEngine: React.FC<AudioEngineProps> = ({ 
  audioElement, 
  isPlaying, 
  color = '#14b8a6',
  eqSettings
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  // Refs for nodes specific to this component instance
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);

  // Initialize Audio Graph
  useEffect(() => {
    if (!audioElement) return;

    const ctx = getGlobalContext();
    
    // Create Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    // Create EQ Filters (60, 250, 1000, 4000, 16000 Hz)
    const freqs = [60, 250, 1000, 4000, 16000];
    const filters = freqs.map((f, i) => {
      const filter = ctx.createBiquadFilter();
      if (i === 0) filter.type = 'lowshelf';
      else if (i === freqs.length - 1) filter.type = 'highshelf';
      else filter.type = 'peaking';
      filter.frequency.value = f;
      return filter;
    });
    filtersRef.current = filters;

    // Get or Create Source
    let source: MediaElementAudioSourceNode;
    if (sourceCache.has(audioElement)) {
      source = sourceCache.get(audioElement)!;
    } else {
      try {
         source = ctx.createMediaElementSource(audioElement);
         sourceCache.set(audioElement, source);
      } catch (e) {
         console.warn("Could not create MediaElementSource", e);
         return; 
      }
    }

    // Connect Graph: Source -> F1 -> ... -> F5 -> Analyser -> Dest
    try {
        // Critical: Disconnect everything first to avoid double-routing (fan-out)
        // or mixing old graph with new graph if the component remounted.
        source.disconnect();
        
        source.connect(filters[0]);
        
        for (let i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i + 1]);
        }
        filters[filters.length - 1].connect(analyser);
        analyser.connect(ctx.destination);
    } catch (e) {
        console.error("Audio Graph Connection Error:", e);
    }

    // Apply initial EQ settings
    const gains = eqSettings.gains;
    filters[0].gain.value = gains[60];
    filters[1].gain.value = gains[250];
    filters[2].gain.value = gains[1000];
    filters[3].gain.value = gains[4000];
    filters[4].gain.value = gains[16000];

    // Cleanup on unmount
    return () => {
        try {
            // Disconnect source from the EQ/Analyser graph
            source.disconnect();
            
            filters.forEach(f => f.disconnect());
            analyser.disconnect();
            
            // Reconnect source directly to destination so audio continues playing
            // in the background without the visualizer/EQ overhead.
            source.connect(ctx.destination);
        } catch (e) {
            // Ignore disconnect errors
        }
    };

  }, [audioElement]);

  // Update EQ Gains Dynamically
  useEffect(() => {
    if (filtersRef.current.length === 5) {
        const ctx = getGlobalContext();
        const gains = eqSettings.gains;
        const filterNodes = filtersRef.current;
        
        const now = ctx.currentTime;
        // Smooth transition
        filterNodes[0].gain.setTargetAtTime(gains[60], now, 0.1);
        filterNodes[1].gain.setTargetAtTime(gains[250], now, 0.1);
        filterNodes[2].gain.setTargetAtTime(gains[1000], now, 0.1);
        filterNodes[3].gain.setTargetAtTime(gains[4000], now, 0.1);
        filterNodes[4].gain.setTargetAtTime(gains[16000], now, 0.1);
    }
  }, [eqSettings]);

  // Visualizer Loop
  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const ctx = getGlobalContext();

    // Resume context if suspended (browser policy)
    if (isPlaying && ctx.state === 'suspended') {
        ctx.resume();
    }

    const renderFrame = () => {
      if (!canvasRef.current || !analyserRef.current) return;

      const canvas = canvasRef.current;
      const context2D = canvas.getContext('2d');
      if (!context2D) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      context2D.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height; // Scale to canvas height

        const gradient = context2D.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(255,255,255,0.4)');

        context2D.fillStyle = gradient;
        
        context2D.beginPath();
        if (context2D.roundRect) {
            context2D.roundRect(x, height - barHeight, barWidth, barHeight, 5);
        } else {
            context2D.rect(x, height - barHeight, barWidth, barHeight);
        }
        context2D.fill();

        x += barWidth + 2;
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    if (isPlaying) {
      renderFrame();
    } else {
       if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-full"
    />
  );
};

export default AudioEngine;
