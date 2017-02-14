<plugandwork-logs-list>
  <div class="uk-margin-top" hide={logs.length==0}>
    <h4 class="uk-margin-bottom-remove ac" hide={logs.length!=0}>Aucune activité pour le moment</h4>
    <article class="uk-comment" each={log, index in logs} data-id="{log.id}">
      <header class="uk-comment-header">
          <img class="uk-comment-avatar" src="{log.thumb_url || 'img/logo_square.png' }" alt="{log.doc_title}" onerror="this.onerror=null;this.src='img/logo_square.png';" width="50px" height="50px">
          <div class="uk-text-small">{log.message}</div>
          <div class="uk-comment-meta">{getDateFromNow(log.createdAt)}</div>
      </header>
      
   </article>
  </div>
  <script>
    var self = this
    
    getDateFromNow(date){
      return moment(date).fromNow()
    }
    ipcRenderer.on('updateLogsList', function (event, logs) {
      self.parent.nb_logs = logs.length
      self.parent.update()
      self.logs = logs
      self.update()
    })
  </script>
</plugandwork-logs-list>