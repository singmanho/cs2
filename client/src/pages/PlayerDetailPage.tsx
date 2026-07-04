import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { CS2_RANKS } from '@shared/types';

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setPlayer(await api.players.get(Number(id))); } catch (err) { console.error('加载玩家失败:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-cs2-text-muted">加载中...</div>;
  if (!player) return <div className="text-cs2-text-muted">玩家不存在</div>;

  return (
    <div className="space-y-6">
      <Link to="/players" className="text-sm text-cs2-text-muted hover:text-cs2-text transition-colors">
        ← 返回玩家列表
      </Link>

      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-3xl flex-shrink-0">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{player.name}</h1>
            <p className="text-cs2-text-muted text-sm mt-0.5">段位: {player.rank}</p>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm">编辑</button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <EditPlayerForm player={player} onClose={() => setEditing(false)} onDone={() => { setEditing(false); load(); }} />
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">比赛数据</h2>
        <div className="card">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Rating" value={player.rating?.toFixed(2) || '0.00'} highlight />
            <StatCard label="K/D" value={player.kd_ratio?.toFixed(2) || '0.00'} />
            <StatCard label="ADR" value={String(player.avg_damage || 0)} />
            <StatCard label="爆头率" value={`${player.headshot_pct || 0}%`} />
            <StatCard label="场次" value={String(player.matches_played || 0)} />
            <StatCard label="胜场" value={String(player.wins || 0)} />
            <StatCard label="负场" value={String(player.losses || 0)} />
            <StatCard label="胜率" value={`${player.matches_played > 0 ? Math.round(player.wins / player.matches_played * 100) : 0}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-cs2-bg rounded-lg p-3">
      <p className="text-xs text-cs2-text-muted mb-1">{label}</p>
      <p className={`font-mono font-semibold ${highlight ? 'text-cs2-accent' : 'text-cs2-text'}`}>{value}</p>
    </div>
  );
}

function EditPlayerForm({ player, onClose, onDone }: { player: any; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(player.name);
  const [rank, setRank] = useState(player.rank);
  const [rating, setRating] = useState(String(player.rating || ''));
  const [kd, setKd] = useState(String(player.kd_ratio || ''));
  const [adr, setAdr] = useState(String(player.avg_damage || ''));
  const [hs, setHs] = useState(String(player.headshot_pct || ''));
  const [matches, setMatches] = useState(String(player.matches_played || ''));
  const [wins, setWins] = useState(String(player.wins || ''));
  const [losses, setLosses] = useState(String(player.losses || ''));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.players.update(player.id, {
        name: name.trim() || null,
        rank: rank || null,
        rating: rating ? Number(rating) : null,
        kd_ratio: kd ? Number(kd) : null,
        avg_damage: adr ? Number(adr) : null,
        headshot_pct: hs ? Number(hs) : null,
        matches_played: matches ? Number(matches) : null,
        wins: wins ? Number(wins) : null,
        losses: losses ? Number(losses) : null,
      });
      onDone();
    } catch (err) { console.error('保存玩家失败:', err); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">编辑选手</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">段位</label>
            <select value={rank} onChange={(e) => setRank(e.target.value)} className="input-field">
              {CS2_RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">Rating</label><input type="number" value={rating} onChange={(e) => setRating(e.target.value)} step="0.01" className="input-field" /></div>
            <div><label className="text-sm font-medium mb-1 block">K/D</label><input type="number" value={kd} onChange={(e) => setKd(e.target.value)} step="0.01" className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1 block">ADR</label><input type="number" value={adr} onChange={(e) => setAdr(e.target.value)} className="input-field" /></div>
            <div><label className="text-sm font-medium mb-1 block">爆头率(%)</label><input type="number" value={hs} onChange={(e) => setHs(e.target.value)} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-sm font-medium mb-1 block">场次</label><input type="number" value={matches} onChange={(e) => setMatches(e.target.value)} className="input-field" /></div>
            <div><label className="text-sm font-medium mb-1 block">胜</label><input type="number" value={wins} onChange={(e) => setWins(e.target.value)} className="input-field" /></div>
            <div><label className="text-sm font-medium mb-1 block">负</label><input type="number" value={losses} onChange={(e) => setLosses(e.target.value)} className="input-field" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? '...' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
