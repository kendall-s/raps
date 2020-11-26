var file_being_edited = false;

var sidebar_open = false;
var save_sidebar_open = false;
var file_sidebar_open = false;
var search_sidebar_open = false;

const path = require('path')
const { csv_header, output_name_object, header_converter } = require(path.join(__dirname, './js/csv_header.js'));
const fs = require('fs')
const csv = require('csv-parser')
const { ipcRenderer, shell } = require('electron')
const remote = require('electron').remote;
const app = remote.app;

const app_version = app.getVersion();

const app_data_path = (app.getPath("appData")) + '\\run_analysis_proc_sheet\\';
console.log(app_data_path);

const createCsvWriter = require('csv-writer').createObjectCsvWriter;


// --------------------------------------------
//                     TOC

//               IPC Functions
// - populate file list
// - save path
// - load form data
// 
//             Utility Functions
// - set version in HTML
// - version selection
// - fetch all input form data 
// - refresh file list
// - populate file list
// - save all data
// - populate all input fields with loaded data
// - handling sidenav open/closing
// - clear all input fields
// - open directory button handling
// - load file button handling
// - load file from double click
// - save file button handling
// - open appdata folder
// - collate final data file

// Misc Title Bar button handling functions



// ______________________________________________________________________________
//
//                              IPC Main loop functions
// ______________________________________________________________________________


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

// Set the app version in the HTML gui 
document.getElementById('app-version').textContent = "v" + app_version;

// Function that handles the version selection feature, if the dropdown is changed, 
// this triggers the file open to be reloaded to the selected version
var version_selector = document.getElementById('version-select');
version_selector.onchange = (event) => {
    var version_selected = event.target.value;
    console.log(version_selected);
    load_file(version = version_selected);

}

// Gets the data from all the fields marked with the Form class
function fetch_all_data() {

    form_data = {};

    form_fields = document.getElementsByClassName("form");
    for (form_field in form_fields) {

        let field = form_fields[form_field];
        //console.log(field);

        let key = field.id;

        let field_type = field.type;

        if (field_type === 'checkbox') {
            let value = field.checked;
            form_data[key] = value;
        } else {
            let value = field.value;
            form_data[key] = value;
        }
    }
    return form_data;
}

// Updates the files in the file list
function refresh_file_list() {

    var directory_path = document.getElementById("selected_directory").text
    window.postMessage({
        type: 'refresh_list',
        dir_path: directory_path
    })
}

// Files the file list with the CSV files in the context
function populate_file_list(csv_files) {
    var sel_list = document.getElementById("csv_file_list");
    sel_list.innerHTML = "";

    csv_files.forEach(csv_name => {
        var name = document.createElement("option")
        name.appendChild(document.createTextNode(csv_name['name']))
        name.value = csv_name['path']
        name.title = csv_name['name']
        sel_list.append(name)
    });
}

// Function called by new version button 
function save_to_both_paths() {
    // Save as new version
    save_all_data(appdata_save = false, new_version = true);
    // Save new file to the appdata location
    save_all_data(appdata_save = true, new_version = false);
}


// Saves the data to the CSV with a human readable header (which is why this is so damn long...)
function save_all_data(appdata_save = false, new_version = false) {
    // Pull the file path from the currently open 
    file_path = document.getElementById("file_currently_open").title;
    // Can't save the file, if a New file is opened and a path isn't specified
    if (file_path == "<i>New</i>") {
        console.log("Not saving file...")
    } else {
        console.log(file_path)
        console.log(new_version);

        // Calculate the time which we are saving the file so it can be added
        // This is used below and is saved directly into the .CSV
        var save_time_date = new Date().toLocaleString();
        var save_time_path = save_time_date.split('/').join('-');
        save_time_path = save_time_path.replace(/\s/g, '');
        save_time_path = save_time_path.replace(/,/g, "+");
        save_time_path = save_time_path.replace(/:/g, "-")
        console.log(save_time_date);

        // If this is the pass to save data in Appdata then create the file path
        if (appdata_save == true) {
            file_path = app_data_path + save_time_path + '.csv';
            console.log(file_path);
            fs.writeFile(file_path, '', (err) => {
                if (err) throw err;
                console.log('The file has been saved!');
            });
        }

        var form_data = fetch_all_data();

        // Create a CSV writer object, passing the header object with ID and column Title 
        const csvWriter = createCsvWriter({
            path: file_path,
            header: csv_header,
            append: new_version
        });


        // This loops over the template output object which holds all the 
        // HTML form IDs and the corresponding column name for writing to the .CSV
        // The save time section is slightly different as it uses the variable from above 👆
        let output = [{}];
        for (const key in output_name_object) {
            if (output_name_object.hasOwnProperty(key)) {
                const element = output_name_object[key];
                if (element === 0) {
                    output[0][key] = save_time_date;
                } else {
                    output[0][key] = form_data[element];
                    console.log(form_data[element])
                }
            }
        }

        // Write data to csv file, updating the version number to match the now newest version
        csvWriter.writeRecords(output)
            .then(() => {
                if (appdata_save == false) {
                    // Got to update the file version number if we have just saved over the existing file
                    // This is a little bit verbose when using just vanilla JS
                    const vc = document.getElementById("version-select")
                    let options_len = vc.options.length
                    var opt = document.createElement("option");
                    opt.text = options_len;
                    vc.add(opt);
                    vc.selectedIndex = vc.options.length - 1;

                    window.postMessage({
                        type: 'new_version_saved'
                    })
                }
            });
    }
}

// Used to fill the input fields with loaded data 
function populate_all_data(data, version) {

    form_fields = document.getElementsByClassName("form");


    // Iterate through the form fields on the RAPS sheet and pull the corresponding data from the object
    for (form_field in form_fields) {

        field = form_fields[form_field];
        console.log(field.id);
        console.log(data[header_converter[field.id]]);

        // Format correctly so that the checkboxes are correctly fixed 
        if (field.type === 'checkbox') {
            let check_state = data[header_converter[field.id]];
            console.log(check_state)
            if (check_state == "true") {
                field.checked = true;
            }
        }

        if (field.type === 'date') {
            const date = data[header_converter[field.id]];
            console.log(date)
            if (date.match(/\//)) {
                const split_date = date.split('/');
                const fmt_date = split_date[2] + '-' + ('0' + split_date[1]).slice(-2) + '-' + ('0' + split_date[0]).slice(-2)
                field.value = fmt_date
            } else {
                field.value = date;
            }

        } else {
            field.value = data[header_converter[field.id]];
        }
    }
}

// Used to control the side nav bars opening and closing, need to clean up - code is extrememly bad 
// and simplistic in acheiving the effect of only one side nav open at a time
function navOpening(button_id) {
    console.log(button_id);

    if (button_id == "save_menu_button") {
        if (save_sidebar_open == true) {
            document.getElementById("save_sidenav").style.width = "0";
            document.getElementById("main_doc").style.marginLeft = "0";
            save_sidebar_open = false
            document.getElementById("save_menu_button_image").classList.toggle('toggle-up');
            document.getElementById("save_menu_div").classList.toggle('sidenav_selected');
            document.getElementById("save_menu_button_image").src = "img/005-floppy-disk-1.svg"

        } else {
            document.getElementById("save_sidenav").style.width = "160px";
            document.getElementById("main_doc").style.marginLeft = "160px";
            save_sidebar_open = true
            document.getElementById("save_menu_button_image").classList.toggle('toggle-up');
            document.getElementById("save_menu_div").classList.toggle('sidenav_selected');
            document.getElementById("save_menu_button_image").src = "img/008-close.svg"

            if (file_sidebar_open == true) {
                file_sidebar_open = false
                document.getElementById("file_sidenav").style.width = "0";
                document.getElementById("file_menu_button_image").classList.toggle('toggle-up');
                document.getElementById("file_menu_div").classList.toggle('sidenav_selected');
                document.getElementById("file_menu_button_image").src = "img/003-file.svg"
            }
            if (search_sidebar_open == true) {
                search_sidebar_open = false
                document.getElementById("search_sidenav").style.width = "0";
                document.getElementById("search_menu_button_image").classList.toggle('toggle-up');
                document.getElementById("search_menu_div").classList.toggle('sidenav_selected');
                document.getElementById("search_menu_button_image").src = "img/search.svg"
            }
        }
    }

    if (button_id == "file_menu_button") {
        if (file_sidebar_open == true) {
            document.getElementById("file_sidenav").style.width = "0";
            document.getElementById("main_doc").style.marginLeft = "0";
            file_sidebar_open = false
            document.getElementById("file_menu_button_image").classList.toggle('toggle-up');
            document.getElementById("file_menu_div").classList.toggle('sidenav_selected');
            document.getElementById("file_menu_button_image").src = "img/003-file.svg"
        } else {
            document.getElementById("file_sidenav").style.width = "160px";
            document.getElementById("main_doc").style.marginLeft = "160px";
            file_sidebar_open = true
            document.getElementById("file_menu_button_image").classList.toggle('toggle-up');
            document.getElementById("file_menu_div").classList.toggle('sidenav_selected');
            document.getElementById("file_menu_button_image").src = "img/008-close.svg"
            if (save_sidebar_open == true) {
                save_sidebar_open = false
                document.getElementById("save_sidenav").style.width = "0";
                document.getElementById("save_menu_button_image").classList.toggle('toggle-up');
                document.getElementById("save_menu_div").classList.toggle('sidenav_selected');
                document.getElementById("save_menu_button_image").src = "img/005-floppy-disk-1.svg"
            }
            if (search_sidebar_open == true) {
                search_sidebar_open = false
                document.getElementById("search_sidenav").style.width = "0";
                document.getElementById("search_menu_button_image").classList.toggle('toggle-up');
                document.getElementById("search_menu_div").classList.toggle('sidenav_selected');
                document.getElementById("search_menu_button_image").src = "img/search.svg"
            }
        }
    }

    if (button_id == "search_menu_button") {
        if (search_sidebar_open == true) {
            document.getElementById("search_sidenav").style.width = "0";
            document.getElementById("main_doc").style.marginLeft = "0";
            search_sidebar_open = false
            document.getElementById("search_menu_button_image").classList.toggle('toggle-up');
            document.getElementById("search_menu_div").classList.toggle('sidenav_selected');
            document.getElementById("search_menu_button_image").src = "img/search.svg"
        } else {
            document.getElementById("search_sidenav").style.width = "160px";
            document.getElementById("main_doc").style.marginLeft = "160px";
            search_sidebar_open = true
            document.getElementById("search_menu_button_image").classList.toggle('toggle-up');
            document.getElementById("search_menu_div").classList.toggle('sidenav_selected');
            document.getElementById("search_menu_button_image").src = "img/008-close.svg"
            if (save_sidebar_open == true) {
                save_sidebar_open = false
                document.getElementById("save_sidenav").style.width = "0";
                document.getElementById("save_menu_button_image").classList.toggle('toggle-up');
                document.getElementById("save_menu_div").classList.toggle('sidenav_selected');
                document.getElementById("save_menu_button_image").src = "img/005-floppy-disk-1.svg"
            }
            if (file_sidebar_open == true) {
                file_sidebar_open = false
                document.getElementById("file_sidenav").style.width = "0";
                document.getElementById("file_menu_button_image").classList.toggle('toggle-up');
                document.getElementById("file_menu_div").classList.toggle('sidenav_selected');
                document.getElementById("file_menu_button_image").src = "img/003-file.svg"
            }
        }
    }

}

// Clears all fields that have the form class 
var clear_count = 0;
function clear_all() {
    clear_count = clear_count + 1;

    if (clear_count == 2) {
        document.getElementById("version-select").innerHTML = "";
        var vc = document.getElementById("version-select")
        var opt = document.createElement("option");
        opt.text = "0";
        vc.add(opt);

        document.getElementById("file_currently_open").innerHTML = "<i>New</i>";
        document.getElementById("file_currently_open").title = "";
        // Get all form fields, marked with the form class
        form_fields = document.getElementsByClassName("form");

        // Iterate through, handle checkboxes slightly differently
        for (form_field in form_fields) {
            field = form_fields[form_field];

            if (field.type === 'checkbox') {
                field.checked = false;
            } else {
                field.value = "";
            }
        }
        clear_count = 0;
    }

}


// When the daily checklist tasks are completed, clicking the All checked ticks all those boxes
function check_all() {
    all_checker_box = document.getElementById("all_daily_checked")
    check_alls = document.getElementsByClassName("daily_checkall")
    if (all_checker_box.checked) {
        for (el of check_alls) {
            el.checked = true
        }
    } else {
        for (el of check_alls) {
            el.checked = false
        }
    }
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

// Hnadles opening the appdata folder on the users machine
function open_appdata_folder() {
    const appdata_path = app.getPath("appData")
    shell.openItem(appdata_path + "\\run_analysis_proc_sheet\\")
}


function collate_final() {
    var directory_path = document.getElementById("selected_directory").text
    if (directory_path) {

    }
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