# 🖥️ Desktop Shortcuts for Medical Distribution Dashboard

Your **Medical Distribution Management System** now has convenient desktop shortcuts for easy access!

## 🚀 Available Desktop Shortcuts

### 1. **Medical Distribution Dashboard.app** (macOS Application)
- **Location**: `~/Desktop/Medical Distribution Dashboard.app`
- **Type**: Native macOS application bundle
- **Usage**: Double-click to launch the desktop application
- **Features**:
  - Proper macOS app icon
  - Native application behavior
  - Runs in the background

### 2. **Medical Distribution Dashboard** (Command Script)
- **Location**: `~/Desktop/Medical Distribution Dashboard`
- **Type**: Executable shell script
- **Usage**: Double-click to launch (may need to right-click → Open first time)
- **Features**:
  - Shows launch progress in Terminal
  - Includes error checking
  - Manual dependency installation if needed

## 🎯 How to Use

### Quick Launch (Recommended)
1. **Double-click** the `Medical Distribution Dashboard.app` icon on your desktop
2. The application will open in a new window
3. Wait for the app to fully load (may take 10-30 seconds on first launch)

### Alternative Launch
1. **Double-click** the `Medical Distribution Dashboard` script
2. A Terminal window will open showing the launch process
3. The desktop app will start automatically
4. You can close the Terminal window once the app appears

## 🔧 Troubleshooting

### First-Time Launch Issues
- **macOS Security**: Right-click the file → "Open" → "Open Anyway"
- **Dependencies**: The launcher will automatically install npm packages if needed
- **Permissions**: Make sure the project directory is accessible

### App Won't Start
1. Check that Node.js and npm are installed: `node --version && npm --version`
2. Ensure you're in the project directory
3. Try running manually: `cd /path/to/project && npm run dev`

### Icon Not Showing
- The app uses the favicon from the project
- You can replace `Medical Distribution Dashboard.app/Contents/Resources/AppIcon.ico` with a custom icon

## 📁 File Locations

```
~/Desktop/
├── Medical Distribution Dashboard.app/          # macOS App Bundle
│   ├── Contents/
│   │   ├── Info.plist                          # App Configuration
│   │   ├── MacOS/
│   │   │   └── Medical Distribution Dashboard  # Executable Script
│   │   └── Resources/
│   │       └── AppIcon.ico                     # App Icon
│   └── Medical Distribution Dashboard.app alias # Desktop Shortcut
└── Medical Distribution Dashboard              # Alternative Launcher Script
```

## 🔄 Updating the Shortcuts

If you move the project directory, update the launcher script:
1. Open `Medical Distribution Dashboard.app/Contents/MacOS/Medical Distribution Dashboard`
2. Change the `PROJECT_DIR` path to your new location
3. Or recreate the shortcuts using the original files

## 🎨 Customization

### Change App Icon
```bash
# Replace the icon file
cp your-custom-icon.png "Medical Distribution Dashboard.app/Contents/Resources/AppIcon.png"
# Update Info.plist if needed
```

### Change App Name
```bash
# Rename the .app bundle
mv "Medical Distribution Dashboard.app" "Your Custom Name.app"
# Update internal files accordingly
```

## 📞 Support

If you encounter issues:
1. Check the Terminal output for error messages
2. Verify Node.js/npm installation
3. Ensure project files are intact
4. Try the alternative launcher script

---
**🎉 Your desktop shortcuts are ready! Double-click to launch your Medical Distribution Dashboard anytime!**
