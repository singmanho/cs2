import { useMemo, useState } from 'react';
import type { Match } from '@shared/types';

interface BracketProps { matches: Match[]; format: string; onUpdateMatch?: (matchId: number, a: number, b: number) => void; updating?: boolean; stage?: string; }

export function Bracket({ matches, format, onUpdateMatch, updating, stage }: BracketProps) {
  // Filter: bracket tab should only show knockout matches (bracket_position starts with R/W/L/GF)
  // matches tab should only show group-stage matches (no bracket_position or bracket_position is null)
  const filtered = useMemo(() => {
    if (stage === 'knockout') return matches.filter(m => m.bracket_position && /^(R|W|L|GF)/.test(m.bracket_position));
    if (stage === 'group') return matches.filter(m => !m.bracket_position || !/^(R|W|L|GF)/.test(m.bracket_position));
    return matches;
  }, [matches, stage]);
  const rounds = useMemo(() => groupByRound(filtered), [filtered]);
  if (filtered.length === 0) return <div className="text-center py-12"><p className="text-cs2-text-muted text-sm">尚无对阵数据</p></div>;
  if (format === 'double_elim') return <DoubleElimBracket matches={filtered} onUpdateMatch={onUpdateMatch} updating={updating} />;
  if (format === 'single_elim') return <SingleElimBracket matches={filtered} onUpdateMatch={onUpdateMatch} updating={updating} />;
  return <SwissBracket rounds={rounds} format={format} matches={filtered} onUpdateMatch={onUpdateMatch} updating={updating} />;
}

function computeTeamRecords(matches: Match[]): Record<string, { wins: number; losses: number }> {
  const r: Record<string, { wins: number; losses: number }> = {};
  for (const m of matches) {
    if (m.status !== 'completed' || !m.winner_team_id) continue;
    const a = m.team_a_name || '', b = m.team_b_name || '';
    if (!a || !b || b === 'BYE') continue;
    if (!r[a]) r[a] = { wins: 0, losses: 0 };
    if (!r[b]) r[b] = { wins: 0, losses: 0 };
    if (m.winner_team_id === m.team_a_id) { r[a].wins++; r[b].losses++; }
    else { r[b].wins++; r[a].losses++; }
  }
  return r;
}

function SwissBracket({ rounds, format, matches, onUpdateMatch, updating }: {
  rounds: [number, Match[]][]; format: string; matches: Match[];
  onUpdateMatch?: (matchId: number, a: number, b: number) => void; updating?: boolean;
}) {
  const records = useMemo(() => computeTeamRecords(matches), [matches]);
  const adv = Object.entries(records).filter(([,r]) => r.wins >= 3 && r.losses < 3).sort((a,b) => b[1].wins - a[1].wins);
  const elim = Object.entries(records).filter(([,r]) => r.losses >= 3 && r.wins < 3).sort((a,b) => a[1].losses - b[1].losses);

  return (
    <div className="space-y-4">
      {(adv.length > 0 || elim.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {adv.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 flex-1 min-w-[200px]">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              <span className="text-xs font-semibold text-green-400 mr-1">晋级 {adv.length}</span>
              <div className="flex gap-1 flex-wrap">
                {adv.map(([name, r]) => (
                  <span key={name} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-300 font-mono">{name} <span className="text-green-400/70">{r.wins}-{r.losses}</span></span>
                ))}
              </div>
            </div>
          )}
          {elim.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex-1 min-w-[200px]">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              <span className="text-xs font-semibold text-red-400 mr-1">淘汰 {elim.length}</span>
              <div className="flex gap-1 flex-wrap">
                {elim.map(([name, r]) => (
                  <span key={name} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-mono">{name} <span className="text-red-400/70">{r.wins}-{r.losses}</span></span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-5 min-w-max items-start">
          {rounds.map(([round, rm]) => {
            const done = rm.filter(m => m.status === 'completed');
            return (
              <div key={round} className="flex flex-col" style={{ minWidth: 210, maxWidth: 260 }}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="w-5 h-5 rounded bg-cs2-accent/10 flex items-center justify-center text-cs2-accent text-[10px] font-bold">{round}</span>
                  <span className="text-xs font-medium text-cs2-text-muted">{format === 'swiss' ? `瑞士轮 第 ${round} 轮` : `第 ${round} 轮`}</span>
                  <span className="text-[10px] text-cs2-text-muted/50 ml-auto">{done.length}/{rm.length}</span>
                </div>
                <div className="h-0.5 rounded-full bg-cs2-border mb-3 mx-1 overflow-hidden">
                  <div className="h-full rounded-full bg-cs2-accent transition-all duration-500" style={{ width: rm.length > 0 ? `${(done.length / rm.length) * 100}%` : '0%' }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  {rm.map(m => <CompactCard key={m.id} match={m} onUpdateScore={onUpdateMatch} updating={updating} records={records} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompactCard({ match, onUpdateScore, updating, records }: {
  match: Match; onUpdateScore?: (id: number, a: number, b: number) => void;
  updating?: boolean; records?: Record<string, { wins: number; losses: number }>;
}) {
  const [editing, setEditing] = useState(false);
  const [sA, setSA] = useState(match.team_a_score?.toString() || '');
  const [sB, setSB] = useState(match.team_b_score?.toString() || '');
  const done = match.status === 'completed';
  const aW = match.winner_team_id === match.team_a_id;
  const bW = match.winner_team_id === match.team_b_id;
  const bye = !match.team_b_id && match.team_b_name === 'BYE';
  const bo = (match as any).bo || 1;
  const submit = () => { if (!onUpdateScore) return; onUpdateScore(match.id, parseInt(sA) || 0, parseInt(sB) || 0); setEditing(false); };
  const aR = records?.[match.team_a_name];
  const bR = records?.[match.team_b_name];
  const bg = bye && done ? 'bg-cs2-surface/50 border-cs2-border/50 opacity-60' : done ? 'bg-cs2-surface border-cs2-border' : 'bg-cs2-surface border-cs2-border hover:border-cs2-accent/30';
  const recordBadge = (r?: { wins: number; losses: number }) => {
    if (!r) return null;
    const cls = r.wins >= 3 ? 'text-green-400' : r.losses >= 3 ? 'text-red-400' : 'text-cs2-text-muted/50';
    return <span className={`text-[9px] font-mono flex-shrink-0 ${cls}`}>{r.wins}-{r.losses}</span>;
  };
  return (
    <div className={`rounded-lg border transition-all duration-200 ${bg}`}>
      <div className={`flex items-center justify-between px-2.5 py-1.5 ${aW && done ? 'bg-cs2-accent/5 rounded-t-lg' : ''}`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${aW ? 'bg-cs2-accent' : done ? 'bg-cs2-text-muted/30' : 'bg-cs2-border'}`} />
          <span className={`text-xs truncate ${aW && done ? 'font-semibold text-cs2-text' : 'text-cs2-text'}`}>{match.team_a_name || 'TBD'}</span>
          {recordBadge(aR)}
        </div>
        {editing ? <input type="number" value={sA} onChange={e => setSA(e.target.value)} className="w-10 text-center bg-cs2-bg border border-cs2-accent/50 rounded text-xs font-mono py-0.5 focus:outline-none focus:ring-1 focus:ring-cs2-accent" min={0} autoFocus />
          : <span className={`font-mono text-xs ml-1 w-5 text-right ${aW && done ? 'text-cs2-accent font-bold' : done ? 'text-cs2-text-muted' : 'text-cs2-text-muted/40'}`}>{match.team_a_score ?? '\u2013'}</span>}
      </div>
      <div className="h-px bg-cs2-border/40 mx-2" />
      <div className={`flex items-center justify-between px-2.5 py-1.5 ${bW && done ? 'bg-cs2-accent/5 rounded-b-lg' : ''}`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${bW ? 'bg-cs2-accent' : done ? 'bg-cs2-text-muted/30' : 'bg-cs2-border'}`} />
          <span className={`text-xs truncate ${bW && done ? 'font-semibold text-cs2-text' : bye ? 'text-cs2-text-muted/50 italic' : 'text-cs2-text'}`}>{match.team_b_name || 'TBD'}</span>
          {recordBadge(bR)}
        </div>
        {editing ? <input type="number" value={sB} onChange={e => setSB(e.target.value)} className="w-10 text-center bg-cs2-bg border border-cs2-accent/50 rounded text-xs font-mono py-0.5 focus:outline-none focus:ring-1 focus:ring-cs2-accent" min={0} />
          : <span className={`font-mono text-xs ml-1 w-5 text-right ${bW && done ? 'text-cs2-accent font-bold' : done ? 'text-cs2-text-muted' : 'text-cs2-text-muted/40'}`}>{bye && done ? '' : (match.team_b_score ?? '\u2013')}</span>}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-cs2-border/30">
        <span className="text-[9px] font-mono text-cs2-text-muted/50 uppercase">BO{bo}</span>
        {done && !bye && <span className="text-[9px] text-cs2-accent font-medium">{aW ? match.team_a_name : match.team_b_name} 胜</span>}
        {bye && done && <span className="text-[9px] text-cs2-text-muted/40">BYE</span>}
        {!done && onUpdateScore && (editing ? (
          <div className="flex gap-1">
            <button onClick={() => setEditing(false)} className="text-[9px] text-cs2-text-muted hover:text-cs2-text px-1 rounded">取消</button>
            <button onClick={submit} disabled={updating} className="text-[9px] text-cs2-accent font-medium px-1 rounded bg-cs2-accent/10 hover:bg-cs2-accent/20">{updating ? '...' : '确认'}</button>
          </div>
        ) : <button onClick={() => setEditing(true)} className="text-[9px] text-cs2-text-muted hover:text-cs2-accent px-1 rounded hover:bg-cs2-accent/5 transition-colors">录入比分</button>)}
      </div>
    </div>
  );
}

function SingleElimBracket({ matches, onUpdateMatch, updating }: {
  matches: Match[]; onUpdateMatch?: (id: number, a: number, b: number) => void; updating?: boolean;
}) {
  const rounds = useMemo(() => groupByRound(matches), [matches]);
  return (
    <div className="overflow-x-auto pb-4 animate-fade-in">
      <div className="flex items-stretch min-w-max">
        {rounds.map(([round, rm], ri) => (
          <div key={round} className="flex flex-col justify-around" style={{ minWidth: 220, marginRight: 20 }}>
            <div className="text-[10px] text-cs2-text-muted font-medium mb-3 px-1 text-center">
              {ri === 0 ? '第一轮' : ri === rounds.length - 1 ? '总决赛' : `第 ${round} 轮`}
            </div>
            <div className="flex flex-col justify-around flex-1">
              {rm.map(m => (
                <BracketCard key={m.id} match={m} onUpdateScore={onUpdateMatch} updating={updating} />
              ))}
            </div>
          </div>
        ))}
        {rounds.length > 0 && (
          <div className="flex flex-col items-center justify-center min-w-[120px]">
            <div className="text-[10px] text-cs2-gold font-medium mb-3">冠军</div>
            {(() => {
              const finalMatch = rounds[rounds.length - 1]?.[1]?.[0];
              const winner = finalMatch?.status === 'completed'
                ? (finalMatch.winner_team_id === finalMatch.team_a_id ? finalMatch.team_a_name : finalMatch.team_b_name)
                : null;
              return (
                <div className={`rounded-lg border-2 px-4 py-3 text-center min-w-[100px] ${winner ? 'border-cs2-gold bg-cs2-gold/10' : 'border-cs2-border/50 border-dashed'}`}>
                  <div className="text-2xl mb-1">🏆</div>
                  <div className={`text-xs font-semibold ${winner ? 'text-cs2-gold' : 'text-cs2-text-muted/30'}`}>
                    {winner || 'TBD'}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function BracketCard({ match: m, onUpdateScore, updating }: {
  match: Match; onUpdateScore?: (id: number, a: number, b: number) => void; updating?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [sA, setSA] = useState(m.team_a_score?.toString() || '');
  const [sB, setSB] = useState(m.team_b_score?.toString() || '');
  const done = m.status === 'completed';
  const aW = m.winner_team_id === m.team_a_id;
  const bW = m.winner_team_id === m.team_b_id;
  const bo = (m as any).bo || 1;
  const submit = () => { if (!onUpdateScore) return; onUpdateScore(m.id, parseInt(sA) || 0, parseInt(sB) || 0); setEditing(false); };
  return (
    <div className={`rounded-lg border transition-all duration-200 ${done ? 'bg-cs2-surface border-cs2-border' : 'bg-cs2-surface border-cs2-border hover:border-cs2-accent/30'}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${aW && done ? 'bg-cs2-accent/5 rounded-t-lg' : ''}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${aW ? 'bg-cs2-accent' : done ? 'bg-cs2-text-muted/30' : 'bg-cs2-border'}`} />
          <span className={`text-sm truncate ${aW && done ? 'font-bold text-cs2-text' : done ? 'text-cs2-text-muted' : 'text-cs2-text'}`}>{m.team_a_name || 'TBD'}</span>
        </div>
        {editing ? <input type="number" value={sA} onChange={e => setSA(e.target.value)} className="w-12 text-center bg-cs2-bg border border-cs2-accent/50 rounded text-sm font-mono py-0.5 focus:outline-none focus:ring-1 focus:ring-cs2-accent" min={0} autoFocus />
          : <span className={`font-mono text-sm ml-2 w-6 text-right ${aW && done ? 'text-cs2-accent font-bold' : done ? 'text-cs2-text-muted' : 'text-cs2-text-muted/30'}`}>{m.team_a_score ?? '–'}</span>}
      </div>
      <div className="h-px bg-cs2-border/40 mx-3" />
      <div className={`flex items-center justify-between px-3 py-2 ${bW && done ? 'bg-cs2-accent/5 rounded-b-lg' : ''}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bW ? 'bg-cs2-accent' : done ? 'bg-cs2-text-muted/30' : 'bg-cs2-border'}`} />
          <span className={`text-sm truncate ${bW && done ? 'font-bold text-cs2-text' : done ? 'text-cs2-text-muted' : 'text-cs2-text'}`}>{m.team_b_name || 'TBD'}</span>
        </div>
        {editing ? <input type="number" value={sB} onChange={e => setSB(e.target.value)} className="w-12 text-center bg-cs2-bg border border-cs2-accent/50 rounded text-sm font-mono py-0.5 focus:outline-none focus:ring-1 focus:ring-cs2-accent" min={0} />
          : <span className={`font-mono text-sm ml-2 w-6 text-right ${bW && done ? 'text-cs2-accent font-bold' : done ? 'text-cs2-text-muted' : 'text-cs2-text-muted/30'}`}>{m.team_b_score ?? '–'}</span>}
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-cs2-border/30">
        <span className="text-[9px] font-mono text-cs2-text-muted/50 uppercase">BO{bo}</span>
        {done && <span className="text-[9px] text-cs2-accent font-medium">{aW ? m.team_a_name : m.team_b_name} 胜</span>}
        {!done && onUpdateScore && (editing ? (
          <div className="flex gap-1">
            <button onClick={() => setEditing(false)} className="text-[9px] text-cs2-text-muted hover:text-cs2-text px-1 rounded">取消</button>
            <button onClick={submit} disabled={updating} className="text-[9px] text-cs2-accent font-medium px-1 rounded bg-cs2-accent/10 hover:bg-cs2-accent/20">{updating ? '...' : '确认'}</button>
          </div>
        ) : <button onClick={() => setEditing(true)} className="text-[9px] text-cs2-text-muted hover:text-cs2-accent px-1 rounded hover:bg-cs2-accent/5 transition-colors">录入比分</button>)}
      </div>
    </div>
  );
}

function DoubleElimBracket({ matches, onUpdateMatch, updating }: {
  matches: Match[]; onUpdateMatch?: (id: number, a: number, b: number) => void; updating?: boolean;
}) {
  const wb = matches.filter(m => m.bracket_position?.startsWith('W') && m.round < 99);
  const lb = matches.filter(m => m.bracket_position?.startsWith('L'));
  const gf = matches.filter(m => m.round === 99);
  const Section = ({ title, color, icon, ms }: { title: string; color: string; icon: string; ms: Match[] }) => (
    <div><div className="flex items-center gap-2 mb-3">
      <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${color}`}>{icon}</div>
      <h3 className={`text-xs font-semibold ${color.split(' ')[0]}`}>{title}</h3>
      <div className="flex-1 h-px bg-cs2-border ml-2" />
    </div><div className="flex gap-4 min-w-max items-start">
      {groupByRound(ms).map(([r, rm]) => (<div key={r} className="flex flex-col" style={{ minWidth: 210 }}>
        <div className="text-[10px] text-cs2-text-muted font-medium mb-2 px-1">Round {r}</div>
        <div className="flex flex-col gap-1.5">{rm.map(m => <CompactCard key={m.id} match={m} onUpdateScore={onUpdateMatch} updating={updating} />)}</div>
      </div>))}</div></div>);
  return (
    <div className="space-y-8 animate-fade-in overflow-x-auto pb-4">
      {wb.length > 0 && <Section title="胜者组" color="bg-green-500/10 text-green-400" icon="W" ms={wb} />}
      {lb.length > 0 && <Section title="败者组" color="bg-red-500/10 text-red-400" icon="L" ms={lb} />}
      {gf.length > 0 && <Section title="总决赛" color="bg-cs2-gold/10 text-cs2-gold" icon="★" ms={gf} />}
    </div>
  );
}

function groupByRound(matches: Match[]): [number, Match[]][] {
  const map = new Map<number, Match[]>();
  for (const m of matches) { if (!map.has(m.round)) map.set(m.round, []); map.get(m.round)!.push(m); }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}