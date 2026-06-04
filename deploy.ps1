# ==============================================================
# deploy.ps1  -  Build + deploy a servidor SSH + restart PM2
# Requiere: PuTTY (plink + pscp) instalado en PATH
#   Descargar: https://www.putty.org/
# AVISO: no subas este fichero a git (ya está en .gitignore)
# ==============================================================
param()
$ErrorActionPreference = "Stop"

# ── Credenciales ───────────────────────────────────────────────
$SSH_HOST = "senise-drums-eu.espacioseguro.com"
$SSH_USER = "senise-drums"
$SSH_PORT = 22
$SSH_PASS = ""        # <-- pon aquí tu contraseña
# ──────────────────────────────────────────────────────────────

$REMOTE_PUBLIC = "/root/shaq/public"
$REMOTE_SERVER = "/root/shaq/server"
$PM2_APP_NAME  = "server"
$PM2_ENTRY     = "~/shaq/server/src/index.js"

function info  { param($msg) Write-Host "[deploy] $msg" -ForegroundColor Green }
function err_exit { param($msg) Write-Host "[deploy] ERROR: $msg" -ForegroundColor Red; exit 1 }

# ── Comprobar dependencias ─────────────────────────────────────
if (-not (Get-Command plink  -ErrorAction SilentlyContinue)) {
    err_exit "plink no encontrado. Instala PuTTY (https://www.putty.org/) y asegúrate de que está en el PATH"
}
if (-not (Get-Command pscp   -ErrorAction SilentlyContinue)) {
    err_exit "pscp no encontrado. Instala PuTTY (https://www.putty.org/)"
}
if (-not (Get-Command npm    -ErrorAction SilentlyContinue)) {
    err_exit "npm no encontrado"
}
if ([string]::IsNullOrEmpty($SSH_PASS)) {
    err_exit "Pon la contraseña en la variable SSH_PASS de este script"
}

$plink_base = @("plink", "-ssh", "-P", $SSH_PORT, "-l", $SSH_USER, "-pw", $SSH_PASS, "-batch", "-no-antispoof", $SSH_HOST)
$pscp_base  = @("pscp", "-P", $SSH_PORT, "-pw", $SSH_PASS, "-r", "-batch")

function Remote-Exec { param($cmd)
    & plink -ssh -P $SSH_PORT -l $SSH_USER -pw $SSH_PASS -batch $SSH_HOST $cmd
    if ($LASTEXITCODE -ne 0) { err_exit "Comando remoto falló: $cmd" }
}

# ── 1. Build ───────────────────────────────────────────────────
info "Compilando cliente..."
npm run build
if ($LASTEXITCODE -ne 0) { err_exit "npm run build falló" }

# ── 2. Subir public/ ──────────────────────────────────────────
info "Subiendo public\ → $REMOTE_PUBLIC ..."
& pscp -P $SSH_PORT -pw $SSH_PASS -r -batch "public\*" "${SSH_USER}@${SSH_HOST}:${REMOTE_PUBLIC}/"
if ($LASTEXITCODE -ne 0) { err_exit "Error subiendo public/" }

# ── 3. Subir server/ ──────────────────────────────────────────
info "Subiendo server\src y package.json → $REMOTE_SERVER ..."
& pscp -P $SSH_PORT -pw $SSH_PASS -r -batch "server\src"          "${SSH_USER}@${SSH_HOST}:${REMOTE_SERVER}/"
& pscp -P $SSH_PORT -pw $SSH_PASS    -batch "server\package.json" "${SSH_USER}@${SSH_HOST}:${REMOTE_SERVER}/"

# ── 4. npm install + restart PM2 ──────────────────────────────
info "Instalando dependencias y reiniciando PM2..."
$remote_cmds = "cd ~/shaq/server && npm install --omit=dev --silent && (pm2 restart $PM2_APP_NAME 2>/dev/null || pm2 start $PM2_ENTRY --name $PM2_APP_NAME) && pm2 save"
& plink -ssh -P $SSH_PORT -l $SSH_USER -pw $SSH_PASS -batch $SSH_HOST $remote_cmds
if ($LASTEXITCODE -ne 0) { err_exit "Error en npm install / pm2 restart remoto" }

info "✅ Deploy completado"
