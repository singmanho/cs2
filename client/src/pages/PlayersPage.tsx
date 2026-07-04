import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { CS2_RANKS, type CS2Rank } from '@shared/types';

export function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadPlayers = async (searchTerm?: string) => {
    setLoading(true);
    try {
      setPlayers(await api.players.list(searchTerm));
    } catch (err) { console.error('加载玩家列表失败:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlayers(search); }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">玩家管理</h1>
          <p className="text-cs2-text-muted text-sm mt-1">手动录入选手信息、段位与数据</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ 添加选手</button>
      </div>

      {showAdd && <AddPlayerForm onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); loadPlayers(search); }} />}

      <input
        type="text" value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索玩家姓名..."
        className="input-field max-w-sm"
      />

      {loading ? (
        <div className="text-cs2-text-muted text-sm">加载中...</div>
      ) : players.length === 0 ? (
        <div className="card text-center py-10 text-cs2-text-muted">
          <p className="text-lg mb-2">暂无玩家</p>
          <p className="text-sm">点击"添加选手"手动录入第一位选手</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p: any) => (
            <Link
              key={p.id}
              to={`/players/${p.id}`}
              className="card flex items-center gap-4 hover:border-cs2-accent/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-lg flex-shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold hover:text-cs2-accent transition-colors truncate block">
                  {p.name}
                </span>
                <p className="text-xs text-cs2-text-muted">{p.rank}</p>
                {p.rating > 0 && (
                  <span className="stat-badge mt-1">Rating {(p.rating).toFixed(2)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPlayerForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [rank, setRank] = useState<CS2Rank>(CS2_RANKS[0]);
  const [rating, setRating] = useState('');
  const [kd, setKd] = useState('');
  const [adr, setAdr] = useState('');
  const [hs, setHs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.players.create({
        name: name.trim(),
        rank,
        rating: rating ? Number(rating) : undefined,
        kd_ratio: kd ? Number(kd) : undefined,
        avg_damage: adr ? Number(adr) : undefined,
        headshot_pct: hs ? Number(hs) : undefined,
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">添加选手</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">选手名称 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">段位</label>
            <select value={rank} onChange={(e) => setRank(e.target.value as CS2Rank)} className="input-field">
              {CS2_RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Rating</label>
              <input type="number" value={rating} onChange={(e) => setRating(e.target.value)} step="0.01" min="0" max="3" placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">K/D</label>
              <input type="number" value={kd} onChange={(e) => setKd(e.target.value)} step="0.01" min="0" placeholder="0.00" className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">ADR</label>
              <input type="number" value={adr} onChange={(e) => setAdr(e.target.value)} min="0" placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">爆头率(%)</label>
              <input type="number" value={hs} onChange={(e) => setHs(e.target.value)} min="0" max="100" placeholder="0" className="input-field" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
