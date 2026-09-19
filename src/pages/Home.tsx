import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import FilterPanel from '../components/FilterPanel';
import VisualizationPanel from '../components/VisualizationPanel';
import MemoryCard from '../components/MemoryCard';
import MemoryModal from '../components/MemoryModal';
import MergePreviewModal from '../components/MergePreviewModal';
import { useMemoryStore } from '../store/memoryStore';
import type { MergeSnapshot } from '../store/memoryStore';
import type { Filters } from '../utils/helpers';
import { filterMemories } from '../utils/helpers';
import type { SmellMemory } from '../utils/constants';
import type { MemoryInput } from '../store/memoryStore';
import { BookOpenCheck, GitMerge, Undo2, X } from 'lucide-react';

const defaultFilters: Filters = {
  smellType: '',
  season: '',
  emotion: '',
};

export default function Home() {
  const {
    memories,
    lastMerge,
    initIfEmpty,
    addMemory,
    updateMemory,
    deleteMemory,
    mergeMemories,
    undoMerge,
    clearMergeUndo,
  } = useMemoryStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SmellMemory | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeRecords, setMergeRecords] = useState<SmellMemory[]>([]);

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  // 记录被删除或合并后，同步清理已失效的勾选
  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => memories.some((m) => m.id === id)));
  }, [memories]);

  const filteredMemories = useMemo(
    () => filterMemories(memories, filters),
    [memories, filters],
  );

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const resetFilters = () => setFilters(defaultFilters);

  const openAddModal = () => { setEditing(null); setModalOpen(true); };
  const openEditModal = (m: SmellMemory) => { setEditing(m); setModalOpen(true); };

  const handleSubmit = (data: MemoryInput) => {
    if (editing) {
      updateMemory(editing.id, data);
    } else {
      addMemory(data);
    }
  };

  const handleDelete = (id: string) => {
    const target = memories.find((m) => m.id === id);
    const msg = `确认删除「${target?.location ?? '这段记忆'}」吗？`;
    if (window.confirm(msg)) {
      deleteMemory(id);
      if (expandedId === id) setExpandedId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const openMergePreview = () => {
    if (selectedIds.length < 2) return;
    // 打开预览时按原列表顺序冻结一份版本，确认前若有变动则整组失败
    const idSet = new Set(selectedIds);
    setMergeRecords(memories.filter((m) => idSet.has(m.id)));
    setMergeOpen(true);
  };

  const handleMergeConfirm = (snapshot: MergeSnapshot[]) =>
    mergeMemories(mergeRecords.map((r) => r.id), snapshot);

  const scrollToCard = (id: string) => {
    setExpandedId(id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-memory-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="min-h-screen">
      <Header onAdd={openAddModal} memoryCount={memories.length} />

      <main className="container max-w-6xl pb-20">
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
          resultCount={filteredMemories.length}
        />

        <VisualizationPanel memories={filteredMemories} onSelect={scrollToCard} />

        <section className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-hand text-2xl text-ochre-600 flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5" />
              气味档案
            </h2>
            <span className="text-xs text-ink-700/50">
              点击卡片展开完整回忆 · 勾选同源记忆可合并
            </span>
          </div>

          {filteredMemories.length === 0 ? (
            <div className="bg-paper-50/70 backdrop-blur rounded-3xl border-2 border-dashed border-paper-400 py-20 text-center">
              <div className="text-6xl mb-4 select-none">🍂</div>
              <h3 className="font-serif text-2xl text-ink-800 mb-2">
                {(filters.smellType || filters.season || filters.emotion)
                  ? '没有匹配的气味记忆'
                  : '还没有封存任何气味'}
              </h3>
              <p className="text-ink-700/60 max-w-md mx-auto mb-6">
                {(filters.smellType || filters.season || filters.emotion)
                  ? '换一组筛选条件试试？或者先封存一段新的气味'
                  : '空气中一定有让你难忘的味道——无论是衣柜里的樟木香，还是雨后操场的青草气'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={openAddModal} className="btn-primary">
                  封存第一段气味
                </button>
                {(filters.smellType || filters.season || filters.emotion) && (
                  <button onClick={resetFilters} className="btn-secondary">
                    清除筛选条件
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="masonry-grid">
              {filteredMemories.map((m, idx) => (
                <div key={m.id} data-memory-id={m.id}>
                  <MemoryCard
                    memory={m}
                    index={idx}
                    isExpanded={expandedId === m.id}
                    isSelected={selectedIds.includes(m.id)}
                    onSelect={() => toggleSelect(m.id)}
                    onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                    onEdit={() => openEditModal(m)}
                    onDelete={() => handleDelete(m.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="pb-10 pt-4 text-center text-xs text-ink-700/40 font-hand text-lg">
        <p>愿每一缕气味，都是打开旧时光的钥匙 · Scent Archive</p>
      </footer>

      <div className="fixed bottom-6 inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {lastMerge && (
          <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-ink-800/95 text-paper-50 shadow-paper-hover backdrop-blur animate-slideDown">
            <span className="text-sm">
              已将 <b className="text-ochre-200">{lastMerge.count}</b> 段同源记忆合并为 1 段
            </span>
            <button
              onClick={undoMerge}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-ochre-500 hover:bg-ochre-400 text-paper-50 text-sm font-medium transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              撤销
            </button>
            <button
              onClick={clearMergeUndo}
              title="放弃撤销"
              className="p-1.5 rounded-lg text-paper-50/60 hover:text-paper-50 hover:bg-paper-50/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-paper-50/95 border border-paper-300 shadow-paper-hover backdrop-blur animate-slideDown">
            <span className="text-sm text-ink-800">
              已勾选 <b className="text-ochre-600">{selectedIds.length}</b> 段记忆
            </span>
            <button
              onClick={openMergePreview}
              disabled={selectedIds.length < 2}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedIds.length >= 2
                  ? 'bg-ochre-500 hover:bg-ochre-600 text-paper-50 shadow-paper'
                  : 'bg-paper-200/50 text-ink-700/40 cursor-not-allowed'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              合并预览
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-sm text-ink-700/70 hover:bg-paper-200 transition-colors"
            >
              清空
            </button>
          </div>
        )}
      </div>

      <MemoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        editingData={editing}
      />

      <MergePreviewModal
        isOpen={mergeOpen}
        records={mergeRecords}
        onClose={() => setMergeOpen(false)}
        onConfirm={handleMergeConfirm}
        onSuccess={() => setSelectedIds([])}
      />
    </div>
  );
}
