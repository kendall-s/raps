const { app } = require('electron')
const { BrowserWindow } = require('electron') 
const { ipcMain } = require('electron')
const { dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const csv = require('csv-parser')

const electronLocalshortcut = require('electron-localshortcut');

var win = null;

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  win.webContents.openDevTools()

  win.removeMenu();

  electronLocalshortcut.register(win, ['Ctrl+S'], () => {
      win.webContents.send('save_shortcut', '');
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
    
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

var app_data_path = app.getPath("appData");

try {
  fs.mkdirSync((app_data_path + "\\run_analysis_proc_sheet"));
} catch (err) {
  console.log("Appdata directory already exists")
}


// ******************************************************

// IPC functions are the Inter-Process Communication functions which handle sending data from the Main event loop (this file) to the Rendered page (index.html)
// They use an event based trigger system based on messages, the messages can have names to identify them

// ******************************************************

// Event for handling when a user wants to open a directory. First gives folder opening dialog, 
// then puts that path into get_files_in_dir function
ipcMain.on('select_dir', async(event, arg) => {
  console.log(event);
  const result = await dialog.showOpenDialog({ 
    properties: ['openDirectory']
  }).then(result => {
    get_files_in_dir(result.filePaths[0]);
  }).catch(err => {
    console.log(err);
  })
})

// Event handling for when user wants to Save File As, displays the save path dialog then returns that result back to the render page
ipcMain.on('save_dialog', async(event, arg) => {
  let option = {
    title: "Save File As",
    filters: [{name: 'Comma Separated Values', extensions: ['csv']}]}

  const result = await dialog.showSaveDialog(options=option).then(result => {
    win.webContents.send('save_path', result);
  }).catch(err => {
    console.log(err);
  })
})

// Event handling for the refresh list function, which is needed for when a user saves a new file, 
// the files list is then updated to show the new file
ipcMain.on('refresh_list', async(event, arg) => {
  dir = arg["dir_path"];
  get_files_in_dir(dir);
})

// When the user selects a file from the file list, this function reads it in and then
// sends the contents back to the rendered page as an object
ipcMain.on('select_file', async(event, data) => {
  var file_to_open = data.file;
  console.log(file_to_open);
  var csv_array = [];

  fs.createReadStream(file_to_open)
  .pipe(csv())
  .on('data', (row) => {
    //console.log(row);
    csv_array.push(row);
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
    context = {"filePath": file_to_open, "csv_data": csv_array, "version": data.version};
    win.webContents.send('load_form_data', context);
  });
})

// Message box for saying a CSV file was successfully read in
ipcMain.on('file_loaded_success', async(event, arg) => {
  const disp = await dialog.showMessageBox({
    type: "info",
    title: "CSV Loaded Successfully",
    message: "The data in the csv was read in and successfully loaded 😃"
  })
})

// Message box for saying a CSV file was saved correctly
ipcMain.on('new_version_saved', async(event, arg) => {
  const disp = await dialog.showMessageBox({
    type: "info",
    title: "New version successfully saved",
    message: "The data was successfully saved to the file as a new version 😃"
  })
})


// Helper functions

// The function which handles getting all CSV files in a directory. They are ordered by mod time
function get_files_in_dir(directory_path) {
  fs.readdir(directory_path, function(err, files) {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    // target_files = files.filter(function(file) {
      // console.log(path.extname(file).toLowerCase() === '.csv');
    // })
    csv_files_full_path = []
    csv_files_name = []
    csv_files_obj = []
    files.forEach(function (file) {
      if (path.extname(file).toLowerCase() === '.csv'){
        csv_files_obj.push({'name': file, 'path': path.join(directory_path, file)})
        csv_files_full_path.push(path.join(directory_path, file));
        csv_files_name.push(file);
      }
    })
    var context = {"dir_path": directory_path, "csv_files": csv_files_obj}
    populate_list(context);
  })
}

// Sends the object containing all the csv files in a directory back to the rendered page
function populate_list(csv_files) {
  win.webContents.send('populate_list', csv_files);
}