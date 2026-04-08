import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sala, ReservaRequest, ReservaResponse } from '../models/sala.model';

@Injectable({ providedIn: 'root' })
export class SalaService {

  private readonly base = `${environment.apiUrl}/salas`;

  constructor(private http: HttpClient) {}

  listarSalas(): Observable<Sala[]> {
    return this.http.get<Sala[]>(this.base);
  }

  obtenerSala(id: number): Observable<Sala> {
    return this.http.get<Sala>(`${this.base}/${id}`);
  }

  /**
   * Reserva asíncrona via cola — usada por la simulación (bots).
   * Siempre retorna exitoso=true, no refleja el resultado real del CAS.
   */
  reservar(salaId: number, req: ReservaRequest): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(`${this.base}/${salaId}/reservar`, req);
  }

  /**
   * Reserva SÍNCRONA con resultado real del CAS.
   * Usada por usuarios reales para mostrar victoria/derrota.
   *
   * exitoso=true  → el usuario ganó la carrera → toast verde
   * exitoso=false → otro hilo se adelantó      → toast rojo
   */
  reservarDirecto(salaId: number, req: ReservaRequest): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(`${this.base}/${salaId}/reservar-directo`, req);
  }

  confirmar(salaId: number, butacaId: string): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(
      `${this.base}/${salaId}/confirmar/${butacaId}`, {}
    );
  }

  liberar(salaId: number, butacaId: string): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(
      `${this.base}/${salaId}/liberar/${butacaId}`, {}
    );
  }
}
