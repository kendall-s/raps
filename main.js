const { app } = require('electron')
const { BrowserWindow } = require('electron')
const { ipcMain } = require('electron')
const { dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const csv = require('csv-parser')

const electronLocalshortcut = require('electron-localshortcut');
const { disconnect } = require('process')

var win = null;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  //win.webContents.openDevTools()

  win.removeMenu();

  electronLocalshortcut.register(win, ['Ctrl+S'], () => {
    win.webContents.send('save_shortcut', '');
  });
  electronLocalshortcut.register(win, ['F12'], () => {
    win.webContents.toggleDevTools()
  })
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

const { get_files_in_dir } = require(path.join(__dirname, './js/utils.js'));

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
ipcMain.on('select_dir', async (event, arg) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    let csv_files = get_files_in_dir(result.filePaths[0]);
    populate_list(csv_files);
  }).catch(err => {
    console.log(err);
  })
})

// Event handling for when user wants to Save File As, displays the save path dialog then returns that result back to the render page
ipcMain.on('save_dialog', async (event, arg) => {
  show_save_dialog();
})

// Event handling for the refresh list function, which is needed for when a user saves a new file, 
// the files list is then updated to show the new file
ipcMain.on('refresh_list', async (event, arg) => {
  dir = arg["dir_path"];
  if (fs.existsSync(dir)) {
    let csv_files = get_files_in_dir(dir);
    populate_list(csv_files);
  }
})

// When the user selects a file from the file list, this function reads it in and then
// sends the contents back to the rendered page as an object
ipcMain.on('select_file', async (event, data) => {
  var file_to_open = data.file;
  console.log(file_to_open);
  read_csv_file(file_to_open, version=data.version, column_check=data.column_check);
})

// Message box for saying a CSV file was successfully read in
ipcMain.on('file_loaded_success', async (event, arg) => {
  const disp = await dialog.showMessageBox({
    type: "info",
    title: "CSV Loaded Successfully",
    message: "The data in the csv was read in and successfully loaded 😀"
  })
})

// Message box for saying a CSV file was saved correctly
ipcMain.on('new_version_saved', async (event, arg) => {
  const disp = await dialog.showMessageBox({
    type: "info",
    title: "New version successfully saved",
    message: "The data was successfully saved to the file as a new version 😃"
  })
})

// Message box for saying the collated file was created successfully
ipcMain.on('new_collated_saved', async (event, arg) => {
  const disp = await dialog.showMessageBox({
    type: "info",
    title: "New collated file successfully saved",
    message: "The collated file was successfully created 😃"
  })
})

ipcMain.on('cant_save_need_path', async (event, arg) => {
  const disp = await dialog.showMessageBox({
    type: "info",
    title: "Error saving file",
    buttons: ['OK', 'Save File As'],
    message: "I can't save the file because there isn't an active file. Please use Save File As to create a new file to save data to."
  })
  .then((response) => {
    console.log(response)
    if (response.response == 1) {
      show_save_dialog();
    }
  })
})



// Helper functions

// Sends the object containing all the csv files in a directory back to the rendered page
function populate_list(csv_files) {
  win.webContents.send('populate_list', csv_files);
}

async function show_save_dialog() {
  let option = {
    title: "Save File As",
    filters: [{ name: 'Comma Separated Values', extensions: ['csv'] }]
  }

  const result = await dialog.showSaveDialog(options = option)
  .then(result => {
    result['new_file'] = true;
    win.webContents.send('save_path', result);
  }).catch(err => {
    console.log(err);
  })
}

function read_csv_file(file_to_open, version=0, column_check=0) {
  var csv_array = [];

  fs.createReadStream(file_to_open)
    .pipe(csv())
    .on('data', (row) => {
      //console.log(row);
      csv_array.push(row);
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
      context = { "filePath": file_to_open, "csv_data": csv_array, "version": version };
      if (column_check) { // Sneaky little read to check the number of columns in the CSV, redirect file load to different function
        context = { "cols": csv_array[0].length }
        win.webContents.send('number_of_csv_cols', context);
      } else {
        win.webContents.send('load_form_data', context);
      }
    });
}

