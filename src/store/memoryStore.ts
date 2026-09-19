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

/** 打开合并预览时生成的版本快照，用于确认前校验记录是否被编辑或移除 */
export interface MergeSnapshot {
  id: string;
  updated_at: string;
}

export type MergeFailureReason = 'too_few' | 'not_found' | 'stale' | 'mismatch';

export type MergeResult =
  | { ok: true; mergedId: string; count: number }
  | { ok: false; reason: MergeFailureReason };

/** 一次成功合并留下的撤销信息：合并后的记录 id + 原始记录及其在原列表中的位置 */
export interface MergeUndoState {
  mergedId: string;
  count: number;
  originals: { memory: SmellMemory; index: number }[];
}

interface MemoryStore {
  memories: SmellMemory[];
  lastMerge: MergeUndoState | null;
  addMemory: (input: MemoryInput) => void;
  updateMemory: (id: string, input: MemoryInput) => void;
  deleteMemory: (id: string) => void;
  mergeMemories: (ids: string[], expected: MergeSnapshot[]) => MergeResult;
  undoMerge: () => void;
  clearMergeUndo: () => void;
  initIfEmpty: () => void;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
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
      mergeMemories: (ids, expected) => {
        const memories = get().memories;
        if (ids.length < 2) return { ok: false, reason: 'too_few' };

        // 按原列表顺序取出选中的记录及其位置
        const idSet = new Set(ids);
        const found: { memory: SmellMemory; index: number }[] = [];
        memories.forEach((m, index) => {
          if (idSet.has(m.id)) found.push({ memory: m, index });
        });
        if (found.length !== ids.length) return { ok: false, reason: 'not_found' };

        // 确认前校验：任一记录被编辑（updated_at 变化）或移除则整组失败
        const expectedMap = new Map(expected.map((s) => [s.id, s.updated_at]));
        for (const { memory } of found) {
          const snapshot = expectedMap.get(memory.id);
          if (snapshot === undefined || snapshot !== memory.updated_at) {
            return { ok: false, reason: 'stale' };
          }
        }

        // 地点与气味类型必须一致，否则整组拒绝，原记录和顺序不变
        const first = found[0].memory;
        const consistent = found.every(
          ({ memory }) =>
            memory.location === first.location &&
            memory.smell_type === first.smell_type,
        );
        if (!consistent) return { ok: false, reason: 'mismatch' };

        const merged: SmellMemory = {
          ...first,
          id: generateId(),
          // 保留最早封存时间
          created_at: found.reduce(
            (min, { memory }) => (memory.created_at < min ? memory.created_at : min),
            first.created_at,
          ),
          updated_at: new Date().toISOString(),
          // 强度取最大值
          intensity: Math.max(...found.map(({ memory }) => memory.intensity)),
          // 关联记忆按原顺序换行拼接
          memory_text: found.map(({ memory }) => memory.memory_text).join('\n'),
        };

        // 合并记录放到组内第一条的原始位置，其余移除，保持整体顺序
        const firstIndex = found[0].index;
        const next: SmellMemory[] = [];
        memories.forEach((m, i) => {
          if (!idSet.has(m.id)) next.push(m);
          else if (i === firstIndex) next.push(merged);
        });

        set({
          memories: next,
          lastMerge: { mergedId: merged.id, count: found.length, originals: found },
        });
        return { ok: true, mergedId: merged.id, count: found.length };
      },
      undoMerge: () => {
        const last = get().lastMerge;
        if (!last) return;
        // 移除合并记录，把原始记录按各自位置插回，恢复原顺序
        const rest = get().memories.filter((m) => m.id !== last.mergedId);
        const restored = [...rest];
        [...last.originals]
          .sort((a, b) => a.index - b.index)
          .forEach(({ memory, index }) => {
            restored.splice(Math.min(index, restored.length), 0, memory);
          });
        set({ memories: restored, lastMerge: null });
      },
      clearMergeUndo: () => set({ lastMerge: null }),
      initIfEmpty: () => {
        if (get().memories.length === 0) {
          set({ memories: mockMemories });
        }
      },
    }),
    {
      name: 'scent-memory-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
