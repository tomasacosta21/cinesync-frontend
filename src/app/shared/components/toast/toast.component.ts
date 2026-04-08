import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastTipo = 'victoria' | 'derrota' | 'info';

export interface Toast {
  id: number;
  tipo: ToastTipo;
  titulo: string;
  mensaje: string;
  duracionMs: number;
}

/**
 * Componente de notificaciones tipo toast.
 *
 * Uso desde otro componente:
 *   @ViewChild(ToastComponent) toast!: ToastComponent;
 *   this.toast.victoria('A5');
 *   this.toast.derrota('A5');
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-contenedor" aria-live="polite">
      <div
        *ngFor="let t of toasts"
        class="toast"
        [class]="'toast toast--' + t.tipo"
        (click)="cerrar(t.id)"
      >
        <div class="toast-icono">
          <span *ngIf="t.tipo === 'victoria'">✓</span>
          <span *ngIf="t.tipo === 'derrota'">✕</span>
          <span *ngIf="t.tipo === 'info'">i</span>
        </div>
        <div class="toast-body">
          <p class="toast-titulo">{{ t.titulo }}</p>
          <p class="toast-mensaje">{{ t.mensaje }}</p>
        </div>
        <div class="toast-barra">
          <div
            class="toast-barra-fill"
            [style.animation-duration]="t.duracionMs + 'ms'"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-contenedor {
      position: fixed;
      bottom: 100px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      width: 320px;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      pointer-events: all;
      animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    .toast--victoria {
      background: #0d2318;
      border: 1px solid #2ec462;
      box-shadow: 0 0 24px rgba(46, 196, 98, 0.2);
    }

    .toast--derrota {
      background: #1a0a0a;
      border: 1px solid #e50914;
      box-shadow: 0 0 24px rgba(229, 9, 20, 0.2);
    }

    .toast--info {
      background: #0e1520;
      border: 1px solid #378add;
    }

    .toast-icono {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast--victoria .toast-icono {
      background: #2ec462;
      color: #000;
    }

    .toast--derrota .toast-icono {
      background: #e50914;
      color: #fff;
    }

    .toast--info .toast-icono {
      background: #378add;
      color: #fff;
    }

    .toast-body { flex: 1; }

    .toast-titulo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      margin: 0 0 3px;
      line-height: 1;
    }

    .toast--victoria .toast-titulo { color: #2ec462; }
    .toast--derrota .toast-titulo  { color: #ff4d4d; }
    .toast--info    .toast-titulo  { color: #85b7eb; }

    .toast-mensaje {
      font-size: 0.78rem;
      color: rgba(240, 236, 228, 0.7);
      margin: 0;
      line-height: 1.4;
    }

    /* Barra de progreso */
    .toast-barra {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      background: rgba(255,255,255,0.05);
    }

    .toast-barra-fill {
      height: 100%;
      width: 100%;
      animation: barraOut linear forwards;
      transform-origin: left;
    }

    @keyframes barraOut {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }

    .toast--victoria .toast-barra-fill { background: #2ec462; }
    .toast--derrota  .toast-barra-fill { background: #e50914; }
    .toast--info     .toast-barra-fill { background: #378add; }
  `]
})
export class ToastComponent implements OnDestroy {

  toasts: Toast[] = [];
  private contador = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Muestra toast de victoria — el usuario ganó la carrera */
  victoria(butacaId: string, duracionMs = 4000): void {
    this.agregar({
      tipo: 'victoria',
      titulo: `¡Butaca ${butacaId} reservada!`,
      mensaje: 'Ganaste la carrera. Completá tu compra antes de que expire la reserva.',
      duracionMs
    });
  }

  /** Muestra toast de derrota — otro usuario se adelantó */
  derrota(butacaId: string, duracionMs = 4000): void {
    this.agregar({
      tipo: 'derrota',
      titulo: 'Llegaste tarde',
      mensaje: `Otra persona reservó la butaca ${butacaId} antes que vos. Elegí otra.`,
      duracionMs
    });
  }

  /** Toast genérico informativo */
  info(titulo: string, mensaje: string, duracionMs = 3000): void {
    this.agregar({ tipo: 'info', titulo, mensaje, duracionMs });
  }

  private agregar(datos: Omit<Toast, 'id'>): void {
    const id = ++this.contador;
    this.toasts.push({ id, ...datos });

    const timer = setTimeout(() => this.cerrar(id), datos.duracionMs);
    this.timers.set(id, timer);
  }

  cerrar(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
  }

  ngOnDestroy(): void {
    this.timers.forEach(t => clearTimeout(t));
  }
}
