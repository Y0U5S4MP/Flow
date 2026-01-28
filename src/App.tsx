import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import ComicViewer from './pages/ComicViewer';
import Upload from './pages/Upload';

// Componente principal de la aplicación - Frameflow
// Gestor de cómics con editor visual avanzado
function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Contenedor principal con gradiente de fondo */}
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
          <Navbar />
          {/* Enrutamiento de páginas principales */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/comic/:id" element={<ComicViewer />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;