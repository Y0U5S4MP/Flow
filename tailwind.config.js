// Configuración de Tailwind CSS para Frameflow
// Define el contenido a procesar y la estructura del tema
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], // Archivos a procesar por Tailwind
  theme: {
    extend: {}, // Extensiones de tema personalizadas (opcional)
  },
  plugins: [], // Plugins de Tailwind (opcional)
};
