$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Add 8 teams to tournament 1
for ($i = 1; $i -le 8; $i++) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1/teams" -Method POST -Body "{`"team_id`":$i}" -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
}

$t = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1"
"Teams in tournament: $($t.data.teams.Count)"

# Generate draw (group stage swiss)
$draw = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1/draw" -Method POST -ContentType "application/json"
"Draw: $($draw.data.Count) matches"

# Enter scores for all group matches (give team_a wins)
$matches = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1"
$mArr = $matches.data.matches | Where-Object { -not $_.bracket_position -and $_.status -eq 'pending' }
foreach ($m in $mArr) {
    Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1/matches/$($m.id)" -Method PUT -Body "{`"team_a_score`":16,`"team_b_score`":10}" -ContentType "application/json" | Out-Null
}

$after = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1"
"Completed group matches: $(($after.data.matches | Where-Object { -not $_.bracket_position -and $_.status -eq 'completed' }).Count)"

# Generate knockout bracket
$knockout = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1/knockout" -Method POST -Body "{`"advance_count`":8}" -ContentType "application/json"
$advCount = if ($knockout.data.advancing) { $knockout.data.advancing.Count } else { 0 }
$knockoutCount = if ($knockout.data.matches) { $knockout.data.matches.Count } else { 0 }
"Advancing teams: $advCount"
"Knockout matches: $knockoutCount"

# Final state
$final = Invoke-RestMethod -Uri "http://localhost:3001/api/tournaments/1"
$totalMatches = $final.data.matches.Count
$knockoutMatches = ($final.data.matches | Where-Object { $_.bracket_position }).Count
"Total matches: $totalMatches, Knockout: $knockoutMatches"
