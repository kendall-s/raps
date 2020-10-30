var file_being_edited = false;

var sidebar_open = false;
var save_sidebar_open = false;
var file_sidebar_open = false;
var search_sidebar_open = false;

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
document.getElementById('app-version').textContent = "v"+ app_version;

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
    file_path = document.getElementById("file_currently_open").title;
    // Can't save the file, if a New file is opened and a path isn't specified
    if (file_path == "<i>New</i>") {
        console.log("Not saving file...")
    } else {
        console.log(file_path)
        console.log(new_version);

        var save_time_date = new Date().toLocaleString();
        var save_time_path = save_time_date.split('/').join('-');
        save_time_path = save_time_path.replace(/\s/g, '');
        save_time_path = save_time_path.replace(/,/g, "+");
        save_time_path = save_time_path.replace(/:/g, "-")
        console.log(save_time_date);

        if (appdata_save == true) {
            file_path = app_data_path + save_time_path + '.csv';
            console.log(file_path);

            fs.writeFile(file_path, '', (err) => {
                if (err) throw err;
                console.log('The file has been saved!');
            });
        }

        var form_data = fetch_all_data();

        var csv_header = [
            { id: 'save_time', title: 'Save Time' },
            { id: 'voyage', title: 'Voyage' },
            { id: 'sheet', title: 'Sheet' },
            { id: 'date', title: 'Date' },
            { id: 'analyst', title: 'Analyst' },
            { id: 'file', title: 'File' },

            { id: 'pre_analysis_comments', title: 'Pre-Analysis Comments' },

            { id: 'air_valve', title: 'Air Tubing Moved' },
            { id: 'mq_container', title: 'MQ Container Full' },
            { id: 'reagents_ran', title: 'Reagents Ran For 30 Mins' },
            { id: 'reagents_sufficient', title: 'Sufficient Reagents' },
            { id: 'correct_rack_file', title: 'Correct Rack File' },
            { id: 'daily_check_comment', title: 'Daily Check Comment' },
            { id: 'all_dailies_checked', title: 'All Daily Completed' },

            { id: 'silicate_colour', title: 'Silicate Colour' },
            { id: 'silicate_acid', title: 'Silicate Acid' },
            { id: 'stannous', title: 'Stannous' },
            { id: 'opa', title: 'OPA' },
            { id: 'nox_buffer', title: 'NOx Buffer' },
            { id: 'nox_colour', title: 'NOx Colour' },
            { id: 'phosphate_colour', title: 'Phosphate Colour' },
            { id: 'phosphate_acid', title: 'Phosphate Acid' },
            { id: 'reagent_comment', title: 'New Reagents Comment' },

            { id: 'rmns_1', title: 'RMNS 1 Used' },
            { id: 'rmns_1_used', title: 'RMNS 1 Lot' },
            { id: 'rmns_2', title: 'RMNS 2 Used' },
            { id: 'rmns_2_used', title: 'RMNS 2 Lot' },
            { id: 'rmns_3', title: 'RMNS 3 Used' },
            { id: 'rmns_3_used', title: 'RMNS 3 Lot' },
            { id: 'internal_standard', title: 'Internal Standard' },
            { id: 'lnsw_batch', title: 'LNSW Batch' },
            { id: 'standards_date', title: 'Standards Date' },
            { id: 'standards_numbers', title: 'Standard No.' },

            { id: 'chan_1_nut', title: 'Channel1 Nutrient' },
            { id: 'chan_1_reagent_baseline', title: 'Channel1 Reagent Baseline' },
            { id: 'chan_1_gain', title: 'Channel1 Gain' },
            { id: 'chan_1_base_offset', title: 'Channel1 Base Offset' },
            { id: 'chan_2_nut', title: 'Channel2 Nutrient' },
            { id: 'chan_2_reagent_baseline', title: 'Channel2 Reagent Baseline' },
            { id: 'chan_2_gain', title: 'Channel2 Gain' },
            { id: 'chan_2_base_offset', title: 'Channel2 Base Offset' },
            { id: 'chan_3_nut', title: 'Channel3 Nutrient' },
            { id: 'chan_3_reagent_baseline', title: 'Channel3 Reagent Baseline' },
            { id: 'chan_3_gain', title: 'Channel3 Gain' },
            { id: 'chan_3_base_offset', title: 'Channel3 Base Offset' },
            { id: 'chan_4_nut', title: 'Channel4 Nutrient' },
            { id: 'chan_4_reagent_baseline', title: 'Channel4 Reagent Baseline' },
            { id: 'chan_4_gain', title: 'Channel4 Gain' },
            { id: 'chan_4_base_offset', title: 'Channel4 Base Offset' },
            { id: 'chan_5_nut', title: 'Channel5 Nutrient' },
            { id: 'chan_5_reagent_baseline', title: 'Channel5 Reagent Baseline' },
            { id: 'chan_5_gain', title: 'Channel5 Gain' },
            { id: 'chan_5_base_offset', title: 'Channel5 Base Offset' },

            { id: 'cadmium_col_prep_date', title: 'Cd Col Prep Date' },
            { id: 'cadmium_col_active_date', title: 'Cd Col Active Date' },
            { id: 'cadmium_col_efficiency', title: 'Cd Col Efficiency' },
            { id: 'tray_protocol_checked', title: 'Tray Protocol Checked' },

            { id: 'start_time', title: 'Start Time' },
            { id: 'finish_time', title: 'Finish Time' },
            { id: 'start_pump_tubes', title: 'Time on PTubes Start' },
            { id: 'finish_pump_tubes', title: 'Time on PTubes Finish' },
            { id: 'start_lab_temp', title: 'Start Lab Temp' },
            { id: 'finish_lab_temp', title: 'Finish Lab Temp' },
            { id: 'rack_used', title: 'Rack Used' },

            { id: 'trace_checked', title: 'Trace Checked' },
            { id: 'trace_concerns', title: 'Trace Concerns' },

            { id: 'nox_calibrants', title: 'NOx Calibrants' },
            { id: 'nox_curve', title: 'NOx Curve Type'},
            { id: 'nox_calibrants_comment', title: 'NOx Calibrants Comment' },
            { id: 'nox_r_squared', title: 'NOx R Squared' },
            { id: 'nox_baseline', title: 'NOx Baseline' },
            { id: 'nox_drift', title: 'NOx Drift' },
            { id: 'nox_mdl', title: 'NOx MDLs' },
            { id: 'nox_duplicates', title: 'NOx Duplicates' },
            { id: 'nox_rmns_1', title: 'NOx RMNS 1' },
            { id: 'nox_rmns_2', title: 'NOx RMNS 2' },
            { id: 'nox_rmns_3', title: 'NOx RMNS 3' },
            { id: 'nox_sus_samples', title: 'NOx Suspect Samples' },

            { id: 'phosphate_calibrants', title: 'Phosphate Calibrants' },
            { id: 'phosphate_curve', title: 'Phosphate Curve Type'},
            { id: 'phosphate_calibrants_comment', title: 'Phosphate Calibrants Comment' },
            { id: 'phosphate_r_squared', title: 'Phosphate R Squared' },
            { id: 'phosphate_baseline', title: 'Phosphate Baseline' },
            { id: 'phosphate_drift', title: 'Phosphate Drift' },
            { id: 'phosphate_mdl', title: 'Phosphate MDLs' },
            { id: 'phosphate_duplicates', title: 'Phosphate Duplicates' },
            { id: 'phosphate_rmns_1', title: 'Phosphate RMNS 1' },
            { id: 'phosphate_rmns_2', title: 'Phosphate RMNS 2' },
            { id: 'phosphate_rmns_3', title: 'Phosphate RMNS 3' },
            { id: 'phosphate_sus_samples', title: 'Phosphate Suspect Samples' },

            { id: 'silicate_calibrants', title: 'Silicate Calibrants' },
            { id: 'silicate_curve', title: 'Silicate Curve Type'},
            { id: 'silicate_calibrants_comment', title: 'Silicate Calibrants Comment' },
            { id: 'silicate_r_squared', title: 'Silicate R Squared' },
            { id: 'silicate_baseline', title: 'Silicate Baseline' },
            { id: 'silicate_drift', title: 'Silicate Drift' },
            { id: 'silicate_mdl', title: 'Silicate MDLs' },
            { id: 'silicate_duplicates', title: 'Silicate Duplicates' },
            { id: 'silicate_rmns_1', title: 'Silicate RMNS 1' },
            { id: 'silicate_rmns_2', title: 'Silicate RMNS 2' },
            { id: 'silicate_rmns_3', title: 'Silicate RMNS 3' },
            { id: 'silicate_sus_samples', title: 'Silicate Suspect Samples' },

            { id: 'ammonia_calibrants', title: 'Ammonia Calibrants' },
            { id: 'ammonia_curve', title: 'Ammonia Curve Type'},
            { id: 'ammonia_calibrants_comment', title: 'Ammonia Calibrants Comment' },
            { id: 'ammonia_r_squared', title: 'Ammonia R Squared' },
            { id: 'ammonia_baseline', title: 'Ammonia Baseline' },
            { id: 'ammonia_drift', title: 'Ammonia Drift' },
            { id: 'ammonia_mdl', title: 'Ammonia MDLs' },
            { id: 'ammonia_duplicates', title: 'Ammonia Duplicates' },
            { id: 'ammonia_rmns_1', title: 'Ammonia RMNS 1' },
            { id: 'ammonia_rmns_2', title: 'Ammonia RMNS 2' },
            { id: 'ammonia_rmns_3', title: 'Ammonia RMNS 3' },
            { id: 'ammonia_sus_samples', title: 'Ammonia Suspect Samples' },

            { id: 'nitrite_calibrants', title: 'Nitrite Calibrants' },
            { id: 'nitrite_curve', title: 'Nitrite Curve Type'},
            { id: 'nitrite_calibrants_comment', title: 'Nitrite Calibrants Comment' },
            { id: 'nitrite_r_squared', title: 'Nitrite R Squared' },
            { id: 'nitrite_baseline', title: 'Nitrite Baseline' },
            { id: 'nitrite_drift', title: 'Nitrite Drift' },
            { id: 'nitrite_mdl', title: 'Nitrite MDLs' },
            { id: 'nitrite_duplicates', title: 'Nitrite Duplicates' },
            { id: 'nitrite_rmns_1', title: 'Nitrite RMNS 1' },
            { id: 'nitrite_rmns_2', title: 'Nitrite RMNS 2' },
            { id: 'nitrite_rmns_3', title: 'Nitrite RMNS 3' },
            { id: 'nitrite_sus_samples', title: 'Nitrite Suspect Samples' },

            { id: 'review_person', title: 'Review Person' },
            { id: 'review_date', title: 'Review Date' },
            { id: 'review_outcome', title: 'Review Outcome' },
            { id: 'review_comment', title: 'Review Comment' },

            { id: 'samples_1', title: 'Samples 1' },
            { id: 'samples_cond_1', title: 'Samples 1 Condition' },
            { id: 'samples_comment_1', title: 'Samples 1 Comment' },

            { id: 'samples_2', title: 'Samples 2' },
            { id: 'samples_cond_2', title: 'Samples 2 Condition' },
            { id: 'samples_comment_2', title: 'Samples 2 Comment' },

            { id: 'samples_3', title: 'Samples 3' },
            { id: 'samples_cond_3', title: 'Samples 3 Condition' },
            { id: 'samples_comment_3', title: 'Samples 3 Comment' }
        ]

        // Create a CSV writer object, passing the header object with ID and column Title 
        const csvWriter = createCsvWriter({
            path: file_path,
            header: csv_header,
            append: new_version
        });
        // Assign the data to the correct columns...
        var output = [
            {
                save_time: save_time_date,
                voyage: form_data['voyage_name'],
                sheet: form_data['sheet_number'],
                date: form_data['date'],
                analyst: form_data['analyst'],
                file: form_data['file_name'],

                pre_analysis_comments: form_data['pre_analysis_comments'],

                air_valve: form_data['air_valve'],
                mq_container: form_data['mq_cont'],
                reagents_ran: form_data['reagents_ran'],
                reagents_sufficient: form_data['reagents_sufficient'],
                correct_rack_file: form_data['correct_rack_file'],
                daily_check_comment: form_data['daily_check_comments'],
                all_dailies_checked: form_data['all_daily_checked'],

                silicate_colour: form_data['silicate_colour'],
                silicate_acid: form_data['silicate_acid'],
                stannous: form_data['stannous'],
                opa: form_data['opa'],
                nox_buffer: form_data['nox_buffer'],
                nox_colour: form_data['nox_colour'],
                phosphate_colour: form_data['phosphate_colour'],
                phosphate_acid: form_data['phosphate_acid'],
                reagent_comment: form_data['reagent_comments'],

                rmns_1: form_data['rmns_1'],
                rmns_1_used: form_data['rmns_1_used'],
                rmns_2: form_data['rmns_2'],
                rmns_2_used: form_data['rmns_2_used'],
                rmns_3: form_data['rmns_3'],
                rmns_3_used: form_data['rmns_3_used'],
                internal_standard: form_data['internal_standard'],
                lnsw_batch: form_data['lnsw_batch'],
                standards_date: form_data['standards_date'],
                standards_numbers: form_data['standards_numbers'],

                chan_1_nut: form_data['channel_1_nutrient'],
                chan_1_reagent_baseline: form_data['channel_1_reagent_baseline'],
                chan_1_gain: form_data['channel_1_gain'],
                chan_1_base_offset: form_data['channel_1_base_offset'],
                chan_2_nut: form_data['channel_2_nutrient'],
                chan_2_reagent_baseline: form_data['channel_2_reagent_baseline'],
                chan_2_gain: form_data['channel_2_gain'],
                chan_2_base_offset: form_data['channel_2_base_offset'],
                chan_3_nut: form_data['channel_3_nutrient'],
                chan_3_reagent_baseline: form_data['channel_3_reagent_baseline'],
                chan_3_gain: form_data['channel_3_gain'],
                chan_3_base_offset: form_data['channel_3_base_offset'],
                chan_4_nut: form_data['channel_4_nutrient'],
                chan_4_reagent_baseline: form_data['channel_4_reagent_baseline'],
                chan_4_gain: form_data['channel_4_gain'],
                chan_4_base_offset: form_data['channel_4_base_offset'],
                chan_5_nut: form_data['channel_5_nutrient'],
                chan_5_reagent_baseline: form_data['channel_5_reagent_baseline'],
                chan_5_gain: form_data['channel_5_gain'],
                chan_5_base_offset: form_data['channel_5_base_offset'],

                cadmium_col_prep_date: form_data['cadmium_column_prep_date'],
                cadmium_col_active_date: form_data['cadmium_column_activate_date'],
                cadmium_col_efficiency: form_data['cadmium_column_efficiency'],

                tray_protocol_checked: form_data['tray_protocol_checked'],
                start_time: form_data['start_time'],
                finish_time: form_data['finish_time'],
                start_pump_tubes: form_data['start_pump_tube_hours'],
                finish_pump_tubes: form_data['finish_pump_tube_hours'],
                start_lab_temp: form_data['start_lab_temperature'],
                finish_lab_temp: form_data['finish_lab_temperature'],

                rack_used: form_data['rack_file_used'],
                trace_checked: form_data['trace_checked'],
                track_concerns: form_data['trace_concerns'],

                nox_calibrants: form_data['nox_calibrants'],
                nox_curve: form_data['nox_curve'],
                nox_calibrants_comment: form_data['nox_calibrants_comments'],
                nox_r_squared: form_data['nox_r_squared'],
                nox_baseline: form_data['nox_baseline'],
                nox_drift: form_data['nox_drift'],
                nox_mdl: form_data['nox_mdl'],
                nox_duplicates: form_data['nox_duplicates'],
                nox_rmns_1: form_data['nox_rmns_1'],
                nox_rmns_2: form_data['nox_rmns_2'],
                nox_rmns_3: form_data['nox_rmns_3'],
                nox_sus_samples: form_data['nox_suspect_samples'],

                phosphate_calibrants: form_data['phosphate_calibrants'],
                phosphate_curve: form_data['phosphate_curve'],
                phosphate_calibrants_comment: form_data['phosphate_calibrants_comments'],
                phosphate_r_squared: form_data['phosphate_r_squared'],
                phosphate_baseline: form_data['phosphate_baseline'],
                phosphate_drift: form_data['phosphate_drift'],
                phosphate_mdl: form_data['phosphate_mdl'],
                phosphate_duplicates: form_data['phosphate_duplicates'],
                phosphate_rmns_1: form_data['phosphate_rmns_1'],
                phosphate_rmns_2: form_data['phosphate_rmns_2'],
                phosphate_rmns_3: form_data['phosphate_rmns_3'],
                phosphate_sus_samples: form_data['phosphate_suspect_samples'],

                silicate_calibrants: form_data['silicate_calibrants'],
                silicate_curve: form_data['silicate_curve'],
                silicate_calibrants_comment: form_data['silicate_calibrants_comments'],
                silicate_r_squared: form_data['silicate_r_squared'],
                silicate_baseline: form_data['silicate_baseline'],
                silicate_drift: form_data['silicate_drift'],
                silicate_mdl: form_data['silicate_mdl'],
                silicate_duplicates: form_data['silicate_duplicates'],
                silicate_rmns_1: form_data['silicate_rmns_1'],
                silicate_rmns_2: form_data['silicate_rmns_2'],
                silicate_rmns_3: form_data['silicate_rmns_3'],
                silicate_sus_samples: form_data['silicate_suspect_samples'],

                ammonia_calibrants: form_data['ammonia_calibrants'],
                ammonia_curve: form_data['ammonia_curve'],
                ammonia_calibrants_comment: form_data['ammonia_calibrants_comments'],
                ammonia_r_squared: form_data['ammonia_r_squared'],
                ammonia_baseline: form_data['ammonia_baseline'],
                ammonia_drift: form_data['ammonia_drift'],
                ammonia_mdl: form_data['ammonia_mdl'],
                ammonia_duplicates: form_data['ammonia_duplicates'],
                ammonia_rmns_1: form_data['ammonia_rmns_1'],
                ammonia_rmns_2: form_data['ammonia_rmns_2'],
                ammonia_rmns_3: form_data['ammonia_rmns_3'],
                ammonia_sus_samples: form_data['ammonia_suspect_samples'],

                nitrite_calibrants: form_data['nitrite_calibrants'],
                nitrite_curve: form_data['nitrite_curve'],
                nitrite_calibrants_comment: form_data['nitrite_calibrants_comments'],
                nitrite_r_squared: form_data['nitrite_r_squared'],
                nitrite_baseline: form_data['nitrite_baseline'],
                nitrite_drift: form_data['nitrite_drift'],
                nitrite_mdl: form_data['nitrite_mdl'],
                nitrite_duplicates: form_data['nitrite_duplicates'],
                nitrite_rmns_1: form_data['nitrite_rmns_1'],
                nitrite_rmns_2: form_data['nitrite_rmns_2'],
                nitrite_rmns_3: form_data['nitrite_rmns_3'],
                nitrite_sus_samples: form_data['nitrite_suspect_samples'],

                review_person: form_data['review_person'],
                review_date: form_data['review_date'],
                review_outcome: form_data['review_outcome'],
                review_comment: form_data['review_comments'],

                samples_1: form_data['samples_1'],
                samples_condition_1: form_data['samples_condition_1'],
                samples_comment_1: form_data['samples_comment_1'],

                samples_2: form_data['samples_2'],
                samples_condition_2: form_data['samples_condition_2'],
                samples_comment_2: form_data['samples_comment_2'],

                samples_3: form_data['samples_3'],
                samples_condition_3: form_data['samples_condition_3'],
                samples_comment_3: form_data['samples_comment_3'],

            }];

        // Write data to csv file, updating the version number to match the now newest version
        csvWriter.writeRecords(output)
            .then(() => {

                if (appdata_save == false) {
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

    header_converter = {
        save_time: 'Save Time',
        voyage_name: 'Voyage',
        sheet_number: 'Sheet',
        date: 'Date',
        analyst: 'Analyst',
        file_name: 'File',

        pre_analysis_comments: 'Pre-Analysis Comments',

        air_valve: 'Air Tubing Moved',
        mq_cont: 'MQ Container Full',
        reagents_ran: 'Reagents Ran For 30 Mins',
        reagents_sufficient: 'Sufficient Reagents',
        correct_rack_file: 'Correct Rack File',
        daily_check_comments: 'Daily Check Comment',
        all_daily_checked: 'All Daily Completed',

        silicate_colour: 'Silicate Colour',
        silicate_acid: 'Silicate Acid',
        stannous: 'Stannous',
        opa: 'OPA',
        nox_buffer: 'NOx Buffer',
        nox_colour: 'NOx Colour',
        phosphate_colour: 'Phosphate Colour',
        phosphate_acid: 'Phosphate Acid',
        reagent_comments: 'New Reagents Comment',

        rmns_1: 'RMNS 1 Used',
        rmns_1_used: 'RMNS 1 Lot',
        rmns_2: 'RMNS 2 Used',
        rmns_2_used: 'RMNS 2 Lot',
        rmns_3: 'RMNS 3 Used',
        rmns_3_used: 'RMNS 3 Lot',
        internal_standard: 'Internal Standard',
        lnsw_batch: 'LNSW Batch',
        standards_date: 'Standards Date',
        standards_numbers: 'Standard No.',

        channel_1_nutrient: 'Channel1 Nutrient',
        channel_1_reagent_baseline: 'Channel1 Reagent Baseline',
        channel_1_gain: 'Channel1 Gain',
        channel_1_base_offset: 'Channel1 Base Offset',
        channel_2_nutrient: 'Channel2 Nutrient',
        channel_2_reagent_baseline: 'Channel2 Reagent Baseline',
        channel_2_gain: 'Channel2 Gain',
        channel_2_base_offset: 'Channel2 Base Offset',
        channel_3_nutrient: 'Channel3 Nutrient',
        channel_3_reagent_baseline: 'Channel3 Reagent Baseline',
        channel_3_gain: 'Channel3 Gain',
        channel_3_base_offset: 'Channel3 Base Offset',
        channel_4_nutrient: 'Channel4 Nutrient',
        channel_4_reagent_baseline: 'Channel4 Reagent Baseline',
        channel_4_gain: 'Channel4 Gain',
        channel_4_base_offset: 'Channel4 Base Offset',
        channel_5_nutrient: 'Channel5 Nutrient',
        channel_5_reagent_baseline: 'Channel5 Reagent Baseline',
        channel_5_gain: 'Channel5 Gain',
        channel_5_base_offset: 'Channel5 Base Offset',

        cadmium_column_prep_date: 'Cd Col Prep Date',
        cadmium_column_activate_date: 'Cd Col Active Date',
        cadmium_column_efficiency: 'Cd Col Efficiency',
        tray_protocol_checked: 'Tray Protocol Checked',

        start_time: 'Start Time',
        finish_time: 'Finish Time',
        start_pump_tube_hours: 'Time on PTubes Start',
        finish_pump_tube_hours: 'Time on PTubes Finish',
        start_lab_temperature: 'Start Lab Temp',
        finish_lab_temperature: 'Finish Lab Temp',

        rack_file_used: 'Rack Used',
        trace_checked: 'Trace Checked',
        trace_concerns: 'Trace Concerns',

        nox_calibrants: 'NOx Calibrants',
        nox_curve: 'NOx Curve Type',
        nox_calibrants_comments: 'NOx Calibrants Comment',
        nox_r_squared: 'NOx R Squared',
        nox_baseline: 'NOx Baseline',
        nox_drift: 'NOx Drift',
        nox_mdl: 'NOx MDLs',
        nox_duplicates: 'NOx Duplicates',
        nox_rmns_1: 'NOx RMNS 1',
        nox_rmns_2: 'NOx RMNS 2',
        nox_rmns_3: 'NOx RMNS 3',
        nox_suspect_samples: 'NOx Suspect Samples',

        phosphate_calibrants: 'Phosphate Calibrants',
        phosphate_curve: 'Phosphate Curve Type',
        phosphate_calibrants_comments: 'Phosphate Calibrants Comment',
        phosphate_r_squared: 'Phosphate R Squared',
        phosphate_baseline: 'Phosphate Baseline',
        phosphate_drift: 'Phosphate Drift',
        phosphate_mdl: 'Phosphate MDLs',
        phosphate_duplicates: 'Phosphate Duplicates',
        phosphate_rmns_1: 'Phosphate RMNS 1',
        phosphate_rmns_2: 'Phosphate RMNS 2',
        phosphate_rmns_3: 'Phosphate RMNS 3',
        phosphate_suspect_samples: 'Phosphate Suspect Samples',

        silicate_calibrants: 'Silicate Calibrants',
        silicate_curve: 'Silicate Curve Type',
        silicate_calibrants_comments: 'Silicate Calibrants Comment',
        silicate_r_squared: 'Silicate R Squared',
        silicate_baseline: 'Silicate Baseline',
        silicate_drift: 'Silicate Drift',
        silicate_mdl: 'Silicate MDLs',
        silicate_duplicates: 'Silicate Duplicates',
        silicate_rmns_1: 'Silicate RMNS 1',
        silicate_rmns_2: 'Silicate RMNS 2',
        silicate_rmns_3: 'Silicate RMNS 3',
        silicate_suspect_samples: 'Silicate Suspect Samples',

        ammonia_calibrants: 'Ammonia Calibrants',
        ammonia_curve: 'Ammonia Curve Type',
        ammonia_calibrants_comments: 'Ammonia Calibrants Comment',
        ammonia_r_squared: 'Ammonia R Squared',
        ammonia_baseline: 'Ammonia Baseline',
        ammonia_drift: 'Ammonia Drift',
        ammonia_mdl: 'Ammonia MDLs',
        ammonia_duplicates: 'Ammonia Duplicates',
        ammonia_rmns_1: 'Ammonia RMNS 1',
        ammonia_rmns_2: 'Ammonia RMNS 2',
        ammonia_rmns_3: 'Ammonia RMNS 3',
        ammonia_suspect_samples: 'Ammonia Suspect Samples',

        nitrite_calibrants: 'Nitrite Calibrants',
        nitrite_curve: 'Nitrite Curve Type',
        nitrite_calibrants_comments: 'Nitrite Calibrants Comment',
        nitrite_r_squared: 'Nitrite R Squared',
        nitrite_baseline: 'Nitrite Baseline',
        nitrite_drift: 'Nitrite Drift',
        nitrite_mdl: 'Nitrite MDLs',
        nitrite_duplicates: 'Nitrite Duplicates',
        nitrite_rmns_1: 'Nitrite RMNS 1',
        nitrite_rmns_2: 'Nitrite RMNS 2',
        nitrite_rmns_3: 'Nitrite RMNS 3',
        nitrite_suspect_samples: 'Nitrite Suspect Samples',

        review_person: 'Review Person',
        review_date: 'Review Date',
        review_outcome: 'Review Outcome',
        review_comments: 'Review Comment',

        samples_1: 'Samples 1',
        samples_condition_1: 'Samples 1 Condition',
        samples_comment_1: 'Samples 1 Comment',

        samples_2: 'Samples 2',
        samples_condition_2: 'Samples 2 Condition',
        samples_comment_2: 'Samples 2 Comment',

        samples_3: 'Samples 3',
        samples_condition_3: 'Samples 3 Condition',
        samples_comment_3: 'Samples 3 Comment',

    }
    // Iterate through the form fields on the RAPS sheet and pull the corresponding data from the object
    for (form_field in form_fields) {

        field = form_fields[form_field];
        console.log(field.id);
        console.log(header_converter[field.id]);

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