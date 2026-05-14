import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type TipoLog = 'encolado' | 'procesando' | 'completado' | 'bloqueado' | 'info';

interface LogEntry {
  tiempo: string;
  evento: string;
  tipo: TipoLog;
  explicacion: string;
}

interface Particula {
  id: number;
  direction: 'in' | 'out';
}

type WorkerEstado = 'activo' | 'bloqueado' | 'idle';

interface EstadoSemaforos {
  mutexPermisos?: number;
  vaciasPermisos?: number;
  llenasPermisos?: number;
  itemsEnCola?: number;
  capacidad?: number;
  totalConsumidas?: number;
  totalBloqueosConsumidor?: number;
  ultimoEvento?: string;
  workerId: string | null;
}

@Component({
  selector: 'app-semaforo-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './semaforo-monitor.component.html',
  styleUrls: ['./semaforo-monitor.component.scss']
})
export class SemaforoMonitorComponent implements OnInit, OnDestroy {

  private readonly api = `${environment.apiUrl}/semaforos`;
  private eventSource?: EventSource;
  private reconectarTimeout?: ReturnType<typeof setTimeout>;

  log: LogEntry[] = [];

  mutex = 1;
  vacias = 10;
  llenas = 0;
  bufferSize = 0;
  bufferCapacidad = 10;
  totalProcesados = 0;
  totalBloqueados = 0;

  workers = new Map<string, WorkerEstado>();
  workerIds: string[] = [];

  particulas: Particula[] = [];
  private particulaSeq = 0;

  get mutexBloqueado(): boolean { return this.mutex === 0; }
  get vaciasBloqueado(): boolean { return this.vacias === 0; }
  get llenasBloqueado(): boolean { return this.llenas === 0; }

  get bufferSlots(): boolean[] {
    return Array.from({ length: this.bufferCapacidad }, (_, i) => i < this.bufferSize);
  }

  constructor(
    private http: HttpClient,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.conectarSSE();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
    if (this.reconectarTimeout) clearTimeout(this.reconectarTimeout);
  }

  trackParticula = (_: number, p: Particula): number => p.id;
  trackWorkerId  = (_: number, id: string): string => id;

  workerEstado(id: string): WorkerEstado {
    return this.workers.get(id) ?? 'idle';
  }

  workerNombreCorto(id: string): string {
    return id.length > 6 ? id.slice(-6) : id;
  }

  private tipoDeEvento(evento: string): TipoLog {
    if (evento.includes('BLOQUEADO'))  return 'bloqueado';
    if (evento.includes('PRODUCIDO'))  return 'encolado';
    if (evento.includes('PROCESANDO')) return 'procesando';
    if (evento.includes('CONSUMIDO'))  return 'completado';
    return 'info';
  }

  private explicacionDe(evento: string): string {
    if (evento.includes('PRODUCIDO'))  return 'Productor ejecutó vacias.acquire() y depositó en buffer';
    if (evento.includes('CONSUMIDO'))  return 'Consumidor retiró del buffer y liberó un slot';
    if (evento.includes('PROCESANDO')) return 'Worker en sección crítica — mutex tomado';
    if (evento.includes('BLOQUEADO')) {
      const e = evento.toLowerCase();
      if (e.includes('productor') || e.includes('vacias') || e.includes('lleno')) {
        return 'Buffer lleno — productor suspendido en vacias.acquire()';
      }
      return 'Buffer vacío — worker suspendido en llenas.acquire()';
    }
    return '';
  }

  private animarEvento(evento: string): void {
    if (evento.includes('PRODUCIDO')) {
      this.spawnParticula('in');
    } else if (evento.includes('CONSUMIDO')) {
      this.spawnParticula('out');
    }
  }

  private spawnParticula(direction: 'in' | 'out'): void {
    const id = ++this.particulaSeq;
    this.particulas = [...this.particulas, { id, direction }];
    setTimeout(() => {
      this.zone.run(() => {
        this.particulas = this.particulas.filter(p => p.id !== id);
      });
    }, 850);
  }

  private conectarSSE(): void {
    this.eventSource?.close();
    this.eventSource = new EventSource(`${this.api}/eventos`);

    const handleData = (ev: MessageEvent) => {
      this.zone.run(() => {
        try {
          this.aplicarEvento(JSON.parse(ev.data));
        } catch { /* ignorar errores de parse */ }
      });
    };

    this.eventSource.onmessage = handleData;
    this.eventSource.addEventListener('estado-semaforos', handleData);

    this.eventSource.onerror = () => {
      this.zone.run(() => this.agregarLog('Conexión SSE perdida, reconectando...', 'info'));
      this.eventSource?.close();
      this.eventSource = undefined;
      this.reconectarTimeout = setTimeout(() => this.conectarSSE(), 3000);
    };
  }

  private aplicarEvento(data: EstadoSemaforos): void {
    if (data.mutexPermisos  !== undefined) this.mutex           = data.mutexPermisos;
    if (data.vaciasPermisos !== undefined) this.vacias          = data.vaciasPermisos;
    if (data.llenasPermisos !== undefined) this.llenas          = data.llenasPermisos;
    if (data.itemsEnCola    !== undefined) this.bufferSize      = data.itemsEnCola;
    if (data.capacidad      !== undefined) this.bufferCapacidad = data.capacidad;
    if (data.totalConsumidas !== undefined) this.totalProcesados = data.totalConsumidas;
    if (data.totalBloqueosConsumidor !== undefined) this.totalBloqueados = data.totalBloqueosConsumidor;

    const wid = data.workerId;
    if (wid && data.ultimoEvento) {
      if (!this.workerIds.includes(wid)) {
        this.workerIds = [...this.workerIds, wid];
      }
      if (data.ultimoEvento.includes('PROCESANDO')) {
        this.workers.set(wid, 'activo');
      } else if (data.ultimoEvento.includes('CONSUMIDO')) {
        this.workers.set(wid, 'idle');
      } else if (data.ultimoEvento.includes('BLOQUEADO')) {
        this.workers.set(wid, 'bloqueado');
      }
    }

    if (data.ultimoEvento) {
      this.agregarLog(data.ultimoEvento, this.tipoDeEvento(data.ultimoEvento));
      this.animarEvento(data.ultimoEvento);
    }
}

  private agregarLog(evento: string, tipo: TipoLog): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const tiempo = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const explicacion = this.explicacionDe(evento);
    this.log.unshift({ tiempo, evento, tipo, explicacion });
    if (this.log.length > 50) this.log.pop();
  }

  encolarUno(): void {
    const filas = ['A', 'B', 'C', 'D', 'E', 'F'];
    const fila = filas[Math.floor(Math.random() * filas.length)];
    const col  = Math.floor(Math.random() * 10) + 1;
    const butacaId = `${fila}${col}`;

    this.http.post(`${this.api}/encolar`, {
      salaId: 1,
      butacaId,
      usuarioId: 'demo-' + Math.random().toString(36).slice(2, 5)
    }, { responseType: 'text' }).subscribe({
      next: () => this.agregarLog(`Encolado: ${butacaId}`, 'encolado'),
      error: () => this.agregarLog(`Error al encolar ${butacaId}`, 'bloqueado'),
      complete: () => {}
    });
  }

  encolarLote(): void {
    this.http.post(`${this.api}/encolar-lote`, { cantidad: 8 }, { responseType: 'text' }).subscribe({
      next: () => this.agregarLog('Lote de 8 butacas encolado', 'encolado'),
      error: () => this.agregarLog('Error al encolar lote', 'bloqueado')
    });
  }
}
