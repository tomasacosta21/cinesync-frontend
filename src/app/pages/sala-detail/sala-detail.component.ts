import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SalaService } from '../../core/services/sala.service';
import { SseService } from '../../core/services/sse.service';
import { ProyeccionService } from '../../core/services/proyeccion.service';
import { Sala, Butaca, EstadoButaca } from '../../core/models/sala.model';

@Component({
  selector: 'app-sala-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sala-detail.component.html',
  styleUrls: ['./sala-detail.component.scss']
})
export class SalaDetailComponent implements OnInit, OnDestroy {

  sala?: Sala;
  cargando = true;
  error = false;

  seleccionadas = new Set<string>();

  // ── Simulación ────────────────────────────────────────────
  simulacionActiva = false;
  timerSegundos    = 0;
  timerDisplay     = '5:00';
  private timerInterval?: ReturnType<typeof setInterval>;
  private readonly DURACION_SIMULACION = 300; // 5 minutos

  // ── Race condition manual ─────────────────────────────────
  raceEnProgreso = false;
  raceResultado  = '';

  ultimoEvento = '';

  private salaId!: number;
  private sseSub?: Subscription;

  readonly userId = 'usr-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salaService: SalaService,
    private sseService: SseService,
    private proyeccionService: ProyeccionService
  ) {}

  ngOnInit(): void {
    this.salaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarSala();
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    this.sseService.desconectar();
    this.pararTimer();
    // Detiene la simulación en el backend al salir de la sala
    this.proyeccionService.detenerSimulacion(this.salaId).subscribe();
  }

  // ── Carga ─────────────────────────────────────────────────

  private cargarSala(): void {
    this.salaService.obtenerSala(this.salaId).subscribe({
      next: sala => {
        this.sala = sala;
        this.cargando = false;
        this.suscribirSSE();
        this.iniciarSimulacion(); // arranca automáticamente
      },
      error: () => { this.cargando = false; this.error = true; }
    });
  }

  // ── SSE ───────────────────────────────────────────────────

  private suscribirSSE(): void {
    this.sseSub = this.sseService.conectar(this.salaId).subscribe({
      next: evento => {
        if (!this.sala || evento.salaId !== this.salaId) return;
        const butaca = this.sala.butacas.find(b => b.id === evento.butacaId);
        if (!butaca) return;
        if (evento.estado !== 'LIBRE' && this.seleccionadas.has(butaca.id)) {
          this.seleccionadas.delete(butaca.id);
        }
        butaca.estado = evento.estado;
        this.ultimoEvento = `${evento.butacaId} → ${evento.estado}`;
        setTimeout(() => { this.ultimoEvento = ''; }, 2000);
      },
      error: () => setTimeout(() => this.suscribirSSE(), 3000)
    });
  }

  // ── Simulación automática ─────────────────────────────────

  private iniciarSimulacion(): void {
    this.proyeccionService.iniciarSimulacion(this.salaId).subscribe({
      next: () => {
        this.simulacionActiva = true;
        this.timerSegundos    = this.DURACION_SIMULACION;
        this.actualizarDisplay();
        this.timerInterval = setInterval(() => {
          this.timerSegundos--;
          this.actualizarDisplay();
          if (this.timerSegundos <= 0) {
            this.simulacionActiva = false;
            this.pararTimer();
          }
        }, 1000);
      },
      error: () => {} // silencioso si el backend no está disponible
    });
  }

  private pararTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private actualizarDisplay(): void {
    const m = Math.floor(this.timerSegundos / 60);
    const s = this.timerSegundos % 60;
    this.timerDisplay = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Race condition manual ─────────────────────────────────

  simularRaceCondition(): void {
    if (!this.sala || this.raceEnProgreso) return;
    const libre = this.sala.butacas.find(b => b.estado === 'LIBRE');
    if (!libre) { this.raceResultado = 'No hay butacas libres.'; return; }

    this.raceEnProgreso = true;
    this.raceResultado  = '';
    const N = 15;
    let exitosos = 0, completados = 0;

    Array.from({ length: N }).forEach((_, i) => {
      this.salaService.reservar(this.salaId, {
        usuarioId: `race-${i}`,
        butacaId:  libre.id
      }).subscribe(resp => {
        if (resp.exitoso) exitosos++;
        if (++completados === N) {
          this.raceResultado = `${N} hilos compitieron por ${libre.id} → ${exitosos} ganó (esperado: 1)`;
          this.raceEnProgreso = false;
          setTimeout(() => { this.raceResultado = ''; }, 5000);
        }
      });
    });
  }

  // ── Butacas ───────────────────────────────────────────────

  seleccionar(butaca: Butaca): void {
    if (butaca.estado === 'OCUPADA' || butaca.estado === 'RESERVADA') return;
    if (this.seleccionadas.has(butaca.id)) {
      this.seleccionadas.delete(butaca.id);
      butaca.estado = 'LIBRE';
    } else {
      this.seleccionadas.add(butaca.id);
      butaca.estado = 'SELECCIONADA';
    }
  }

  confirmarReserva(): void {
    if (!this.sala || !this.seleccionadas.size) return;
    const ids = Array.from(this.seleccionadas);
    this.seleccionadas.clear();
    ids.forEach(butacaId => {
      this.salaService.reservar(this.salaId, { usuarioId: this.userId, butacaId })
        .subscribe(resp => {
          if (resp.exitoso) {
            setTimeout(() => this.salaService.confirmar(this.salaId, butacaId).subscribe(), 1500);
          } else {
            const b = this.sala?.butacas.find(b => b.id === butacaId);
            if (b) b.estado = 'LIBRE';
          }
        });
    });
  }

  cancelarSeleccion(): void {
    if (!this.sala) return;
    this.seleccionadas.forEach(id => {
      const b = this.sala!.butacas.find(b => b.id === id);
      if (b) b.estado = 'LIBRE';
    });
    this.seleccionadas.clear();
  }

  // ── Helpers ───────────────────────────────────────────────

  clasePara(butaca: Butaca): string {
    return this.seleccionadas.has(butaca.id) ? 'seleccionada' : butaca.estado.toLowerCase();
  }

  contarPorEstado(estado: EstadoButaca | string): number {
    return this.sala?.butacas.filter(b => b.estado === estado).length ?? 0;
  }

  idsSeleccionadas(): string { return Array.from(this.seleccionadas).join(', '); }

  filas(): number[] {
    return this.sala ? Array.from({ length: this.sala.filas }, (_, i) => i) : [];
  }

  butacasDeFila(filaIdx: number): Butaca[] {
    return this.sala?.butacas.filter(b => b.fila === filaIdx) ?? [];
  }

  letraFila(filaIdx: number): string { return String.fromCharCode(65 + filaIdx); }

  volver(): void { this.router.navigate(['/sala', this.salaId, 'proyecciones']); }
}
