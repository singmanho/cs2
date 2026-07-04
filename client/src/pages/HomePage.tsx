import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api/client';
import { CS2_RANKS } from '@shared/types';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-12">
      <section className="text-center py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          CS2 <span className="text-cs2-accent">赛事管理</span>
        </h1>
        <p className="text-cs2-text-muted text-lg max-w-xl mx-auto mb-8">
          手动录入选手数据（含段位），创建赛事，自动抽签生成对阵图。
          支持瑞士轮、双败淘汰、组内循环三种赛制，小组赛与淘汰赛可分别设置。
        </p>

        <div className="flex gap-3 justify-center">
          <Link to="/players" className="btn-primary">添加选手</Link>
          <Link to="/tournaments" className="btn-secondary">创建赛事</Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/players" className="card hover:border-cs2-accent/50 transition-colors group">
          <div className="w-10 h-10 rounded-lg bg-cs2-accent/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-cs2-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">选手管理</h3>
          <p className="text-sm text-cs2-text-muted">手动录入选手信息、段位与比赛数据</p>
        </Link>

        <Link to="/tournaments" className="card hover:border-cs2-accent/50 transition-colors group">
          <div className="w-10 h-10 rounded-lg bg-cs2-accent/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-cs2-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M5 3v4.5M19 3v4.5M8 21h8M12 17v4M9.4 3c-.633 2.21-1.9 4.5-3.4 6.5M14.6 3c.633 2.21 1.9 4.5 3.4 6.5" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">赛事中心</h3>
          <p className="text-sm text-cs2-text-muted">创建赛事、管理对阵、查看实时赛程</p>
        </Link>

        <div className="card">
          <div className="w-10 h-10 rounded-lg bg-cs2-accent/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-cs2-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">灵活赛制</h3>
          <p className="text-sm text-cs2-text-muted">小组赛与淘汰赛可独立选择赛制：瑞士轮 · 双败淘汰 · 组内循环</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="font-semibold text-cs2-accent mb-2">🇨🇭 瑞士轮</h4>
          <p className="text-sm text-cs2-text-muted">
            每轮按积分匹配实力相近的对手，胜者得3分。逐轮生成对阵，最终积分排名决定晋级。
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-cs2-gold mb-2">🏆 双败淘汰</h4>
          <p className="text-sm text-cs2-text-muted">
            输一次落入败者组，输两次淘汰。胜者组冠军与败者组冠军会师总决赛。
          </p>
        </div>
        <div className="card">
          <h4 className="font-semibold text-blue-400 mb-2">🔄 组内循环</h4>
          <p className="text-sm text-cs2-text-muted">
            组内每位选手与其他所有人各打一场，按积分排名，确保每人都充分交手。
          </p>
        </div>
      </section>
    </div>
  );
}
