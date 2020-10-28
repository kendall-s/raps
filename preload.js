const { ipcRenderer } = require('electron')

process.once('loaded', () => {
    window.addEventListener('message', event => {
      if (event.data.type === 'select_dir') {
        ipcRenderer.send('select_dir')
      }

      else if (event.data.type === 'new_version_saved') {
        ipcRenderer.send('new_version_saved')
      }

      else if (event.data.type === 'save_dialog') {
        ipcRenderer.send('save_dialog')
        }

      else if (event.data.type === 'select_file') {
          ipcRenderer.send('select_file', event.data)
      }

      else if (event.data.type === 'file_loaded_successfully') {
          ipcRenderer.send('file_loaded_success')

      }
      else if (event.data.type === 'refresh_list') {
        ipcRenderer.send('refresh_list', event.data)
      }
    })
  })
