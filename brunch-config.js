module.exports = {
  npm: {
    globals: {
      $: 'jquery',
      jQuery: 'jquery',
      _: "underscore",
      riot: "riot",
      UIKit: "uikit"
    },
    styles: {
      /*select2: ['dist/css/select2.css'],*/
    }
  },
  hooks: {
    preCompile: (end) => {
      var fs = require('fs');
      // JS
      //fs.createReadStream('node_modules/uikit/dist/js/components/pagination.js').pipe(fs.createWriteStream('src/vendors/uikit-pagination.js'));
      //fs.createReadStream('node_modules/uikit/dist/js/components/form-select.js').pipe(fs.createWriteStream('src/vendors/uikit-form-select.js'));
      //fs.createReadStream('node_modules/uikit/dist/js/components/datepicker.js').pipe(fs.createWriteStream('src/vendors/uikit-datepicker.js'));
      //fs.createReadStream('node_modules/uikit/dist/js/components/notify.js').pipe(fs.createWriteStream('src/vendors/uikit-notify.js'));
      //fs.createReadStream('node_modules/uikit/dist/js/components/autocomplete.js').pipe(fs.createWriteStream('src/vendors/uikit-autocomplete.js'));
      //fs.createReadStream('node_modules/uikit/dist/js/components/timepicker.js').pipe(fs.createWriteStream('src/vendors/uikit-timepicker.js'));
      //fs.createReadStream('node_modules/select2/dist/js/select2.js').pipe(fs.createWriteStream('src/vendors/select2.js'));
      // CSS
      fs.createReadStream('node_modules/uikit/dist/css/uikit.almost-flat.css').pipe(fs.createWriteStream('src/vendors/0-uikit.css'));
      //fs.createReadStream('node_modules/uikit/dist/css/components/datepicker.gradient.css').pipe(fs.createWriteStream('src/vendors/1-uikit-datepicker.css'));
      //fs.createReadStream('node_modules/uikit/dist/css/components/form-select.gradient.css').pipe(fs.createWriteStream('src/vendors/3-uikit-form-select.css'));
      //fs.createReadStream('node_modules/uikit/dist/css/components/notify.gradient.css').pipe(fs.createWriteStream('src/vendors/4-uikit-notify.css'));
      //fs.createReadStream('node_modules/uikit/dist/css/components/autocomplete.gradient.css').pipe(fs.createWriteStream('src/vendors/5-uikit-autocomplete.css'));
      // Fonts
      fs.createReadStream('node_modules/uikit/dist/fonts/fontawesome-webfont.ttf').pipe(fs.createWriteStream('src/assets/fonts/fontawesome-webfont.ttf'));
      fs.createReadStream('node_modules/uikit/dist/fonts/fontawesome-webfont.woff').pipe(fs.createWriteStream('src/assets/fonts/fontawesome-webfont.woff'));
      fs.createReadStream('node_modules/uikit/dist/fonts/fontawesome-webfont.woff2').pipe(fs.createWriteStream('src/assets/fonts/fontawesome-webfont.woff2'));
      fs.createReadStream('node_modules/uikit/dist/fonts/FontAwesome.otf').pipe(fs.createWriteStream('src/assets/fonts/FontAwesome.otf'));
      
      end();
    }
  },
  files: {
    javascripts: {
      joinTo: {
        'js/js.js': /^src\/[js|widgets]/,
        'js/vendors.js': [/^(?!src)/, /^src\/vendors/ ], 
      }
    },
    stylesheets: {
      joinTo: {
        'css/css.css': /^src\/[css]/,
        'css/vendors.css': [/^(?!src)/, /^src\/vendors/],
      },
    },
  },
  plugins: {
    htmlPages: {
      compileAssets: true
    }
  },

  overrides: {
    production: {
      paths: {
        public: 'dist'
      }
    } 
  }
  
};