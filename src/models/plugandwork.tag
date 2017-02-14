<plugandwork>
  <plugandwork-login-form query="{query}" show={ state == 'unset' }/>

  <plugandwork-main hide={ state == 'unset' } />
  <script>
    this.state = "idle"
    var self = this
    ipcRenderer.on('refresh_login', function (event, state) {
      self.state = state
      self.update()
    })
    
  </script>
</plugandwork>