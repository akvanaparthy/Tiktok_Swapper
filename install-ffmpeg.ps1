Set-Location $PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'

Write-Host "Downloading ffmpeg..."
Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile 'bin\ffmpeg.zip' -UseBasicParsing

Write-Host "Extracting..."
Expand-Archive -Path 'bin\ffmpeg.zip' -DestinationPath 'bin\ffmpeg-temp' -Force

$ffmpegDir = Get-ChildItem 'bin\ffmpeg-temp' -Directory | Select-Object -First 1
Copy-Item (Join-Path $ffmpegDir.FullName 'bin\ffmpeg.exe') 'bin\ffmpeg.exe' -Force
Copy-Item (Join-Path $ffmpegDir.FullName 'bin\ffprobe.exe') 'bin\ffprobe.exe' -Force

Write-Host "Cleaning up..."
Remove-Item 'bin\ffmpeg.zip' -Force -ErrorAction SilentlyContinue
Remove-Item 'bin\ffmpeg-temp' -Recurse -Force -ErrorAction SilentlyContinue

if (Test-Path 'bin\ffmpeg.exe') {
    Write-Host "ffmpeg installed successfully!"
} else {
    Write-Host "ffmpeg installation failed"
}
