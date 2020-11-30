/*
This file contains the functionality for dealing with the CSV files
Including the reading, writing and formatting of the data in prep for the CSV files
____________________________________________________________________________________

Table of Contents:

- save_to_both_paths() : void function to initiate saving to both paths (user desired and appdata)

- save_all_data(appdata_save, new_version): saves 

- fetch_all_data(): returns the form data from the HTML page

- 


*/

// Function called by new version button 
function save_to_both_paths() {
    // Save as new version
    save_all_data(appdata_save = false, new_version = true);
    // Save new file to the appdata location
    save_all_data(appdata_save = true, new_version = false);
}





function create_appdata_path(save_time) {
    file_path = app_data_path + save_time + '.csv';
    console.log(file_path);
    fs.writeFile(file_path, '', (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
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
                    console.log(form_data[element])
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
