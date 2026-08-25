import { create } from 'zustand';

/**
 * Non contiene i colori (mutati direttamente su `colors`, vedi applyTheme): serve solo a far
 * ri-renderizzare l'intera app quando il tema cambia, ovunque sia stato cambiato.
 */
interface ThemeStoreState {
  version: number;
  bump: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  version: 0,
  bump: () => set({ version: get().version + 1 }),
}));
