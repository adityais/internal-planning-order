# Generates the thin HTML wrappers for every page (all logic lives in assets/js/pages/<page>.js).
$b = Split-Path $PSScriptRoot -Parent
$pages = [ordered]@{
  'index'='Planning prototype'; 'foundations'='Foundations'; 'not-available'='Not in this prototype';
  'project-planning'='Project Planning'; 'allocation'='Resource Allocation'; 'milkrun-ref'='Milkrun Reference';
  'milkrun-list'='Milkrun Planning'; 'milkrun-wizard'='New Milkrun Plan'; 'milkrun-step5'='Schedule & Chaining'; 'trips'='Daily Trip Plan';
  'readiness'='Readiness Board'; 'readiness-tablet'='Readiness Check-in'; 'exceptions'='Exception approval'; 'exceptions-phone'='Exception approval';
  'dispatch'='Dispatch Board'; 'vendor-availability'='Daily Availability';
  'order-inbox'='Order Inbox'; 'order-detail'='Order Detail';
  'assignment'='Assignment'; 'convert'='Convert to Trip'; 'admin'='Admin'; 'tolltariff'='Toll Tariff'
}
$scripts = @('vendor/xlsx.mini.min.js','js/ui.js','js/md-snapshot.js','js/md-demo-fill.js','js/md.js','js/roles.js','js/store.js','js/chain.js','js/domain.js','js/water.js','js/seed.js','js/seed-dd.js','js/comp.js','js/shell.js','js/io.js','js/pdf.js','js/panels.js','js/docs.js','js/plan.js','js/milkrun.js','js/ready.js','js/order.js','js/vendor.js')
# dealing.html is a hand written redirect to order-inbox.html?tab=dealing (Dealing is a tab of the Order Inbox)
$extra = @{ 'order-inbox' = @('js/pages/dealing.js','js/pages/assignment.js') }
foreach ($k in $pages.Keys) {
  $sc = $scripts; if (@('project-planning','allocation','resource-requests') -contains $k) { $sc = $scripts + 'js/pplan.js' }
  if ($extra.ContainsKey($k)) { $sc = $sc + $extra[$k] }
  $tags = ($sc | ForEach-Object { "<script src=""assets/$_""></script>" }) -join "`n"
  $html = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$($pages[$k]) - MODA TMS</title>
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/planning.css">
<link rel="stylesheet" href="assets/css/app.css">
</head>
<body data-page="$k">
<noscript>JavaScript is required.</noscript>
$tags
<script src="assets/js/pages/$k.js"></script>
</body>
</html>
"@
  [IO.File]::WriteAllText((Join-Path $b "$k.html"), $html, [Text.UTF8Encoding]::new($false))
  $js = Join-Path $b "assets/js/pages/$k.js"
  if (-not (Test-Path $js)) { [IO.File]::WriteAllText($js, "/* $($pages[$k]) */`nSHELL.mount({module:'planning',title:'$($pages[$k])'});`n", [Text.UTF8Encoding]::new($false)) }
}
"done"
