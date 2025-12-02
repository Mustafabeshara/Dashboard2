@echo off
REM Medical Distribution Dashboard - Desktop App Launcher (Windows)
REM Run this script to clone and start the Electron app

echo.
echo Medical Distribution Dashboard - Desktop Setup
echo ==================================================
echo.

REM Check for Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo X Git is not installed. Please install Git first.
    echo   Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo X Node.js is not installed. Please install Node.js 20+ first.
    echo   Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Prerequisites check passed
echo.

set APP_DIR=%USERPROFILE%\MedicalDashboard

REM Clone or update repository
if exist "%APP_DIR%" (
    echo Updating existing installation...
    cd /d "%APP_DIR%"
    git pull origin main
) else (
    echo Cloning repository...
    git clone https://github.com/Mustafabeshara/Dashboard2.git "%APP_DIR%"
    cd /d "%APP_DIR%"
)

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

REM Generate Prisma client
echo.
echo Generating local database client...
call npx prisma generate --schema=prisma/schema.local.prisma

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating local environment file...
    (
        echo # Local Development Environment
        echo DATABASE_URL=postgresql://localhost:5432/medical_distribution
        echo LOCAL_DATABASE_URL=file:./local.db
        echo NEXTAUTH_SECRET=local-development-secret-change-in-production
        echo NEXTAUTH_URL=http://localhost:3000
        echo.
        echo # AI Providers - add your keys
        echo # GROQ_API_KEY=your_groq_key
        echo # GEMINI_API_KEY=your_gemini_key
    ) > .env.local
    echo Created .env.local - add your API keys to enable AI features
)

REM Run the app
echo.
echo Starting Medical Distribution Dashboard...
echo The app will open in a new window.
echo.
call npm run electron:dev

pause
