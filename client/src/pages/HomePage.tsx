import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function HomePage() {
  const [stats, setStats] = useState({ players: 0, teams: 0, tournaments: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [p, t, tt] = await Promise.all([
          api.players.list().catch(() => []),
          api.teams.list().catch(() => []),
          api.tournaments.list().catch(() => []),
        ]);
        setStats({ players: p.length, teams: t.length, tournaments: tt.length });
      } catch { /* */ }
    };
    load();
  }, []);

  return (
    <div className="space-y-16 animate-fade-in">
      {/* Hero */}
      <section className="relative text-center py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cs2-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cs2-accent/10 border border-cs2-accent/20 text-cs2-accent text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-cs2-accent animate-pulse" />
            赛事管理系统
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            CS2 <span className="gradient-text">Tournament</span>
          </h1>
          <p className="text-cs2-text-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            专业 CS2 赛事管理平台 — 选手段位录入、战队管理、自动抽签对阵、
            支持瑞士轮 · 单败/双败淘汰 · 组内循环，小组赛与淘汰赛可分别设置赛制和 BO 格式。
          </p>

          <div className="flex gap-3 justify-center mb-12">
            <Link to="/tournaments" className="btn-primary px-6 py-3 text-base">
              进入赛事中心
            </Link>
            <Link to="/players" className="btn-secondary px-6 py-3 text-base">
              管理选手
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-cs2-accent">{stats.players}</div>
              <div className="text-sm text-cs2-text-muted mt-1">选手</div>
            </div>
            <div className="w-px bg-cs2-border" />
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-cs2-gold">{stats.teams}</div>
              <div className="text-sm text-cs2-text-muted mt-1">战队</div>
            </div>
            <div className="w-px bg-cs2-border" />
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-green-400">{stats.tournaments}</div>
              <div className="text-sm text-cs2-text-muted mt-1">赛事</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/players" className="card-glow group">
          <div className="w-12 h-12 rounded-xl bg-cs2-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-cs2-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">选手管理</h2>
          <p className="text-sm text-cs2-text-muted leading-relaxed">
            录入选手信息与完美平台段位，管理个人比赛数据（Rating / K/D / ADR / 爆头率）
          </p>
        </Link>

        <Link to="/teams" className="card-glow group">
          <div className="w-12 h-12 rounded-xl bg-cs2-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-cs2-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">战队管理</h2>
          <p className="text-sm text-cs2-text-muted leading-relaxed">
            组建战队、管理成员阵容，为赛事报名做好准备
          </p>
        </Link>

        <Link to="/tournaments" className="card-glow group">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M5 3v4.5M19 3v4.5M8 21h8M12 17v4M9.4 3c-.633 2.21-1.9 4.5-3.4 6.5M14.6 3c.633 2.21 1.9 4.5 3.4 6.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5c.833 1.667 1.833 2.5 3 2.5s2.167-.833 3-2.5" />
            </svg>
          </div>
          <h2 className="font-semibold text-lg mb-1">赛事中心</h2>
          <p className="text-sm text-cs2-text-muted leading-relaxed">
            创建赛事、批量添加战队、自动抽签对阵、实时比分录入与积分榜
          </p>
        </Link>
      </section>

      {/* Format cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-center">支持的赛制</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card-glow">
            <div className="text-2xl mb-2">🇨🇭</div>
            <h3 className="font-semibold text-cs2-accent mb-2">瑞士轮</h3>
            <p className="text-sm text-cs2-text-muted leading-relaxed">
              同分对打，Buchholz 破平，无重赛。逐轮配对直到晋级名额确定。
            </p>
          </div>
          <div className="card-glow">
            <div className="text-2xl mb-2">⚔️</div>
            <h3 className="font-semibold text-blue-400 mb-2">单败淘汰</h3>
            <p className="text-sm text-cs2-text-muted leading-relaxed">
              标准淘汰赛，输一场即出局。赛程紧凑，悬念拉满。
            </p>
          </div>
          <div className="card-glow">
            <div className="text-2xl mb-2">🏆</div>
            <h3 className="font-semibold text-cs2-gold mb-2">双败淘汰</h3>
            <p className="text-sm text-cs2-text-muted leading-relaxed">
              胜者组 + 败者组，输两次才淘汰。总决赛 WB 冠军 vs LB 冠军。
            </p>
          </div>
          <div className="card-glow">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-emerald-400 mb-2">组内循环</h3>
            <p className="text-sm text-cs2-text-muted leading-relaxed">
              全员互打，积分排名。公平公正，适合小组赛阶段。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
