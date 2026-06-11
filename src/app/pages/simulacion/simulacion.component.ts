import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SimulacionService } from '../../core/services/simulacion.service';
import {
  EscenarioSimulacion,
  EventoSimulacion,
  MetricasSimulacion,
  TecnicaSimulacion
} from '../../core/models/simulacion.model';

interface ButacaVisual {
  id: string;
  fila: number;
  columna: number;
}

/**
 * Laboratorio de sincronización: compara CAS, ReentrantLock y synchronized
 * sobre una réplica de Sala Estrenos (120 butacas), mostrando la grilla en
 * vivo vía SSE y las métricas de cada técnica al completarse.
 */
@Component({
  selector: 'app-simulacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simulacion.component.html',
  styleUrls: ['./simulacion.component.scss']
})
export class SimulacionComponent implements OnDestroy {

  readonly FILAS = 10;
  readonly COLUMNAS = 12;
  readonly butacas: ButacaVisual[] = this.crearGrilla();

  readonly escenarios: { valor: EscenarioSimulacion; etiqueta: string; detalle: string }[] = [
    { valor: 'BAJA_CONTENCION', etiqueta: 'Baja contención', detalle: '120 solicitudes · ratio 1:1' },
    { valor: 'ALTA_CONTENCION', etiqueta: 'Alta contención', detalle: '500 solicitudes · ratio 4:1' }
  ];
  readonly opcionesWorkers: { valor: number | null; etiqueta: string }[] = [
    { valor: 1, etiqueta: '1' },
    { valor: 2, etiqueta: '2' },
    { valor: 4, etiqueta: '4' },
    { valor: 8, etiqueta: '8' },
    { valor: null, etiqueta: '1·2·4·8 (speedup)' }
  ];

  escenario: EscenarioSimulacion = 'BAJA_CONTENCION';
  workers: number | null = 4;

  corriendo = false;
  simulacionId = '';
  exportable = false;
  errorMsg = '';

  tecnicaActiva: TecnicaSimulacion | null = null;
  workersActivos = 0;
  progreso = 0;          // 0–100, por bloques (técnica × workers) completados
  private totalBloques = 3;
  reseteando = false;    // animación de 1s al limpiar la grilla entre técnicas

  /** butacaId → clase CSS ('en-proceso' | 'ocupada-cas' | 'ocupada-lock' | 'ocupada-sync') */
  estadosButacas = new Map<string, string>();

  /** Filas de la tabla: promedio de las 5 corridas por técnica/workers. */
  filasMetricas: MetricasSimulacion[] = [];

  private sseSub?: Subscription;
  private resetTimeout?: ReturnType<typeof setTimeout>;
  private completaRecibida = false;

  constructor(private simulacionService: SimulacionService, private router: Router) {}

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    this.simulacionService.desconectar();
    if (this.resetTimeout) clearTimeout(this.resetTimeout);
  }

  // ── Control ───────────────────────────────────────────────────────────

  iniciar(): void {
    if (this.corriendo) return;
    this.corriendo = true;
    this.exportable = false;
    this.errorMsg = '';
    this.filasMetricas = [];
    this.estadosButacas.clear();
    this.tecnicaActiva = null;
    this.progreso = 0;
    this.completaRecibida = false;

    this.simulacionService.iniciar(this.escenario, this.workers).subscribe({
      next: resp => {
        this.simulacionId = resp.simulacionId;
        this.suscribirProgreso();
      },
      error: () => {
        this.corriendo = false;
        this.errorMsg = 'No se pudo iniciar la simulación. ¿Está corriendo el backend?';
      }
    });
  }

  private suscribirProgreso(): void {
    this.sseSub = this.simulacionService.conectarProgreso(this.simulacionId).subscribe({
      next: ev => this.procesarEvento(ev),
      complete: () => {
        // El stream se cierra al terminar; si no llegó SIMULACION_COMPLETA
        // (corte de red), recuperamos los resultados por REST.
        if (!this.completaRecibida) this.recuperarResultados();
      }
    });
  }

  private procesarEvento(ev: EventoSimulacion): void {
    switch (ev.tipo) {
      case 'TECNICA_INICIADA':
        this.tecnicaActiva = ev.tecnica ?? null;
        this.workersActivos = ev.workers ?? 0;
        if (ev.totalBloques) this.totalBloques = ev.totalBloques;
        break;

      case 'BUTACA_ACTUALIZADA':
        if (!ev.butacaId) return;
        if (ev.estado === 'EN_PROCESO') {
          this.estadosButacas.set(ev.butacaId, 'en-proceso');
        } else if (ev.estado === 'OCUPADA') {
          this.estadosButacas.set(ev.butacaId, this.claseOcupada(ev.tecnica));
        } else {
          this.estadosButacas.delete(ev.butacaId);
        }
        break;

      case 'TECNICA_COMPLETADA':
        if (ev.metricas) this.filasMetricas = [...this.filasMetricas, ev.metricas];
        this.progreso = Math.round(this.filasMetricas.length / this.totalBloques * 100);
        this.animarReset();
        break;

      case 'SIMULACION_COMPLETA':
        this.completaRecibida = true;
        this.corriendo = false;
        this.exportable = true;
        this.tecnicaActiva = null;
        this.progreso = 100;
        break;
    }
  }

  private recuperarResultados(): void {
    if (!this.simulacionId) { this.corriendo = false; return; }
    this.simulacionService.resultados(this.simulacionId).subscribe({
      next: res => {
        this.corriendo = res.estado === 'EN_CURSO';
        this.exportable = res.estado === 'COMPLETADA';
        if (res.estado === 'ERROR') {
          this.errorMsg = res.mensajeError ?? 'La simulación terminó con error.';
        }
      },
      error: () => { this.corriendo = false; }
    });
  }

  exportarExcel(): void {
    window.open(this.simulacionService.urlExportacion(this.simulacionId), '_blank');
  }

  // ── Grilla ────────────────────────────────────────────────────────────

  /** Reset visual entre técnicas: 1s de fade y la grilla vuelve a gris. */
  private animarReset(): void {
    this.reseteando = true;
    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    this.resetTimeout = setTimeout(() => {
      this.estadosButacas.clear();
      this.reseteando = false;
    }, 1000);
  }

  private crearGrilla(): ButacaVisual[] {
    const grilla: ButacaVisual[] = [];
    for (let f = 0; f < this.FILAS; f++) {
      for (let c = 0; c < this.COLUMNAS; c++) {
        grilla.push({ id: String.fromCharCode(65 + f) + (c + 1), fila: f, columna: c });
      }
    }
    return grilla;
  }

  private claseOcupada(tecnica?: TecnicaSimulacion): string {
    switch (tecnica) {
      case 'CAS_ATOMICO':    return 'ocupada-cas';
      case 'REENTRANT_LOCK': return 'ocupada-lock';
      case 'SYNCHRONIZED':   return 'ocupada-sync';
      default:               return 'ocupada-cas';
    }
  }

  // ── Helpers de template ───────────────────────────────────────────────

  clasePara(butaca: ButacaVisual): string {
    return this.estadosButacas.get(butaca.id) ?? 'libre';
  }

  etiquetaTecnica(tecnica: TecnicaSimulacion | null | undefined): string {
    switch (tecnica) {
      case 'CAS_ATOMICO':    return 'CAS';
      case 'REENTRANT_LOCK': return 'LOCK';
      case 'SYNCHRONIZED':   return 'SYNC';
      default:               return '—';
    }
  }

  trackButaca(_: number, b: ButacaVisual): string { return b.id; }

  volver(): void { this.router.navigate(['/salas']); }
}
