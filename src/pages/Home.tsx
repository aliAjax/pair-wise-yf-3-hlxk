import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import FilterPanel from '../components/FilterPanel';
import VisualizationPanel from '../components/VisualizationPanel';
import MemoryCard from '../components/MemoryCard';
import MemoryModal from '../components/MemoryModal';
import MergePreviewModal from '../components/MergePreviewModal';
import { useMemoryStore } from '../store/memoryStore';
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
    pendingMerge,
    lastMerge,
    initIfEmpty,
    addMemory,
    updateMemory,
    deleteMemory,
    beginMerge,
    cancelMerge,
    confirmMerge,
    undoMerge,
    dismissMergeNotice,
  } = useMemoryStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SmellMemory | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [beginError, setBeginError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  // 记录被移除（删除/合并）后，同步清理勾选与展开状态
  useEffect(() => {
    const alive = new Set(memories.map((m) => m.id));
    setSelectedIds((ids) => ids.filter((id) => alive.has(id)));
    setExpandedId((id) => (id && !alive.has(id) ? null : id));
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

  const scrollToCard = (id: string) => {
    setExpandedId(id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-memory-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const toggleMergeMode = () => {
    setMergeMode((v) => !v);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const openMergePreview = () => {
    const res = beginMerge(selectedIds);
    setBeginError(res.ok ? null : res.reason ?? '无法合并');
    setConfirmError(null);
    setMergeModalOpen(true);
  };

  const closeMergeModal = () => {
    cancelMerge();
    setMergeModalOpen(false);
    setBeginError(null);
    setConfirmError(null);
  };

  const handleConfirmMerge = () => {
    const res = confirmMerge();
    if (res.ok) {
      setMergeModalOpen(false);
      setBeginError(null);
      setConfirmError(null);
      setMergeMode(false);
      setSelectedIds([]);
    } else {
      setConfirmError(res.reason ?? '合并失败');
    }
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
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-700/50 hidden sm:inline">
                {mergeMode ? '勾选地点与气味类型一致的记忆' : '点击卡片展开完整回忆'}
              </span>
              <button
                onClick={toggleMergeMode}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  mergeMode
                    ? 'bg-ochre-500 text-paper-50 shadow-paper'
                    : 'bg-paper-100 text-ochre-600 border border-paper-300 hover:bg-paper-200'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                {mergeMode ? '退出合并' : '同源合并'}
              </button>
            </div>
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
                    onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                    onEdit={() => openEditModal(m)}
                    onDelete={() => handleDelete(m.id)}
                    selectable={mergeMode}
                    selected={selectedIds.includes(m.id)}
                    onSelectToggle={() => toggleSelect(m.id)}
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
          <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-ink-800/95 text-paper-50 shadow-2xl border border-ink-700 animate-slideDown">
            <span className="text-sm">
              🧪 已合并 <b className="text-ochre-300">{lastMerge.originals.length}</b> 段同源气味
            </span>
            <button
              onClick={undoMerge}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-ochre-500 hover:bg-ochre-600 text-paper-50 text-xs font-medium transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              撤销合并
            </button>
            <button
              onClick={dismissMergeNotice}
              aria-label="关闭提示"
              className="p-1.5 rounded-lg text-paper-50/60 hover:text-paper-50 hover:bg-paper-50/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {mergeMode && (
          <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-paper-50/95 backdrop-blur shadow-2xl border border-paper-300 animate-slideDown">
            <span className="text-sm text-ink-800">
              已选 <b className="text-ochre-600">{selectedIds.length}</b> 条
              {selectedIds.length < 2 && (
                <span className="text-xs text-ink-700/50 ml-1">（至少勾选 2 条）</span>
              )}
            </span>
            <button
              onClick={openMergePreview}
              disabled={selectedIds.length < 2}
              className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                selectedIds.length >= 2
                  ? 'bg-ochre-500 hover:bg-ochre-600 text-paper-50 shadow-paper'
                  : 'bg-paper-200/60 text-ink-700/40 cursor-not-allowed'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              生成合并预览
            </button>
            <button
              onClick={toggleMergeMode}
              aria-label="退出合并模式"
              className="p-1.5 rounded-lg text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
            >
              <X className="w-4 h-4" />
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
        isOpen={mergeModalOpen}
        beginError={beginError}
        pending={pendingMerge}
        confirmError={confirmError}
        onConfirm={handleConfirmMerge}
        onClose={closeMergeModal}
      />
    </div>
  );
}
