$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

function Fetch-Page {
    param([string]$url)
    try {
        $r = Invoke-WebRequest -Uri $url -UserAgent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -TimeoutSec 20 -UseBasicParsing
        return @{ Status = $r.StatusCode; Content = $r.Content }
    } catch {
        return @{ Status = 0; Error = $_.Exception.Message }
    }
}

Write-Host "Fetching sitemap index..."
$sitemapIndex = Fetch-Page "https://sedentist.com/sitemap_index.xml"
Write-Host "Sitemap index status: $($sitemapIndex.Status)"

if ($sitemapIndex.Status -ne 200) {
    Write-Host "Failed to fetch sitemap index"
    exit 1
}

$xml = [xml]$sitemapIndex.Content
$namespaces = @{ sm = "http://www.sitemaps.org/schemas/sitemap/0.9" }
$sitemaps = $xml.SelectNodes("//sm:sitemap", $namespaces)

Write-Host "Found $($sitemaps.Count) sitemaps in index"

$allUrls = @{}
$visited = @{}
$internalLinks = @{}
$externalLinks = @{}
$issues = @()
$navElements = @()
$allAnchors = @()

foreach ($sm in $sitemaps) {
    $loc = $sm.loc
    Write-Host "Processing: $loc"
    $result = Fetch-Page $loc
    if ($result.Status -eq 200) {
        try {
            $smXml = [xml]$result.Content
            $urlSet = $smXml.SelectNodes("//sm:url", $namespaces)
            Write-Host "  Found $($urlSet.Count) URLs"
            foreach ($u in $urlSet) {
                $url = $u.loc
                $lastmod = if ($u.lastmod) { $u.lastmod } else { "" }
                $allUrls[$url] = @{ LastMod = $lastmod; Status = 200 }
            }
        } catch {
            Write-Host "  Parse error: $($_.Exception.Message)"
        }
    } else {
        Write-Host "  Failed: $($result.Status)"
    }
}

Write-Host ""
Write-Host "Total URLs found: $($allUrls.Count)"
Write-Host ""

function Extract-LinksFromHtml {
    param([string]$html, [string]$baseUrl)

    $links = @{ Internal = @(); External = @(); Anchors = @() }
    if (-not $html) { return $links }

    $linkPattern = '<a\s+[^>]*href\s*=["'']([^"'']*)["''][^>]*>'
    $matches = [regex]::Matches($html, $linkPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    foreach ($m in $matches) {
        $href = $m.Groups[1].Value
        if ($href.StartsWith("#")) {
            $links.Anchors += @{ Base = $baseUrl; Anchor = $href }
        } elseif ($href -match "^(https?://|//)") {
            if ($href -match "^//") { $href = "https:" + $href }
            try {
                $uri = [System.Uri]::new($href)
                $baseUri = [System.Uri]::new($baseUrl)
                if ($uri.Host -eq $baseUri.Host) {
                    $links.Internal += $href
                } else {
                    $links.External += $href
                }
            } catch {}
        } elseif ($href -notmatch "^mailto:|^tel:") {
            try {
                $baseUri = [System.Uri]::new($baseUrl)
                $absUrl = [System.Uri]::new($baseUri, $href).AbsoluteUri
                $links.Internal += $absUrl
            } catch {}
        }
    }
    return $links
}

Write-Host "Crawling discovered pages for links..."

$urlList = $allUrls.Keys | Sort-Object
$count = 0
foreach ($url in $urlList) {
    $count++
    if ($count % 10 -eq 0) { Write-Host "  Crawled $count of $($allUrls.Count)" }

    $result = Fetch-Page $url
    if ($result.Status -eq 200 -and $result.Content) {
        $allUrls[$url].Status = 200

        if ($result.Content -match 'text/html') {
            $links = Extract-LinksFromHtml $result.Content $url

            foreach ($intLink in $links.Internal) {
                if (-not $internalLinks.ContainsKey($intLink)) {
                    $internalLinks[$intLink] = @()
                }
                $internalLinks[$intLink] += $url
            }

            foreach ($extLink in $links.External) {
                if (-not $externalLinks.ContainsKey($extLink)) {
                    $externalLinks[$extLink] = @()
                }
                $externalLinks[$extLink] += $url
            }

            $navPattern = '<nav[^>]*>(.*?)</nav>'
            $navMatches = [regex]::Matches($result.Content, $navPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
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

            $anchorPattern = 'id=["'']([^"'']*)["'']'
            $anchorMatches = [regex]::Matches($result.Content, $anchorPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($am in $anchorMatches) {
                $allAnchors += @{ Page = $url; AnchorId = $am.Groups[1].Value }
            }
        }
    } else {
        $allUrls[$url].Status = $result.Status
        $issues += @{ Type = "DeadEnd"; Url = $url; Status = $result.Status }
    }
}

Write-Host ""
Write-Host "Building sitemap structure..."

$xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' + "`n"
$xmlContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n"

$jsonPages = @()
foreach ($url in ($allUrls.Keys | Sort-Object)) {
    $info = $allUrls[$url]
    $xmlContent += "  <url>`n"
    $xmlContent += "    <loc>$([System.Security.SecurityElement]::Escape($url))</loc>`n"
    if ($info.LastMod) { $xmlContent += "    <lastmod>$([System.Security.SecurityElement]::Escape($info.LastMod))</lastmod>`n" }
    $xmlContent += "    <status>$($info.Status)</status>`n"
    $xmlContent += "  </url>`n"

    $inboundCount = 0
    foreach ($k in $internalLinks.Keys) {
        if ($internalLinks[$k] -contains $url) { $inboundCount++ }
    }

    $jsonPages += @{
        url = $url
        lastmod = $info.LastMod
        status = $info.Status
        inboundLinks = $inboundCount
        outboundLinks = $internalLinks.Count
    }
}

$xmlContent += '</urlset>'

$jsonSitemap = @{
    site = "https://sedentist.com"
    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    totalPages = $allUrls.Count
    pages = $jsonPages
}

$linkLedger = @{
    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    baseUrl = "https://sedentist.com"
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

foreach ($a in $allAnchors) {
    $linkLedger.anchors += $a
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

$report = @"
================================================================================
                        SEDENTIST.COM CRAWL REPORT
================================================================================
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Method: Sitemap analysis + HTTP crawl
================================================================================

SUMMARY
--------------------------------------------------------------------------------
Total Pages Discovered: $($allUrls.Count)
Total Internal Links:   $($internalLinks.Count)
Total External Links:    $($externalLinks.Count)
Total Anchor Tags:       $($allAnchors.Count)
Total Nav Elements:      $($navElements.Count)
Orphan Pages:           $($orphanPages.Count)

ISSUES DETECTED
--------------------------------------------------------------------------------
"@

$issueTypes = @{}
foreach ($i in $issues) {
    $t = $i.Type
    if (-not $issueTypes.ContainsKey($t)) { $issueTypes[$t] = 0 }
    $issueTypes[$t]++
}
foreach ($t in ($issueTypes.Keys | Sort-Object)) {
    $report += "`n[$t]: $($issueTypes[$t]) occurrences`n"
}

if ($orphanPages.Count -gt 0) {
    $report += "`nORPHAN PAGES (not linked from any other page):`n"
    foreach ($p in $orphanPages) {
        $report += "  - $p`n"
    }
}

$report += @"

ALL DISCOVERED PAGES
--------------------------------------------------------------------------------
"@

foreach ($url in ($allUrls.Keys | Sort-Object)) {
    $info = $allUrls[$url]
    $report += "`n$url`n"
    $report += "  Status: $($info.Status)`n"
    if ($info.LastMod) { $report += "  LastMod: $($info.LastMod)`n" }
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
