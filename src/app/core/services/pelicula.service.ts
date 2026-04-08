import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pelicula, PeliculaRequest } from '../models/sala.model';

@Injectable({ providedIn: 'root' })
export class PeliculaService {

  private readonly base = `${environment.apiUrl}/peliculas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Pelicula[]> {
    return this.http.get<Pelicula[]>(this.base);
  }

  obtener(id: string): Observable<Pelicula> {
    return this.http.get<Pelicula>(`${this.base}/${id}`);
  }

  crear(req: PeliculaRequest): Observable<Pelicula> {
    return this.http.post<Pelicula>(this.base, req);
  }

  actualizar(id: string, req: PeliculaRequest): Observable<Pelicula> {
    return this.http.put<Pelicula>(`${this.base}/${id}`, req);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
