$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

function Fetch-Page {
    param([string]$url)
    try {
        $r = Invoke-WebRequest -Uri $url -UserAgent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
        return @{ Status = $r.StatusCode; Content = $r.Content; ContentType = $r.ContentType }
    } catch {
        $ex = $_.Exception
        if ($ex.Response) {
            return @{ Status = [int]$ex.Response.StatusCode; Error = $ex.Message }
        }
        return @{ Status = 0; Error = $ex.Message }
    }
}

Write-Host "Fetching sitemap index..."
$result = Invoke-WebRequest -Uri "https://sedentist.com/sitemap_index.xml" -UserAgent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
Write-Host "Status: $($result.StatusCode)"
Write-Host "Content type: $($result.ContentType)"
Write-Host "Content length: $($result.Content.Length)"
Write-Host "Content:"
Write-Host $result.Content
