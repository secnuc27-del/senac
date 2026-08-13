# 1. Padronizar nomes das fotos
$fotosDir = "fotos"
Write-Host "--- 1. PADRONIZANDO NOME DAS FOTOS ---"
Write-Host "Buscando fotos em: $fotosDir"

if (-not (Test-Path $fotosDir)) {
    Write-Host "Erro: Pasta '$fotosDir' não encontrada no diretório atual."
    exit
}

Get-ChildItem -Path $fotosDir | ForEach-Object {
    if ($_.Attributes -match "Directory") { return }
    $oldName = $_.Name
    $ext = $_.Extension
    $base = $_.BaseName
    
    # Normaliza para FormD para decompor acentos
    $normalized = $base.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $normalized.ToCharArray()) {
        if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($c)
        }
    }
    $stripped = $sb.ToString()
    $newName = $stripped.ToLower()
    $newName = $newName -replace 'ç', 'c'
    # Substitui qualquer sequência não alfanumérica por um único hífen
    $newName = $newName -replace '[^a-z0-9]+', '-'
    # Remove hífens no início e no fim
    $newName = $newName -replace '^-+|-+$', ''
    $newName = $newName + $ext.ToLower()
    
    if ($oldName -ne $newName) {
        Write-Host "Renomeando: '$oldName' -> '$newName'"
        Rename-Item -Path $_.FullName -NewName $newName -ErrorAction SilentlyContinue
    } else {
        Write-Host "Já padronizado: '$oldName'"
    }
}

# 2. Verificar mapeamento em dia.html
if (-not (Test-Path "dia.html")) {
    Write-Host "Erro: Arquivo 'dia.html' não encontrado no diretório atual."
    exit
}

$diaHtml = Get-Content -Path "dia.html" -Raw -Encoding UTF8
$matches = [regex]::Matches($diaHtml, "P\+'([^']+)'")
$uniqueMatches = @()
foreach ($m in $matches) {
    $file = $m.Groups[1].Value
    if ($uniqueMatches -notcontains $file) {
        $uniqueMatches += $file
    }
}

Write-Host "`n--- 2. VERIFICANDO MAPEAMENTO EM DIA.HTML ---"
$missingCount = 0
foreach ($file in $uniqueMatches) {
    $filePath = Join-Path $fotosDir $file
    if (-not (Test-Path $filePath)) {
        Write-Host "  ❌ Arquivo ausente: '$file'" -ForegroundColor Red
        $missingCount++
    } else {
        Write-Host "  ✓ Encontrado: '$file'" -ForegroundColor Green
    }
}

if ($missingCount -eq 0) {
    Write-Host "`n🎉 Excelente! Todas as fotos mapeadas no código existem na pasta 'fotos/'!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Faltam $missingCount fotos necessárias!" -ForegroundColor Yellow
}
