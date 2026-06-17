# ====================================================================
# SCRIPT DE PUBLICACIÓN AUTOMÁTICA EN INSTAGRAM (ROYAL WATCH MTY)
# ====================================================================
# Este script lee el catálogo local, maneja las imágenes de forma remota/local,
# genera un caption elegante y publica a Instagram usando la API oficial.

# Forzar codificación UTF-8 para la salida de consola
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Directorio base del script
$BaseDir = $PSScriptRoot
if ($null -eq $BaseDir -or $BaseDir -eq "") {
    $BaseDir = Get-Location
}

# --- 1. FUNCIÓN PARA CARGAR VARIABLES .ENV ---
function Load-Env {
    param([string]$Path)
    if (Test-Path $Path) {
        Write-Host "Cargando configuración desde $Path..." -ForegroundColor Cyan
        Get-Content $Path -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
                $key = $Matches[1].Trim()
                $val = $Matches[2].Trim()
                # Quitar comillas simples/dobles de los extremos si existen
                if ($val -match '^"(.*)"$' -or $val -match "^'(.*)'$") {
                    $val = $Matches[1]
                }
                $envKey = $key
                Set-Item -Path "env:$envKey" -Value $val
            }
        }
    } else {
        Write-Warning "No se encontró el archivo de configuración .env en $Path. Se usarán valores por defecto."
    }
}

# --- 2. CARGAR CONFIGURACIÓN ---
$envFile = Join-Path $BaseDir ".env"
Load-Env -Path $envFile

# Mapeo de variables
$InstagramAccountId = $env:INSTAGRAM_BUSINESS_ACCOUNT_ID
$MetaAccessToken = $env:META_ACCESS_TOKEN
$ImageHostingMode = $env:IMAGE_HOSTING_MODE
$PublicBaseUrl = $env:PUBLIC_BASE_URL
$ImgbbApiKey = $env:IMGBB_API_KEY

$MaxPostsPerRun = 5
if ($env:MAX_POSTS_PER_RUN -and [int]::TryParse($env:MAX_POSTS_PER_RUN, [ref]$parsedMax)) {
    $MaxPostsPerRun = $parsedMax
}

$DryRun = $true
if ($env:DRY_RUN -eq "false") {
    $DryRun = $false
}

Write-Host "--- CONFIGURACIÓN INICIALIZADA ---" -ForegroundColor Green
Write-Host "ID Instagram Account:  $InstagramAccountId"
Write-Host "Modo de Hosting:       $ImageHostingMode"
Write-Host "Máximo de posts/run:   $MaxPostsPerRun"
Write-Host "Modo Simulación (Dry): $DryRun"
Write-Host "----------------------------------"

# --- 3. VALIDACIÓN DE CREDENCIALES ---
if (-not $DryRun) {
    if (-not $InstagramAccountId -or $InstagramAccountId -eq "tu_instagram_business_account_id") {
        Write-Error "ERROR: Debes configurar tu INSTAGRAM_BUSINESS_ACCOUNT_ID en el archivo .env para realizar publicaciones reales."
        exit 1
    }
    if (-not $MetaAccessToken -or $MetaAccessToken -eq "tu_access_token_aqui") {
        Write-Error "ERROR: Debes configurar tu META_ACCESS_TOKEN en el archivo .env para realizar publicaciones reales."
        exit 1
    }
    if ($ImageHostingMode -eq "UPLOAD_API" -and (-not $ImgbbApiKey -or $ImgbbApiKey -eq "tu_api_key_de_imgbb_aqui")) {
        Write-Error "ERROR: Para el modo UPLOAD_API debes configurar un IMGBB_API_KEY válido en el archivo .env."
        exit 1
    }
}

# --- 4. FUNCIÓN PARA SUBIR IMAGEN A IMGBB ---
function Upload-To-Imgbb {
    param([string]$LocalPath)
    
    if (-not (Test-Path $LocalPath)) {
        throw "La ruta de archivo local no existe: $LocalPath"
    }

    Write-Host "Subiendo imagen '$LocalPath' a Imgbb..." -ForegroundColor Yellow
    
    try {
        # Convertir imagen a Base64
        $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
        $base64 = [Convert]::ToBase64String($bytes)
        
        # URL encode para evitar fallos de transmisión
        $encodedBase64 = [System.Net.WebUtility]::UrlEncode($base64)
        $body = "image=$encodedBase64"
        
        $uri = "https://api.imgbb.com/1/upload?key=$ImgbbApiKey"
        
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
        
        if ($response -and $response.success) {
            $uploadedUrl = $response.data.url
            Write-Host "¡Imagen subida con éxito! URL: $uploadedUrl" -ForegroundColor Green
            return $uploadedUrl
        } else {
            throw "La respuesta de Imgbb no reportó éxito."
        }
    } catch {
        throw "Error al subir a Imgbb: $_"
    }
}

# --- 5. CARGAR ESTADO DE PUBLICACIONES ---
$stateFile = Join-Path $BaseDir "instagram_state.json"
if (Test-Path $stateFile) {
    try {
        $stateContent = Get-Content $stateFile -Raw -Encoding UTF8
        $state = ConvertFrom-Json $stateContent
    } catch {
        Write-Warning "El archivo de estado estaba corrupto o vacío. Creando nuevo estado..."
        $state = [PSCustomObject]@{
            published_watches = @()
            posts_in_last_24h = @()
        }
    }
} else {
    $state = [PSCustomObject]@{
        published_watches = @()
        posts_in_last_24h = @()
    }
}

# Asegurar tipos array
if ($null -eq $state.published_watches) { $state.published_watches = @() }
else { $state.published_watches = @($state.published_watches) }

if ($null -eq $state.posts_in_last_24h) { $state.posts_in_last_24h = @() }
else { $state.posts_in_last_24h = @($state.posts_in_last_24h) }

# --- 6. CONTROL DE TASA DE PUBLICACIÓN (RATE LIMIT 25/24H) ---
$now = [DateTime]::UtcNow
$oneDayAgo = $now.AddDays(-1)

$validTimestamps = @()
foreach ($tsStr in $state.posts_in_last_24h) {
    if ([DateTime]::TryParse($tsStr, [ref]$ts)) {
        $tsUtc = $ts.ToUniversalTime()
        if ($tsUtc -gt $oneDayAgo) {
            $validTimestamps += $tsStr
        }
    }
}
$state.posts_in_last_24h = $validTimestamps

$postsCount = $state.posts_in_last_24h.Count
Write-Host "Publicaciones oficiales realizadas en las últimas 24 horas: $postsCount de 25" -ForegroundColor Yellow
if ($postsCount -ge 25 -and -not $DryRun) {
    Write-Warning "Límite oficial de Instagram alcanzado (25 posts cada 24 horas). Finalizando ejecución."
    exit 0
}

# --- 7. CARGAR Y PARSEAR EL CATÁLOGO (WATCHES_CATALOG.JS) ---
$catalogFile = Join-Path $BaseDir "watches_catalog.js"
if (-not (Test-Path $catalogFile)) {
    Write-Error "No se encontró el archivo de catálogo: $catalogFile"
    exit 1
}

Write-Host "Leyendo catálogo de relojes..." -ForegroundColor Cyan
$jsContent = Get-Content $catalogFile -Raw -Encoding UTF8

if ($jsContent -match 'const\s+WATCHES_PRODUCTS\s*=\s*\[([\s\S]*?)\]\s*;?') {
    $arrayText = $Matches[1]
    # Reemplazar claves JS sin comillas a claves JSON con comillas
    $jsonText = $arrayText -replace '(\b\w+)\s*:', '"$1":'
    # Remover comas sobrantes antes del cierre de objetos/arrays para compatibilidad
    $jsonText = $jsonText -replace ',\s*([\]\}])', '$1'
    $jsonText = "[$jsonText]"
    
    $catalog = ConvertFrom-Json $jsonText
    Write-Host "Se cargaron $($catalog.Count) relojes del catálogo." -ForegroundColor Green
} else {
    Write-Error "No se pudo extraer la lista de productos de watches_catalog.js"
    exit 1
}

# --- 8. FILTRAR RELOJES DISPONIBLES Y NO PUBLICADOS ---
$pendingWatches = @()
foreach ($watch in $catalog) {
    # Validar que tenga una referencia única identificable
    $ref = $watch.referencia
    if (-not $ref) {
        Write-Warning "Ignorando reloj sin referencia: $($watch.marca) $($watch.modelo)"
        continue
    }

    # Validar si ya se publicó
    if ($state.published_watches -contains $ref) {
        continue
    }

    # Validar que no esté vendido (solo publicamos lo disponible, consignado, etc.)
    if ($watch.status -eq "Vendido") {
        continue
    }

    $pendingWatches += $watch
}

Write-Host "Relojes pendientes por publicar encontrados: $($pendingWatches.Count)" -ForegroundColor Cyan

if ($pendingWatches.Count -eq 0) {
    Write-Host "Todos los relojes del catálogo ya han sido publicados o están vendidos. ¡Buen trabajo!" -ForegroundColor Green
    exit 0
}

# --- 9. FUNCIÓN PARA GENERAR DESCRIPCIÓN ---
function Build-Caption {
    param($Watch)
    
    $marca = $Watch.marca.ToUpper()
    $modelo = $Watch.modelo
    $ref = $Watch.referencia
    $medida = $Watch.medida
    $material = $Watch.material
    $caratula = $Watch.caratula
    $movimiento = $Watch.movimiento
    $status = $Watch.status
    
    # Manejar precio placeholder (561.7978 equivale a $10,000 MXN en store.js / placeholder)
    $precio = $Watch.precio
    $precioStr = ""
    if ($precio -eq 561.7978 -or $precio -eq 0 -or $null -eq $precio) {
        $precioStr = "Consultar Precio (DM o WhatsApp)"
    } else {
        $precioStr = "$($precio.ToString('C0', [System.Globalization.CultureInfo]::GetCultureInfo('en-US'))) USD"
    }

    $msg = "Hola, estoy interesado en el reloj $marca $modelo (Ref: $ref)"
    $waUrl = "https://api.whatsapp.com/send?phone=528121980008&text=$([System.Net.WebUtility]::UrlEncode($msg))"

    # Plantilla de publicación de Instagram
    $caption = @"
👑 $marca $modelo 👑

Detalles de la pieza:
✨ Referencia: $ref
📏 Diámetro: $medida
🛠 Material: $material
🎨 Carátula: $caratula
⚙ Movimiento: $movimiento
💵 Precio: $precioStr
📦 Estatus: $status

📲 ¿Te interesa esta pieza exclusiva? Escríbenos directamente por Mensaje Privado (DM) o haz clic en el enlace de nuestra biografía para enviarnos un WhatsApp inmediato al +52 81 2198 0008.

---

#RoyalWatchMTY #AltaRelojeria #RelojesDeLujo #CompraVentaRelojes #SanPedroGarzaGarcia #Monterrey #RelojesOriginales #LuxuryWatch #$(($marca -replace '\s+', '')) #$(($modelo -replace '\s+', ''))
"@
    return $caption
}

# --- 10. PROCESO DE PUBLICACIÓN ---
$publishedThisRun = 0

foreach ($watch in $pendingWatches) {
    if ($publishedThisRun -ge $MaxPostsPerRun) {
        Write-Host "Límite establecido por ejecución ($MaxPostsPerRun) alcanzado. Deteniendo ejecución actual." -ForegroundColor Yellow
        break
    }
    
    # Validar tasa límite total antes de cada post
    if ($state.posts_in_last_24h.Count -ge 25 -and -not $DryRun) {
        Write-Warning "Se alcanzó el límite diario total de 25 posts en Instagram. Finalizando."
        break
    }

    $ref = $watch.referencia
    Write-Host "`n===============================================" -ForegroundColor Gray
    Write-Host "PROCESANDO: $($watch.marca) $($watch.modelo) (Ref: $ref)" -ForegroundColor Cyan
    
    # A. Obtener URL de la imagen
    $imageUrl = ""
    if ($ImageHostingMode -eq "LOCAL_HOSTED") {
        # Ejemplo: https://royalwatchmty.com/relojes/Rolex_Submariner_No-Date_Diagonal_2137.jpg
        $imageUrl = $PublicBaseUrl.TrimEnd('/') + "/" + $watch.imagen.Replace('\', '/')
    } else {
        # Modo UPLOAD_API
        $localImgRelative = $watch.imagen
        $localImgPath = Join-Path $BaseDir $localImgRelative
        
        if (-not (Test-Path $localImgPath)) {
            Write-Warning "No se encontró la imagen en local: $localImgPath. Saltando este reloj."
            continue
        }
        
        try {
            $imageUrl = Upload-To-Imgbb -LocalPath $localImgPath
        } catch {
            Write-Error "Fallo en la subida de imagen para ref $($ref): $_"
            continue
        }
    }

    # B. Construir descripción
    $caption = Build-Caption -Watch $watch
    
    Write-Host "--- DESCRIPCIÓN GENERADA ---" -ForegroundColor DarkYellow
    Write-Host $caption
    Write-Host "URL Imagen: $imageUrl" -ForegroundColor DarkCyan
    Write-Host "----------------------------"

    # C. Ejecutar publicación (Real o Simulada)
    if ($DryRun) {
        Write-Host "[SIMULACIÓN] Publicación exitosa de $ref." -ForegroundColor Green
        # En modo simulación también registramos para no repetir en la siguiente prueba
        $state.published_watches += $ref
        $state.posts_in_last_24h += [DateTime]::UtcNow.ToString("o")
        $publishedThisRun++
    } else {
        try {
            Write-Host "Creando contenedor de medios en Meta API..." -ForegroundColor Yellow
            
            # Paso 1: Crear Contenedor
            $uriMedia = "https://graph.facebook.com/v17.0/$InstagramAccountId/media"
            $bodyMedia = @{
                image_url = $imageUrl
                caption = $caption
                access_token = $MetaAccessToken
            }
            
            # Enviar como JSON
            $jsonBody = $bodyMedia | ConvertTo-Json
            $responseMedia = Invoke-RestMethod -Uri $uriMedia -Method Post -Body $jsonBody -ContentType "application/json; charset=utf-8"
            
            $containerId = $responseMedia.id
            if (-not $containerId) {
                throw "No se obtuvo el ID del contenedor de Meta."
            }
            Write-Host "Contenedor de medios creado con ID: $containerId" -ForegroundColor Green
            
            # Paso 2: Polling - Esperar a que el contenedor esté procesado
            $statusCode = ""
            $attempts = 0
            $maxAttempts = 15
            Write-Host "Esperando procesamiento de imagen por parte de Instagram..." -ForegroundColor Yellow
            
            while ($statusCode -ne "FINISHED" -and $attempts -lt $maxAttempts) {
                Start-Sleep -Seconds 10
                $attempts++
                Write-Host "Verificando estado (Intento $attempts)..."
                
                $uriCheck = "https://graph.facebook.com/v17.0/$containerId?fields=status_code&access_token=$MetaAccessToken"
                $responseCheck = Invoke-RestMethod -Uri $uriCheck -Method Get
                $statusCode = $responseCheck.status_code
                Write-Host "Estado: $statusCode"
                
                if ($statusCode -eq "ERROR") {
                    throw "Instagram reportó un error al procesar el contenedor de medios."
                }
            }
            
            if ($statusCode -ne "FINISHED") {
                throw "Tiempo de espera agotado esperando que se procese la imagen."
            }
            
            # Paso 3: Publicar
            Write-Host "Publicando contenedor en el feed de Instagram..." -ForegroundColor Yellow
            $uriPublish = "https://graph.facebook.com/v17.0/$InstagramAccountId/media_publish"
            $bodyPublish = @{
                creation_id = $containerId
                access_token = $MetaAccessToken
            } | ConvertTo-Json
            
            $responsePublish = Invoke-RestMethod -Uri $uriPublish -Method Post -Body $bodyPublish -ContentType "application/json; charset=utf-8"
            
            if ($responsePublish.id) {
                Write-Host "¡PUBLICADO CON ÉXITO! ID de Publicación: $($responsePublish.id)" -ForegroundColor Green
                
                # Actualizar estado
                $state.published_watches += $ref
                $state.posts_in_last_24h += [DateTime]::UtcNow.ToString("o")
                $publishedThisRun++
                
                # Guardar estado inmediatamente por si se interrumpe
                $state | ConvertTo-Json -Depth 5 | Set-Content -Path $stateFile -Encoding UTF8
                
                # Pausa entre posts reales para no saturar APIs
                Write-Host "Esperando 45 segundos antes de continuar con la siguiente pieza..." -ForegroundColor DarkGray
                Start-Sleep -Seconds 45
            } else {
                throw "Fallo al publicar el contenedor."
            }
        } catch {
            Write-Error "Error al publicar ref $($ref) en Instagram: $_"
            # Detener el bucle en caso de error grave de API para evitar spam de errores
            if ($_.Exception.Response) {
                $streamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $errDetail = $streamReader.ReadToEnd()
                Write-Host "Detalles del error de Meta API: $errDetail" -ForegroundColor Red
            }
            Write-Host "Deteniendo la ejecución actual para revisar configuraciones." -ForegroundColor Red
            break
        }
    }
}

# --- 11. GUARDAR ESTADO FINAL ---
Write-Host "`nGuardando registro final de estado..." -ForegroundColor Cyan
$state | ConvertTo-Json -Depth 5 | Set-Content -Path $stateFile -Encoding UTF8
Write-Host "Proceso terminado con éxito. Relojes publicados en esta sesión: $publishedThisRun" -ForegroundColor Green
