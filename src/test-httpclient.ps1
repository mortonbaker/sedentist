$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

Add-Type -AssemblyName System.Net.Http

$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AllowAutoRedirect = $true
$handler.MaxAutomaticRedirections = 10
$handler.CookieContainer = New-Object System.Net.CookieContainer

$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(30)
$client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
$client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
$client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.5")
$client.DefaultRequestHeaders.Add("Connection", "keep-alive")

function Fetch-HttpClient {
    param([string]$url)
    try {
        $response = $client.GetAsync($url).Result
        $content = $response.Content.ReadAsStringAsync().Result
        return @{ Status = [int]$response.StatusCode; Content = $content; IsSuccess = $response.IsSuccessStatusCode }
    } catch {
        return @{ Status = 0; Error = $_.Exception.Message; IsSuccess = $false }
    }
}

Write-Host "Testing HttpClient approach..."

$urls = @(
    "https://sedentist.com/",
    "https://sedentist.com/sitemap.xml",
    "https://sedentist.com/robots.txt"
)

foreach ($url in $urls) {
    Write-Host "Testing: $url"
    $result = Fetch-HttpClient $url
    if ($result.IsSuccess) {
        Write-Host "  Status: $($result.Status)"
        Write-Host "  Length: $($result.Content.Length)"
        Write-Host "  Preview: $($result.Content.Substring(0, [Math]::Min(500, $result.Content.Length)))"
    } else {
        Write-Host "  Status: $($result.Status)"
        Write-Host "  Error: $($result.Error)"
    }
    Write-Host ""
}

$client.Dispose()
