import React, { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Properties } from './components/Properties';
import { useEditorStore } from './stores/editorStore';
import './App.css';

function App() {
  const { createPresentation } = useEditorStore();

  useEffect(() => {
    // Initialize a new presentation on mount
    createPresentation('My Presentation');
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <h1>MatekHelp</h1>
        </div>
        <div className="app-actions">
          <button className="btn-primary">Save</button>
          <button className="btn-secondary">Export</button>
        </div>
      </header>

      <div className="app-layout">
        <Sidebar />
        
        <main className="app-main">
          <Toolbar />
          <Canvas />
        </main>

        <Properties />
      </div>
    </div>
  );
}

export default App;
