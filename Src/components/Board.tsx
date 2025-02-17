import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDrag } from 'react-use-gesture';
import { useBoardStore } from '../store/boardStore';
import { MediaElement } from '../types/board';
import { ZoomIn, ZoomOut, Camera, Monitor, Upload, Hand, Maximize, Trash2, Layers, ChevronUp, ChevronDown, Link, Copy, CheckCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Webcam from 'react-webcam';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const WORKSPACE_PADDING = 200;
const BOARD_WIDTH = CANVAS_WIDTH + (WORKSPACE_PADDING * 2);
const BOARD_HEIGHT = CANVAS_HEIGHT + (WORKSPACE_PADDING * 2);
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
const GRID_SIZE = 50;

const PAN_BOUNDARY_MARGIN = 50;
const SMOOTH_PAN_DURATION = 300;

export const Board: React.FC = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const { elements, zoom, pan, setZoom, setPan, addElement, updateElement, removeElement } = useBoardStore();
  const [resizing, setResizing] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [momentum, setMomentum] = useState({ x: 0, y: 0 });
  const [lastPanTime, setLastPanTime] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const panAnimationRef = useRef<number>();
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);

  const handleCopyOBSLink = () => {
    const currentUrl = window.location.origin;
    const roomKey = new URLSearchParams(window.location.search).get('roomKey');
    const obsUrl = `${currentUrl}/view?roomKey=${roomKey}`;
    
    navigator.clipboard.writeText(obsUrl).then(() => {
      setShowCopiedFeedback(true);
      setTimeout(() => setShowCopiedFeedback(false), 2000);
    });
  };

  const checkBoundaries = useCallback((x: number, y: number) => {
    const scale = zoom / 100;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const maxX = (BOARD_WIDTH * scale - viewportWidth) / 2;
    const maxY = (BOARD_HEIGHT * scale - viewportHeight) / 2;
    
    if (Math.abs(x + maxX) < PAN_BOUNDARY_MARGIN) return 'left';
    if (Math.abs(x - maxX) < PAN_BOUNDARY_MARGIN) return 'right';
    if (Math.abs(y + maxY) < PAN_BOUNDARY_MARGIN) return 'top';
    if (Math.abs(y - maxY) < PAN_BOUNDARY_MARGIN) return 'bottom';
    return null;
  }, [zoom]);

  const constrainPan = useCallback((x: number, y: number): { x: number, y: number } => {
    const scale = zoom / 100;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const maxX = (BOARD_WIDTH * scale - viewportWidth) / 2;
    const maxY = (BOARD_HEIGHT * scale - viewportHeight) / 2;
    
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }, [zoom]);

  const smoothPan = useCallback((targetX: number, targetY: number) => {
    const startX = pan.x;
    const startY = pan.y;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / SMOOTH_PAN_DURATION, 1);
      
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentX = startX + (targetX - startX) * easedProgress;
      const currentY = startY + (targetY - startY) * easedProgress;
      
      const constrained = constrainPan(currentX, currentY);
      setPan(constrained.x, constrained.y);
      
      if (progress < 1) {
        panAnimationRef.current = requestAnimationFrame(animate);
      }
    };
    
    if (panAnimationRef.current) {
      cancelAnimationFrame(panAnimationRef.current);
    }
    
    panAnimationRef.current = requestAnimationFrame(animate);
  }, [pan, setPan, constrainPan]);

  const centerView = useCallback(() => {
    setMomentum({ x: 0, y: 0 });
    smoothPan(0, 0);
    setZoom(100);
  }, [setZoom, smoothPan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        document.body.style.cursor = 'grab';
      } else if (e.code === 'Delete' && selectedElement) {
        removeElement(selectedElement);
        setSelectedElement(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsDraggingCanvas(false);
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.body.style.cursor = 'default';
    };
  }, [isSpacePressed, selectedElement, removeElement]);

  const bindCanvasDrag = useDrag(
    ({ movement: [mx, my], velocity, first, last, active }) => {
      if (isSpacePressed) {
        if (first) {
          setIsDraggingCanvas(true);
          document.body.style.cursor = 'grabbing';
          setMomentum({ x: 0, y: 0 });
        }
        
        if (active) {
          const now = Date.now();
          const timeDelta = now - lastPanTime;
          const speedFactor = Math.min(1, timeDelta / 16);
          const zoomFactor = Math.max(0.2, Math.min(1, 100 / zoom));
          
          const deltaX = mx * speedFactor * zoomFactor;
          const deltaY = my * speedFactor * zoomFactor;
          
          const constrained = constrainPan(pan.x + deltaX, pan.y + deltaY);
          setPan(constrained.x, constrained.y);
          setLastPanTime(now);
        }
        
        if (last) {
          setIsDraggingCanvas(false);
          document.body.style.cursor = isSpacePressed ? 'grab' : 'default';
          
          if (typeof velocity === 'number') {
            setMomentum({
              x: velocity * 0.5 * Math.max(0.2, Math.min(1, 100 / zoom)),
              y: velocity * 0.5 * Math.max(0.2, Math.min(1, 100 / zoom))
            });
          }
        }
      }
    },
    { enabled: true }
  );

  const bindDrag = useDrag(({ movement: [mx, my], first, last, args: [id] }) => {
    if (!isSpacePressed && (first || last)) {
      const element = elements.find((el) => el.id === id);
      if (element) {
        const newX = element.position.x + mx / (zoom / 100);
        const newY = element.position.y + my / (zoom / 100);
        
        const constrainedX = Math.max(WORKSPACE_PADDING, Math.min(WORKSPACE_PADDING + CANVAS_WIDTH - element.size.width, newX));
        const constrainedY = Math.max(WORKSPACE_PADDING, Math.min(WORKSPACE_PADDING + CANVAS_HEIGHT - element.size.height, newY));
        
        updateElement(id as string, {
          position: { x: constrainedX, y: constrainedY },
        });
      }
    }
  });

  const bindResize = useDrag(({ movement: [mx, my], args: [id, corner] }) => {
    if (!isSpacePressed) {
      const element = elements.find((el) => el.id === id);
      if (!element) return;

      const scale = zoom / 100;
      let newWidth = element.size.width;
      let newHeight = element.size.height;
      let newX = element.position.x;
      let newY = element.position.y;

      const minWidth = 50;
      const minHeight = 50;
      const maxX = WORKSPACE_PADDING + CANVAS_WIDTH;
      const maxY = WORKSPACE_PADDING + CANVAS_HEIGHT;

      switch (corner) {
        case 'se':
          newWidth = Math.max(minWidth, Math.min(maxX - element.position.x, element.size.width + mx / scale));
          newHeight = Math.max(minHeight, Math.min(maxY - element.position.y, element.size.height + my / scale));
          break;
        case 'sw':
          newWidth = Math.max(minWidth, element.size.width - mx / scale);
          newHeight = Math.max(minHeight, Math.min(maxY - element.position.y, element.size.height + my / scale));
          newX = Math.max(WORKSPACE_PADDING, Math.min(element.position.x + element.size.width - minWidth, element.position.x + mx / scale));
          break;
        case 'ne':
          newWidth = Math.max(minWidth, Math.min(maxX - element.position.x, element.size.width + mx / scale));
          newHeight = Math.max(minHeight, element.size.height - my / scale);
          newY = Math.max(WORKSPACE_PADDING, Math.min(element.position.y + element.size.height - minHeight, element.position.y + my / scale));
          break;
        case 'nw':
          newWidth = Math.max(minWidth, element.size.width - mx / scale);
          newHeight = Math.max(minHeight, element.size.height - my / scale);
          newX = Math.max(WORKSPACE_PADDING, Math.min(element.position.x + element.size.width - minWidth, element.position.x + mx / scale));
          newY = Math.max(WORKSPACE_PADDING, Math.min(element.position.y + element.size.height - minHeight, element.position.y + my / scale));
          break;
      }

      updateElement(id as string, {
        position: { x: newX, y: newY },
        size: { width: newWidth, height: newHeight },
      });
    }
  });

  const handleZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(zoom + delta, MIN_ZOOM), MAX_ZOOM);
    if (newZoom !== zoom) {
      setZoom(newZoom);
      
      const scale = newZoom / zoom;
      const constrained = constrainPan(pan.x * scale, pan.y * scale);
      setPan(constrained.x, constrained.y);
    }
  };

  const handleElementClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement(id);
  };

  const handleBackgroundClick = () => {
    setSelectedElement(null);
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    const element = elements.find(el => el.id === id);
    if (!element) return;

    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedElements.findIndex(el => el.id === id);
    
    if (direction === 'up' && currentIndex < sortedElements.length - 1) {
      const nextElement = sortedElements[currentIndex + 1];
      updateElement(element.id, { zIndex: nextElement.zIndex });
      updateElement(nextElement.id, { zIndex: element.zIndex });
    } else if (direction === 'down' && currentIndex > 0) {
      const prevElement = sortedElements[currentIndex - 1];
      updateElement(element.id, { zIndex: prevElement.zIndex });
      updateElement(prevElement.id, { zIndex: element.zIndex });
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      
      addElement({
        id: uuidv4(),
        type: 'webcam',
        url: '', // Will be ignored since we're using stream
        stream: stream,
        position: { 
          x: WORKSPACE_PADDING + (CANVAS_WIDTH - 320) / 2,
          y: WORKSPACE_PADDING + (CANVAS_HEIGHT - 240) / 2
        },
        size: { width: 320, height: 240 },
        zIndex: elements.length + 1,
      });
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { width: 1920, height: 1080 } 
      });
      
      // Get the video track settings to determine actual size
      const videoTrack = stream.getVideoTracks()[0];
      const { width: streamWidth, height: streamHeight } = videoTrack.getSettings();
      
      // Calculate dimensions that fit within the canvas
      const maxWidth = CANVAS_WIDTH * 0.8;
      const maxHeight = CANVAS_HEIGHT * 0.8;
      const scale = Math.min(
        maxWidth / (streamWidth || 1920),
        maxHeight / (streamHeight || 1080)
      );
      const width = (streamWidth || 1920) * scale;
      const height = (streamHeight || 1080) * scale;
      
      addElement({
        id: uuidv4(),
        type: 'screen',
        url: '', // Will be ignored since we're using stream
        stream: stream,
        position: { 
          x: WORKSPACE_PADDING + (CANVAS_WIDTH - width) / 2,
          y: WORKSPACE_PADDING + (CANVAS_HEIGHT - height) / 2
        },
        size: { width, height },
        zIndex: elements.length + 1,
      });
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const handleRemoveElement = (id: string) => {
    const element = elements.find(el => el.id === id);
    if (element?.stream) {
      element.stream.getTracks().forEach(track => track.stop());
    }
    removeElement(id);
    setSelectedElement(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        addElement({
          id: uuidv4(),
          type: 'image',
          url: imageSrc,
          position: { 
            x: WORKSPACE_PADDING + (CANVAS_WIDTH - 320) / 2,
            y: WORKSPACE_PADDING + (CANVAS_HEIGHT - 240) / 2
          },
          size: { width: 320, height: 240 },
          zIndex: elements.length + 1,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="w-16 bg-gray-800 p-4 flex flex-col gap-4 shadow-lg z-50">
        <button
          onClick={startWebcam}
          className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white"
          title="Add Webcam"
        >
          <Camera size={20} />
        </button>
        <button
          onClick={startScreenShare}
          className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white"
          title="Share Screen"
        >
          <Monitor size={20} />
        </button>
        <label className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white cursor-pointer">
          <Upload size={20} />
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </label>
        {selectedElement && (
          <>
            <button
              onClick={() => handleRemoveElement(selectedElement)}
              className="p-2 bg-red-600 rounded-lg hover:bg-red-700 text-white"
              title="Remove Selected Element"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => moveLayer(selectedElement, 'up')}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white"
                title="Move Layer Up"
              >
                <ChevronUp size={20} />
              </button>
              <button
                onClick={() => moveLayer(selectedElement, 'down')}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white"
                title="Move Layer Down"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </>
        )}
        <div className="mt-auto">
          <button
            onClick={handleCopyOBSLink}
            className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-white relative group"
            title="Copy OBS Browser Source Link"
          >
            {showCopiedFeedback ? <CheckCheck size={20} /> : <Link size={20} />}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
              Copy OBS Link
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex gap-2 z-50 bg-gray-800 p-2 rounded-lg shadow-lg">
          <button
            onClick={centerView}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Center View"
          >
            <Maximize size={20} />
          </button>
          <div className="w-px bg-gray-600" />
          <button
            onClick={() => handleZoom(10)}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => handleZoom(-10)}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 w-48 h-48 bg-gray-800 rounded-lg overflow-hidden z-50 shadow-lg border border-gray-700">
          <div className="relative w-full h-full bg-gray-900">
            {/* Canvas area indicator in minimap */}
            <div
              className="absolute border border-gray-600"
              style={{
                left: `${(WORKSPACE_PADDING / BOARD_WIDTH) * 100}%`,
                top: `${(WORKSPACE_PADDING / BOARD_HEIGHT) * 100}%`,
                width: `${(CANVAS_WIDTH / BOARD_WIDTH) * 100}%`,
                height: `${(CANVAS_HEIGHT / BOARD_HEIGHT) * 100}%`,
              }}
            />
            {/* Viewport indicator */}
            <div
              className="absolute border-2 border-blue-500"
              style={{
                left: `${(-pan.x / BOARD_WIDTH) * 100}%`,
                top: `${(-pan.y / BOARD_HEIGHT) * 100}%`,
                width: `${(window.innerWidth / BOARD_WIDTH) * 100}%`,
                height: `${(window.innerHeight / BOARD_HEIGHT) * 100}%`,
                transform: `scale(${100 / zoom})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg z-50 shadow-lg">
          <span className="text-sm text-white">
            {Math.round(-pan.x)}, {Math.round(-pan.y)} • {Math.round(zoom)}%
          </span>
        </div>

        {isSpacePressed && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg z-50 shadow-lg">
            <Hand size={16} />
            <span className="text-sm">Navegação ativada</span>
          </div>
        )}

        <div
          ref={boardRef}
          {...bindCanvasDrag()}
          className="relative transform-gpu bg-gray-900"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
          }}
          onClick={handleBackgroundClick}
        >
          {/* Canvas area with grid */}
          <div
            className="absolute bg-gray-800"
            style={{
              left: WORKSPACE_PADDING,
              top: WORKSPACE_PADDING,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to right, rgba(255,255,255,0.1) ${GRID_SIZE}px, transparent ${GRID_SIZE}px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) ${GRID_SIZE}px, transparent ${GRID_SIZE}px)
              `,
              backgroundSize: `${GRID_SIZE / 4}px ${GRID_SIZE / 4}px, ${GRID_SIZE / 4}px ${GRID_SIZE / 4}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px`,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />

          {/* Elements */}
          {elements.map((element) => (
            <div
              key={element.id}
              {...bindDrag(element.id)}
              className={`absolute group ${selectedElement === element.id ? 'ring-2 ring-blue-500' : ''}`}
              style={{
                left: element.position.x,
                top: element.position.y,
                width: element.size.width,
                height: element.size.height,
                zIndex: element.zIndex,
              }}
              onClick={(e) => handleElementClick(element.id, e)}
            >
              {element.stream ? (
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={videoRef => {
                    if (videoRef && element.stream) {
                      videoRef.srcObject = element.stream;
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={element.url}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              )}
              
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500">
                <div {...bindResize(element.id, 'nw')} className="absolute -left-1 -top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize" />
                <div {...bindResize(element.id, 'ne')} className="absolute -right-1 -top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize" />
                <div {...bindResize(element.id, 'sw')} className="absolute -left-1 -bottom-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize" />
                <div {...bindResize(element.id, 'se')} className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};