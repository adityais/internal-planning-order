# Minimal static file server for the Planning prototype (no Node/Python needed).
# Serves the "Grand Design UI" folder so the Master Data prototype shares the same origin (localStorage).
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8765]
# Then open http://localhost:8765/Planning%20%26%20Order%20Management/Build/index.html
param([int]$Port = 8765)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.png'='image/png'; '.svg'='image/svg+xml'; '.xlsx'='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; '.csv'='text/csv'; '.pdf'='application/pdf'; '.md'='text/markdown; charset=utf-8'; '.ico'='image/x-icon' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $root at http://localhost:$Port/Planning%20%26%20Order%20Management/Build/index.html"
while ($l.IsListening) {
  try {
    $ctx = $l.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'Planning & Order Management/Build/index.html' }
    $file = Join-Path $root $path
    $full = [IO.Path]::GetFullPath($file)
    if (-not $full.StartsWith($root)) { $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue }
    # test harness only: POST writes generated sample files / screenshots into Build/test-data or Build/tests
    if ($ctx.Request.HttpMethod -eq 'POST' -and ($path -like 'Planning & Order Management/Build/test-data/*' -or $path -like 'Planning & Order Management/Build/tests/*')) {
      $ms = New-Object IO.MemoryStream; $ctx.Request.InputStream.CopyTo($ms); [IO.File]::WriteAllBytes($full, $ms.ToArray())
      $ctx.Response.StatusCode = 201; $ctx.Response.Close(); continue
    }
    if (Test-Path $full -PathType Container) { $full = Join-Path $full 'index.html' }
    if (Test-Path $full -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control','no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $ctx.Response.StatusCode = 404 }
    $ctx.Response.Close()
  } catch { }
}
