import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EscenarioSimulacion,
  EventoSimulacion,
  IniciarSimulacionResponse,
  ResultadosSimulacion
} from '../models/simulacion.model';

/**
 * Cliente de la API de simulación comparativa (CAS vs ReentrantLock vs synchronized).
 * Maneja su propio EventSource, independiente del SSE de salas.
 */
@Injectable({ providedIn: 'root' })
export class SimulacionService {

  private readonly base = `${environment.apiUrl}/simulacion`;
  private eventSource?: EventSource;

  constructor(private http: HttpClient, private zone: NgZone) {}

  /** workers null → barrido completo 1, 2, 4, 8 (habilita la hoja Speedup del Excel). */
  iniciar(escenario: EscenarioSimulacion, workers: number | null): Observable<IniciarSimulacionResponse> {
    return this.http.post<IniciarSimulacionResponse>(`${this.base}/iniciar`, { escenario, workers });
  }

  conectarProgreso(simulacionId: string): Observable<EventoSimulacion> {
    return new Observable(observer => {
      this.eventSource = new EventSource(`${this.base}/progreso/${simulacionId}`);

      this.eventSource.addEventListener('simulacion', (ev: MessageEvent) => {
        this.zone.run(() => {
          try {
            observer.next(JSON.parse(ev.data) as EventoSimulacion);
          } catch {
            observer.error('Error al parsear evento SSE de simulación');
          }
        });
      });

      this.eventSource.onerror = () => {
        // El backend cierra el stream al completar la simulación: no es un error
        // si ya recibimos SIMULACION_COMPLETA; el componente decide cómo tratarlo.
        this.zone.run(() => observer.complete());
      };

      return () => this.desconectar();
    });
  }

  desconectar(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
  }

  resultados(simulacionId: string): Observable<ResultadosSimulacion> {
    return this.http.get<ResultadosSimulacion>(`${this.base}/resultados/${simulacionId}`);
  }

  urlExportacion(simulacionId: string): string {
    return `${this.base}/exportar/${simulacionId}`;
  }
}
