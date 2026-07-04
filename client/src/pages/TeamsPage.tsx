import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setTeams(await api.teams.list()); } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">战队管理</h1>
          <p className="text-cs2-text-muted text-sm mt-1">创建和管理 CS2 战队</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ 创建战队</button>
      </div>

      {showCreate && <CreateTeamForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}

      {loading ? (
        <div className="text-cs2-text-muted text-sm">加载中...</div>
      ) : teams.length === 0 ? (
        <div className="card text-center py-10 text-cs2-text-muted">
          <p className="text-lg mb-2">暂无战队</p>
          <p className="text-sm">点击"创建战队"组建第一支队伍</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t: any) => (
            <Link key={t.id} to={`/teams/${t.id}`} className="card hover:border-cs2-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-cs2-text-muted">{t.member_count ?? 0} 名成员</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTeamForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true); setError('');
    try { await api.teams.create({ name: name.trim() }); onCreated(); }
    catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-4">创建战队</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">战队名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="例如: TYLOO" required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? '...' : '创建'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
