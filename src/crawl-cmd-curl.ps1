$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

function Get-CurlContent {
    param([string]$url)
    $escapedUrl = $url -replace '"', '\"'
    $output = cmd /c "curl -s `"$escapedUrl`" -L --max-redirs 10 -A `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`" 2>&1"
    return $output -join "`n"
}

Write-Host "Fetching sitemap index..."
$sitemapIndexContent = Get-CurlContent "https://sedentist.com/sitemap_index.xml"
Write-Host "Sitemap index fetched. Length: $($sitemapIndexContent.Length)"

$xml = [xml]$sitemapIndexContent
$namespaces = @{ sm = "http://www.sitemaps.org/schemas/sitemap/0.9" }
$sitemaps = $xml.SelectNodes("//sm:sitemap", $namespaces)

Write-Host "Found $($sitemaps.Count) sitemaps"

$allUrls = @{}
$internalLinks = @{}
$externalLinks = @{}
$allAnchors = @{}
$navElements = @()
$issues = @()

foreach ($sm in $sitemaps) {
    $loc = $sm.loc
    Write-Host "Processing: $loc"
    $content = Get-CurlContent $loc
    if ($content -and $content.Length -gt 100) {
        try {
            $smXml = [xml]$content
            $urlSet = $smXml.SelectNodes("//sm:url", $namespaces)
            Write-Host "  Found $($urlSet.Count) URLs"
            foreach ($u in $urlSet) {
                $url = $u.loc
                $lastmod = if ($u.lastmod) { $u.lastmod } else { "" }
                $allUrls[$url] = @{ LastMod = $lastmod; Status = "pending"; Title = "" }
            }
        } catch {
            Write-Host "  Parse error: $($_.Exception.Message)"
        }
    } else {
        Write-Host "  Failed to fetch or empty"
    }
}

Write-Host ""
Write-Host "Total URLs found in sitemaps: $($allUrls.Count)"

Write-Host ""
Write-Host "Crawling pages for link analysis..."

$urlList = $allUrls.Keys | Sort-Object
$count = 0
foreach ($url in $urlList) {
    $count++
    if ($count % 20 -eq 0) { Write-Host "  Crawled $count of $($allUrls.Count)" }

    $content = Get-CurlContent $url

    if ($content -and $content.Length -gt 100) {
        $allUrls[$url].Status = "200"
        $allUrls[$url].ContentLength = $content.Length

        $titlePattern = '<title[^>]*>([^<]*)</title>'
        $titleMatch = [regex]::Match($content, $titlePattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($titleMatch.Success) {
            $allUrls[$url].Title = $titleMatch.Groups[1].Value.Trim()
        }

        $linkPattern = '<a\s+[^>]*href\s*=["'']([^"'']*)["''][^>]*>'
        $matches = [regex]::Matches($content, $linkPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

        $pageInternalLinks = @()
        $pageExternalLinks = @()

        foreach ($m in $matches) {
            $href = $m.Groups[1].Value
            if ($href.StartsWith("#")) {
                if (-not $allAnchors.ContainsKey($url)) { $allAnchors[$url] = @() }
                $allAnchors[$url] += $href
            } elseif ($href -match "^(https?://|//)") {
                if ($href -match "^//") { $href = "https:" + $href }
                try {
                    $uri = [System.Uri]::new($href)
                    $baseUri = [System.Uri]::new($url)
                    if ($uri.Host -eq $baseUri.Host) {
                        $pageInternalLinks += $href
                    } else {
                        $pageExternalLinks += $href
                    }
                } catch {}
            } elseif ($href -notmatch "^mailto:|^tel:") {
                try {
                    $baseUri = [System.Uri]::new($url)
                    $absUrl = [System.Uri]::new($baseUri, $href).AbsoluteUri
                    $pageInternalLinks += $absUrl
                } catch {}
            }
        }

        foreach ($intLink in $pageInternalLinks) {
            if (-not $internalLinks.ContainsKey($intLink)) { $internalLinks[$intLink] = @() }
            $internalLinks[$intLink] += $url
        }

        foreach ($extLink in $pageExternalLinks) {
            if (-not $externalLinks.ContainsKey($extLink)) { $externalLinks[$extLink] = @() }
            $externalLinks[$extLink] += $url
        }

        $navPattern = '<nav[^>]*>(.*?)</nav>'
        $navMatches = [regex]::Matches($content, $navPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        foreach ($nm in $navMatches) {
            $navLinks = @()
            $nlPattern = '<a\s+[^>]*href\s*=["'']([^"'']*)["''][^>]*>([^<]*)</a>'
            $nlMatches = [regex]::Matches($nm.Value, $nlPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($nl in $nlMatches) {
                $navLinks += @{ Href = $nl.Groups[1].Value; Text = $nl.Groups[2].Value.Trim() }
            }
            if ($navLinks.Count -gt 0) {
                $navElements += @{ Page = $url; Links = $navLinks }
            }
        }

    } else {
        $allUrls[$url].Status = "error"
        $issues += @{ Type = "DeadEnd"; Url = $url }
    }
}

Write-Host ""
Write-Host "Building output files..."

$xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' + "`n"
$xmlContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n"

$jsonPages = @()
foreach ($url in ($allUrls.Keys | Sort-Object)) {
    $info = $allUrls[$url]
    $xmlContent += "  <url>`n"
    $xmlContent += "    <loc>$([System.Security.SecurityElement]::Escape($url))</loc>`n"
    if ($info.LastMod) { $xmlContent += "    <lastmod>$([System.Security.SecurityElement]::Escape($info.LastMod))</lastmod>`n" }
    if ($info.Title) { $xmlContent += "    <title>$([System.Security.SecurityElement]::Escape($info.Title))</title>`n" }
    $xmlContent += "    <status>$($info.Status)</status>`n"
    $xmlContent += "  </url>`n"

    $inboundCount = 0
    foreach ($k in $internalLinks.Keys) {
        if ($internalLinks[$k] -contains $url) { $inboundCount++ }
    }

    $childLinks = @()
    if ($internalLinks.ContainsKey($url)) {
        $childLinks = $internalLinks[$url]
    }

    $jsonPages += @{
        url = $url
        lastmod = $info.LastMod
        title = $info.Title
        status = $info.Status
        inboundCount = $inboundCount
        outboundCount = $childLinks.Count
        childLinks = $childLinks
    }
}

$xmlContent += '</urlset>'

$rootUrl = "https://sedentist.com"
$rootChildren = @()
foreach ($url in ($allUrls.Keys | Sort-Object)) {
    $info = $allUrls[$url]
    if ($info.LastMod -match "^2022-") {
        $rootChildren += @{ Url = $url; Type = "post"; LastMod = $info.LastMod }
    } elseif ($info.LastMod -match "^2026-") {
        $rootChildren += @{ Url = $url; Type = "page"; LastMod = $info.LastMod }
    }
}

$jsonSitemap = @{
    site = $rootUrl
    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    totalPages = $allUrls.Count
    totalInternalLinks = $internalLinks.Count
    totalExternalLinks = $externalLinks.Count
    pages = $jsonPages
}

$linkLedger = @{
    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    baseUrl = $rootUrl
    summary = @{
        totalPages = $allUrls.Count
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

foreach ($k in ($internalLinks.Keys | Sort-Object)) {
    $linkLedger.internalLinks += @{
        url = $k
        foundOn = $internalLinks[$k]
        count = $internalLinks[$k].Count
    }
}

foreach ($k in ($externalLinks.Keys | Sort-Object)) {
    $linkLedger.externalLinks += @{
        url = $k
        foundOn = $externalLinks[$k]
        count = $externalLinks[$k].Count
    }
}

foreach ($page in ($allAnchors.Keys | Sort-Object)) {
    foreach ($anchor in $allAnchors[$page]) {
        $linkLedger.anchors += @{ Page = $page; Anchor = $anchor }
    }
}

foreach ($n in $navElements) {
    $linkLedger.navigation += $n
}

$orphanPages = @()
foreach ($url in ($allUrls.Keys | Sort-Object)) {
    $found = $false
    foreach ($k in $internalLinks.Keys) {
        if ($internalLinks[$k] -contains $url) {
            $found = $true
            break
        }
    }
    if (-not $found) {
        $orphanPages += $url
    }
}

$deadEnds = $issues | Where-Object { $_.Type -eq "DeadEnd" }

$report = @"
================================================================================
                        SEDENTIST.COM CRAWL REPORT
================================================================================
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Method: Sitemap analysis + curl-based HTTP crawl
================================================================================

SUMMARY
--------------------------------------------------------------------------------
Total Pages Discovered: $($allUrls.Count)
Total Internal Links:   $($internalLinks.Count)
Total External Links:    $($externalLinks.Count)
Total Anchor Tags:       $($allAnchors.Count)
Total Nav Elements:      $($navElements.Count)
Orphan Pages:           $($orphanPages.Count)
Dead Ends (crawl errors): $($deadEnds.Count)

ISSUES DETECTED
--------------------------------------------------------------------------------
"@

if ($deadEnds.Count -gt 0) {
    $report += "`n[DeadEnd]: $($deadEnds.Count) pages failed to crawl`n"
    foreach ($de in $deadEnds | Select-Object -First 10) {
        $report += "  - $($de.Url)`n"
    }
    if ($deadEnds.Count -gt 10) {
        $report += "  ... and $($deadEnds.Count - 10) more`n"
    }
}

if ($orphanPages.Count -gt 0) {
    $report += "`nORPHAN PAGES (not linked from any other page):`n"
    foreach ($p in $orphanPages) {
        $report += "  - $p`n"
    }
}

$report += @"

ALL DISCOVERED PAGES (by sitemap)
--------------------------------------------------------------------------------
"@

$bySitemap = @{}
foreach ($url in ($allUrls.Keys | Sort-Object)) {
    $info = $allUrls[$url]
    $key = if ($info.LastMod -match "^2022-") { "post-sitemap" } elseif ($info.LastMod -match "^2026-") { "page-sitemap" } else { "other" }
    if (-not $bySitemap.ContainsKey($key)) { $bySitemap[$key] = @() }
    $bySitemap[$key] += $url
}

foreach ($key in ($bySitemap.Keys | Sort-Object)) {
    $report += "`n[$key] ($($bySitemap[$key].Count) pages):`n"
    foreach ($url in $bySitemap[$key]) {
        $info = $allUrls[$url]
        $report += "  $url`n"
        if ($info.Title) { $report += "    Title: $($info.Title)`n" }
        $report += "    Status: $($info.Status)`n"
    }
}

$report += @"

INTERNAL LINK DETAILS
--------------------------------------------------------------------------------
"@

foreach ($k in ($internalLinks.Keys | Sort-Object)) {
    $report += "`n[int] $k`n"
    foreach ($s in $internalLinks[$k]) {
        $report += "  <- $s`n"
    }
}

$report += @"

EXTERNAL LINK DETAILS
--------------------------------------------------------------------------------
"@

foreach ($k in ($externalLinks.Keys | Sort-Object)) {
    $report += "`n[ext] $k`n"
    foreach ($s in $externalLinks[$k]) {
        $report += "  <- $s`n"
    }
}

$xmlContent | Out-File -FilePath "$OutputDir\sitemap.xml" -Encoding UTF8
$jsonSitemap | ConvertTo-Json -Depth 20 | Out-File -FilePath "$OutputDir\sitemap.json" -Encoding UTF8
$linkLedger | ConvertTo-Json -Depth 20 | Out-File -FilePath "$OutputDir\link-ledger.json" -Encoding UTF8
$report | Out-File -FilePath "$OutputDir\crawl-report.txt" -Encoding UTF8

Write-Host ""
Write-Host "Files written:"
Write-Host "  - $OutputDir\sitemap.xml"
Write-Host "  - $OutputDir\sitemap.json"
Write-Host "  - $OutputDir\link-ledger.json"
Write-Host "  - $OutputDir\crawl-report.txt"
Write-Host ""
Write-Host "Summary:"
Write-Host "  Pages: $($allUrls.Count)"
Write-Host "  Internal Links: $($internalLinks.Count)"
Write-Host "  External Links: $($externalLinks.Count)"
Write-Host "  Issues: $($issues.Count)"
