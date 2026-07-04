import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const FORMAT_LABELS: Record<string, string> = {
  swiss: '瑞士轮',
  double_elim: '双败淘汰',
  round_robin: '组内循环',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  upcoming: { label: '即将开始', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  in_progress: { label: '进行中', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  completed: { label: '已结束', className: 'bg-cs2-text-muted/10 text-cs2-text-muted border-cs2-text-muted/20' },
};

export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setTournaments(await api.tournaments.list()); } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">赛事中心</h1>
          <p className="text-cs2-text-muted text-sm mt-1">管理与追踪所有 CS2 赛事</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ 创建赛事</button>
      </div>

      {showCreate && <CreateTournamentForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}

      {loading ? (
        <div className="text-cs2-text-muted">加载中...</div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-10 text-cs2-text-muted">
          <p className="text-lg mb-2">暂无赛事</p>
          <p className="text-sm">点击"创建赛事"开始组织比赛</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map((t: any) => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.upcoming;
            return (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="card hover:border-cs2-accent/50 transition-colors block">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <span className={`tag ${st.className}`}>{st.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-cs2-text-muted">
                  <span className="tag">{t.stage_type === 'group' ? '小组赛' : '淘汰赛'}</span>
                  <span className="tag">小组: {FORMAT_LABELS[t.group_format]}</span>
                  <span className="tag">淘汰: {FORMAT_LABELS[t.knockout_format]}</span>
                  <span>{t.player_count ?? 0} 名选手</span>
                </div>
                {t.description && <p className="text-sm text-cs2-text-muted mt-3 line-clamp-2">{t.description}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateTournamentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stageType, setStageType] = useState('knockout');
  const [groupFormat, setGroupFormat] = useState('round_robin');
  const [knockoutFormat, setKnockoutFormat] = useState('swiss');
  const [teamSize, setTeamSize] = useState(1);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true); setError('');
    try {
      await api.tournaments.create({
        name: name.trim(), description: description.trim(),
        stage_type: stageType,
        group_format: groupFormat,
        knockout_format: knockoutFormat,
        team_size: teamSize,
        max_participants: maxParticipants,
      });
      onCreated();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4">创建赛事</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">赛事名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如: 2026 夏季邀请赛" className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">描述（可选）</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field resize-none" rows={2} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">初始阶段</label>
            <select value={stageType} onChange={(e) => setStageType(e.target.value)} className="input-field">
              <option value="group">小组赛</option>
              <option value="knockout">淘汰赛</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">小组赛赛制</label>
              <select value={groupFormat} onChange={(e) => setGroupFormat(e.target.value)} className="input-field">
                <option value="round_robin">组内循环</option>
                <option value="swiss">瑞士轮</option>
                <option value="double_elim">双败淘汰</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">淘汰赛赛制</label>
              <select value={knockoutFormat} onChange={(e) => setKnockoutFormat(e.target.value)} className="input-field">
                <option value="swiss">瑞士轮</option>
                <option value="double_elim">双败淘汰</option>
                <option value="round_robin">组内循环</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">每队人数</label>
              <input type="number" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} min={1} max={5} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">最大参与数</label>
              <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min={2} max={128} className="input-field" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? '创建中...' : '创建'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
