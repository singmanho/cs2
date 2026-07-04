import json, urllib.request, urllib.error

BASE = "http://localhost:3001/api"

def api(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method,
                                headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        return err

# 80 players (16 teams × 5)
PLAYERS = [
    ("s1mple", "传说", 1.25, 1.4, 92, 45),
    ("electronic", "枪王", 1.15, 1.2, 85, 40),
    ("b1t", "大师 III", 1.12, 1.1, 80, 38),
    ("Perfecto", "大师 II", 1.05, 1.0, 75, 35),
    ("sdy", "大师 I", 1.00, 0.95, 72, 32),
    ("NiKo", "传说", 1.28, 1.35, 90, 48),
    ("huNter-", "枪王", 1.14, 1.15, 83, 41),
    ("m0NESY", "传说", 1.30, 1.45, 88, 42),
    ("HooXi", "专家 III", 0.95, 0.85, 68, 28),
    ("nexa", "大师 III", 1.08, 1.05, 78, 36),
    ("ZywOo", "传说", 1.27, 1.42, 91, 46),
    ("apEX", "大师 II", 1.02, 0.98, 76, 34),
    ("Magisk", "大师 III", 1.10, 1.12, 81, 39),
    ("dupreeh", "大师 I", 1.00, 0.96, 74, 33),
    ("Spinx", "枪王", 1.16, 1.20, 84, 42),
    ("donk", "传说", 1.32, 1.48, 95, 50),
    ("sh1ro", "枪王", 1.18, 1.22, 86, 43),
    ("magixx", "大师 III", 1.06, 1.03, 77, 35),
    ("zont1x", "大师 II", 1.04, 1.00, 75, 34),
    ("chopper", "大师 I", 1.00, 0.94, 72, 31),
    ("ropz", "枪王", 1.19, 1.25, 87, 44),
    ("frozen", "枪王", 1.17, 1.21, 85, 42),
    ("Twistzz", "枪王", 1.15, 1.18, 84, 43),
    ("torzsi", "大师 III", 1.10, 1.08, 80, 38),
    ("JDC", "大师 II", 1.03, 0.99, 74, 33),
    ("TeSeS", "大师 III", 1.08, 1.06, 79, 37),
    ("Snappi", "大师 II", 1.02, 0.97, 76, 34),
    ("maden", "大师 I", 1.00, 0.95, 73, 32),
    ("SunPayus", "大师 III", 1.07, 1.04, 78, 36),
    ("NertZ", "大师 II", 1.05, 1.02, 77, 35),
    ("YEKINDAR", "枪王", 1.14, 1.16, 82, 40),
    ("NAF", "大师 III", 1.09, 1.07, 80, 38),
    ("oSee", "大师 II", 1.04, 1.00, 75, 34),
    ("nitr0", "大师 I", 0.98, 0.92, 71, 30),
    ("EliGE", "大师 III", 1.11, 1.10, 81, 39),
    ("Jame", "枪王", 1.13, 1.14, 83, 41),
    ("FL1T", "大师 III", 1.09, 1.08, 80, 38),
    ("fame", "大师 II", 1.05, 1.01, 76, 35),
    ("n0rb3r7", "大师 I", 1.01, 0.96, 73, 32),
    ("Qikert", "大师 II", 1.03, 0.98, 74, 33),
    ("Snappi", "大师 II", 1.04, 1.00, 76, 34),
    ("valde", "大师 I", 1.01, 0.97, 73, 32),
    ("dycha", "大师 III", 1.07, 1.05, 78, 36),
    ("hades", "大师 II", 1.05, 1.02, 77, 35),
    ("Goofy", "专家 III", 0.97, 0.90, 70, 29),
    ("dupreeh", "大师 II", 1.03, 1.00, 75, 34),
    ("blameF", "大师 III", 1.10, 1.08, 82, 39),
    ("gla1ve", "大师 I", 0.99, 0.93, 72, 31),
    ("Xyp9x", "大师 II", 1.02, 0.97, 74, 33),
    ("Buzz", "大师 I", 1.00, 0.95, 72, 31),
    ("stavn", "枪王", 1.16, 1.19, 84, 42),
    ("TeSeS", "大师 III", 1.09, 1.07, 80, 38),
    ("sjuush", "大师 II", 1.04, 1.01, 76, 34),
    ("nicoodoz", "大师 III", 1.07, 1.05, 78, 36),
    ("cadiaN", "大师 II", 1.03, 0.99, 75, 33),
    ("yuurih", "枪王", 1.15, 1.18, 83, 41),
    ("KSCERATO", "枪王", 1.14, 1.17, 82, 40),
    ("arT", "大师 III", 1.08, 1.06, 79, 37),
    ("saffee", "大师 II", 1.04, 1.00, 76, 34),
    ("drop", "大师 I", 1.00, 0.95, 73, 32),
    ("biguzera", "大师 III", 1.09, 1.07, 80, 38),
    ("lux", "大师 II", 1.04, 1.01, 76, 34),
    ("hardzao", "大师 I", 1.01, 0.96, 73, 32),
    ("nqz", "大师 III", 1.07, 1.05, 78, 36),
    ("kauez", "专家 III", 0.96, 0.89, 70, 28),
    ("tabseN", "大师 III", 1.09, 1.07, 80, 38),
    ("syrsoN", "大师 III", 1.10, 1.09, 81, 39),
    ("Krimbo", "大师 II", 1.06, 1.03, 77, 35),
    ("prosus", "大师 I", 1.01, 0.96, 73, 32),
    ("faveN", "大师 II", 1.03, 0.99, 75, 33),
    ("FaNg", "大师 III", 1.08, 1.06, 79, 37),
    ("JT", "大师 II", 1.04, 1.01, 76, 34),
    ("hallzerk", "大师 III", 1.09, 1.07, 80, 38),
    ("Grim", "大师 II", 1.05, 1.02, 77, 35),
    ("junior", "大师 I", 1.00, 0.95, 72, 31),
    ("Ax1Le", "枪王", 1.20, 1.26, 88, 45),
    ("nafany", "大师 III", 1.07, 1.05, 78, 36),
    ("Hobbit", "大师 II", 1.05, 1.02, 77, 35),
    ("n0rb3r7", "大师 I", 1.01, 0.96, 73, 32),
    ("KaiR0N", "大师 II", 1.04, 1.01, 76, 34),
]

TEAMS = [
    "NaVi", "G2", "Vitality", "Spirit", "MOUZ",
    "Falcons", "Liquid", "VP", "ENCE", "Astralis",
    "HEROIC", "FURIA", "paiN", "BIG", "Complexity",
    "Spirit Academy",
]

print(f"Creating {len(PLAYERS)} players...")
player_ids = []
for name, rank, rating, kd, adr, hs in PLAYERS:
    r = api("POST", "/players", {
        "name": name, "rank": rank,
        "rating": rating, "kd_ratio": kd,
        "avg_damage": adr, "headshot_pct": hs,
    })
    if r.get("success"):
        player_ids.append(r["data"]["id"])
    else:
        print(f"  skip {name}: {r.get('error','')}")
        player_ids.append(None)

print(f"Created {len([p for p in player_ids if p])} players")

print(f"Creating {len(TEAMS)} teams...")
team_ids = []
for tname in TEAMS:
    r = api("POST", "/teams", {"name": tname})
    if r.get("success"):
        team_ids.append(r["data"]["id"])
        print(f"  {tname} -> id {r['data']['id']}")
    else:
        print(f"  skip {tname}: {r.get('error','')}")
        team_ids.append(None)

print("Adding 5 members per team...")
for i, tid in enumerate(team_ids):
    if not tid:
        continue
    for j in range(5):
        pid = player_ids[i * 5 + j]
        if pid:
            api("POST", f"/teams/{tid}/members", {"player_id": pid})

print("Verifying...")
ts = api("GET", "/teams")
for t in ts["data"]:
    print(f"  {t['name']}: {t['member_count']} members")

print("\nDone!")
