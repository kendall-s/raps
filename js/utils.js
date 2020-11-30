const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { shell } = require('electron')


// The function which handles getting all CSV files in a directory. They are ordered by modif time
function get_files_in_dir(directory_path) {
    files = fs.readdirSync(directory_path);
    csv_files_full_path = []
    csv_files_name = []
    csv_files_obj = []
    files.forEach(file => {
        if (path.extname(file).toLowerCase() === '.csv') {
            csv_files_obj.push({ 'name': file, 'path': path.join(directory_path, file) })

            csv_files_obj.sort(compare);

            csv_files_full_path.push(path.join(directory_path, file));
            csv_files_name.push(file);
        }
    })
    context = { "dir_path": directory_path, "csv_files": csv_files_obj };
    return context;
}

// Read file utility that is async 🤪
async function read_csv_file(file_to_open) {
    return new Promise((resolve, reject) => {
        let csv_obj = []

        let read_stream = fs.createReadStream(file_to_open)
        .pipe(csv())
        
        read_stream.on('data', (row) => {
          csv_obj.push(row);
        });

        read_stream.on('error', (err) => {
            console.log(err);
            reject(err);
        });

        return read_stream.on('end', () => {
            resolve(csv_obj);
        });
    });
}

// Util compare function for csv files, could have imported an NPM package but I didn't 🤪
function compare(a, b) {
    if (a.name < b.name) {
        return 1;
    }
    if (a.name > b.name) {
        return -1;
    }
    return 0;
}


// Utility function to get the matching key for values
async function get_key_by_value(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}


/**
 * Small function that creates an appdata file with the same save time as the RAPS file, this is used for backing up data :)
 * @param {} save_time 
 * @return {String}
 */
function create_appdata_path(save_time) {
    file_path = app_data_path + save_time + '.csv';
    console.log(file_path);
    fs.writeFile(file_path, '', (err) => {
        if (err) throw err;
        console.log('The appdata file has been created!');
    });
    return file_path;
}


/**
 * Utility function which returns the call time as a string that can be used in a file path
 * @return {String}
 */
function get_path_formatted_date() {
    let save_time_date = new Date().toLocaleString();
    let save_time_path = save_time_date.split('/').join('-');
    save_time_path = save_time_path.replace(/\s/g, '');
    save_time_path = save_time_path.replace(/,/g, "+");
    save_time_path = save_time_path.replace(/:/g, "-")
    return save_time_path;
}

module.exports = { create_appdata_path, get_files_in_dir, get_key_by_value, read_csv_file, get_path_formatted_date }


