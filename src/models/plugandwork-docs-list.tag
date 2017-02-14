<plugandwork-docs-list class="fw">
  <div class="uk-grid" show={docs.length==0}>
    <div class="uk-width-1-1 uk-text-center uk-text-large" >Aucun fichier</div>
  </div>
  <div class="doclist" show={docs.length!=0}>
    <div class="panel-doc" each={doc, index in docs} data-id="{doc.id}" data-title="{doc.title}">
      <div class="uk-clearfix">
        <div class="uk-float-left divt">
          <img class="uk-border-rounded dt" src="{doc.thumb_url ? baseurl + doc.thumb_url : './img/logo_square_32x32.png' }" alt="{doc.title}" width="32px" height="32px" onError="this.onerror=null;this.src='./img/logo_square_32x32.png';">
        </div>

        <div class="uk-float-left docright">
          <div class="uk-clearfix">
            <div class="buttons">
              <button disabled={doc.status != "changed"} class="uk-button uk-button-mini uk-button-success" title="Téléverser" data-action="upload"     data-did="{doc.id}" onclick={ doc_action }>
                <i class="uk-icon-cloud"></i>
              </button>
              <button disabled={doc.status != "changed"} class="uk-button uk-button-mini uk-button-success" title="Téléverser et libérer" data-action="upload_unlock" data-did="{doc.id}" onclick={ doc_action }>
                <i class="uk-icon-cloud-upload"></i>
              </button>
              <a href="#" class="uk-button uk-button-mini uk-button-close" title="Supprimer sur le poste et libérer" data-action="remove_unlock" data-did="{doc.id}" onclick={ doc_action }>
                <i class="uk-icon-remove"></i>
              </a>
              <a href="#" class="uk-button uk-button-mini uk-button-primary" title="Ouvrir le document" data-action="open_file" data-did="{doc.id}" onclick={ doc_action }>
                <i class="uk-icon-file"></i>
              </a>
              <a href="#" class="uk-button uk-button-mini uk-button-primary" title="Voir document dans son dossier" data-action="open_folder" data-did="{doc.id}" onclick={ doc_action }>
                <i class="uk-icon-folder"></i>
              </a>
              <a href="#" class="uk-button uk-button-mini uk-button-primary" title="Voir le document en ligne" data-action="open_link" data-did="{doc.id}" onclick={ doc_action }>
                <i class="uk-icon-globe"></i>
              </a>
            </div>
            <div class="doc-title">{doc.title}</div>
          </div>
          
        </div>
      </div>

        
    </div>
  </div>
  
  <script>
    var self = this
    this.docs = []
    this.baseurl = ""
    
    doc_action(e) {
      ipcRenderer.send("doc_action", e.currentTarget.dataset.did, e.currentTarget.dataset.action)
    }
    
    ipcRenderer.on('updateDocsList', function (event, docs, baseurl) {
      self.parent.nb_changed = docs.length
      self.parent.update()
      self.docs = docs
      self.baseurl = baseurl
      self.update()
    })
  </script>
</plugandwork-docs-list>