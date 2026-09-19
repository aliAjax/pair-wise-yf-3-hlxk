import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SmellMemory, Season, SmellType, Emotion } from '../utils/constants';
import { generateId } from '../utils/helpers';
import { mockMemories } from '../data/mockData';

export interface MemoryInput {
  location: string;
  source_guess: string;
  intensity: number;
  humidity: number;
  season: Season;
  smell_type: SmellType;
  memory_text: string;
  color_association: string;
  emotion: Emotion;
  want_again: boolean;
}

export interface MergeSnapshot {
  ids: string[];
  records: SmellMemory[];
  preview: SmellMemory;
}

export interface LastMerge {
  mergedId: string;
  originals: { record: SmellMemory; index: number }[];
}

export interface MergeResult {
  ok: boolean;
  reason?: string;
}

interface MemoryStore {
  memories: SmellMemory[];
  pendingMerge: MergeSnapshot | null;
  lastMerge: LastMerge | null;
  addMemory: (input: MemoryInput) => void;
  updateMemory: (id: string, input: MemoryInput) => void;
  deleteMemory: (id: string) => void;
  initIfEmpty: () => void;
  beginMerge: (ids: string[]) => MergeResult;
  cancelMerge: () => void;
  confirmMerge: () => MergeResult;
  undoMerge: () => void;
  dismissMergeNotice: () => void;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
      pendingMerge: null,
      lastMerge: null,
      addMemory: (input) => {
        const now = new Date().toISOString();
        const newMem: SmellMemory = {
          id: generateId(),
          ...input,
          created_at: now,
          updated_at: now,
        };
        set({ memories: [newMem, ...get().memories] });
      },
      updateMemory: (id, input) => {
        set({
          memories: get().memories.map((m) =>
            m.id === id
              ? { ...m, ...input, updated_at: new Date().toISOString() }
              : m,
          ),
        });
      },
      deleteMemory: (id) => {
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },
      initIfEmpty: () => {
        if (get().memories.length === 0) {
          set({ memories: mockMemories });
        }
      },
      beginMerge: (ids) => {
        const { memories } = get();
        const uniqueIds = [...new Set(ids)];
        if (uniqueIds.length < 2) {
          return { ok: false, reason: '至少勾选两条记忆才能合并' };
        }
        const records = uniqueIds
          .map((id) => memories.find((m) => m.id === id))
          .filter((m): m is SmellMemory => !!m)
          .sort((a, b) => memories.indexOf(a) - memories.indexOf(b));
        if (records.length !== uniqueIds.length) {
          return { ok: false, reason: '部分记忆已不存在，整组无法合并' };
        }
        const location = records[0].location.trim();
        const smellType = records[0].smell_type;
        const sameLocation = records.every((r) => r.location.trim() === location);
        const sameType = records.every((r) => r.smell_type === smellType);
        if (!sameLocation || !sameType) {
          // 整组拒绝：不改动任何记录与顺序
          return { ok: false, reason: '地点与气味类型必须一致，整组已拒绝' };
        }
        const preview: SmellMemory = {
          ...records[0],
          id: generateId(),
          intensity: Math.max(...records.map((r) => r.intensity)),
          memory_text: records
            .map((r) => r.memory_text)
            .filter((t) => t.trim().length > 0)
            .join('\n'),
          created_at: records.map((r) => r.created_at).sort()[0],
          updated_at: new Date().toISOString(),
        };
        set({
          pendingMerge: {
            ids: records.map((r) => r.id),
            records: records.map((r) => ({ ...r })),
            preview,
          },
        });
        return { ok: true };
      },
      cancelMerge: () => {
        set({ pendingMerge: null });
      },
      confirmMerge: () => {
        const { memories, pendingMerge } = get();
        if (!pendingMerge) {
          return { ok: false, reason: '没有待确认的合并' };
        }
        // 确认前校验：任一记录被编辑或移除，则整组失败
        for (const snap of pendingMerge.records) {
          const current = memories.find((m) => m.id === snap.id);
          if (!current || current.updated_at !== snap.updated_at) {
            set({ pendingMerge: null });
            return { ok: false, reason: '确认前有记录被编辑或移除，整组合并失败' };
          }
        }
        const insertIndex = memories.findIndex((m) => m.id === pendingMerge.ids[0]);
        const idSet = new Set(pendingMerge.ids);
        const next = memories.filter((m) => !idSet.has(m.id));
        next.splice(insertIndex, 0, pendingMerge.preview);
        set({
          memories: next,
          pendingMerge: null,
          lastMerge: {
            mergedId: pendingMerge.preview.id,
            originals: pendingMerge.records.map((r) => ({
              record: r,
              index: memories.findIndex((m) => m.id === r.id),
            })),
          },
        });
        return { ok: true };
      },
      undoMerge: () => {
        const { memories, lastMerge } = get();
        if (!lastMerge) return;
        const next = memories.filter((m) => m.id !== lastMerge.mergedId);
        // 按原位置逐条插回，精确恢复合并前的顺序
        for (const { record, index } of lastMerge.originals) {
          next.splice(Math.min(index, next.length), 0, record);
        }
        set({ memories: next, lastMerge: null });
      },
      dismissMergeNotice: () => {
        set({ lastMerge: null });
      },
    }),
    {
      name: 'scent-memory-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        memories: state.memories,
        lastMerge: state.lastMerge,
      }),
    },
  ),
);
