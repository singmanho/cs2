$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Create16-team Swiss tournament
$swiss = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments" -Method POST -Body '{"name":"2026夏季邀请赛","description":"瑞士轮小组赛 + 单败淘汰赛","stage_type":"group","group_format":"swiss","knockout_format":"single_elim","default_bo":3}' -ContentType "application/json"
$tid = $swiss.data.id
"Tournament $tid created: $($swiss.data.name) (swiss + single_elim BO3)"

# Add all 16 teams
for ($i = 1; $i -le 16; $i++) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/teams" -Method POST -Body "{`"team_id`":$i}" -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
}
$t2 = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid"
"Teams: $($t2.data.teams.Count)"

# Generate Swiss draw (R1)
$draw = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/draw" -Method POST -ContentType "application/json"
"Swiss R1 matches: $($draw.data.Count)"

# Enter R1 scores (simulate: team_a always wins for simplicity)
$allM = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid"
$r1Matches = $allM.data.matches | Where-Object { $_.round -eq 1 -and $_.status -eq 'pending' }
foreach ($m in $r1Matches) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/matches/$($m.id)" -Method PUT -Body '{`"team_a_score`":16,`"team_b_score`":12}' -ContentType "application/json" | Out-Null
}
"After R1: completed $($r1Matches.Count) matches"

# Check R2 was auto-generated
$afterR1 = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid"
$r2 = $afterR1.data.matches | Where-Object { $_.round -eq 2 }
"R2 matches auto-generated: $($r2.Count)"

# Enter R2 scores
$r2Pending = $afterR1.data.matches | Where-Object { $_.round -eq 2 -and $_.status -eq 'pending' }
foreach ($m in $r2Pending) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/matches/$($m.id)" -Method PUT -Body '{`"team_a_score`":16,`"team_b_score`":9}' -ContentType "application/json" | Out-Null
}
"After R2: completed $($r2Pending.Count) matches"

# Enter R3 scores
$afterR2 = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid"
$r3Pending = $afterR2.data.matches | Where-Object { $_.round -eq 3 -and $_.status -eq 'pending' }
foreach ($m in $r3Pending) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/matches/$($m.id)" -Method PUT -Body '{`"team_a_score`":16,`"team_b_score`":13}' -ContentType "application/json" | Out-Null
}
"After R3: completed $($r3Pending.Count) matches"

# Enter R4 scores
$afterR3 = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid"
$r4Pending = $afterR3.data.matches | Where-Object { $_.round -eq 4 -and $_.status -eq 'pending' }
foreach ($m in $r4Pending) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/matches/$($m.id)" -Method PUT -Body '{`"team_a_score`":16,`"team_b_score`":10}' -ContentType "application/json" | Out-Null
}
"After R4: completed $($r4Pending.Count) matches"

# Now generate knockout bracket from group results
$knockout = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid/knockout" -Method POST -Body '{"advance_count":8}' -ContentType "application/json"
$advCount = if ($knockout.data.advancing) { $knockout.data.advancing.Count } else { 0 }
$knockoutCount = if ($knockout.data.matches) { $knockout.data.matches.Count } else { 0 }
"Advancing to knockout: $advCount teams"
"Knockout matches: $knockoutCount"

# Show advancing teams
if ($knockout.data.advancing) {
    $knockout.data.advancing | ForEach-Object { Write-Output "  $($_.name) ($($_.wins)W-$($_.losses)L)" }
}

# Final summary
$final = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/$tid"
$totalMatches = $final.data.matches.Count
$knockoutMatches = ($final.data.matches | Where-Object { $_.bracket_position }).Count
$groupMatches = ($final.data.matches | Where-Object { -not $_.bracket_position }).Count
"Final: $groupMatches group + $knockoutMatches knockout = $totalMatches total"
"Tournament URL: http://localhost:5173/tournaments/$tid"