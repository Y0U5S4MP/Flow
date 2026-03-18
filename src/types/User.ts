// Interfaz que representa un usuario en Frameflow
// Roles:
//   - admin: acceso completo a todas las funciones
//   - creator: puede crear, editar y subir cómics
//   - reader: solo puede ver cómics
export interface User {
  id: string; // ID único del usuario
  username: string; // Nombre de usuario
  email: string; // Email del usuario
  role: 'admin' | 'creator' | 'reader'; // Rol que define permisos
  avatar?: string; // URL opcional de avatar del usuario
  createdAt: string; // Fecha de creación de la cuenta
}

// Interfaz que representa el estado actual de autenticación
// Se usa globalmente a través del AuthContext
export interface AuthState {
  user: User | null; // Usuario actual o null si no está autenticado
  isAuthenticated: boolean; // Si existe una sesión activa
  isLoading: boolean; // Si se está cargando el estado de autenticación
}