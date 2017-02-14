<plugandwork-user class="fw">
  <div class="uk-width-1-2 uk-container-center uk-margin-top">
    <div class="uk-panel uk-panel-box uk-panel-box-primary">
      <div class="uk-text-large uk-text-center"><i class="uk-icon-user"></i>{user.first_name} {user.last_name}</div>
      <p class="uk-text-center">
        {user.email}
        <br/><br/>
        <a href="#" class="uk-text-center" title="Déconnecter" data-action="logout" onclick={ user_action }>
          <i class="uk-icon-sign-out"></i> Déconnexion
        </a>
      </p>
    </div>
  </div>
  <script>
    this.user = {}
    this.user.first_name = 'Prénom'
    this.user.last_name = 'Nom'
    this.user.email = 'email'
    var self = this
    ipcRenderer.on('user_infos', function(e, user) {
      self.user = user
      self.update()
    })
    user_action(e) {
      ipcRenderer.send("user_action", e.currentTarget.dataset.action)
    }
  </script>
</plugandwork-user>