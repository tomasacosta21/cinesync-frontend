export type EstadoButaca = 'LIBRE' | 'RESERVADA' | 'OCUPADA' | 'SELECCIONADA';

export interface Butaca {
  id: string;
  fila: number;
  columna: number;
  estado: EstadoButaca;
}

export interface Sala {
  id: number;
  nombre: string;
  filas: number;
  columnas: number;
  butacas: Butaca[];
}

export interface ReservaRequest {
  usuarioId: string;
  butacaId: string;
}

export interface ReservaResponse {
  exitoso: boolean;
  mensaje: string;
  butacaId: string;
  estado: string;
}

export interface SseEvent {
  salaId: number;
  butacaId: string;
  estado: EstadoButaca;
}

// ── Películas ─────────────────────────────────────────────────────────────────

export interface Pelicula {
  id: string;
  titulo: string;
  director: string;
  genero: string;
  duracionMinutos: number;
  sinopsis: string;
  imagen: string;
  clasificacion: string;
}

export interface PeliculaRequest {
  titulo: string;
  director: string;
  genero: string;
  duracionMinutos: number;
  sinopsis: string;
  imagen: string;
  clasificacion: string;
}

// ── Proyecciones ──────────────────────────────────────────────────────────────

export interface Proyeccion {
  id: string;
  salaId: number;
  salaNombre: string;
  peliculaId: string;
  peliculaTitulo: string;
  peliculaImagen: string;
  peliculaClasificacion: string;
  peliculaDuracionMinutos: number;
  fechaHora: string;
  precioBase: number;
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
}

export interface ProyeccionRequest {
  salaId: number;
  peliculaId: string;
  fechaHora: string;
  precioBase: number;
}

export interface SimulacionEstado {
  activa: boolean;
  salaId: number;
  duracionSegundos?: number;
  mensaje?: string;
}
