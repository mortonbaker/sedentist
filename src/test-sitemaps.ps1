$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

$testUrls = @(
    "https://sedentist.com/sitemap_index.xml",
    "https://sedentist.com/post-sitemap.xml",
    "https://sedentist.com/page-sitemap.xml",
    "https://sedentist.com/sitemap.xml"
)

foreach ($url in $testUrls) {
    Write-Host "Testing: $url"
    try {
        $r = Invoke-WebRequest -Uri $url -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
        Write-Host "  Status: $($r.StatusCode)"
        Write-Host "  Length: $($r.Content.Length)"
        Write-Host "  Preview: $($r.Content.Substring(0, [Math]::Min(300, $r.Content.Length)))"
    } catch {
        Write-Host "  Error: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            Write-Host "  Status: $([int]$_.Exception.Response.StatusCode)"
        }
    }
    Write-Host ""
}
