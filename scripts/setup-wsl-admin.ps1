#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

Write-Host "[1/3] Enabling Windows Subsystem for Linux..."
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

Write-Host "[2/3] Enabling Virtual Machine Platform..."
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

Write-Host "[3/3] WSL features are enabled."
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Reboot Windows."
Write-Host "2. Open PowerShell and run: wsl --install -d Ubuntu"
Write-Host "3. Launch Ubuntu once and create your Linux username/password."
Write-Host "4. Inside Ubuntu, run the setup script in docs/wsl-codex-setup.md"
