$ErrorActionPreference = "Continue"
$results = @{}

$urls = @(
    "https://sedentist.com/",
    "https://sedentist.com/robots.txt",
    "https://sedentist.com/sitemap.xml"
)

foreach ($url in $urls) {
    Write-Host "Testing: $url"
    try {
        $r = Invoke-WebRequest -Uri $url -UserAgent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -TimeoutSec 15 -UseBasicParsing
        $results[$url] = @{ Status = $r.StatusCode; ContentLength = $r.Content.Length; ContentType = $r.ContentType }
        Write-Host "  Status: $($r.StatusCode)"
        if ($r.StatusCode -eq 200) {
            Write-Host "  Content preview: $($r.Content.Substring(0, [Math]::Min(500, $r.Content.Length)))"
        }
    } catch {
        Write-Host "  Error: $($_.Exception.Message)"
        $results[$url] = @{ Error = $_.Exception.Message }
    }
    Write-Host ""
}

$results | ConvertTo-Json
