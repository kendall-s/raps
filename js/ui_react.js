

/** */
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