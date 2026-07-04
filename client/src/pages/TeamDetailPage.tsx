import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setTeam(await api.teams.get(Number(id))); } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (playerSearch.length < 1) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try { setSearchResults(await api.players.list(playerSearch)); } catch { /* */ }
    }, 300);
    return () => clearTimeout(t);
  }, [playerSearch]);

  const handleAddMember = async (playerId: number) => {
    if (!id) return;
    await api.teams.addMember(Number(id), playerId);
    setShowAdd(false); setPlayerSearch('');
    load();
  };

  const handleRemoveMember = async (playerId: number) => {
    if (!id) return;
    await api.teams.removeMember(Number(id), playerId);
    load();
  };

  if (loading) return <div className="text-cs2-text-muted">加载中...</div>;
  if (!team) return <div className="text-cs2-text-muted">战队不存在</div>;

  const members = team.members || [];

  return (
    <div className="space-y-6">
      <Link to="/teams" className="text-sm text-cs2-text-muted hover:text-cs2-text transition-colors">← 返回战队列表</Link>

      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-2xl">
              {team.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-cs2-text-muted text-sm">{members.length} 名成员</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm">+ 添加成员</button>
        </div>
      </div>

      {showAdd && (
        <div className="card">
          <div className="relative">
            <label className="text-sm font-medium mb-1 block">搜索玩家添加</label>
            <input type="text" value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} placeholder="输入玩家姓名..." className="input-field" />
            {playerSearch && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-cs2-surface border border-cs2-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                {searchResults.filter((p: any) => !members.some((m: any) => m.player_id === p.id)).map((p: any) => (
                  <button key={p.id} onClick={() => handleAddMember(p.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-cs2-accent/10 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cs2-accent/10 flex items-center justify-center text-cs2-accent text-xs font-bold">{p.name.charAt(0)}</span>
                    {p.name} <span className="text-cs2-text-muted ml-auto text-xs">{p.rank} · {p.rating?.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowAdd(false)} className="text-xs text-cs2-text-muted mt-2">取消</button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">战队成员</h2>
        {members.length === 0 ? (
          <p className="text-cs2-text-muted text-sm">暂无成员，点击"添加成员"招募选手</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m: any) => (
              <div key={m.id} className="card p-3 flex items-center gap-3 group">
                <Link to={`/players/${m.player_id}`} className="w-9 h-9 rounded-full bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-sm flex-shrink-0">
                  {(m.player?.name || m.name || '?').charAt(0)}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/players/${m.player_id}`} className="font-medium text-sm hover:text-cs2-accent truncate block">{m.name}</Link>
                  <p className="text-xs text-cs2-text-muted">{m.rank} · Rating {m.rating?.toFixed(2)}</p>
                </div>
                <button onClick={() => handleRemoveMember(m.player_id)} className="opacity-0 group-hover:opacity-100 text-cs2-text-muted hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
