TODO :
  - nedb recording of each tagset and each doc and then get the doc data and crete or sync the local fs in app data
  - use memfs and linkfs (cause somes docs are in several places) and get tagset title to link directory in user documents/rce folders
    - (My docs user's system folder)/rce/
      - dashboard (Tableau de Bord) ro
        - files here are new files and files on dashboard without tagset_ids
      - spaces (Espaces de Travail)
        - space1 - rw depend on user rights
          - files for spaces1 - rw depend on user rights
      - briefcase (Porte Documents)
        - files here are booked files
  - enhance ui to get better tray integration and popup only for login or notes edition
  - use chokidar to watch the fs for changing files or folder name https://github.com/paulmillr/chokidar
  

FILE STATUS id db
  When file is :
    changed: changed
    removed: unlink
    uploaded with success: normal
    uploaded without success: error
  
  
  UI : 
    3 tabs
      - files synced (status normal)
      - files to be uploaded (status changed)
      - parameters
        - basic
          - registered login account
        - advanced (hidden by default)
          - show status
          - show last correct sync date
        
  