import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type TipoLog = 'encolado' | 'procesando' | 'completado' | 'bloqueado' | 'info';

interface LogEntry {
  tiempo: string;
  evento: string;
  tipo: TipoLog;
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

  private aplicarEvento(data: any): void {
    if (data.mutex          !== undefined) this.mutex          = data.mutex;
    if (data.vacias         !== undefined) this.vacias         = data.vacias;
    if (data.llenas         !== undefined) this.llenas         = data.llenas;
    if (data.bufferSize     !== undefined) this.bufferSize     = data.bufferSize;
    if (data.bufferCapacidad !== undefined) this.bufferCapacidad = data.bufferCapacidad;
    if (data.totalProcesados !== undefined) this.totalProcesados = data.totalProcesados;
    if (data.totalBloqueados !== undefined) this.totalBloqueados = data.totalBloqueados;

    if (data.mensaje) {
      this.agregarLog(data.mensaje, data.tipo ?? 'info');
    }
  }

  private agregarLog(evento: string, tipo: TipoLog): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const tiempo = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    this.log.unshift({ tiempo, evento, tipo });
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
    }).subscribe({
      next: () => this.agregarLog(`Encolado: ${butacaId}`, 'encolado'),
      error: () => this.agregarLog(`Error al encolar ${butacaId}`, 'bloqueado'),
      complete: () => {}
    });
  }

  encolarLote(): void {
    this.http.post(`${this.api}/encolar-lote`, { cantidad: 8 }).subscribe({
      next: () => this.agregarLog('Lote de 8 butacas encolado', 'encolado'),
      error: () => this.agregarLog('Error al encolar lote', 'bloqueado')
    });
  }
}
