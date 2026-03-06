import { useEffect, useRef } from "react";

export default function PanoramaViewer({ imageURL, hotspots }) {

  const viewerRef = useRef(null);
  const viewerInstance = useRef(null);

  useEffect(() => {

    if (!viewerRef.current || !imageURL) return;

    // Destroy old viewer
    if (viewerInstance.current) {
      viewerInstance.current.destroy();
    }

    // Create viewer
    viewerInstance.current = window.pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: imageURL,
      autoLoad: true,

      pitch: 0,
      yaw: 0,
      hfov: 100,

      hotSpots: hotspots || [],

      showControls: false
    });

    // Start automatic rotation after panorama loads
    viewerInstance.current.on("load", () => {
      viewerInstance.current.startAutoRotate(-2);
    });

    // Cleanup
    return () => {
      viewerInstance.current?.destroy();
    };

  }, [imageURL, hotspots]);

  return (
    <div
      ref={viewerRef}
      style={{
        width: "100%",
        height: "100%"
      }}
    />
  );
}