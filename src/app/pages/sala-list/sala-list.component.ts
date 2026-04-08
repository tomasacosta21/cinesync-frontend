import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SalaService } from '../../core/services/sala.service';
import { Sala } from '../../core/models/sala.model';

@Component({
  selector: 'app-sala-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sala-list.component.html',
  styleUrls: ['./sala-list.component.scss']
})
export class SalaListComponent implements OnInit {

  salas: Sala[] = [];
  cargando = true;

  constructor(
    private salaService: SalaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.salaService.listarSalas().subscribe({
      next: salas => { this.salas = salas; this.cargando = false; },
      error: ()    => { this.cargando = false; }
    });
  }

  // Navega a la pantalla de proyecciones de la sala
  irAProyecciones(id: number): void {
    this.router.navigate(['/sala', id, 'proyecciones']);
  }

  contarPorEstado(sala: Sala, estado: string): number {
    return sala.butacas.filter(b => b.estado === estado).length;
  }

  porcentajeOcupacion(sala: Sala): number {
    const total    = sala.butacas.length;
    const ocupadas = this.contarPorEstado(sala, 'OCUPADA')
                   + this.contarPorEstado(sala, 'RESERVADA');
    return Math.round((ocupadas / total) * 100);
  }

  etiquetaSala(id: number): string {
    return ({ 1: 'ESTRENO', 2: 'EN CARTELERA', 3: 'CLÁSICA' } as Record<number,string>)[id] ?? '';
  }
}
