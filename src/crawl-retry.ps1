$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputDir = "C:\Users\morto\Code\sedentist\src"

function Get-CurlWithDelay {
    param([string]$url, [int]$delayMs = 2000)

    $escapedUrl = $url -replace '"', '\"'
    Start-Sleep -Milliseconds $delayMs
    $output = cmd /c "curl -s `"$escapedUrl`" -L --max-redirs 5 -A `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`" -H `"Accept: text/html,application/xhtml+xml`" 2>&1"
    return $output -join "`n"
}

Write-Host "Attempting to fetch sitemap index..."

$content = Get-CurlWithDelay "https://sedentist.com/sitemap_index.xml" 3000

if ($content -and $content.Contains("<sitemapindex")) {
    Write-Host "Successfully fetched sitemap index"

    $xml = [xml]$content
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
        Write-Host "Fetching: $loc"
        $smContent = Get-CurlWithDelay $loc 2000

        if ($smContent -and $smContent.Contains("<urlset")) {
            try {
                $smXml = [xml]$smContent
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
            Write-Host "  Failed or blocked"
        }
    }

    Write-Host ""
    Write-Host "Total URLs found: $($allUrls.Count)"

    if ($allUrls.Count -gt 0) {
        $count = 0
        foreach ($url in ($allUrls.Keys | Sort-Object)) {
            $count++
            if ($count % 10 -eq 0) { Write-Host "  Crawled $count of $($allUrls.Count)" }

            $pageContent = Get-CurlWithDelay $url 500

            if ($pageContent -and $pageContent.Length -gt 500 -and $pageContent.Contains("<html")) {
                $allUrls[$url].Status = "200"

                $titlePattern = '<title[^>]*>([^<]*)</title>'
                $titleMatch = [regex]::Match($pageContent, $titlePattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                if ($titleMatch.Success) {
                    $allUrls[$url].Title = $titleMatch.Groups[1].Value.Trim()
                }

                $linkPattern = '<a\s+[^>]*href\s*=["'']([^"'']*)["''][^>]*>'
                $matches = [regex]::Matches($pageContent, $linkPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

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
                                if (-not $internalLinks.ContainsKey($href)) { $internalLinks[$href] = @() }
                                $internalLinks[$href] += $url
                            } else {
                                if (-not $externalLinks.ContainsKey($href)) { $externalLinks[$href] = @() }
                                $externalLinks[$href] += $url
                            }
                        } catch {}
                    } elseif ($href -notmatch "^mailto:|^tel:") {
                        try {
                            $baseUri = [System.Uri]::new($url)
                            $absUrl = [System.Uri]::new($baseUri, $href).AbsoluteUri
                            if (-not $internalLinks.ContainsKey($absUrl)) { $internalLinks[$absUrl] = @() }
                            $internalLinks[$absUrl] += $url
                        } catch {}
                    }
                }

                $navPattern = '<nav[^>]*>(.*?)</nav>'
                $navMatches = [regex]::Matches($pageContent, $navPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
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
                $allUrls[$url].Status = "blocked"
                $issues += @{ Type = "Blocked"; Url = $url }
            }
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

            $childLinks = if ($internalLinks.ContainsKey($url)) { $internalLinks[$url] } else { @() }

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

        $jsonSitemap = @{
            site = "https://sedentist.com"
            generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
            totalPages = $allUrls.Count
            totalInternalLinks = $internalLinks.Count
            totalExternalLinks = $externalLinks.Count
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

        foreach ($page in ($allAnchors.Keys | Sort-Object)) {
            foreach ($anchor in $allAnchors[$page]) {
                $linkLedger.anchors += @{ Page = $page; Anchor = $anchor }
            }
        }

        foreach ($n in $navElements) {
            $linkLedger.navigation += $n
        }

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
Blocked Pages:          $($issues.Count)

ISSUES DETECTED
--------------------------------------------------------------------------------
"@

        if ($issues.Count -gt 0) {
            $report += "`n[Blocked]: $($issues.Count) pages were blocked by bot protection`n"
            foreach ($i in $issues | Select-Object -First 5) {
                $report += "  - $($i.Url)`n"
            }
            if ($issues.Count -gt 5) {
                $report += "  ... and $($issues.Count - 5) more`n"
            }
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
            if ($info.Title) { $report += "  Title: $($info.Title)`n" }
            $report += "  Status: $($info.Status)`n"
            if ($info.LastMod) { $report += "  LastMod: $($info.LastMod)`n" }
        }

        $xmlContent | Out-File -FilePath "$OutputDir\sitemap.xml" -Encoding UTF8
        $jsonSitemap | ConvertTo-Json -Depth 20 | Out-File -FilePath "$OutputDir\sitemap.json" -Encoding UTF8
        $linkLedger | ConvertTo-Json -Depth 20 | Out-File -FilePath "$OutputDir\link-ledger.json" -Encoding UTF8
        $report | Out-File -FilePath "$OutputDir\crawl-report.txt" -Encoding UTF8

        Write-Host ""
        Write-Host "Files written successfully!"
        Write-Host "  Pages: $($allUrls.Count)"
        Write-Host "  Internal Links: $($internalLinks.Count)"
        Write-Host "  External Links: $($externalLinks.Count)"

    } else {
        throw "Failed to fetch sitemap index"
    }

} else {
    throw "Failed to fetch sitemap index - site may be protected"
}
