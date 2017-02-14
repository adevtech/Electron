<plugandwork-changed-list>
  <h4 class="uk-margin-bottom-remove ac" show={docs.length==0}>Aucune modification detectée</h4>
  <div class="uk-panel-box uk-margin-top" show={docs.length!=0}>
    <table class="uk-table uk-table-striped">
      <thead>
        <tr>
          <th>&nbsp;</th>
          <th>Fichiers modifiés ({docs.length})</th>
          <th width="130px" class="uk-text-center">Action</th>
        </tr>
      </thead>
      <tbody id="changed_files">
        <tr each={doc, index in docs} data-id="{doc.id}">
          <td width="36px">
            <img class="uk-thumbnail" src="{baseurl}{doc.thumb_url}" alt="{doc.title}" width="32px" height="32px">
          </td>
          <td>{doc.title}
          </td>
          <td class="uk-text-right">
            <a href="#" class="uk-button uk-button-success" title="Téléverser" data-action="upload" data-did="{doc.id}" onclick={ doc_action }>
              <i class="uk-icon-cloud"></i>
            </a>
            <a href="#" class="uk-button uk-button-success" title="Téléverser et libérer" data-action="upload_unlock" data-did="{doc.id}" onclick={ doc_action }>
              <i class="uk-icon-cloud-upload"></i>
            </a>
            <a href="#" class="uk-button uk-button-danger" title="Supprimer sur le poste et libérer" data-action="remove_unlock" data-did="{doc.id}" onclick={ doc_action }>
              <i class="uk-icon-remove"></i>
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <script>
    var self = this
    this.docs = []
    this.baseurl = ""
    
    doc_action(e) {
      ipcRenderer.send("doc_action", e.currentTarget.dataset.did, e.currentTarget.dataset.action)
    }
    
    ipcRenderer.on('updateChangedList', function (event, docs, baseurl) {
      self.parent.nb_changed = docs.length
      self.parent.update()
      self.docs = docs
      self.baseurl = baseurl
      self.update()
    })
  </script>
</plugandwork-changed-list>