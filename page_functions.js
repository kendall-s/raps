var file_being_edited = false;

const path = require('path')

const { header_converter } = require(path.join(__dirname, './js/csv_header.js'));
//const { get_files_in_dir, get_key_by_value, read_csv_file, get_path_formatted_date } = require(path.join(__dirname, './js/utils.js'));
const { fetch_latest_release } = require(path.join(__dirname, './js/utils.js'));
const { save_to_both_paths, save_all_data, collate_final } = require(path.join(__dirname, './js/csv_actions.js'));

const { ipcRenderer, shell } = require('electron')
const remote = require('electron').remote;
const app = remote.app;

// Get the appdata path 
const app_data_path = (app.getPath("appData")) + '\\run_analysis_proc_sheet\\';
console.log(app_data_path);

// Get the app version from the package.json
const app_version = app.getVersion();

// Set the app version in the HTML gui 
document.getElementById('app-version').textContent = "v"+ app_version;

fetch_latest_release(app_version);

/*
                Table of Contents
________________________________________________

                IPC Functions
        - Save shortcut
        - Populate file list 
        - Save file as
        - Load form data
            
            Page Functionality
        - Load file
        - Open directory
        - Save directory

            Title Bar
        - Button functionality for title bar

*/


// CTRL+S save shortcut handler
ipcRenderer.on('save_shortcut', (event, data) => {
    console.log("Keyboard shortcut");
    save_to_both_paths();
})

// IPC for when the user has selected a specific folder to load in the CSV files from
ipcRenderer.on('populate_list', (event, data) => {
    // Get the user selected folder path and set the heading text to it
    document.getElementById("selected_directory").text = data["dir_path"]

    // Extract the csv_file array from the data context and populate the file list
    var csv_files_data = data["csv_files"]
    populate_file_list(csv_files_data);
});


// IPC for when the user has selcted the Save File As button
// From the main loop after the save dialog has been used, the file currently open element is set to this path
ipcRenderer.on('save_path', (event, data) => {

    console.log(data);

    // Set the file currently open element to the file path 
    const file_split = data.filePath.split("\\");
    document.getElementById("file_currently_open").innerHTML = file_split[file_split.length - 1];
    document.getElementById("file_currently_open").title = data.filePath;
    file_being_edited = data.filePath;

    // Save all the data to the selected path and then also refresh the file list to include to file
    save_all_data();
    save_all_data(appdata_save = true, new_version = false);

    refresh_file_list();

});

// When an old file is opened this function loads in that data (for the specific version) 
// then also using the populate helper function puts that data in the right spots
ipcRenderer.on('load_form_data', (event, data) => {
    console.log(data);

    // Set the file path text to the file path
    const file_split = data.filePath.split("\\");
    document.getElementById("file_currently_open").innerHTML = file_split[file_split.length - 1];
    document.getElementById("file_currently_open").title = data.filePath;

    // Get the number of versions, then also reset the version select dropdown
    var latest_version = data['csv_data'].length - 1;
    document.getElementById("version-select").innerHTML = "";

    // Add the number of versions to the select dropdown
    var vc = document.getElementById("version-select")
    for (let i = 0; i < data['csv_data'].length; i++) {
        var opt = document.createElement("option");
        opt.text = i;
        vc.add(opt);
    }

    // Determine if a specific version was selected, if it was, this will be the picked version, otherwise use latest version
    var selected_version = data.version;
    console.log(selected_version);
    if (selected_version !== false) {
        console.log('A version was selected')
        // Set the currnt version number to the selected one
        vc.selectedIndex = selected_version;
    } else {
        selected_version = latest_version;
        vc.selectedIndex = latest_version;
    }

    // Try to extract the data and put it in the corresponding field
    try {

        current_data = data['csv_data'][selected_version];
        console.log(current_data);

        populate_all_data(current_data, selected_version);

        window.postMessage({
            type: 'file_loaded_successfully'
        })

    } catch (error) {
        console.log(error)
        console.log("CSV doesn't match what is expected")
    }

});


// ______________________________________________________________________________
//
//                              Page utility functions
// ______________________________________________________________________________

// Hnadles opening the appdata folder on the users machine
function open_appdata_folder() {
    const appdata_path = app.getPath("appData")
    shell.openItem(appdata_path + "\\run_analysis_proc_sheet\\")
}

// Handles the load file button, gets selected file, sends to Main loop
function load_file(version = false, file_path = false) {
    let column_check = false;
    // If the user changes the file by using the version control dropdown, else they are loading a whole separate file
    if (version) { // Use this to sneakily check the current columns in a file
        var file_path = document.getElementById("file_currently_open").title
        var value = file_path;

    } else { // Load the file from the selected file in the file list 
        var sel_list = document.getElementById("csv_file_list");
        var index_select = sel_list.options.selectedIndex;
        var value = sel_list.options[index_select].value;
    }
    window.postMessage({ // Post load file message back to main thread
        type: 'select_file',
        file: value,
        version: version,
        column_check: column_check
    })
}

// Handles the opening directory button, just sends message to Main loop
function open_dir() {
    console.log('Clicked')
    window.postMessage({
        type: 'select_dir'
    })
}

// Handles the save data button 
function save_data() {
    window.postMessage({
        type: 'save_dialog'
    })
}


// ______________________________________________________________________________
//
//                           Title bar utility functions
// ______________________________________________________________________________

const win = remote.getCurrentWindow(); /* Note this is different to the
html global `window` variable */

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
    }
};

window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        win.minimize();
    });

    document.getElementById('max-button').addEventListener("click", event => {
        win.maximize();
    });

    document.getElementById('restore-button').addEventListener("click", event => {
        win.unmaximize();
    });

    document.getElementById('close-button').addEventListener("click", event => {
        win.close();
    });

    // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
    toggleMaxRestoreButtons();
    win.on('maximize', toggleMaxRestoreButtons);
    win.on('unmaximize', toggleMaxRestoreButtons);

    function toggleMaxRestoreButtons() {
        if (win.isMaximized()) {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }
}