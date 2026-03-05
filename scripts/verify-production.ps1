param(
  [string]$BaseUrl = "https://calculadora-freelancer-orpin.vercel.app"
)

$ErrorActionPreference = "Stop"

$checks = @(
  @{ Path = "/";                Type = "html" },
  @{ Path = "/calculadora.js";  Type = "js"   },
  @{ Path = "/compliance.js";   Type = "js"   },
  @{ Path = "/privacidade.html";Type = "html" },
  @{ Path = "/privacidade";     Type = "html" }
)

$results = foreach ($c in $checks) {
  $url = "$BaseUrl$($c.Path)"
  $status = "ERRO"
  $ct = "-"
  try {
    $headers = curl.exe -s -I $url
    $statusLine = ($headers | Select-String -Pattern '^HTTP/').Line | Select-Object -Last 1
    if ($statusLine) {
      $parts = $statusLine -split "\s+"
      if ($parts.Length -ge 2) { $status = [int]$parts[1] }
    }
    $ctLine = ($headers | Select-String -Pattern '^Content-Type:').Line | Select-Object -Last 1
    if ($ctLine) { $ct = ($ctLine -replace '^Content-Type:\s*', '').Trim() }
  } catch {
    $status = "ERRO"
    $ct = "-"
  }

  $pass = $false
  if ($status -is [int]) {
    switch ($c.Type) {
      "js"   { $pass = ($status -eq 200 -and $ct -match "javascript|ecmascript|text/plain") }
      "html" { $pass = ($status -eq 200 -and $ct -match "html") }
      default { $pass = ($status -eq 200) }
    }
  }

  [pscustomobject]@{
    URL         = $url
    Status      = $status
    ContentType = $ct
    PASS        = $pass
  }
}

$results | Format-Table -AutoSize

if ($results.PASS -contains $false) {
  Write-Host "`nFinal verdict: NOT READY" -ForegroundColor Red
} else {
  Write-Host "`nFinal verdict: GO-LIVE READY" -ForegroundColor Green
}
