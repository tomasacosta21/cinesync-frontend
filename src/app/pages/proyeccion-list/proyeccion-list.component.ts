import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalaService } from '../../core/services/sala.service';
import { ProyeccionService } from '../../core/services/proyeccion.service';
import { PeliculaService } from '../../core/services/pelicula.service';
import { Sala, Proyeccion, Pelicula, ProyeccionRequest } from '../../core/models/sala.model';

type Vista = 'cartelera' | 'abm';

@Component({
  selector: 'app-proyeccion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './proyeccion-list.component.html',
  styleUrls: ['./proyeccion-list.component.scss']
})
export class ProyeccionListComponent implements OnInit, OnDestroy {

  sala?: Sala;
  proyecciones: Proyeccion[] = [];
  peliculas: Pelicula[] = [];
  cargando = true;
  salaId!: number;

  vista: Vista = 'cartelera';

  // ABM form
  formulario: ProyeccionRequest = {
    salaId: 0,
    peliculaId: '',
    fechaHora: '',
    precioBase: 2000
  };
  editandoId: string | null = null;
  guardando = false;
  mensajeForm = '';

  // Película seleccionada para el detalle en cartelera
  peliculaSeleccionada: Pelicula | null = null;
  proyeccionSeleccionada: Proyeccion | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salaService: SalaService,
    private proyeccionService: ProyeccionService,
    private peliculaService: PeliculaService
  ) {}

  ngOnInit(): void {
    this.salaId = Number(this.route.snapshot.paramMap.get('id'));
    this.formulario.salaId = this.salaId;
    this.cargarDatos();
  }

  ngOnDestroy(): void {}

  // ── Carga ─────────────────────────────────────────────────

  cargarDatos(): void {
    this.cargando = true;
    this.salaService.obtenerSala(this.salaId).subscribe(sala => {
      this.sala = sala;
    });
    this.peliculaService.listar().subscribe(p => this.peliculas = p);
    this.proyeccionService.listarPorSala(this.salaId).subscribe({
      next: p => { this.proyecciones = p; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  // ── Navegación ────────────────────────────────────────────

  volver(): void {
    this.router.navigate(['/salas']);
  }

  seleccionarProyeccion(proyeccion: Proyeccion): void {
    this.proyeccionSeleccionada = proyeccion;
    const pelicula = this.peliculas.find(p => p.id === proyeccion.peliculaId);
    this.peliculaSeleccionada = pelicula ?? null;
  }

  irASala(proyeccion: Proyeccion): void {
    // Activa la proyección (resetea butacas) y navega a la sala
    this.proyeccionService.activar(proyeccion.id).subscribe(() => {
      this.router.navigate(['/sala', this.salaId]);
    });
  }

  // ── ABM ───────────────────────────────────────────────────

  abrirFormNuevo(): void {
    this.editandoId = null;
    this.mensajeForm = '';
    this.formulario = {
      salaId:     this.salaId,
      peliculaId: this.peliculas[0]?.id ?? '',
      fechaHora:  this.fechaHoraDefault(),
      precioBase: 2000
    };
  }

  abrirFormEditar(p: Proyeccion): void {
    this.editandoId = p.id;
    this.mensajeForm = '';
    this.formulario = {
      salaId:     p.salaId,
      peliculaId: p.peliculaId,
      fechaHora:  p.fechaHora.substring(0, 16),
      precioBase: p.precioBase
    };
    this.vista = 'abm';
  }

  guardar(): void {
    if (!this.formulario.peliculaId || !this.formulario.fechaHora) {
      this.mensajeForm = 'Completá todos los campos requeridos.';
      return;
    }
    this.guardando = true;
    this.mensajeForm = '';

    const req: ProyeccionRequest = {
      ...this.formulario,
      fechaHora: this.formulario.fechaHora + ':00'
    };

    const op$ = this.editandoId
      ? this.proyeccionService.actualizar(this.editandoId, req)
      : this.proyeccionService.crear(req);

    op$.subscribe({
      next: () => {
        this.guardando = false;
        this.editandoId = null;
        this.mensajeForm = '¡Guardado con éxito!';
        this.cargarDatos();
        setTimeout(() => { this.mensajeForm = ''; this.vista = 'cartelera'; }, 1500);
      },
      error: () => {
        this.guardando = false;
        this.mensajeForm = 'Error al guardar. Intentá de nuevo.';
      }
    });
  }

  cancelar(id: string): void {
    if (!confirm('¿Cancelar esta proyección?')) return;
    this.proyeccionService.cancelar(id).subscribe(() => this.cargarDatos());
  }

  // ── Helpers ───────────────────────────────────────────────

  peliculaDe(proyeccion: Proyeccion): Pelicula | undefined {
    return this.peliculas.find(p => p.id === proyeccion.peliculaId);
  }

  private fechaHoraDefault(): string {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 16);
  }

  formatearFecha(fechaHora: string): string {
    const d = new Date(fechaHora);
    return d.toLocaleDateString('es-AR', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  formatearHora(fechaHora: string): string {
    const d = new Date(fechaHora);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  badgeEstado(estado: string): string {
    return ({
      PROGRAMADA: 'badge--prog',
      EN_CURSO:   'badge--curso',
      FINALIZADA: 'badge--fin',
      CANCELADA:  'badge--canc'
    } as Record<string,string>)[estado] ?? '';
  }

  etiquetaEstado(estado: string): string {
    return ({
      PROGRAMADA: 'Programada',
      EN_CURSO:   'En curso',
      FINALIZADA: 'Finalizada',
      CANCELADA:  'Cancelada'
    } as Record<string,string>)[estado] ?? estado;
  }

  precioFormateado(precio: number): string {
    return `$${precio.toLocaleString('es-AR')}`;
  }
}
