import 'reflect-metadata'
import './App.css';
import { initiateGame } from '@hology/core/gameplay';
import { createRef, useEffect } from 'react';
import shaders from './shaders'
import actors from './actors'
import Game from './services/game'

function App() {
  const containerRef = createRef<HTMLDivElement>()
  useEffect(() => {
    const runtime = initiateGame(Game, {
      element: containerRef.current, 
      sceneName: 'demo', 
      dataDir: 'data', 
      shaders,
      actors
    })
    return () => runtime.shutdown()
  }, [containerRef])
  return (
    <div className="App">
      <div ref={containerRef}></div>
    </div>
  );
}

export default App;