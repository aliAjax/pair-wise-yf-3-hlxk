import { useEffect, useState } from 'react';
import { X, GitMerge, AlertTriangle, Check } from 'lucide-react';
import type { SmellMemory } from '../utils/constants';
import { getSmellTypeInfo } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import type { MergeResult, MergeSnapshot, MergeFailureReason } from '../store/memoryStore';

interface Props {
  isOpen: boolean;
  /** 打开预览时冻结的记录版本，按原列表顺序排列 */
  records: SmellMemory[];
  onClose: () => void;
  onConfirm: (snapshot: MergeSnapshot[]) => MergeResult;
  onSuccess: () => void;
}

const FAILURE_MESSAGES: Record<MergeFailureReason, string> = {
  too_few: '至少需要勾选两条记忆才能合并',
  not_found: '有记录在确认前被移除，本次合并已整组取消',
  stale: '有记录在确认前被编辑或移除，本次合并已整组取消',
  mismatch: '地点与气味类型必须一致，本组已整组拒绝',
};

export default function MergePreviewModal({ isOpen, records, onClose, onConfirm, onSuccess }: Props) {
  const [failReason, setFailReason] = useState<MergeFailureReason | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFailReason(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const first = records[0];
  const sameLocation = records.every((r) => r.location === first?.location);
  const sameType = records.every((r) => r.smell_type === first?.smell_type);
  const consistent = records.length >= 2 && sameLocation && sameType;

  // 预览生成的合并版本：最早封存时间、最大强度、关联记忆按原顺序换行拼接
  const preview = consistent
    ? {
        created_at: records.reduce(
          (min, r) => (r.created_at < min ? r.created_at : min),
          first.created_at,
        ),
        intensity: Math.max(...records.map((r) => r.intensity)),
        memory_text: records.map((r) => r.memory_text).join('\n'),
      }
    : null;

  const stype = consistent ? getSmellTypeInfo(first.smell_type) : null;

  const handleConfirm = () => {
    const snapshot: MergeSnapshot[] = records.map((r) => ({ id: r.id, updated_at: r.updated_at }));
    const result = onConfirm(snapshot);
    if (result.ok) {
      onSuccess();
      onClose();
    } else if ('reason' in result) {
      // 项目未开启 strict 模式，判别联合不会自动收窄，用 in 判断失败分支
      setFailReason(result.reason);
    }
  };

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
              已勾选 {records.length} 段记忆 · 地点与气味类型一致才能合并
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {failReason && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-brick-500/10 border border-brick-500/30 text-brick-600">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{FAILURE_MESSAGES[failReason]}</p>
                <p className="text-xs mt-1 opacity-80">原记录和顺序均未改动，关闭后可重新勾选。</p>
              </div>
            </div>
          )}

          {!consistent && !failReason && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-brick-500/10 border border-brick-500/30 text-brick-600">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">本组记忆无法合并（整组拒绝）</p>
                <p className="text-xs mt-1 opacity-80">
                  {!sameLocation && '勾选的记录地点不一致。'}
                  {!sameType && '勾选的记录气味类型不一致。'}
                  同源合并要求地点与气味类型完全一致，原记录和顺序保持不变。
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-hand text-lg text-ochre-600 mb-2">待合并的记忆（按原顺序）</h3>
            <div className="space-y-2">
              {records.map((r, idx) => {
                const rType = getSmellTypeInfo(r.smell_type);
                const locationDiff = !sameLocation && r.location !== first.location;
                const typeDiff = !sameType && r.smell_type !== first.smell_type;
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-paper-100/70 border border-paper-200"
                  >
                    <span className="w-6 h-6 shrink-0 rounded-full bg-ochre-100 text-ochre-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-sm font-medium ${locationDiff ? 'text-brick-600 underline decoration-wavy' : 'text-ink-800'}`}
                        >
                          {r.location}
                        </span>
                        <span
                          className={`scent-tag ${typeDiff ? 'ring-2 ring-brick-500/60' : ''} text-paper-50`}
                          style={{ backgroundColor: rType.color }}
                        >
                          {rType.emoji} {rType.label}
                        </span>
                        <span className="text-[11px] text-ink-700/50">
                          强度 {r.intensity}/10 · 封存于 {formatDate(r.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-700/60 mt-1 line-clamp-2 font-serif">
                        {r.memory_text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {consistent && preview && stype && (
            <div>
              <h3 className="font-hand text-lg text-moss-600 mb-2">合并后生成的版本</h3>
              <div className="p-4 rounded-2xl bg-moss-50 border border-moss-200">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="font-serif text-lg font-semibold text-ink-800">
                    {first.location}
                  </span>
                  <span className="scent-tag text-paper-50" style={{ backgroundColor: stype.color }}>
                    {stype.emoji} {stype.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div className="p-2.5 rounded-xl bg-paper-50/80 border border-paper-200">
                    <div className="text-[11px] text-ink-700/50 mb-0.5">封存时间（取最早）</div>
                    <div className="font-medium text-ink-800">{formatDate(preview.created_at)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-paper-50/80 border border-paper-200">
                    <div className="text-[11px] text-ink-700/50 mb-0.5">强度（取最大值）</div>
                    <div className="font-medium text-ochre-600 font-serif text-lg leading-snug">
                      {preview.intensity} / 10
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-paper-50/80 border border-paper-200">
                  <div className="text-[11px] text-ink-700/50 mb-1">关联记忆（按原顺序换行拼接）</div>
                  <p className="font-serif text-sm leading-relaxed text-ink-800 whitespace-pre-wrap">
                    {preview.memory_text}
                  </p>
                </div>
                <p className="text-[11px] text-ink-700/50 mt-2">
                  其余属性（来源猜测、湿度、季节、情绪、颜色联想等）沿用原顺序第一条的记录。
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-paper-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!consistent}
              className={`inline-flex items-center gap-1.5 ${
                consistent
                  ? 'btn-primary'
                  : 'bg-paper-200/50 text-ink-700/40 font-medium rounded-xl px-5 py-2.5 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              确认合并
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
