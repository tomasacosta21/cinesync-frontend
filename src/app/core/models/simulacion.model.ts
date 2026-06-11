// ── Simulación comparativa de técnicas de sincronización ─────────────────────

export type TecnicaSimulacion = 'CAS_ATOMICO' | 'REENTRANT_LOCK' | 'SYNCHRONIZED';
export type EscenarioSimulacion = 'BAJA_CONTENCION' | 'ALTA_CONTENCION';

export interface MetricasSimulacion {
  tecnica: TecnicaSimulacion;
  escenario: EscenarioSimulacion;
  workers: number;
  repeticion: number;        // 0 = promedio de las 5 corridas
  wallClockTimeMs: number;
  throughput: number;
  reservasExitosas: number;
  reservasFallidas: number;
  conflictosDetectados: number;
  latenciaPromedioMs: number;
  latenciaMaxMs: number;
  latenciaMinMs: number;
}

export interface EventoSimulacion {
  tipo: 'TECNICA_INICIADA' | 'BUTACA_ACTUALIZADA' | 'TECNICA_COMPLETADA' | 'SIMULACION_COMPLETA';
  butacaId?: string;
  tecnica?: TecnicaSimulacion;
  estado?: 'EN_PROCESO' | 'OCUPADA' | 'LIBRE';
  workers?: number;
  bloque?: number;
  totalBloques?: number;
  metricas?: MetricasSimulacion;
  resultados?: MetricasSimulacion[];
}

export interface IniciarSimulacionResponse {
  simulacionId: string;
  escenario: EscenarioSimulacion;
  workers: number[];
}

export interface ResultadosSimulacion {
  simulacionId: string;
  estado: 'EN_CURSO' | 'COMPLETADA' | 'ERROR';
  escenario: EscenarioSimulacion;
  workers: number[];
  mensajeError?: string;
  resultados: MetricasSimulacion[];
}
