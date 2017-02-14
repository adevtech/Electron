<plugandwork-login-form>
  <div class="uk-width-2-3 uk-container-center uk-margin-top">
    <div class="uk-grid">
      <div class="uk-width-1-1 uk-panel-box ">
        <form class="uk-form uk-form-stacked" onsubmit="{onLogin}">
          <fieldset class="">
              <div class="uk-form-row">
                  <label for="name">Identifiant</label><br>
                  <input id="username" type="text" placeholder="Identifiant" class="uk-width-1-1">
              </div>

              <div class="uk-form-row">
                  <label for="password">Mot de passe</label><br>
                  <input id="password" type="password" placeholder="Mot de passe" class="uk-width-1-1">
              </div>

              <div class="uk-form-row">
                  <label for="server">Serveur plugandwork</label><br>
                  <input id="server" type="text" placeholder="Serveur plugandwork" class="uk-width-1-1">
              </div>

              <div class="uk-form-row">
                  <label for="cb" class="pure-checkbox">
                    <input id="cb" type="checkbox"> J'accepte les conditions générales d'utilisation
                  </label>
              </div>
              <div class="uk-form-row">
              
                  <button type="submit" class="uk-button uk-button-primary">Connexion</button>
              </div>
          </fieldset>
        </form>
      </div>
    </div>
  </div>
  <script>
    var _this = this
    onLogin(e) {
      ipcRenderer.send('pw-login', { username: _this.username.value, password: _this.password.value, server: _this.server.value })
    } 
  </script>
</plugandwork-login-form>