import { useEffect, useRef } from "react";
import { Canvas } from "./Canvas";

function App() {
  const containerRef = useRef<HTMLDivElement>()

  useEffect(() => {
    const container = containerRef.current
    // const { clientHeight, clientWidth } = container
    const canvasE = document.getElementById('canvas') as HTMLCanvasElement
    const canvas = new Canvas(canvasE);

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = (entries[0] && entries[0].contentRect) || {}
      console.log(">>> aa", width, height);
      canvas.resize(width, height)
    })

    resizeObserver.observe(container)
  }, [])
  
  return (
    <div
      ref={containerRef}
      style={{
        // position: 'absolute',
        height: '100vh',
        width: '100%',
        // border: '1px solid red',
        background: '#d3c3c3'
      }}
    >
      <canvas id="canvas"></canvas>
    </div>
  );
}

export default App;
