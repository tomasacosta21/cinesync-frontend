import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SseEvent } from '../models/sala.model';

@Injectable({ providedIn: 'root' })
export class SseService {

  private eventSource?: EventSource;

  constructor(private zone: NgZone) {}

  /**
   * Abre una conexión SSE con el backend y emite cada evento como Observable.
   * NgZone.run() es necesario para que Angular detecte los cambios recibidos
   * desde fuera del ciclo de detección (los eventos SSE llegan en un callback externo).
   */
  conectar(salaId: number): Observable<SseEvent> {
    return new Observable(observer => {
      this.eventSource = new EventSource(
        `${environment.apiUrl}/eventos/sala/${salaId}`
      );

      this.eventSource.addEventListener('butaca-actualizada', (ev: MessageEvent) => {
        this.zone.run(() => {
          try {
            observer.next(JSON.parse(ev.data) as SseEvent);
          } catch {
            observer.error('Error al parsear evento SSE');
          }
        });
      });

      this.eventSource.onerror = () => {
        this.zone.run(() => observer.error('SSE connection lost'));
      };

      return () => this.desconectar();
    });
  }

  desconectar(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
  }
}
