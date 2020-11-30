const { csv_header, output_name_object, header_converter } = require(path.join(__dirname, 'csv_header.js'));
const { get_path_formatted_date, get_files_in_dir, get_key_by_value } = require(path.join(__dirname, 'utils.js'));
const { get_current_file_path, increment_version_box } = require(path.join(__dirname, 'ui_react.js'));

const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

/*
This file contains the functionality for dealing with the CSV files
Including the reading, writing and formatting of the data in prep for the CSV files
____________________________________________________________________________________

Table of Contents:

- process csv(filename, path): csv processer for creating collated file

- save_to_both_paths() : void function to initiate saving to both paths (user desired and appdata)

- save_all_data(appdata_save, new_version): saves 

- fetch_all_data(): returns the form data from the HTML page

- collate_final(): routine for creating the collated CSV file
*/

async function process_csv(file_name, path) {
    let csv_data = [];
    try {
        csv_data = await read_csv_file(path); // Await the reading of the file data
    } catch(err) {
        console.log(err)
        alert(`I have encountered an error 😅: \n${err}`)
    }

    let latest_data = csv_data[csv_data.length - 1]; // Get the 'latest' data, which is just the last row
    let converted_latest_data = {}

    // Small check to ensure the data type matches what we are expecting. Also will ignore the collated file.
    if(!('Save Time' in latest_data) || ('RAPS File Name' in latest_data)) {
        return false;
    }

    // We need to change the keys to match the CSV output header
    // Can do a value search on the Object to get the correct key
    for (const key in latest_data) {
        if (latest_data.hasOwnProperty(key)) {
            const element = latest_data[key];
            console.log(key)
            let find_key = await get_key_by_value(header_converter, key);
            console.log(header_converter[find_key]);

            Object.assign(converted_latest_data, {[find_key]: element});
        }
    }
    converted_latest_data['raps_name'] = file_name;
    if ('save_time' in converted_latest_data) { // This is a simplistic/not fool proof check on the file structure
        return converted_latest_data; // Add the file data to the data array
    } else {
        return false;
    }
};

// Creates the appdata folder file
function create_appdata_path(save_time) {
    file_path = app_data_path + save_time + '.csv';
    console.log(file_path);
    fs.writeFile(file_path, '', (err) => {
        if (err) throw err;
        console.log('The appdata file has been created!');
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
    
    let file_path = get_current_file_path();

    // Can't save the file, if a New file is opened and a path isn't specified
    if (file_path == "<i>New</i>") {
        console.log("Not saving file...")
    } else {
        console.log(file_path)
        console.log(new_version);

        // Calculate the time which we are saving the file so it can be added
        // This is used below and is saved directly into the .CSV
        let save_time_path = get_path_formatted_date();
        let save_time_date = new Date().toLocaleString();
        
        // If this is the pass to save data in Appdata then create the file path
        if (appdata_save == true) {
            create_appdata_path(save_time_path);
        }

        // Fetch all the data from the HTML page
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
        for (const key in output_name_object) { // The key/value pairs match the csv header row
            if (output_name_object.hasOwnProperty(key)) {
                const element = output_name_object[key];
                if (element === 0) {
                    output[0][key] = save_time_date;
                } else {
                    output[0][key] = form_data[element];
                    //console.log(form_data[element])
                }
            }
        }
        // Write data to csv file, updating the version number to match the now newest version
        csvWriter.writeRecords(output)
        .then(() => {
            if (appdata_save == false) { // If this isn't the save loop for the appdata folder, we will increment the version
                increment_version_box();
                window.postMessage({
                    type: 'new_version_saved'
                })
            }
        })
        .catch((err) => {
            alert(`I've encountered an error 😅. The error is: \n ${err}. \n \n`);
        })
    }
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

async function collate_final() {
    var directory_path = document.getElementById("selected_directory").text
    if (directory_path) {

        // Get sorted arr of CSV files in directory
        let csv_files = get_files_in_dir(directory_path);
        
        var latest_file_data = [];
        
        // Loop through all the CSV files in the directory. 
        for (let index = 0; index < csv_files['csv_files'].length; index++) {
            const element = csv_files['csv_files'][index]; // Get the element in the arr
            const file_name = element['name']; // Get the file name from the obj
            const path = element['path']; // Get the full path to the file
        
            csv_data = await process_csv(file_name, path)
            if (csv_data) {
                latest_file_data.push(csv_data);
                console.log(latest_file_data);
            }
        }

        // Get the CSV column header object, add the file name column needed for the collated version
        let csv_header_modif = csv_header
        csv_header_modif.push({id: 'raps_name', title: 'RAPS File Name'})

        // Make the collated file path

        let save_time_path = get_path_formatted_date();
        const collated_file_path = directory_path + '/' + 'zRAPS_Collated_'+ save_time_path +'.csv'

        // Create a CSV writer object, passing the header object with ID and column Title 
        const csvWriter = createCsvWriter({
            path: collated_file_path,
            header: csv_header_modif,
        });

        // Write data to the CSV file. 
        csvWriter.writeRecords(latest_file_data)
        .then(() => {
            window.postMessage({
                type: 'new_collated_saved'
            })
        })
        .catch((err) => {
            alert(`I've encountered an error 😅. The error is: \n${err}. \n\n`);
        });
    }
}

module.exports = { save_to_both_paths, save_all_data }
