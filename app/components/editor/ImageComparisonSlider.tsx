// Image Comparison Slider - Before/After with draggable divider
import { useState, useRef, useEffect, memo } from "react";

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const ImageComparisonSlider = memo(({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "Processed",
}: ImageComparisonSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current || !isDragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("mouseup", () => setIsDragging(false));
      document.addEventListener("touchend", () => setIsDragging(false));
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", () => setIsDragging(false));
      document.removeEventListener("touchend", () => setIsDragging(false));
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "500px",
        overflow: "hidden",
        borderRadius: "8px",
        cursor: "ew-resize",
        userSelect: "none",
      }}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
    >
      {/* After Image (processed) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <img
          src={afterImage}
          alt={afterLabel}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            backgroundColor: "rgba(0, 128, 96, 0.9)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
        >
          {afterLabel}
        </div>
      </div>

      {/* Before Image (original) with clip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          transition: isDragging ? "none" : "clip-path 0.1s ease",
        }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            backgroundColor: "rgba(98, 112, 124, 0.9)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
        >
          {beforeLabel}
        </div>
      </div>

      {/* Slider divider */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${sliderPosition}%`,
          width: "4px",
          backgroundColor: "white",
          cursor: "ew-resize",
          transform: "translateX(-50%)",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
          transition: isDragging ? "none" : "left 0.1s ease",
        }}
      >
        {/* Slider handle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "48px",
            height: "48px",
            backgroundColor: "white",
            borderRadius: "50%",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            color: "#6D7175",
          }}
        >
          ⟷
        </div>
      </div>
    </div>
  );
});

ImageComparisonSlider.displayName = "ImageComparisonSlider";
