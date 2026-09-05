/**
 * Service to handle F5 Methodology Data Persistence
 * Simulates Supabase Tables structure using localStorage
 */

const TABLES = {
  F1: 'f1_diagnostico',
  F2: 'f2_estruturacao',
  F3: 'f3_acompanhamento',
  F4: 'f4_planejamento',
  F5: 'f5_governanca',
  STATE: 'f5_execution_state'
};

export const F5Service = {
  // Initialize or Get State
  getState: () => {
    const state = localStorage.getItem(TABLES.STATE);
    if (!state) {
      const initialState = {
        currentPhase: 1,
        phases: {
          1: { status: 'in_progress', unlocked: true },
          2: { status: 'locked', unlocked: false },
          3: { status: 'locked', unlocked: false },
          4: { status: 'locked', unlocked: false },
          5: { status: 'locked', unlocked: false }
        }
      };
      localStorage.setItem(TABLES.STATE, JSON.stringify(initialState));
      return initialState;
    }
    return JSON.parse(state);
  },

  updateState: (newState) => {
    localStorage.setItem(TABLES.STATE, JSON.stringify(newState));
  },

  // Generic Save Data
  savePhaseData: (phaseNumber, data) => {
    const tableName = Object.values(TABLES)[phaseNumber - 1];
    localStorage.setItem(tableName, JSON.stringify(data));
  },

  // Generic Get Data
  getPhaseData: (phaseNumber) => {
    const tableName = Object.values(TABLES)[phaseNumber - 1];
    return JSON.parse(localStorage.getItem(tableName) || '{}');
  },

  // Complete Phase Logic - CRITICAL for sequential flow
  completePhase: (phaseNumber) => {
    const state = F5Service.getState();
    const phaseKey = parseInt(phaseNumber);
    
    console.log(`[F5Service] Completing Phase ${phaseKey}...`);

    // 1. Mark current as completed
    if (state.phases[phaseKey]) {
        state.phases[phaseKey].status = 'completed';
    }
    
    // 2. Unlock next if exists
    if (phaseKey < 5) {
      const nextPhase = phaseKey + 1;
      if (state.phases[nextPhase]) {
          state.phases[nextPhase].unlocked = true;
          // Only set to in_progress if it was previously locked
          if (state.phases[nextPhase].status === 'locked') {
              state.phases[nextPhase].status = 'in_progress';
          }
          state.currentPhase = nextPhase;
          console.log(`[F5Service] Phase ${nextPhase} Unlocked!`);
      }
    }

    F5Service.updateState(state);
    return state;
  },
  
  // Generate Mock Report
  generateReport: (phaseNumber) => {
    const data = F5Service.getPhaseData(phaseNumber);
    console.log(`Generating Report for Phase ${phaseNumber}`, data);
    return {
      success: true,
      url: `/reports/phase-${phaseNumber}-${Date.now()}.pdf`,
      generatedAt: new Date().toISOString()
    };
  }
};