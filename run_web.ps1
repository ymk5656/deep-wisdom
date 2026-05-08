$env:PATH = "D:\project\nodejs;" + $env:PATH
Set-Location $PSScriptRoot
& "D:\project\nodejs\node.exe" "node_modules\next\dist\bin\next" dev --port 3000
