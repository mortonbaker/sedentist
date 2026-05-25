param(
    [string]$BaseUrl = "https://sedentist.com/",
    [string]$OutputDir = "C:\Users\morto\Code\sedentist\src"
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$visited = @{}
$internalLinks = @{}
$externalLinks = @{}
$allAnchors = @()
$navElements = @()
$redirectChain = @{}
$issues = @()
$pageHierarchy = @{}

class PageNode {
    [string]$Url
    [string]$Title
    [string]$Parent
    [int]$Depth
    [string]$StatusCode
    [string]$ContentType
    [object[]]$Links
    [string]$DiscoveredVia

    PageNode([string]$url, [string]$parent, [int]$depth, [string]$discoveredVia) {
        $this.Url = $url
        $this.Parent = $parent
        $this.Depth = $depth
        $this.DiscoveredVia = $discoveredVia
        $this.Links = @()
    }
}

function Normalize-Url {
    param([string]$url, [string]$baseUrl)

    if ([string]::IsNullOrEmpty($url)) { return $null }
    $url = $url.Trim()

    if ($url -match '^#') { return $null }
    if ($url -match '^mailto:') { return $null }
    if ($url -match '^tel:') { return $null }

    try {
        $uri = $null
        if ([System.Uri]::TryCreate($url, [System.UriKind]::Absolute, [ref]$uri)) {
            return $uri.AbsoluteUri
        }
        if ([System.Uri]::TryCreate($baseUrl, [System.UriKind]::Absolute, [ref]$uri)) {
            $baseUri = $uri
            if ($url.StartsWith("/")) {
                $baseUri = [System.Uri]::new($baseUri.Scheme + "://" + $baseUri.Host)
                return [System.Uri]::new($baseUri, $url).AbsoluteUri
            }
            return [System.Uri]::new($baseUri, $url).AbsoluteUri
        }
    } catch {}
    return $null
}

function Get-InternalUrl {
    param([string]$url, [string]$baseUrl)

    $normalized = Normalize-Url $url $baseUrl
    if (-not $normalized) { return $null }

    try {
        $baseUri = [System.Uri]::new($baseUrl)
        $urlUri = [System.Uri]::new($normalized)
        if ($urlUri.Host -eq $baseUri.Host) {
            $normalizedPath = $urlUri.PathAndQuery -replace '/$', ''
            if ([string]::IsNullOrEmpty($normalizedPath)) { return $baseUri.AbsoluteUri }
            return $normalized
        }
    } catch {}
    return $null
}

function Is-ExternalUrl {
    param([string]$url, [string]$baseUrl)

    $normalized = Normalize-Url $url $baseUrl
    if (-not $normalized) { return $false }

    try {
        $baseUri = [System.Uri]::new($baseUrl)
        $urlUri = [System.Uri]::new($normalized)
        return $urlUri.Host -ne $baseUri.Host
    } catch {}
    return $false
}

function Extract-Links {
    param([string]$html, [string]$baseUrl)

    $links = @{ Internal = @(); External = @(); Anchors = @() }

    if (-not $html) { return $links }

    $linkPattern = '<a\s+[^>]*href\s*=\s*["'']([^"'']*)["''][^>]*>'
    $matches = [regex]::Matches($html, $linkPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    foreach ($match in $matches) {
        $href = $match.Groups[1].Value
        if ($href -match '^#') {
            $links.Anchors += @{ BaseUrl = $baseUrl; Anchor = $href }
        } elseif (Is-ExternalUrl $href $baseUrl) {
            $extUrl = Normalize-Url $href $baseUrl
            if ($extUrl) { $links.External += $extUrl }
        } else {
            $intUrl = Get-InternalUrl $href $baseUrl
            if ($intUrl) { $links.Internal += $intUrl }
        }
    }

    $navPattern = '<nav\s+[^>]*>(.*?)</nav>'
    $navMatches = [regex]::Matches($html, $navPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    foreach ($navMatch in $navMatches) {
        $navLinks = @()
        $navLinkPattern = '<a\s+[^>]*href\s*=\s*["'']([^"'']*)["''][^>]*>([^<]*)</a>'
        $navLinkMatches = [regex]::Matches($navMatch.Value, $navLinkPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        foreach ($nl in $navLinkMatches) {
            $navHref = $nl.Groups[1].Value
            $navText = $nl.Groups[2].Value.Trim()
            if ($navHref -notmatch '^#' -and $navHref -notmatch '^mailto:') {
                $navLinks += @{ Href = $navHref; Text = $navText; Normalized = (Get-InternalUrl $navHref $baseUrl) }
            }
        }
        if ($navLinks.Count -gt 0) {
            $script:navElements += @{ BaseUrl = $baseUrl; Links = $navLinks }
        }
    }

    return $links
}

function Crawl-Page {
    param([string]$url, [string]$parent, [int]$depth, [string]$discoveredVia)

    if ($depth -gt 10) {
        $script:issues += @{ Type = "MaxDepthExceeded"; Url = $url; Parent = $parent }
        return
    }

    $normalizedUrl = Normalize-Url $url $baseUrl
    if (-not $normalizedUrl) { return }

    if ($visited.ContainsKey($normalizedUrl)) {
        if ($parent -and $parent -ne $normalizedUrl) {
            if (-not $script:redirectChain[$normalizedUrl]) {
                $script:redirectChain[$normalizedUrl] = @()
            }
            $script:redirectChain[$normalizedUrl] += $parent
        }
        return
    }

    $visited[$normalizedUrl] = $true

    try {
        $req = [System.Net.WebRequest]::Create($normalizedUrl)
        $req.Method = "GET"
        $req.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        $req.AllowAutoRedirect = $true
        $req.MaximumAutomaticRedirections = 20
        $req.Timeout = 15000

        $response = $null
        $responseUri = $normalizedUrl

        try {
            $response = $req.GetResponse()
            $responseUri = $response.ResponseUri.AbsoluteUri
        } catch [System.Net.WebException] {
            if ($_.Exception.Response) {
                $response = $_.Exception.Response
                $responseUri = $response.ResponseUri.AbsoluteUri
            } else {
                $script:issues += @{ Type = "ConnectionError"; Url = $normalizedUrl; Error = $_.Exception.Message; Parent = $parent }
                return
            }
        }

        if ($responseUri -ne $normalizedUrl -and $visited.ContainsKey($responseUri)) {
            $script:issues += @{ Type = "RedirectLoop"; Url = $normalizedUrl; FinalUrl = $responseUri; Chain = @($normalizedUrl, $responseUri) }
            return
        }

        $statusCode = [int]$response.StatusCode
        $contentType = $response.ContentType

        if ($statusCode -ge 300 -and $statusCode -lt 400) {
            $script:issues += @{ Type = "RedirectWithoutFinal"; Url = $normalizedUrl; StatusCode = $statusCode }
        }

        if ($statusCode -ge 400) {
            $script:issues += @{ Type = "DeadEnd"; Url = $normalizedUrl; StatusCode = $statusCode; Parent = $parent }
            return
        }

        $node = [PageNode]::new($normalizedUrl, $parent, $depth, $discoveredVia)
        $node.StatusCode = $statusCode.ToString()
        $node.ContentType = $contentType

        if ($contentType -and $contentType.Contains("text/html")) {
            $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
            $html = $reader.ReadToEnd()
            $reader.Close()

            $titlePattern = '<title[^>]*>([^<]*)</title>'
            $titleMatch = [regex]::Match($html, $titlePattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($titleMatch.Success) {
                $node.Title = $titleMatch.Groups[1].Value.Trim()
            }

            $links = Extract-Links $html $normalizedUrl

            $node.Links = $links.Internal

            foreach ($intLink in $links.Internal) {
                if (-not $internalLinks.ContainsKey($intLink)) {
                    $internalLinks[$intLink] = @()
                }
                $internalLinks[$intLink] += $normalizedUrl

                if (-not $visited.ContainsKey($intLink)) {
                    Crawl-Page -url $intLink -parent $normalizedUrl -depth ($depth + 1) -discoveredVia "link from $normalizedUrl"
                }
            }

            foreach ($extLink in $links.External) {
                if (-not $externalLinks.ContainsKey($extLink)) {
                    $externalLinks[$extLink] = @()
                }
                $externalLinks[$extLink] += $normalizedUrl
            }

            foreach ($anchor in $links.Anchors) {
                $allAnchors += $anchor
            }
        }

        $response.Close()

    } catch {
        $script:issues += @{ Type = "Error"; Url = $normalizedUrl; Error = $_.Exception.Message; Parent = $parent }
    }
}

Write-Host "Starting crawl of $BaseUrl"
Crawl-Page -url $BaseUrl -parent $null -depth 0 -discoveredVia "initial"

Write-Host "Crawl complete. Pages visited: $($visited.Count)"

$rootNode = @{
    Url = $BaseUrl
    Title = "Root"
    Children = @()
}

$urlToNode = @{ $BaseUrl = $rootNode }

foreach ($url in $visited.Keys | Sort-Object) {
    if ($url -eq $BaseUrl) { continue }
    $urlToNode[$url] = @{ Url = $url; Title = ""; Children = @() }
}

foreach ($url in $visited.Keys | Sort-Object) {
    if ($url -eq $BaseUrl) { continue }
    $intLinksFromUrl = @()
    foreach ($intLink in $internalLinks.Keys) {
        if ($internalLinks[$intLink] -contains $url) {
            $intLinksFromUrl += $intLink
        }
    }
    foreach ($childUrl in $intLinksFromUrl) {
        if ($urlToNode.ContainsKey($childUrl)) {
            $urlToNode[$url].Children += $urlToNode[$childUrl]
        }
    }
}

$xmlContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"@

foreach ($url in ($visited.Keys | Sort-Object)) {
    $title = if ($urlToNode[$url].Title) { $urlToNode[$url].Title } else { "" }
    $xmlContent += @"

  <url>
    <loc>$([System.Security.SecurityElement]::Escape($url))</loc>
    <title>$([System.Security.SecurityElement]::Escape($title))</title>
  </url>
"@
}

$xmlContent += @"

</urlset>
"@

$jsonSitemap = @{
    site = $BaseUrl
    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    totalPages = $visited.Count
    pages = @()
}

foreach ($url in ($visited.Keys | Sort-Object)) {
    $node = $urlToNode[$url]
    $parentLinks = @()
    foreach ($intLink in $internalLinks.Keys) {
        if ($internalLinks[$intLink] -contains $url) {
            $parentLinks += $intLink
        }
    }
    $childLinks = @()
    foreach ($child in $node.Children) {
        $childLinks += $child.Url
    }

    $jsonSitemap.pages += @{
        url = $url
        title = $node.Title
        depth = if ($url -eq $BaseUrl) { 0 } else { ($url -split '/' | Where-Object { $_ }).Count }
        parentLinks = $parentLinks
        childLinks = $childLinks
        hasChildren = ($node.Children.Count -gt 0)
    }
}

$linkLedger = @{
    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    baseUrl = $BaseUrl
    summary = @{
        totalPages = $visited.Count
        totalInternalLinks = $internalLinks.Count
        totalExternalLinks = $externalLinks.Count
        totalAnchors = $allAnchors.Count
        totalNavElements = $navElements.Count
    }
    internalLinks = @()
    externalLinks = @()
    anchors = @()
    navigation = @()
}

foreach ($intLink in ($internalLinks.Keys | Sort-Object)) {
    $linkLedger.internalLinks += @{
        url = $intLink
        foundOn = $internalLinks[$intLink]
        count = $internalLinks[$intLink].Count
    }
}

foreach ($extLink in ($externalLinks.Keys | Sort-Object)) {
    $linkLedger.externalLinks += @{
        url = $extLink
        foundOn = $externalLinks[$extLink]
        count = $externalLinks[$extLink].Count
    }
}

foreach ($anchor in $allAnchors) {
    $linkLedger.anchors += $anchor
}

foreach ($nav in $navElements) {
    $linkLedger.navigation += $nav
}

$crawlReport = @"
================================================================================
                        SEDENTIST.COM CRAWL REPORT
================================================================================
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Base URL: $BaseUrl
================================================================================

SUMMARY
--------------------------------------------------------------------------------
Total Pages Discovered: $($visited.Count)
Total Internal Links:   $($internalLinks.Count)
Total External Links:    $($externalLinks.Count)
Total Anchor Tags:      $($allAnchors.Count)
Total Nav Elements:     $($navElements.Count)

ISSUES DETECTED
--------------------------------------------------------------------------------
"@

$issueCounts = @{}
foreach ($issue in $issues) {
    $type = $issue.Type
    if (-not $issueCounts.ContainsKey($type)) {
        $issueCounts[$type] = 0
    }
    $issueCounts[$type]++
}

foreach ($type in ($issueCounts.Keys | Sort-Object)) {
    $crawlReport += "`n[$type]: $($issueCounts[$type]) occurrences`n"
}

$deadEnds = $issues | Where-Object { $_.Type -eq "DeadEnd" }
if ($deadEnds.Count -gt 0) {
    $crawlReport += "`nDEAD ENDS (4xx errors):`n"
    foreach ($de in $deadEnds) {
        $crawlReport += "  - $($de.Url) (Status: $($de.StatusCode))`n"
        if ($de.Parent) { $crawlReport += "    Linked from: $($de.Parent)`n" }
    }
}

$redirectLoops = $issues | Where-Object { $_.Type -eq "RedirectLoop" }
if ($redirectLoops.Count -gt 0) {
    $crawlReport += "`nREDIRECT LOOPS DETECTED:`n"
    foreach ($rl in $redirectLoops) {
        $crawlReport += "  - $($rl.Url) -> $($rl.FinalUrl)`n"
    }
}

$orphanPages = @()
foreach ($url in ($visited.Keys | Sort-Object)) {
    if ($url -eq $BaseUrl) { continue }
    $foundAsChild = $false
    foreach ($intLink in $internalLinks.Keys) {
        if ($internalLinks[$intLink] -contains $url) {
            $foundAsChild = $true
            break
        }
    }
    if (-not $foundAsChild) {
        $orphanPages += $url
    }
}

if ($orphanPages.Count -gt 0) {
    $crawlReport += "`nORPHAN PAGES (not linked from any other page):`n"
    foreach ($op in $orphanPages) {
        $crawlReport += "  - $op`n"
    }
}

$crawlReport += @"

ALL DISCOVERED PAGES
--------------------------------------------------------------------------------
"@

foreach ($url in ($visited.Keys | Sort-Object)) {
    $node = $urlToNode[$url]
    $childCount = $node.Children.Count
    $crawlReport += "`n$url`n"
    if ($node.Title) { $crawlReport += "  Title: $($node.Title)`n" }
    $crawlReport += "  Children: $childCount`n"
}

$crawlReport += @"

INTERNAL LINK DETAILS
--------------------------------------------------------------------------------
"@

foreach ($intLink in ($internalLinks.Keys | Sort-Object)) {
    $crawlReport += "`n[int] $intLink`n"
    foreach ($source in $internalLinks[$intLink]) {
        $crawlReport += "  <- $source`n"
    }
}

$crawlReport += @"

EXTERNAL LINK DETAILS
--------------------------------------------------------------------------------
"@

foreach ($extLink in ($externalLinks.Keys | Sort-Object)) {
    $crawlReport += "`n[ext] $extLink`n"
    foreach ($source in $externalLinks[$extLink]) {
        $crawlReport += "  <- $source`n"
    }
}

$xmlContent | Out-File -FilePath "$OutputDir\sitemap.xml" -Encoding UTF8

$jsonSitemap | ConvertTo-Json -Depth 20 | Out-File -FilePath "$OutputDir\sitemap.json" -Encoding UTF8

$linkLedger | ConvertTo-Json -Depth 20 | Out-File -FilePath "$OutputDir\link-ledger.json" -Encoding UTF8

$crawlReport | Out-File -FilePath "$OutputDir\crawl-report.txt" -Encoding UTF8

Write-Host "Files written to $OutputDir"
Write-Host "  - sitemap.xml"
Write-Host "  - sitemap.json"
Write-Host "  - link-ledger.json"
Write-Host "  - crawl-report.txt"

Write-Host "`nSummary:"
Write-Host "  Pages: $($visited.Count)"
Write-Host "  Internal Links: $($internalLinks.Count)"
Write-Host "  External Links: $($externalLinks.Count)"
Write-Host "  Issues: $($issues.Count)"
