import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Bracket } from '../components/Bracket';

const FORMAT_LABELS: Record<string, string> = {
  swiss: '瑞士轮', double_elim: '双败淘汰', round_robin: '组内循环', single_elim: '单败淘汰',
};

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'teams' | 'matches' | 'bracket' | 'standings' | 'leaderboard'>('teams');
  const [teamSearch, setTeamSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setTournament(await api.tournaments.get(Number(id))); } catch (err) { console.error('加载赛事失败:', err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleBatchAdd = async () => {
    if (!id || selectedTeamIds.length === 0) return;
    try {
      await api.tournaments.batchAddTeams(Number(id), selectedTeamIds);
      setShowBatchAdd(false); setSelectedTeamIds([]); load();
    } catch (err) { console.error('批量添加战队失败:', err); }
  };

  const handleAddTeam = async (teamId: number) => {
    if (!id) return;
    try {
      await api.tournaments.addTeam(Number(id), { team_id: teamId });
      setTeamSearch(''); load();
    } catch (err) { console.error('添加战队失败:', err); }
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!id) return;
    try {
      await api.tournaments.removeTeam(Number(id), teamId);
      load();
    } catch (err) { console.error('移除战队失败:', err); }
  };

  const handleGenerateDraw = async () => {
    if (!id) return;
    try { await api.tournaments.generateDraw(Number(id)); load(); }
    catch (err: any) { alert(err.message); }
  };

  const handleGenerateKnockout = async () => {
    if (!id) return;
    try { await api.tournaments.generateKnockout(Number(id)); load(); }
    catch (err: any) { alert(err.message); }
  };

  const handleStartTournament = async () => {
    if (!id) return;
    try { await api.tournaments.start(Number(id)); load(); }
    catch (err: any) { alert(err.message); }
  };

  const handleEndTournament = async () => {
    if (!id) return;
    if (!confirm('确认结束此赛事？')) return;
    try { await api.tournaments.end(Number(id)); load(); }
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
              <span className="tag">默认 BO{tournament.default_bo || 1}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {tournament.status === 'upcoming' && teamCount >= 2 && (
              <>
                <button onClick={handleStartTournament} className="btn-secondary">开始赛事</button>
                <button onClick={handleGenerateDraw} className="btn-primary">生成对阵</button>
              </>
            )}
            {tournament.status === 'in_progress' && (
              <>
                <button onClick={handleGenerateKnockout} className="btn-secondary">生成淘汰赛对阵</button>
                <button onClick={handleEndTournament} className="btn-secondary text-red-400 border-red-500/30 hover:bg-red-500/10">结束赛事</button>
              </>
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
            <>
              <button onClick={async () => { setAllTeams(await api.teams.list()); setShowBatchAdd(true); }} className="btn-secondary">+ 批量添加战队</button>
              {showBatchAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="card w-full max-w-lg mx-4 max-h-[70vh] overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-3">选择战队</h2>
                    <div className="space-y-2 mb-4">
                      {allTeams.filter((t:any) => !(tournament.teams||[]).some((tt:any) => tt.team_id===t.id)).map((t:any) => (
                        <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-cs2-bg cursor-pointer">
                          <input type="checkbox" checked={selectedTeamIds.includes(t.id)} onChange={() => setSelectedTeamIds(prev => prev.includes(t.id) ? prev.filter(x=>x!==t.id) : [...prev, t.id])} className="w-4 h-4" />
                          <span className="w-7 h-7 rounded-lg bg-cs2-accent/10 flex items-center justify-center text-cs2-accent text-xs font-bold">{t.name.charAt(0)}</span>
                          <span className="text-sm">{t.name}</span>
                          <span className="text-xs text-cs2-text-muted ml-auto">{t.member_count}人</span>
                        </label>
                      ))}
                      {allTeams.filter((t:any)=>!(tournament.teams||[]).some((tt:any)=>tt.team_id===t.id)).length===0 && <p className="text-sm text-cs2-text-muted">所有战队已添加</p>}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowBatchAdd(false); setSelectedTeamIds([]); }} className="btn-secondary">取消</button>
                      <button onClick={handleBatchAdd} disabled={selectedTeamIds.length===0} className="btn-primary">添加 {selectedTeamIds.length} 支战队</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {(!tournament.teams || tournament.teams.length === 0) ? (
            <div className="card text-center py-8 text-cs2-text-muted"><p>暂无战队，添加战队后即可抽签</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tournament.teams.map((tt: any) => (
                <div key={tt.id} className="card p-3 flex items-center gap-3 group">
                  <Link to={`/teams/${tt.team_id}`} className="w-9 h-9 rounded-lg bg-cs2-accent/10 flex items-center justify-center text-cs2-accent font-bold text-sm flex-shrink-0">
                    {(tt.team_name || '?').charAt(0)}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/teams/${tt.team_id}`} className="font-medium text-sm hover:text-cs2-accent truncate block">{tt.team_name || `Team #${tt.team_id}`}</Link>
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

      {/* Matches tab — group stage */}
      {tab === 'matches' && (
        <Bracket matches={tournament.matches || []} format={tournament.group_format} stage="group"
          onUpdateMatch={tournament.status === 'in_progress' ? handleUpdateMatch : undefined} />
      )}

      {/* Bracket tab — knockout stage */}
      {tab === 'bracket' && (
        <Bracket matches={tournament.matches || []} format={tournament.knockout_format || tournament.group_format} stage="knockout"
          onUpdateMatch={tournament.status === 'in_progress' ? handleUpdateMatch : undefined} />
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
            rank: m.player?.rank || '未定级',
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
