import React, { useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const WORKSPACE_PADDING = 200;

export const ViewerBoard: React.FC = () => {
  const { elements } = useBoardStore();

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <div
        className="relative"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
      >
        {elements.map((element) => (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: element.position.x - WORKSPACE_PADDING,
              top: element.position.y - WORKSPACE_PADDING,
              width: element.size.width,
              height: element.size.height,
              zIndex: element.zIndex,
            }}
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
          </div>
        ))}
      </div>
    </div>
  );
};