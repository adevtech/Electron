<plugandwork-main class="fw">
  <nav class="uk-navbar bar uk-navbar-attached">
    <ul class="uk-navbar-nav">
      <li class="uk-navbar-brand"><img class="logo" src="./img/logo_square_32x32.png" alt="plugandwork" width="24px" height="24px"></li>
      <li class="{ uk-active: this.show_user }"><a href="#" onclick={ toggle_user_panel }><i class="uk-icon-user"></i></a></li>
    </ul>
    <div class="uk-navbar-content uk-navbar-flip" onclick={ quit }>
      <i class="uk-icon-times"></i>
    </div>
    <div class="uk-navbar-content uk-navbar-flip" onclick={ refresh }>
      <i class="uk-icon-refresh"></i>
    </div>
    <div class="uk-navbar-content uk-navbar-flip">
      <form class="uk-form uk-margin-remove uk-display-inline-block" onsubmit={ doSearch }>
        <input type="text" name="search" placeholder="Rechercher">
        
      </form>
    </div>
  </nav>
  
  <div class="uk-grid main">
    <plugandwork-docs-list hide={ show_user } />
    <plugandwork-user show={ show_user }/>
  </div>


  <script>
    this.nb_changed = 1
    this.nb_logs = 0
    this.show_user_panel = false
    this.show_search = false
    
    toggle_user_panel(e){
      this.show_user = !this.show_user
    }
    
    toggle_search(e){
      this.show_search = !this.show_search
    }
    
    doSearch(e) {
      e.preventDefault()
      var filter = this.search.value
      console.log(filter)
      $(".search_msg").remove()
      if(filter) {
        $(".doclist .panel-doc").hide()
        var docs = $(".doclist .panel-doc[data-title*='"+filter+"']")
        if(docs.length > 0){
          docs.show()
        } else {
          $(".doclist").prepend('<div class="uk-width-1-1 uk-text-center uk-text-large search_msg" >Pas de resultat</div>')
        }
        
      } else {
        $(".doclist .panel-doc").show()
      }
    } 
    
    quit() {
      ipcRenderer.send("app-quit")
    }
    refresh() {
      ipcRenderer.send("refresh_docs")
    }
  </script>
</plugandwork-main>
