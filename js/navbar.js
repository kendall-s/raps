// Used to control the side nav bars opening and closing, need to clean up - code is extrememly bad 
// and simplistic in acheiving the effect of only one side nav open at a time

var sidebar_open = false;
var save_sidebar_open = false;
var file_sidebar_open = false;
var search_sidebar_open = false;

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