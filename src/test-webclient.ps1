$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

function Get-WebClientContent {
    param([string]$url)
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        $wc.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        $content = $wc.DownloadString($url)
        $wc.Dispose()
        return @{ Success = $true; Content = $content }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

Write-Host "Testing with WebClient..."

$result = Get-WebClientContent "https://sedentist.com/sitemap.xml"
if ($result.Success) {
    Write-Host "Success!"
    Write-Host "Content length: $($result.Content.Length)"
    Write-Host "Preview:"
    Write-Host $result.Content.Substring(0, [Math]::Min(1000, $result.Content.Length))
} else {
    Write-Host "Failed: $($result.Error)"
}

Write-Host ""
Write-Host "Trying page-sitemap.xml..."
$result2 = Get-WebClientContent "https://sedentist.com/page-sitemap.xml"
if ($result2.Success) {
    Write-Host "Success!"
    Write-Host "Content length: $($result2.Content.Length)"
    Write-Host "Preview:"
    Write-Host $result2.Content.Substring(0, [Math]::Min(1000, $result2.Content.Length))
} else {
    Write-Host "Failed: $($result2.Error)"
}
