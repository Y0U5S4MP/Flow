import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Punto de entrada de la aplicación Frameflow
// Renderiza el componente raíz en el elemento HTML con id 'root'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
