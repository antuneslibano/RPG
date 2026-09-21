import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EventBus } from '@/core/events/eventBus';
import type { GameState } from '@/domain/world/gameState';
import { SaveService } from '@/persistence/saveService';
import type { SavePartition, SaveSlotMeta } from '@/persistence/schema';
import { AsyncStorageAdapter } from '@/persistence/asyncStorageAdapter';
import { createNewGame, type NewGameConfig } from '@/game/newGame';
import { LocalNarrativeProvider, type NarrativeProvider } from '@/narrative/narrativeProvider';
import { setHapticsEnabled } from '@/ui/components/haptics';
import { telemetry } from '@/shell/telemetry';

const DEFAULT_SLOT = 'slot_1';

interface GameContextValue {
  state: GameState | null;
  bus: EventBus;
  narrative: NarrativeProvider;
  slots: SaveSlotMeta[];
  busy: boolean;
  lastError: string | null;
  /** Bumps whenever the mutable state tree changed, forcing a re-render. */
  revision: number;
  startNewGame: (config: NewGameConfig) => Promise<void>;
  loadGame: (slotId?: string) => Promise<boolean>;
  saveGame: (partitions?: SavePartition[]) => Promise<void>;
  deleteSlot: (slotId: string) => Promise<void>;
  refreshSlots: () => Promise<void>;
  /** Runs a mutation against the state and schedules an incremental save. */
  mutate: (fn: (state: GameState) => void, partitions?: SavePartition[]) => void;
  exitToMenu: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const busRef = useRef(new EventBus({ onError: (error, name) => telemetry.error(`evento ${name}`, error) }));
  const saveRef = useRef(new SaveService(new AsyncStorageAdapter()));
  const narrativeRef = useRef<NarrativeProvider>(new LocalNarrativeProvider());
  const stateRef = useRef<GameState | null>(null);

  const [revision, setRevision] = useState(0);
  const [slots, setSlots] = useState<SaveSlotMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSlots = useCallback(async () => {
    const index = await saveRef.current.readIndex();
    setSlots(index.slots);
  }, []);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const saveGame = useCallback(async (partitions?: SavePartition[]) => {
    const state = stateRef.current;
    if (!state) return;
    if (partitions) saveRef.current.markDirty(...partitions);
    if (!saveRef.current.hasPendingWrites()) return;
    try {
      const report = await saveRef.current.save(DEFAULT_SLOT, state);
      telemetry.save(report.durationMs, report.partitionsWritten.length);
      busRef.current.emit('GAME_SAVED', { slotId: report.slotId, durationMs: report.durationMs });
      await refreshSlots();
    } catch (error) {
      telemetry.error('falha ao salvar', error);
      setLastError('Não foi possível salvar o progresso.');
    }
  }, [refreshSlots]);

  /** Debounced autosave: mutations are frequent, writes should not be. */
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveGame();
    }, 1200);
  }, [saveGame]);

  const mutate = useCallback((fn: (state: GameState) => void, partitions?: SavePartition[]) => {
    const state = stateRef.current;
    if (!state) return;
    try {
      fn(state);
    } catch (error) {
      telemetry.error('falha em mutação de estado', error);
      setLastError('Algo deu errado ao aplicar essa ação.');
      return;
    }
    saveRef.current.markDirty(...(partitions ?? ['player', 'world', 'items']));
    setHapticsEnabled(state.settings.hapticsEnabled);
    bump();
    scheduleAutosave();
  }, [bump, scheduleAutosave]);

  const startNewGame = useCallback(async (config: NewGameConfig) => {
    setBusy(true);
    setLastError(null);
    try {
      const started = Date.now();
      const state = createNewGame(config, busRef.current);
      telemetry.generation('mundo', Date.now() - started, Object.keys(state.npcs).length);
      stateRef.current = state;
      saveRef.current.markAllDirty();
      await saveRef.current.save(DEFAULT_SLOT, state, { full: true });
      await refreshSlots();
      bump();
    } catch (error) {
      telemetry.error('falha ao criar novo jogo', error);
      setLastError('Não foi possível criar o mundo.');
    } finally {
      setBusy(false);
    }
  }, [bump, refreshSlots]);

  const loadGame = useCallback(async (slotId = DEFAULT_SLOT) => {
    setBusy(true);
    setLastError(null);
    try {
      const hasSave = await saveRef.current.hasSave(slotId);
      if (!hasSave) {
        setLastError('Nenhum save encontrado.');
        return false;
      }
      // A throwaway world provides the shape; every partition is overwritten.
      const template = createNewGame({
        heroName: 'temp', classId: 'druid', originId: 'origin_village',
        presentation: 'androgynous', allocatedAttributes: {}, seedLabel: 'template-0000',
      });
      const report = await saveRef.current.load(slotId, template);
      if (!report.state) {
        setLastError('Save corrompido e sem backup utilizável.');
        return false;
      }
      if (report.issues.length > 0) telemetry.validation(report.issues.length);
      if (report.recoveredPartitions.length > 0) {
        setLastError(`Save parcialmente recuperado (${report.recoveredPartitions.join(', ')}).`);
      }
      stateRef.current = report.state;
      setHapticsEnabled(report.state.settings.hapticsEnabled);
      bump();
      return true;
    } catch (error) {
      telemetry.error('falha ao carregar', error);
      setLastError('Não foi possível carregar o save.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [bump]);

  const deleteSlot = useCallback(async (slotId: string) => {
    await saveRef.current.deleteSlot(slotId);
    if (stateRef.current) stateRef.current = null;
    await refreshSlots();
    bump();
  }, [bump, refreshSlots]);

  const exitToMenu = useCallback(() => {
    void saveGame();
    stateRef.current = null;
    bump();
  }, [bump, saveGame]);

  const value = useMemo<GameContextValue>(() => ({
    state: stateRef.current,
    bus: busRef.current,
    narrative: narrativeRef.current,
    slots,
    busy,
    lastError,
    revision,
    startNewGame,
    loadGame,
    saveGame,
    deleteSlot,
    refreshSlots,
    mutate,
    exitToMenu,
  }), [slots, busy, lastError, revision, startNewGame, loadGame, saveGame, deleteSlot, refreshSlots, mutate, exitToMenu]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame deve ser usado dentro de GameProvider');
  return context;
}

/** Narrow hook for screens that cannot render without a live game. */
export function useGameState(): GameState {
  const { state } = useGame();
  if (!state) throw new Error('Nenhum jogo ativo');
  return state;
}
