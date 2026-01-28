import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para Frameflow
// Incluye plugin de React y optimización de dependencias
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'], // Excluir lucide-react de la pre-optimización
  },
});
