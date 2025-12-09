
import React, { useEffect, useRef } from 'react';
import { EqSettings } from '../types';

interface AudioEngineProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  color?: string; 
  eqSettings: EqSettings;
}

// Global cache for MediaElementSourceNodes to prevent "already connected" errors
const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

const AudioEngine: React.FC<AudioEngineProps> = ({ 
  audioElement, 
  isPlaying, 
  color = '#14b8a6',
  eqSettings
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  // Web Audio Graph Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize Audio Graph
  useEffect(() => {
    if (!audioElement) return;

    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
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

      // Connect Source
      let source: MediaElementAudioSourceNode;
      if (sourceCache.has(audioElement)) {
        source = sourceCache.get(audioElement)!;
      } else {
        try {
           source = ctx.createMediaElementSource(audioElement);
           sourceCache.set(audioElement, source);
        } catch (e) {
           console.warn("Could not create MediaElementSource", e);
           // Fallback if cached connection failed but map missed it? 
           // Should ideally not happen with WeakMap logic.
           return; 
        }
      }
      sourceRef.current = source;

      // Connect Graph: Source -> F1 -> F2 -> F3 -> F4 -> F5 -> Analyser -> Dest
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(analyser);
      analyser.connect(ctx.destination);
    }

    // Cleanup logic: typically we don't close context to avoid breaking other audio,
    // but here the graph is specific to this player view.
    // However, if we unmount, we should ideally disconnect to allow garbage collection
    // but keeping 'source' connected to 'destination' is vital if music keeps playing.
    // Logic: If isPlaying, we want music to continue even if UI closes (miniplayer).
    // But AudioEngine unmounts when PlayerView unmounts.
    // For a robust app, AudioEngine should be in App.tsx. 
    // Given the constraints, we will just handle EQ updates here.
    // If the component unmounts, the nodes persist in memory if connected to destination.
    // This is actually "okay" for this architecture.

  }, [audioElement]);

  // Update EQ Gains
  useEffect(() => {
    if (filtersRef.current.length === 5 && audioContextRef.current) {
        const gains = eqSettings.gains;
        const filterNodes = filtersRef.current;
        
        const now = audioContextRef.current.currentTime;
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
    if (!canvasRef.current || !audioContextRef.current) return;

    // Resume context if suspended (browser policy)
    if (isPlaying && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    const renderFrame = () => {
      if (!canvasRef.current || !analyserRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height; // Scale to canvas height

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(255,255,255,0.4)');

        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth, barHeight, 5);
        ctx.fill();

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
