import json, urllib.request

BASE = "http://localhost:3001/api"

def api(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method,
                                headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        return err

# 1. Create16-team Swiss tournament
r = api("POST", "/tournaments", {
    "name": "2026夏季邀请赛",
    "description": "瑞士轮小组赛 + 单败淘汰赛",
    "stage_type": "group",
    "group_format": "swiss",
    "knockout_format": "single_elim",
    "default_bo": 3
})
print(f"Created: {r.get('error') or r['data']['name']}")
tid = r["data"]["id"]
print(f"Tournament ID: {tid}")

# 2. Add all 16 teams
for i in range(1, 17):
    api("POST", f"/tournaments/{tid}/teams", {"team_id": i})

t = api("GET", f"/tournaments/{tid}")
print(f"Teams: {len(t['data']['teams'])}")

# 3. Generate Swiss draw
draw = api("POST", f"/tournaments/{tid}/draw")
if not draw.get("success"):
    print(f"Draw failed: {draw.get('error')}")
    exit(1)
print(f"Swiss R1: {len(draw['data'])} matches")

# 4. Enter R1 scores
tdata = api("GET", f"/tournaments/{tid}")
r1_pending = [m for m in tdata["data"]["matches"] if m["round"] == 1 and m["status"] == "pending"]
for m in r1_pending:
    api("PUT", f"/tournaments/{tid}/matches/{m['id']}", {"team_a_score": 16, "team_b_score": 12})
print(f"R1: completed {len(r1_pending)}")

# 5. R2
tdata = api("GET", f"/tournaments/{tid}")
r2_pending = [m for m in tdata["data"]["matches"] if m["round"] == 2 and m["status"] == "pending"]
for m in r2_pending:
    api("PUT", f"/tournaments/{tid}/matches/{m['id']}", {"team_a_score": 16, "team_b_score": 9})
print(f"R2: completed {len(r2_pending)}")

# 6. R3
tdata = api("GET", f"/tournaments/{tid}")
r3_pending = [m for m in tdata["data"]["matches"] if m["round"] == 3 and m["status"] == "pending"]
for m in r3_pending:
    api("PUT", f"/tournaments/{tid}/matches/{m['id']}", {"team_a_score": 16, "team_b_score": 13})
print(f"R3: completed {len(r3_pending)}")

# 7. R4
tdata = api("GET", f"/tournaments/{tid}")
r4_pending = [m for m in tdata["data"]["matches"] if m["round"] == 4 and m["status"] == "pending"]
for m in r4_pending:
    api("PUT", f"/tournaments/{tid}/matches/{m['id']}", {"team_a_score": 16, "team_b_score": 10})
print(f"R4: completed {len(r4_pending)}")

# 8. Show standings before knockout
standings = api("GET", f"/tournaments/{tid}")
records = {}
for m in standings["data"]["matches"]:
    if not m.get("bracket_position") and m["status"] == "completed" and m.get("winner_team_id"):
        a = m["team_a_name"]
        b = m["team_b_name"]
        for name in [a, b]:
            if name not in records:
                records[name] = {"w": 0, "l": 0}
        if m["winner_team_id"] == m["team_a_id"]:
            records[a]["w"] += 1
            records[b]["l"] += 1
        else:
            records[b]["w"] += 1
            records[a]["l"] += 1

ranked = sorted(records.items(), key=lambda x: (-x[1]["w"], x[1]["l"]))
print(f"\n=== Swiss Standings ===")
for i, (name, rec) in enumerate(ranked):
    tag = "✅" if rec["w"] >= 3 else "  "
    print(f"  {i+1:2}. {tag} {name:20s} {rec['w']}W-{rec['l']}L")

# 9. Generate knockout from top 8
knockout = api("POST", f"/tournaments/{tid}/knockout", {"advance_count": 8})
if not knockout.get("success"):
    print(f"Knockout failed: {knockout.get('error')}")
    exit(1)
adv = knockout["data"]["advancing"]
km = knockout["data"]["matches"]
print(f"\n=== Knockout Bracket ===")
print(f"Advancing: {len(adv)} teams")
for t in adv:
    print(f"  {t['name']} ({t['wins']}W-{t['losses']}L)")
print(f"Knockout matches: {len(km)}")
for m in km:
    print(f"  {m['bracket_position']}: {m['team_a_name']} vs {m['team_b_name']} [R{m['round']}]")

# 10. Final summary
final = api("GET", f"/tournaments/{tid}")
total = len(final["data"]["matches"])
knockout_m = [m for m in final["data"]["matches"] if m.get("bracket_position")]
group_m = [m for m in final["data"]["matches"] if not m.get("bracket_position")]
print(f"\n=== Final ===")
print(f"Group: {len(group_m)}, Knockout: {len(knockout_m)}, Total: {total}")
print(f"URL: http://localhost:5173/tournaments/{tid}")
