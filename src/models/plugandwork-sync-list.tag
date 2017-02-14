<plugandwork-sync-list>
  <div class="uk-panel-box uk-margin-top" hide={docs.length==0}>
    <h4 class="uk-margin-bottom-remove">Rapatriement en cours ... {docs.length}</h4>
    <table class="uk-table uk-table-striped">
      
      <thead>
        <tr>
          <th>Fichier</th>
          <th class="uk-text-right">Type</th>
        </tr>
      </thead>
      <tbody>
        <tr each={doc, index in docs} data-id="{doc.id}">
          <td>{doc.title}
            <div class="uk-progress uk-progress-mini">
              <div class="uk-progress-bar" style="width: 0%;"></div>
            </div>
          </td>
          <td class="uk-text-right">{doc.type}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <script>
    var self = this

    /*
    setInterval(function() {
      ipcRenderer.send("refresh_list")
      console.log("refreshing...")
    }, 10000)
    */
    //ipcRenderer.send("refresh_list")
    //console.log("refreshing...")

    ipcRenderer.on('updateSyncList', function (event, docs) {
      //self.parent.nb_logs = docs.length
      self.docs = docs
      
      self.update()
    })
  </script>
</plugandwork-sync-list>