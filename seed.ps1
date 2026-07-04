$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ranks = @('新锐 I','新锐 II','新锐 III','精英 I','精英 II','精英 III','专家 I','专家 II','专家 III','大师 I','大师 II','大师 III','传说','枪王','枪王之王')
$names = @('ZywOo','s1mple','NiKo','m0NESY','donk','sh1ro','ropz','Twistzz','broky','frozen','jL','b1t','XANTARES','KSCERATO','device','stavn','Spinx','flameZ','Magisk','apEX','karrigan','cadiaN','siuhy','Aleksib','Snappi','HooXi','electroNic','Perfecto','NAF','YEKINDAR','Ax1Le','shalfey','mzinho','insani','biguzera','Try','deko','zorte','KaiR0N','npl','headtr1ck','WORO2K','Jame','fame','mir','Qikert','FL1T','Patsi','sdy','Norwi','Forester','TRAVIS','alpha','Krad','CacaNito','joel','oxy','Jeorge','Swisher','junior','JT','hallzerk','Cooper','Grim','floppy','EliGE','oSee','autimatic','RUSH','flameZ','dupreeh','Snappi','Maden','SunPayus','BOROS','XANTARES','MAJ3R','Calyx','Wicadia','F1KU')

Write-Output "Creating 80 players..."
$playerIds = @()
for ($i = 0; $i -lt 80; $i++) {
    $n = if ($i -lt $names.Length) { $names[$i] } else { "Pro$i" }
    $r = $ranks[$i % 15]
    $rt = [math]::Round((0.8 + (Get-Random -Min 0 -Max 40) / 100), 2)
    $kd = [math]::Round((0.7 + (Get-Random -Min 0 -Max 45) / 100), 2)
    $ad = 60 + (Get-Random -Min 0 -Max 35)
    $hs = 20 + (Get-Random -Min 0 -Max 40)
    $body = "{`"name`":`"$n`",`"rank`":`"$r`",`"rating`":$rt,`"kd_ratio`":$kd,`"avg_damage`":$ad,`"headshot_pct`":$hs}"
    try { $resp = Invoke-WebRequest -Uri http://localhost:3001/api/players -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue } catch {}
}
$pl = (Invoke-RestMethod -Uri http://localhost:3001/api/players).data.Count
Write-Output "Players: $pl"

$teamNames = @('NaVi','FaZe','G2','Vitality','Spirit','MOUZ','Falcons','Liquid','VP','ENCE','Astralis','HEROIC','FURIA','paiN','BIG','Complexity')
Write-Output "Creating 16 teams..."
$teamIds = @()
for ($i = 0; $i -lt 16; $i++) {
    $body = "{`"name`":`"$($teamNames[$i])`"}"
    $r = Invoke-RestMethod -Uri http://localhost:3001/api/teams -Method POST -Body $body -ContentType "application/json"
    $teamIds += $r.data.id
}

Write-Output "Adding 5 players to each team..."
for ($i = 0; $i -lt 16; $i++) {
    $tid = $teamIds[$i]
    for ($j = 0; $j -lt 5; $j++) {
        $pid = $i * 5 + $j + 1
        Invoke-RestMethod -Uri "http://localhost:3001/api/teams/$tid/members" -Method POST -Body "{`"player_id`":$pid}" -ContentType "application/json" | Out-Null
    }
}

$tc = (Invoke-RestMethod -Uri http://localhost:3001/api/teams).data.Count
Write-Output "Done: $pl players, $tc teams"
