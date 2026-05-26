import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LockScreen from './components/LockScreen';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LockScreen />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
