import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Bracket } from '../components/Bracket';

const FORMAT_LABELS: Record<string, string> = {
  swiss: '瑞士轮', double_elim: '双败淘汰', round_robin: '组内循环',
};

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'teams' | 'matches' | 'bracket' | 'standings' | 'leaderboard'>('teams');
  const [teamSearch, setTeamSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setTournament(await api.tournaments.get(Number(id))); } catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (teamSearch.length < 1) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const teams = await api.teams.list();
        setSearchResults(teams);
      } catch { /* */ }
    }, 300);
    return () => clearTimeout(t);
  }, [teamSearch]);

  const handleAddTeam = async (teamId: number) => {
    if (!id) return;
    await api.tournaments.addTeam(Number(id), { team_id: teamId });
    setTeamSearch(''); setShowDropdown(false); load();
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!id) return;
    await api.tournaments.removeTeam(Number(id), teamId);
    load();
  };

  const handleGenerateDraw = async () => {
    if (!id) return;
    try { await api.tournaments.generateDraw(Number(id)); load(); }
    catch (err: any) { alert(err.message); }
  };

  const handleUpdateMatch = async (matchId: number, scoreA: number, scoreB: number) => {
    if (!id) return;
    try { await api.tournaments.updateMatch(Number(id), matchId, { team_a_score: scoreA, team_b_score: scoreB }); load(); }
    catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="text-cs2-text-muted">加载中...</div>;
  if (!tournament) return <div className="text-cs2-text-muted">赛事不存在</div>;

  const teamCount = tournament.teams?.length || 0;

  return (
    <div className="space-y-6">
      <Link to="/tournaments" className="text-sm text-cs2-text-muted hover:text-cs2-text">← 返回赛事列表</Link>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-cs2-text-muted">
              <span className="tag">{tournament.stage_type === 'group' ? '小组赛' : '淘汰赛'}</span>
              <span className="tag">小组: {FORMAT_LABELS[tournament.group_format]}</span>
              <span className="tag">淘汰: {FORMAT_LABELS[tournament.knockout_format]}</span>
              <span className="tag">{teamCount} 支战队</span>
            </div>
          </div>
          <div className="flex gap-2">
            {tournament.status === 'upcoming' && teamCount >= 2 && (
              <button onClick={handleGenerateDraw} className="btn-primary">生成对阵</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-cs2-border">
        {(['teams','matches','bracket','standings','leaderboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
            ${tab === t ? 'border-cs2-accent text-cs2-accent' : 'border-transparent text-cs2-text-muted hover:text-cs2-text'}`}>
            {{teams:'战队', matches:'对阵', bracket:'对阵图', standings:'积分榜', leaderboard:'选手榜'}[t]}
          </button>
        ))}
      </div>

      {/* Teams tab */}
      {tab === 'teams' && (
        <div className="space-y-4">
          {tournament.status === 'upcoming' && (
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">添加战队</label>
              <input type="text" value={teamSearch} onChange={(e) => { setTeamSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="搜索战队..." className="input-field max-w-sm" />
              {showDropdown && teamSearch && (
                <div className="absolute top-full mt-1 w-full max-w-sm bg-cs2-surface border border-cs2-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                  {searchResults.filter((t: any) => !(tournament.teams || []).some((tt: any) => tt.team_id === t.id)).length === 0 ? (
                    <p className="px-3 py-2 text-sm text-cs2-text-muted">未找到可添加的战队</p>
                  ) : (
                    searchResults.filter((t: any) => !(tournament.teams || []).some((tt: any) => tt.team_id === t.id)).map((t: any) => (
                      <button key={t.id} onClick={() => handleAddTeam(t.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-cs2-accent/10 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cs2-accent/10 flex items-center justify-center text-cs2-accent text-xs font-bold">{t.name.charAt(0)}</span>
                        {t.name} <span className="text-cs2-text-muted ml-auto text-xs">{t.member_count}人</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {(!tournament.teams || tournament.teams.length === 0) ? (
            <div className="card text-center py-8 text-cs2-text-muted"><p>暂无战队，添加战队后即可抽签</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tournament.teams.map((tt: any) => (
                <div key={tt.id} className="card p-3 flex items-center gap-3 group">
                  <Link to={`/teams/${tt.team_id}`} className="w-9 h-9 rounded-lg bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-sm flex-shrink-0">
                    {(tt.team?.name || '?').charAt(0)}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/teams/${tt.team_id}`} className="font-medium text-sm hover:text-cs2-accent truncate block">{tt.team?.name || `Team #${tt.team_id}`}</Link>
                    {tt.group_name && <span className="text-xs text-cs2-accent">{tt.group_name}组</span>}
                  </div>
                  {tournament.status === 'upcoming' && (
                    <button onClick={() => handleRemoveTeam(tt.team_id)} className="opacity-0 group-hover:opacity-100 text-cs2-text-muted hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matches tab */}
      {tab === 'matches' && (
        <Bracket matches={tournament.matches || []} format={tournament.group_format}
          onUpdateMatch={tournament.status === 'in_progress' ? handleUpdateMatch : undefined} />
      )}

      {/* Bracket tab */}
      {tab === 'bracket' && (
        <Bracket matches={tournament.matches || []} format={tournament.group_format} />
      )}

      {/* Standings tab */}
      {tab === 'standings' && (
        <StandingsView standings={tournament.standings || []} />
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <LeaderboardView teams={tournament.teams || []} />
      )}
    </div>
  );
}

function StandingsView({ standings }: { standings: any[] }) {
  if (!standings || standings.length === 0) return (
    <div className="card text-center py-8 text-cs2-text-muted"><p>暂无积分数据</p></div>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-cs2-text-muted border-b border-cs2-border">
            <th className="pb-2 pr-4 font-medium">#</th>
            <th className="pb-2 pr-4 font-medium">战队</th>
            <th className="pb-2 pr-4 font-medium text-center">场次</th>
            <th className="pb-2 pr-4 font-medium text-center">胜</th>
            <th className="pb-2 pr-4 font-medium text-center">负</th>
            <th className="pb-2 pr-4 font-medium text-center">积分</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s: any, i: number) => (
            <tr key={s.team_id} className="border-b border-cs2-border/50">
              <td className="py-2 pr-4 font-mono text-cs2-text-muted">{i + 1}</td>
              <td className="py-2 pr-4 font-medium">{s.team_name}</td>
              <td className="py-2 pr-4 text-center">{s.matches_played}</td>
              <td className="py-2 pr-4 text-center text-green-400">{s.wins}</td>
              <td className="py-2 pr-4 text-center text-red-400">{s.losses}</td>
              <td className="py-2 pr-4 text-center font-mono font-bold text-cs2-accent">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardView({ teams }: { teams: any[] }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // Build leaderboard from team members
    const allPlayers: any[] = [];
    const seen = new Set<number>();
    for (const tt of teams) {
      if (tt.team?.members) {
        for (const m of tt.team.members) {
          if (seen.has(m.player_id)) continue;
          seen.add(m.player_id);
          allPlayers.push({
            player_id: m.player_id,
            name: m.player?.name || m.name || `Player ${m.player_id}`,
            rank: m.player?.rank || '暂无段位',
            rating: m.player?.rating || 0,
            kd_ratio: m.player?.kd_ratio || 0,
            avg_damage: m.player?.avg_damage || 0,
            headshot_pct: m.player?.headshot_pct || 0,
            matches_played: m.player?.matches_played || 0,
            wins: m.player?.wins || 0,
          });
        }
      }
    }
    allPlayers.sort((a, b) => b.rating - a.rating);
    setLeaderboard(allPlayers);
  }, [teams]);

  if (leaderboard.length === 0) return (
    <div className="card text-center py-8 text-cs2-text-muted"><p>暂无选手数据</p></div>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-cs2-text-muted border-b border-cs2-border">
            <th className="pb-2 pr-4 font-medium">#</th>
            <th className="pb-2 pr-4 font-medium">选手</th>
            <th className="pb-2 pr-4 font-medium">段位</th>
            <th className="pb-2 pr-4 font-medium text-center">Rating</th>
            <th className="pb-2 pr-4 font-medium text-center">K/D</th>
            <th className="pb-2 pr-4 font-medium text-center">ADR</th>
            <th className="pb-2 pr-4 font-medium text-center">爆头率</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((p: any, i: number) => (
            <tr key={p.player_id} className="border-b border-cs2-border/50">
              <td className="py-2 pr-4 font-mono text-cs2-text-muted">{i + 1}</td>
              <td className="py-2 pr-4 font-medium">
                <Link to={`/players/${p.player_id}`} className="hover:text-cs2-accent">{p.name}</Link>
              </td>
              <td className="py-2 pr-4 text-cs2-text-muted">{p.rank}</td>
              <td className="py-2 pr-4 text-center font-mono text-cs2-accent">{p.rating.toFixed(2)}</td>
              <td className="py-2 pr-4 text-center font-mono">{p.kd_ratio.toFixed(2)}</td>
              <td className="py-2 pr-4 text-center font-mono">{p.avg_damage}</td>
              <td className="py-2 pr-4 text-center font-mono">{p.headshot_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
