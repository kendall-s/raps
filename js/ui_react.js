/*
This file contains the functionality for providing reactivity to the user interface,
typically provided by a JS framework 🤡 

Included in here is also functions that will return values from the UI, but doesn't include the
form data which is handled in the csv_actions file.

____________________________________________________________________________________

                                Table of Contents:

- refresh_file_list(): sends a IPC to update the file list

- populate_file_list(): formats file names and fills the file list

- populate_all_data(): upon loading of a csv file, this function puts all the data into the fields

- clear_all(): empties and clears all the fields

- check_all(): checks all the daily check boxes, if the check all is ticked

- increment_version_box(): on creation of a new version, the version dropdown box is incremented

- get_current_file_path(): parses the currently kept file path

- update_rmns(): fills in the RMNS fields that are read only on the page

*/


// Function that handles the version selection feature, if the dropdown is changed, 
// this triggers the file open to be reloaded to the selected version
var version_selector = document.getElementById('version-select');
version_selector.onchange = (event) => {
    var version_selected = event.target.value;
    console.log(version_selected);
    load_file(version = version_selected);

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
            if (check_state == "false") {
                field.checked = false;
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
    // Hi this is just a little sneaky, so that the RMNS fields are updated to match the data
    document.getElementById('rmns_1_used').onchange();
    document.getElementById('rmns_2_used').onchange();
    document.getElementById('rmns_3_used').onchange();
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

function increment_version_box() {
    // Got to update the file version number if we have just saved over the existing file
    // This is a little bit verbose when using just vanilla JS
    const vc = document.getElementById("version-select")
    let options_len = vc.options.length
    var opt = document.createElement("option");
    opt.text = options_len;
    vc.add(opt);
    vc.selectedIndex = vc.options.length - 1;
}

// Gets the current file path, which is actually held within the title of the file path element 🤡
function get_current_file_path() {
    // Pull the file path from the currently open 
    file_path = document.getElementById("file_currently_open").title;
    return file_path;
}

// Updates the additional RMNS fields to match the user editable ones
function update_rmns(rmns_input) {
    let rmns_num = rmns_input.getAttribute("num");
    let rmns_text = rmns_input.value;
    rmns_fields = document.getElementsByClassName(`rmns_${rmns_num}`);

    for (const el of rmns_fields) {
        el.value = rmns_text;
    }
}

module.exports = { get_current_file_path, increment_version_box, refresh_file_list }