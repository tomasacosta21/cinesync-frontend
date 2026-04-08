import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proyeccion, ProyeccionRequest, SimulacionEstado } from '../models/sala.model';

@Injectable({ providedIn: 'root' })
export class ProyeccionService {

  private readonly base = `${environment.apiUrl}/proyecciones`;

  constructor(private http: HttpClient) {}

  listarPorSala(salaId: number): Observable<Proyeccion[]> {
    return this.http.get<Proyeccion[]>(`${this.base}/sala/${salaId}`);
  }

  listarTodas(): Observable<Proyeccion[]> {
    return this.http.get<Proyeccion[]>(this.base);
  }

  crear(req: ProyeccionRequest): Observable<Proyeccion> {
    return this.http.post<Proyeccion>(this.base, req);
  }

  actualizar(id: string, req: ProyeccionRequest): Observable<Proyeccion> {
    return this.http.put<Proyeccion>(`${this.base}/${id}`, req);
  }

  activar(id: string): Observable<Proyeccion> {
    return this.http.post<Proyeccion>(`${this.base}/${id}/activar`, {});
  }

  cancelar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Simulación ────────────────────────────────────────────

  iniciarSimulacion(salaId: number): Observable<SimulacionEstado> {
    return this.http.post<SimulacionEstado>(
      `${this.base}/simulacion/${salaId}/iniciar`, {}
    );
  }

  detenerSimulacion(salaId: number): Observable<SimulacionEstado> {
    return this.http.post<SimulacionEstado>(
      `${this.base}/simulacion/${salaId}/detener`, {}
    );
  }

  estadoSimulacion(salaId: number): Observable<SimulacionEstado> {
    return this.http.get<SimulacionEstado>(
      `${this.base}/simulacion/${salaId}/estado`
    );
  }
}
