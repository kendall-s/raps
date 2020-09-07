var installer = require('electron-winstaller');
var path      = require('path');
const dialog  = require('electron').dialog;

console.log("packaging into a exe...\n");
resultPromise = installer.createWindowsInstaller({
    appDirectory:    'C:/Users/she384/Documents/Electron_Apps/RAPS',
    outputDirectory: './installers/final',
    exe:             'AppName.exe',
    setupExe:        'FinalExeName.exe',
    noMsi:           true,
    iconUrl:         'IconUrl',
    setupIcon:       'IconPath'
});

resultPromise.then(function () {
    console.log("Installer created");
    dialog.showMessageBox({
        type:    'info',
        title:   'electron-winstaller',
        message: "Installer created",
        buttons: ['ok']
    });
    require('electron').app.quit();
})