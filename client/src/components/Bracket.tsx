// ============================================================
// Double Elimination Bracket Visualization
// ============================================================
// Renders a bracket tree with Winners Bracket flowing down,
// Losers Bracket branching off, and Grand Final at the bottom.

import { useMemo, useState } from 'react';
import type { Match } from '@shared/types';

interface BracketProps {
  matches: Match[];
  format: string;
  onUpdateMatch?: (matchId: number, teamAScore: number, teamBScore: number) => void;
  updating?: boolean;
}

interface BracketMatchNode {
  id: string;
  match: Match | null;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_id: number | null;
  status: string;
  children: [BracketMatchNode | null, BracketMatchNode | null];
}

export function Bracket({ matches, format, onUpdateMatch, updating }: BracketProps) {
  const bracketTree = useMemo(() => {
    if (format === 'double_elim') {
      return buildDoubleElimTree(matches);
    }
    return buildSingleElimTree(matches);
  }, [matches, format]);

  if (matches.length === 0) {
    return (
      <div className="text-center text-cs2-text-muted text-sm py-6">
        尚无对阵数据，请先生成抽签
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex min-w-full justify-center">
        <div className="flex flex-col gap-8 py-4">
          {/* Winners Bracket */}
          {format === 'double_elim' && (
            <div>
              <h3 className="text-sm font-semibold text-cs2-accent mb-3">🏆 胜者组</h3>
              <BracketRoundList matches={getRoundMatches(matches, 1)} onUpdateMatch={onUpdateMatch} updating={updating} />
            </div>
          )}

          {/* Losers Bracket */}
          {format === 'double_elim' && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-cs2-gold mb-3">🔄 败者组</h3>
              <LosersMatches matches={matches} onUpdateMatch={onUpdateMatch} updating={updating} />
            </div>
          )}

          {/* Swiss or Round Robin: just list rounds */}
          {(format === 'swiss' || format === 'round_robin') && (
            <div className="space-y-6">
              {groupByRound(matches).map(([round, roundMatches]) => (
                <div key={round}>
                  <h3 className="text-sm font-semibold text-cs2-accent mb-3">
                    {format === 'swiss' ? `瑞士轮 第 ${round} 轮` : `第 ${round} 轮`}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roundMatches.map((m: Match) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        onUpdateScore={onUpdateMatch}
                        updating={updating}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grand Final */}
          {format === 'double_elim' && matches.some(m => m.round === 99) && (
            <div className="mt-4 border-t border-cs2-border pt-4">
              <h3 className="text-sm font-semibold text-cs2-gold mb-2">👑总决赛</h3>
              {matches.filter(m => m.round === 99).map(m => (
                <MatchCard key={m.id} match={m} onUpdateScore={onUpdateMatch} updating={updating} isFinal />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketRoundList({
  matches,
  onUpdateMatch,
  updating,
}: {
  matches: Match[];
  onUpdateMatch?: (matchId: number, a: number, b: number) => void;
  updating?: boolean;
}) {
  if (matches.length === 0) return null;

  const byRound = groupByRound(matches);
  return (
    <div className="flex gap-6">
      {byRound.map(([round, roundMatches]) => (
        <div key={round} className="flex flex-col gap-3 min-w-[240px]">
          <div className="text-xs text-cs2-text-muted font-medium">R{round}</div>
          {roundMatches.map((m) => (
            <MatchCard key={m.id} match={m} onUpdateScore={onUpdateMatch} updating={updating} compact />
          ))}
        </div>
      ))}
    </div>
  );
}

function LosersMatches({
  matches,
  onUpdateMatch,
  updating,
}: {
  matches: Match[];
  onUpdateMatch?: (matchId: number, a: number, b: number) => void;
  updating?: boolean;
}) {
  const lbMatches = matches.filter(m =>
    m.bracket_position?.startsWith('L') && m.round < 99
  );

  if (lbMatches.length === 0) return <p className="text-xs text-cs2-text-muted">暂无败者组对阵</p>;

  const byRound = groupByRound(lbMatches);

  return (
    <div className="flex gap-6">
      {byRound.map(([round, roundMatches]) => (
        <div key={round} className="flex flex-col gap-3 min-w-[240px]">
          <div className="text-xs text-cs2-text-muted font-medium">L{round}</div>
          {roundMatches.map((m) => (
            <MatchCard key={m.id} match={m} onUpdateScore={onUpdateMatch} updating={updating} compact />
          ))}
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  onUpdateScore,
  updating,
  compact,
  isFinal,
}: {
  match: Match;
  onUpdateScore?: (matchId: number, a: number, b: number) => void;
  updating?: boolean;
  compact?: boolean;
  isFinal?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(match.team_a_score?.toString() || '');
  const [scoreB, setScoreB] = useState(match.team_b_score?.toString() || '');

  const isCompleted = match.status === 'completed';
  const aIsWinner = match.winner_team_id === match.team_a_id;
  const bIsWinner = match.winner_team_id === match.team_b_id;

  const handleScoreUpdate = () => {
    if (!onUpdateScore) return;
    const a = parseInt(scoreA) || 0;
    const b = parseInt(scoreB) || 0;
    onUpdateScore(match.id, a, b);
    setEditing(false);
  };

  return (
    <div className={`
      rounded-lg border p-3 transition-colors
      ${isFinal ? 'border-cs2-gold/50 bg-cs2-gold/5 min-w-[300px]' :
        isCompleted ? 'border-cs2-border bg-cs2-surface' :
        'border-cs2-border bg-cs2-surface hover:border-cs2-accent/30'}
      ${compact ? 'min-w-[220px]' : ''}
    `}>
      {/* Team A */}
      <div className={`flex items-center justify-between py-1.5 px-1 rounded ${aIsWinner ? 'text-cs2-accent font-semibold' : ''}`}>
        <span className="text-sm truncate flex-1">{match.team_a_name || 'TBD'}</span>
        {editing ? (
          <input
            type="number"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            className="w-12 text-center bg-cs2-bg border border-cs2-border rounded text-sm font-mono py-0.5"
            min={0}
          />
        ) : (
          <span className={`font-mono text-sm ml-2 ${isCompleted ? 'font-bold' : 'text-cs2-text-muted'}`}>
            {match.team_a_score ?? '-'}
          </span>
        )}
      </div>

      {/* Team B */}
      <div className={`flex items-center justify-between py-1.5 px-1 rounded mt-0.5 ${bIsWinner ? 'text-cs2-accent font-semibold' : ''}`}>
        <span className="text-sm truncate flex-1">{match.team_b_name || 'TBD'}</span>
        {editing ? (
          <input
            type="number"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            className="w-12 text-center bg-cs2-bg border border-cs2-border rounded text-sm font-mono py-0.5"
            min={0}
          />
        ) : (
          <span className={`font-mono text-sm ml-2 ${isCompleted ? 'font-bold' : 'text-cs2-text-muted'}`}>
            {match.team_b_score ?? '-'}
          </span>
        )}
      </div>

      {/* Action bar */}
      {onUpdateScore && match.status !== 'completed' && (
        <div className="mt-2 pt-2 border-t border-cs2-border flex justify-end">
          {editing ? (
            <div className="flex gap-1">
              <button onClick={() => setEditing(false)} className="text-xs text-cs2-text-muted hover:text-cs2-text px-2">取消</button>
              <button onClick={handleScoreUpdate} disabled={updating} className="text-xs text-cs2-accent hover:text-cs2-accent-hover px-2">
                {updating ? '...' : '确认'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-cs2-text-muted hover:text-cs2-text">
              录入比分
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="mt-1 text-xs text-cs2-accent font-medium">
          {aIsWinner ? match.team_a_name : match.team_b_name} 胜
        </div>
      )}
    </div>
  );
}

// --- Utilities ---

function groupByRound(matches: Match[]): [number, Match[]][] {
  const map = new Map<number, Match[]>();
  for (const m of matches) {
    if (!map.has(m.round)) map.set(m.round, []);
    map.get(m.round)!.push(m);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function getRoundMatches(matches: Match[], round: number): Match[] {
  return matches.filter(m => m.round === round && m.bracket_position?.startsWith('W'));
}

function buildSingleElimTree(matches: Match[]): any {
  return { matches: groupByRound(matches) };
}

function buildDoubleElimTree(matches: Match[]): any {
  const wb = matches.filter(m => m.bracket_position?.startsWith('W'));
  const lb = matches.filter(m => m.bracket_position?.startsWith('L'));
  const gf = matches.filter(m => m.round === 99);
  return { wb: groupByRound(wb), lb: groupByRound(lb), gf };
}
