const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

export const api = {
  players: {
    list: (search?: string) =>
      request<any[]>(`/players${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id: number) => request<any>(`/players/${id}`),
    create: (data: { name: string; rank: string; rating?: number; kd_ratio?: number; avg_damage?: number; headshot_pct?: number }) =>
      request<any>('/players', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, any>) =>
      request<any>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/players/${id}`, { method: 'DELETE' }),
  },

  teams: {
    list: () => request<any[]>('/teams'),
    get: (id: number) => request<any>(`/teams/${id}`),
    create: (data: { name: string; player_ids?: number[] }) =>
      request<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { name: string }) =>
      request<any>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/teams/${id}`, { method: 'DELETE' }),
    addMember: (teamId: number, playerId: number) =>
      request<any>(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ player_id: playerId }) }),
    removeMember: (teamId: number, playerId: number) =>
      request<void>(`/teams/${teamId}/members/${playerId}`, { method: 'DELETE' }),
  },

  tournaments: {
    list: () => request<any[]>('/tournaments'),
    get: (id: number) => request<any>(`/tournaments/${id}`),
    create: (data: { name: string; description?: string; stage_type: string; group_format: string; knockout_format: string; team_size?: number; max_participants?: number }) =>
      request<any>('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
    addTeam: (id: number, data: { team_id: number; seed?: number; group_name?: string }) =>
      request<any>(`/tournaments/${id}/teams`, { method: 'POST', body: JSON.stringify(data) }),
    removeTeam: (id: number, teamId: number) =>
      request<void>(`/tournaments/${id}/teams/${teamId}`, { method: 'DELETE' }),
    generateDraw: (id: number) =>
      request<any>(`/tournaments/${id}/draw`, { method: 'POST' }),
    updateMatch: (tournamentId: number, matchId: number, data: { team_a_score: number; team_b_score: number }) =>
      request<any>(`/tournaments/${tournamentId}/matches/${matchId}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
