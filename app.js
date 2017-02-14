const { app, shell, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron')
const electron = require('electron')
const path = require('path')
var Positioner = require('electron-positioner')
const Store = require('./store.js')
const axios = require('axios')
const mkdirp = require('mkdirp')
const chokidar = require('chokidar')
const http = require('http')
const request = require('request')
const fs = require('fs')
var crypto = require('crypto')
const notifier = require('node-notifier');
const faye = require('faye')
var Extensions = require('websocket-extensions'),
    deflate    = require('permessage-deflate')
var AutoLaunch = require('auto-launch')

let mainWindow; //do this so that the window object doesn't get GC'd

let hash
let state = "active"
let syncFiles = {}
let syncInProgress = false
let ws
let wsOnline = false

const userDataPath = app.getPath('userData');

var pwAutoLauncher = new AutoLaunch({name: "plugandwork"})
pwAutoLauncher.isEnabled()
.then(function(isEnabled){
    if(isEnabled){
        return;
    }
    pwAutoLauncher.enable();
})
var Datastore = require('nedb')
var db = new Datastore({ filename: userDataPath + '/.pwdb_docs', autoload: true, timestampData: true })
var dblogs = new Datastore({ filename: userDataPath + '/.pwdb_logs', autoload: true, timestampData: true });

db.persistence.setAutocompactionInterval(10000)
dblogs.persistence.setAutocompactionInterval(10000)

var iconActive = path.join(__dirname, 'images', 'tray-active.png');
var iconSync = path.join(__dirname, 'images', 'tray-sync.png');
var iconIdle = path.join(__dirname, 'images', 'tray-idle.png');
var iconError = path.join(__dirname, 'images', 'tray-error.png');
var iconUnset = path.join(__dirname, 'images', 'tray-error.png');

// Utilities
var isDarwin = (process.platform === 'darwin');
var isLinux = (process.platform === 'linux');
var isWindows = (process.platform === 'win32');

// First instantiate the class
const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    files_dir: app.getPath('documents')+'/plugandwork',
    state: 'unset'
  }
});

function checksum(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex')
}

// When our app is ready, we'll create our BrowserWindow
app.on('ready', function() {
  var cachedBounds;
  var appIcon = new Tray(iconIdle);
  var windowPosition = (isWindows) ? 'trayBottomCenter' : 'trayCenter';
  var baseurl = store.get('baseurl')
  var wsurl = store.get('wsurl')
  var state = store.get('state')
  var uuid = store.get('uuid')
  var counter = 0
  
  let files_dir = store.get("files_dir")
  let base_files_dir = userDataPath + '/data'
  let dir_name_dashboard = "Tableau de Bord"
  let dir_name_spaces = "Espaces de Travail"
  
  mkdirp(files_dir, function(err) { 
    var watch_rce = chokidar.watch(files_dir, {
      ignored: /[\/\\]\./,
      persistent: true,
      followSymlinks: false,
      awaitWriteFinish: true,
      ignoreInitial: true,
      depth: 0
    });
  
    var log = console.log.bind(console);

    watch_rce
    .on('add', function(fpath){
      //console.log("Path added " + fpath)
      // if file in db nothing else add it
      var data = fs.readFileSync(fpath)
      if(data.length > 0){
        let md5 = checksum(data)
        db.find({ file_md5: md5 }, function (err, docs) {
          var count = docs.length
          console.log("MD5 "+md5+" path " + fpath + " COUNT "+ count)
          if(err) throw console.log(err)
          if(count == 0){
            console.log("New file "+fpath+"add it to the API and record it")
            addPwFile(fpath)
          } else {
            var sd = docs[0]
            if(sd && (sd.status == "changed")){
              db.update({ _id: sd.id}, { $set: { status: "normal" } }, {}, function (err) {
                if(err) changeState("error", {error: ""+err})
                
              })
            }
          }
        })
      } else {
        console.log("Nil data add for "+fpath)
      }

    })
    .on('change', function(fpath){
      let title = path.basename(fpath)
      db.find({ mountpath: fpath }, function (err, docs) {
        if(err) console.log( "db find error "+ err)
        if(docs.length > 0){
          var sd = docs[0]
          console.log("Find changed " + sd.title + " status "+sd.status)
          if(sd.status == "normal" || sd.status == "created"){
            db.update({ _id: sd.id}, { $set: { status: "changed" } }, {}, function (err) {
              if(err) changeState("error", {error: ""+err})
              addLog({message: "Le fichier "+sd.title+" a été modifié", doc_id: sd._id})
              console.log("File "+fpath+" changed and recorded")
              
            })
            
          }
        } else {
          console.log("Not found in links " + fpath)
        }
      })
      refreshUiChangedList()
    })
    .on('unlink', function(fpath){
      console.log("unlink " + fpath)
      db.findOne({ mountpath: fpath }, function (err, sd) {
        if(err) console.log( "db find error "+ err)
        if(sd){
          unlockDoc(sd._id)
          unmountFileTree(sd._id)
        }
      })
    }) 
  
  })
  addLog({message: "Application plugandwork lancée"})
        
  syncList()
  //rtconnect()
  refreshUiDocsList()
  setInterval(function () {
    if(!wsOnline){
      if(state == "active"){
        syncList()
      } else {
        if(state != "sync"){
          checkState()
        }
      }
    }
  }, 10000)
  
  function initMenu () {
    var template = [{
      label: 'Edit',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            };
          }
        },
        {
          label: 'Mode',
          submenu: [
            {
              label: 'Hors ligne',
              click: function (item, focusedWindow) {
                changeState('idle')
              }
            },
            {
              label: 'En ligne',
              click: function (item, focusedWindow) {
                changeState('active')
              }
            }
          ]
        }
        ,{
          label: 'Aide',
          role: 'help',
          click () { require('electron').shell.openExternal('http://plugandwork.fr') }
        },
        {
          label: 'Quitter',
          role: 'quit'
        }

      ]
    }];

    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
  
  function refreshUserInfos(){
    if(store.get('auth_token')){
      getPwApi('/users/me').then(function (response) {
        var data = response.data;
        if(data){
          appIcon.window.webContents.send('user_infos', data);
          return data
        } else {
          changeState('error', {error: 'Problème d\'identification au serveur plugandwork'})
          return {}
        }
      })
      .catch(function (error) {
        changeState('error', {error: 'Requete : erreur de connexion au serveur plugandwork'})
        return {}
      }); 
    } else {
      changeState('unset')
    }
    
  }
  
  function checkState(){
    if(store.get('auth_token')){
      getPwApi('/users/ping').then(function (response) {
        var data = response.data;
        if(data == "pong"){
          if(state != "active" && state != "sync")
            changeState('active')
          return data
        } else {
          changeState('error', {error: 'Problème d\'identification au serveur plugandwork'})
          return {}
        }
      })
      .catch(function (error) {
        changeState('error', {error: 'Requete : erreur de connexion au serveur plugandwork'})
        return {}
      }); 
    } else {
      changeState('unset')
    }
  }
  
  function unlockDoc(id){
    getPwApi('/docs/'+id+'/unlock').then(function (response) {
      return response.data
    })
  }
  
  function syncList(){
    getPwApi('/users/locked_files_hash').then(function (response) {
      oh = hash
      hash = response.data
      if( state == "active" && oh != hash){
        console.log("SYNC", hash)
        // TODO : look at readme
        getPwApi('/users/locked_files').then(function (r) {
          syncFiles = r.data.docs
          //event.sender.send('updateSyncList', syncFiles);
          var numFiles = syncFiles.length
          var filesProcessed = 0
          var ids = []
          for(let doc of syncFiles){
            ids.push(doc.id)
            filesProcessed++;
            changeState('sync')
            var base = base_files_dir
            mkdirp(base, function(err) { 
              if (err) console.error(err)
              else {
                getPwApi('/docs/'+doc.id).then(function (response) {
                  let d = response.data
                  d._id = doc.id
                  d.status = "new"
                  db.findOne({ _id: doc.id }, function (err, sd) {
                    if(err) console.log( "db insert error "+ err)
                    if(sd){
                      console.log("Already IN " + doc.title)
                    } else {
                      let file_path = base + '/' + doc.id
                      
                      // TODO check if another file is locked with same title
                      d.localpath = file_path
                      d.mountpath = files_dir + '/' + doc.title
                      
                      db.insert(d, function (err, nd) {   // Callback is optional
                        if(err){
                          throw err
                        } else {
                          console.log("Inserted " + nd.title)
                          if(nd.type == "file" || nd.type == "email"){
                            console.log("Base localpath "+ nd.localpath)
                            fs.exists(d.mountpath, function(exists) { 
                              if (exists) { 
                                var data = fs.readFileSync(d.mountpath)
                                if(data.length > 0){
                                  let md5 = checksum(data)
                                  db.find({ file_md5: md5 }, function (err, docs) {
                                    var count = docs.length
                                    console.log("MD5 "+md5+" path " + d.mountpath + " COUNT "+ count)
                                    if(err) throw console.log(err)
                                    if(count == 0){
                                      getPwFileData(nd._id, file_path)
                                    } else {
                                      console.log("Data already IN "+ d.mountpath)
                                      db.update({ id: nd._id }, { $set: { status: "normal" } }, {upsert: true}, function () {});
                                    }
                                  })
                                }
                              } else {
                                getPwFileData(nd._id, file_path)
                              }
                            });
                            
                          }
                        }
                      });
                    }
                  });
                })
                

              }
            });
            
          }
          // find all doc to clean cause not in sync and then clean directory
          console.log(ids)
          db.find({ _id: { $nin: ids}, status: "normal"  }, function (err, docs) {
            if(err) throw changeState('error', {error: err})
            for(let doc of docs){
              console.log("Not anymore in DB " + doc.title)
              unmountFileTree(doc.id)
            }
          });
          refreshUiSyncList()
          
          if(filesProcessed == numFiles){
            changeState('active')
          }
        }).catch(function(e){
          console.log("E" + e)
          changeState('error', {error: ""+e})
        })
      }
    }).catch(function(e){
      console.log("E" + e)
      changeState('error', {error: ""+e})
    })
  }
  
  function getPwApi(upath, options){
    options = options || {};
    var url = baseurl+ '/api/d1' + upath
    url += '?auth_token='+store.get('auth_token')+'&uuid='+store.get('uuid')
    //console.log(url, options)
    return axios.get(url)
  }
  
  function getPwFileData(id, file_path){
    var url = baseurl
    url += '/api/d1/docs/'+id+'/data'
    url += '?auth_token='+store.get('auth_token')+'&uuid='+store.get('uuid')

    request.get({url: url, encoding: 'binary'}, function (err, response, body) {
      fs.writeFile(file_path, body, 'binary', function(err) {
        
        if(err)
          db.update({ _id: id }, { $set: { status: "error", error: err } }, {}, function (err) {
            if(err) changeState("error", {error: ""+err})
          });
        else {
          mountFileTree(id)
        }
          
      }); 
    });
  }
  
  function addPwFile(fpath, callback) {
    var url = baseurl+ '/api/d1/docs'
    url += '?auth_token='+store.get('auth_token')+'&uuid='+store.get('uuid')
    //console.log(url, options)
    // create doc on api
    console.log("adding file")
    let jd = {}
    jd.title = path.basename(fpath)
    // calculate tagset_ids with the path
    let json = {"doc":jd}
    let file_md5 = checksum(fpath)
    axios.post(url, json).then(function(response){
      let d = response.data
      console.log("doc start create ", d)
      let nd = {title: jd.title, _id: d.id, file_md5: file_md5, status: "created"} 
      nd.localpath = base_files_dir+'/'+d.id
      nd.mountpath = fpath
      nd.id = d.id
      // create the local record
      db.findOne({ _id: d.id }, function (err, sd) {
        if(err) console.log( "db insert error "+ err)
        if(sd){
          console.log( "already inserted "+ sd.title)
        } else {
          console.log( "to be inserted "+ nd.title)
          db.insert(nd, function (err, nd) {   // Callback is optional
            if(err){
              throw err
            } else {
              if(nd){
                console.log("Inserted ND " + nd.title)
                // mv the file in userdata and create a link on it
                //fs.rename(fpath, nd.localpath, function(){
                  var url = baseurl+ '/api/d1/docs/'+d.id+'/file'
                  url += '?auth_token='+store.get('auth_token')+'&uuid='+store.get('uuid')
              
                  //mountFileTree(d.id)
                  // post data in api doc
                  var req = request.post(url, function (err, resp, body) {
                    if (err) {
                      console.log('Error uploading file to api ! '+err);
                    } else {
                      console.log('URL: ' + body);
                    }
                  });
                  var form = req.form();
                  form.append('file', fs.createReadStream(nd.mountpath));
                  req.on('finish', function(){
                    console.log('upload ended');
                    db.update({ id: nd._id }, { $set: { status: "normal" } }, {}, function (err) {
                      if(err){
                        console.log(err)
                      }
                    });
                    typeof callback === 'function' && callback(sd._id)
                  });
                //})
            
            
              } else {
                console.log("no inserted doc ")
              }
            }
          });
        }
      })
    })
  }
  
  function replacePwFile(id, callback) {
    db.findOne({ _id: id }, function (err, sd) {
      if(err) console.log( "db insert error "+ err)
      if(sd){
        console.log("Ready to replace " + sd.title)
        var url = baseurl+ '/api/d1/docs/'+sd.id+'/file'
        url += '?auth_token='+store.get('auth_token')+'&uuid='+store.get('uuid')
        var oid = sd._id
        // post data in api doc
        console.log("PATH", sd.mountpath)
        var formData = {
          file: {
            value:fs.createReadStream(sd.mountpath),
            options: {
              filename: sd.title,
              contentType: sd.content_type
            }
          }
        };
        var req = request.post({url, formData: formData}, function (err, resp, body) {
          if (err) {
            console.log('Error uploading file to api ! '+err);
          } else {
            console.log('resp: ' + resp.statusCode);
            if((resp.statusCode == 200) && body){
              var res = JSON.parse(body)
              console.log('ID: ' + res.id);
              if(res.id){
                if (res.id != sd._id){
                  d = sd
                  db.remove({ _id: oid }, {}, function (err, numRemoved) {
                    d.status = "normal"
                    if(numRemoved > 0){
                      d.id = res.id
                      d._id = res.id
                      db.insert(d, function (err, nd) {   // Callback is optional
                        if(err){
                          throw err
                        } else {
                          console.log('storing new record '+d.id);
                        }
                      })
                    }
                 
                    typeof callback === 'function' && callback(d._id) 
                  });
                } else {
                  typeof callback === 'function' && callback(sd._id) 
                }
              }
            }
          }
        });
        req.on('finish', function(){
          console.log('upload ended removing record '+oid);
          
          refreshUiChangedList()
        });
      }
    })
  }
  
  function mountFileTree(id){
    db.findOne({ _id: id }, function (err, sd) {
      if(err) throw err
      if(sd){
        console.log("Mounting "+ sd.title)
        let msg = "Le fichier "+sd.title+" a été synchronisé"
        let base = path.dirname(sd.mountpath)
        mkdirp(base, function(err) { 
          fs.renameSync(sd.localpath, sd.mountpath, function(){})
          var l = {message: msg, doc_id: id, thumb_url: baseurl + sd.thumb_url}
          console.log("move file in real dir " + sd.mountpath)
          //console.log(l)
          addLog(l)
          db.update({ id: id }, { $set: { status: "normal" } }, {}, function (err) {
            if(err){
              console.log(err)
            }
            refreshUiDocsList()
          });
        })
      }
    })

  }
  
  function unmountFileTree(id){
    db.findOne({ _id: id }, function (err, sd) {
      if(err) throw err
      if(sd){
        console.log("Unmounting "+ sd.title)
        
        console.log("Unlink local "+sd.mountpath)
        fs.exists(sd.mountpath, function(exists) { 
          if (exists) { 
            fs.unlink(sd.mountpath)
          } 
        });
        
        addLog({message: "Le fichier "+sd.title+" à été enlevé", doc_id: sd._id, thumb_url: baseurl + sd.thumb_url})
        db.remove({ _id: id }, {}, function (err, numRemoved) {});
        refreshUiChangedList()
        refreshUiDocsList()
      }
    })

  }
  
  function unlinkFile(fpath){
    console.log("Unlink "+fpath)
    fs.exists(fpath, function(exists) { 
      if (exists) { 
        fs.unlink(fpath)
      } 
    });
  }
  
  function linkFile(id, target) {
    let fpath = files_dir + target
    db.findOne({ _id: id }, function (err, sd) {
      if(err) throw err
      if(sd){
        console.log("Real mounting "+ sd.title+" in "+fpath)
        let file_path = fpath+'/'+sd.title
        if(sd.type == "email"){
          file_path += '.eml' 
        }
        mkdirp(fpath, function(err) { 
          fs.link(sd.localpath, file_path, function(){
            console.log("Link "+sd.localpath+" to "+file_path)
            db.update({ id: sd._id }, { $addToSet: { links: file_path } }, {}, function () {});
          })
        })
        
      }
    })
  }
  
  function cleanDir(folder) {
    console.log("clean folder "+ folder)
    fs.lstat(folder, function(err, stats) {
      if (!err && stats.isDirectory()) {
    
        var files = fs.readdirSync(folder);
        if (files.length > 0) {
          files.forEach(function(file) {
            var fullPath = path.join(folder, file);
            cleanDir(fullPath);
          });

          // re-evaluate files; after deleting subfolder
          // we may have parent folder empty now
          files = fs.readdirSync(folder);
        }

        if (files.length == 0) {
          console.log("removing: ", folder);
          fs.rmdirSync(folder);
          return;
        }
      }
    })
  }
  
  function changeState(st, infos){
    os = state
    state = st
    console.log("state => "+st)
    if (state != os) {
      infos = infos || {};
      store.set('state', state);
      wsOnline = (state != "error")
      store.set('state_infos', infos);
      refreshUI()
    }
  }
  
  function addLog(log){
    dblogs.insert(log, function (err, newDoc) {
      if(err) console.log("Error inserting log "+ err)
      var icon = path.join(__dirname, '/images/128x128.png')

      const n = notifier.notify({
        title: 'plugandwork',
        subtitle: 'information',
        message: log.message,
        icon: icon,
        contentImage: (log.thumb_url || icon),
        sound: true
        //buttons: ['Fermer', 'Snooze'],
      })
    })
    refreshUiLogsList()
  }
  
  function refreshUI(){
    var infos = store.get("state_infos")
    infos = infos || {error: "!!"}
    
    switch (state) {
      case "error":
        appIcon.setToolTip('plugandwork - erreurs !' + infos.error);
        appIcon.setImage(iconError);
        break
      case "unset":
        appIcon.setToolTip('plugandwork - merci de vous connecter à un serveur');
        appIcon.setImage(iconUnset);
        break
      case "sync":
        console.log("SYNC TRAY")
        appIcon.setToolTip('plugandwork - synchronisation en cours');
        appIcon.setImage(iconSync);
        break
      case "idle": 
        appIcon.setToolTip('plugandwork - non connecté');
        appIcon.setImage(iconIdle);
        break

      default: 
        console.log("active")
        appIcon.setToolTip('plugandwork - connecté');
        appIcon.setImage(iconActive);
        break
    }
    console.log("Send state "+state)
    appIcon.window.webContents.send('refresh_login', state);
    
  }
  
  function initWs(){
    var channel_key = store.get("channel_key")
    var baseurl = store.get("baseurl")
    var uuid = store.get("uuid")
    if(channel_key){
      console.log("starting ws")
      var client = new faye.Client(baseurl + "/faye")
      client.addWebsocketExtension(deflate)
      try {
        client.unsubscribe('/users/'+channel_key)
      } catch(e) {}
      var subscription = client.subscribe('/users/'+channel_key, function(data) {
        //console.log("ws message ", data)
        var icon = cicon = path.join(__dirname, '/images/128x128.png')
        if(data.icon){
          cicon = baseurl + data.icon
        }
        if(data.action == "message"){
          //{message, from, badge, cid}
          const notification = notifier.notify({
            title: 'message',
            subtitle: data.from, 
            message: data.message,
            icon: icon,
            contentImage: cicon,
            sound: true,
            wait: true,
            closeLabel: 'Fermer'
          })
          notification.on('click', (text) => {
            //if (text === 'Snooze') {
              // Snooze! 
            //}
            //notification.close()
          })
        }
        if(data.action == "refresh_briefcase"){
          syncList()
        }
        // refresh_briefcase
      });

      subscription.callback(function() {
        console.log('[SUBSCRIBE SUCCEEDED]');
      });
      subscription.errback(function(error) {
        console.log('[SUBSCRIBE FAILED]', error);
      });
      client.bind('transport:down', function() {
        console.log('[CONNECTION DOWN]');
        wsOnline = false
        checkState()
      });
      client.bind('transport:up', function() {
        wsOnline = true
        checkState()
        console.log('[CONNECTION UP]');
      });
    }
    
  }
  
  function refreshUiSyncList(){
    db.find({ status: {$in: ["new", "created"]}   }, function (err, docs) {
      if(err) throw changeState('error', {error: ""+err})
      console.log("Refresh sync list "+ docs.length)
      appIcon.window.webContents.send('updateSyncList', docs);
    });
  }
  
  function refreshUiChangedList(){
    db.find({ status: "changed" }, function (err, docs) {
      if(err) throw changeState('error', {error: ""+err})
      console.log("Refresh changed list "+ docs.length)
      appIcon.window.webContents.send('updateChangedList', docs, baseurl);
    });
  }
  
  function refreshUiDocsList(){
    db.find({ }, function (err, docs) {
      if(err) throw changeState('error', {error: ""+err})
      console.log("Refresh doc list "+ docs.length)
      appIcon.window.webContents.send('updateDocsList', docs, baseurl);
    });
  }

  function refreshUiLogsList(){
    dblogs.find({}).sort({ createdAt: -1 }).limit(10).exec(function (err, logs) {
      if(err) throw changeState('error', {error: ""+err})
      console.log("Refresh logs list "+ logs.length)
      appIcon.window.webContents.send('updateLogsList', logs);
    });
  }

  function hideWindow () {
    if (!appIcon.window) { return; }
    appIcon.window.hide();
  }
  function initWindow () {
    var defaults = {
      width: 420,
      height: 450,
      show: false,
      frame: false,
      resizable: false,
      webPreferences: {
        overlayScrollbars: true
      }
    };

    appIcon.window = new BrowserWindow(defaults);
    appIcon.positioner = new Positioner(appIcon.window);
    appIcon.window.loadURL('file://' + __dirname + '/src/index.html');
    appIcon.window.on('blur', hideWindow);
    appIcon.window.setVisibleOnAllWorkspaces(true);
    appIcon.window.on('change_state', refreshUI);

    appIcon.window.webContents.on('devtools-opened', (event, deviceList, callback) => {
      appIcon.window.setSize(800, 600);
      appIcon.window.setResizable(true);
    });

    appIcon.window.webContents.on('devtools-closed', (event, deviceList, callback) => {
      appIcon.window.setSize(420, 450);
      appIcon.window.setResizable(false);
    });

    initMenu();
    initWs()
    
    //checkAutoUpdate(false);
    
    appIcon.window.on('resize', () => {
      // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
      // the height, width, and x and y coordinates.
      //let { width, height } = mainWindow.getBounds();
      // Now that we have them, save them using the `set` method.
      //store.set('windowBounds', { width, height });
    });
  }

  function showWindow (trayPos) {
    var noBoundsPosition;
    if (!isDarwin && trayPos !== undefined) {
      var displaySize = electron.screen.getPrimaryDisplay().workAreaSize;
      var trayPosX = trayPos.x;
      var trayPosY = trayPos.y;

      if (isLinux) {
        var cursorPointer = electron.screen.getCursorScreenPoint();
        trayPosX = cursorPointer.x;
        trayPosY = cursorPointer.y;
      }

      var x = (trayPosX < (displaySize.width / 2)) ? 'left' : 'right';
      var y = (trayPosY < (displaySize.height / 2)) ? 'top' : 'bottom';

      if (x === 'right' && y === 'bottom') {
        noBoundsPosition = (isWindows) ? 'trayBottomCenter' : 'bottomRight';
      } else if (x === 'left' && y === 'bottom') {
        noBoundsPosition = 'bottomLeft';
      } else if (y === 'top') {
        noBoundsPosition = (isWindows) ? 'trayCenter' : 'topRight';
      }
    } else if (trayPos === undefined) {
      noBoundsPosition = (isWindows) ? 'bottomRight' : 'topRight';
    }

    refreshUiLogsList()
    refreshUiDocsList()
    refreshUserInfos()
    
    var position = appIcon.positioner.calculate(noBoundsPosition || windowPosition, trayPos);
    appIcon.window.setPosition(position.x, position.y);
    appIcon.window.show();
  }

  // Pass those values in to the BrowserWindow options
  //mainWindow = new BrowserWindow({ width, height });
  
  initWindow()
  refreshUI()
  
  refreshUserInfos()

  // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
  // to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
  
  //mainWindow.loadURL('file://' + path.join(__dirname, 'index.html'));
  
  appIcon.on('click', function (e, bounds) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) { return hideWindow(); };
    if (appIcon.window && appIcon.window.isVisible()) { return hideWindow(); };
    bounds = bounds || cachedBounds;
    cachedBounds = bounds;
    showWindow(cachedBounds);
  });

  ipcMain.on('reopen-window', function() {
    showWindow(cachedBounds);
  });
  
  ipcMain.on('refresh_docs', function() {
    refreshUiDocsList()
  });
  
  ipcMain.on('doc_action', (event, doc_id, action) => {
    console.log("doc action ", doc_id, action)
    db.findOne({ _id: doc_id }, function (err, sd) {
      if(err) throw err
      if(sd){
        switch (action) {
          case "upload":
            replacePwFile(sd._id)
            break
          case "upload_unlock":
            unlockDoc(sd._id)
            replacePwFile(sd._id, unmountFileTree)
            
            break
          case "remove_unlock":
            unlockDoc(sd._id)
            unmountFileTree(sd._id)
            break

          case "open_link":
            shell.openExternal(baseurl + '/documents/' + sd._id)
            break

          case "open_file":
            shell.openItem(sd.mountpath)
            break
          case "open_folder":
            shell.showItemInFolder(sd.mountpath)
            break
          default: 
            console.log("action not found for " + sd.title)
            break
        }
      } else {
        console.log("not found "+doc_id)
      }
    })
  });
  
  ipcMain.on('user_action', (event, action) => {
    console.log("user_action ", action)

    switch (action) {
      case "logout":
        changeState("unset")
        store.set('auth_token', '')
        store.set('login', '')
        store.set('wsurl', null)
        dblogs.remove({}, {}, function (err, numRemoved) {});
        break
      default: 
        console.log("action not found for user " + action)
        break
    }

  });

  ipcMain.on('startup-enable', function() {
    autoStart.enable();
  });

  ipcMain.on('startup-disable', function() {
    autoStart.disable();
  });

  ipcMain.on('check-update', function() {
    checkAutoUpdate(true);
  });

  ipcMain.on('app-quit', function() {
    app.quit();
  });

  appIcon.setToolTip('plugandwork notifications.');
  
  ipcMain.on('pw-login', (event, arg) => { 
    
    baseurl = 'https://'+arg.server
    if(baseurl.match(/127.0.0.1/g) || baseurl == "https://rce.dev"){
      baseurl = 'http://'+arg.server
    }
    var url = baseurl+'/api/login'
    axios.post(url, {
      username: arg.username,
      password: arg.password,
      server: arg.server,
      name: 'plugandwork_sync (' + process.platform + ')'
    }).then(function (response) {
      var data = response.data;
      console.log(data)
      if(data.success){
        store.set('email', data.email)
        store.set('login', data.login)
        store.set('uuid', data.uuid)
        store.set('auth_token', data.auth_token)
        store.set('baseurl', baseurl)
        store.set('channel_key', data.channel_key)
        changeState('active')
        refreshUserInfos()
        initWs()
      } else {
        changeState('error', {error: 'Problème d\'identification au serveur plugandwork'})
      }
    })
    .catch(function (error) {
      changeState('error', {error: 'Erreur de connexion au serveur plugandwork'})
    });
  });
  
  
  
});
app.on('before-quit', () => {
  console.log("Quit !")
})

  function setBadge(text) {
    if (process.platform === "darwin") {
      app.dock.setBadge("" + text);
    } else if (process.platform === "win32") {
      var win = remote.getCurrentWindow();

      if (text === "") {
        win.setOverlayIcon(null, "");
        return;
      }

      // Create badge
      var canvas = document.createElement("canvas");
      canvas.height = 140;
      canvas.width = 140;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.ellipse(70, 70, 70, 70, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "white";

      if (text.length > 2) {
        ctx.font = "75px sans-serif";
        ctx.fillText("" + text, 70, 98);
      } else if (text.length > 1) {
        ctx.font = "100px sans-serif";
        ctx.fillText("" + text, 70, 105);
      } else {
        ctx.font = "125px sans-serif";
        ctx.fillText("" + text, 70, 112);
      }

      var badgeDataURL = canvas.toDataURL();
      var img = NativeImage.createFromDataUrl(badgeDataURL);

      win.setOverlayIcon(img, text);
    }
  };