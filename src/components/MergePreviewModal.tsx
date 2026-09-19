import { useEffect } from 'react';
import { X, GitMerge, AlertTriangle, Layers, Clock, Flame, FileText } from 'lucide-react';
import type { MergeSnapshot } from '../store/memoryStore';
import { getSmellTypeInfo } from '../utils/constants';
import { formatDate } from '../utils/helpers';

interface Props {
  isOpen: boolean;
  beginError: string | null;
  pending: MergeSnapshot | null;
  confirmError: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function MergePreviewModal({ isOpen, beginError, pending, confirmError, onConfirm, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rejected = !!beginError || !!confirmError;
  const errorText = beginError ?? confirmError;
  const stype = pending ? getSmellTypeInfo(pending.preview.smell_type) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:p-6 overflow-y-auto">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div
        className="relative w-full max-w-2xl bg-paper-50 rounded-3xl shadow-2xl border border-paper-300 animate-slideDown"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.54 0 0 0 0 0.35 0 0 0 0 0.18 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-paper-200 rounded-t-3xl bg-paper-50/95 backdrop-blur">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-2">
              <GitMerge className="w-6 h-6 text-ochre-500" />
              同源合并预览
            </h2>
            <p className="text-sm text-ink-700/60 mt-0.5 font-hand">
              {rejected ? '这一组气味无法合并' : '确认后，选中的记忆将融合为一段'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {rejected && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-brick-500/10 border border-brick-400/40">
              <AlertTriangle className="w-5 h-5 text-brick-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-brick-600">{errorText}</div>
                <p className="text-sm text-ink-700/60 mt-1">
                  {beginError
                    ? '原有记录与顺序均未改动。请重新勾选地点和气味类型都一致的记忆。'
                    : '合并未执行，请回到列表重新勾选并生成预览。'}
                </p>
              </div>
            </div>
          )}

          {!rejected && pending && stype && (
            <>
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-paper-200 mb-4">
                  <span className="w-1.5 h-6 bg-ochre-500 rounded-full" />
                  <h3 className="font-hand text-xl text-ochre-600">合并后的气味</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-paper-100/70 border border-paper-200">
                    <div className="text-[11px] text-ink-700/50 mb-1">地点（同源）</div>
                    <div className="font-serif font-semibold text-ink-800">{pending.preview.location}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-paper-100/70 border border-paper-200">
                    <div className="text-[11px] text-ink-700/50 mb-1">气味类型（同源）</div>
                    <div className="font-medium text-ink-800">
                      <span className="mr-1">{stype.emoji}</span>{stype.label}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-paper-100/70 border border-paper-200">
                    <div className="text-[11px] text-ink-700/50 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 封存时间 · 保留最早
                    </div>
                    <div className="font-medium text-ink-800">{formatDate(pending.preview.created_at)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-paper-100/70 border border-paper-200">
                    <div className="text-[11px] text-ink-700/50 mb-1 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> 强度 · 取最大值
                    </div>
                    <div className="font-medium text-ink-800">
                      {pending.records.map((r) => r.intensity).join(' / ')}
                      <span className="mx-1.5 text-ochre-500">→</span>
                      <b className="text-ochre-600 font-serif text-lg">{pending.preview.intensity}</b>
                      <span className="text-xs text-ink-700/50"> / 10</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-4 rounded-xl bg-paper-100/70 border border-paper-200">
                  <div className="text-[11px] text-ink-700/50 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> 关联记忆 · 按原顺序换行拼接
                  </div>
                  <p className="font-serif text-[15px] leading-relaxed text-ink-800 whitespace-pre-wrap">
                    {pending.preview.memory_text || '（所选记忆都没有填写关联记忆）'}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-paper-200 mb-3">
                  <span className="w-1.5 h-6 bg-moss-500 rounded-full" />
                  <h3 className="font-hand text-xl text-moss-600 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    参与合并的 {pending.records.length} 段记忆
                  </h3>
                </div>
                <ol className="space-y-2">
                  {pending.records.map((r, idx) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-paper-100/60 border border-paper-200/80"
                    >
                      <span className="w-6 h-6 shrink-0 rounded-full bg-ochre-100 text-ochre-600 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-800 truncate">{r.location}</div>
                        <div className="text-[11px] text-ink-700/55">
                          强度 {r.intensity}/10 · 封存于 {formatDate(r.created_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-ink-700/55">
                  确认前若其中任何一条被编辑或移除，整组合并将自动失败。合并成功后可以撤销一次。
                </p>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-200">
            {rejected ? (
              <button onClick={onClose} className="btn-primary">知道了</button>
            ) : (
              <>
                <button onClick={onClose} className="btn-secondary">再想想</button>
                <button onClick={onConfirm} className="btn-primary inline-flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4" />
                  确认合并
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
