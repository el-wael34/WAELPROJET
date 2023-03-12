(function(back) {
var storage = require("Storage");
var settings = Object.assign(storage.readJSON("quicklaunch.json", true) || {});

var apps = storage.list(/\.info$/).map(app=>{var a=storage.readJSON(app,1);return a&&{name:a.name,type:a.type,sortorder:a.sortorder,src:a.src};}).filter(app=>app && (app.type=="app" || app.type=="launch" || app.type=="clock" || !app.type));

// Add psuedo app to trigger Bangle.showLauncher later
apps.push({
    "name": "Show Launcher",
    "type": undefined,
    "sortorder": -12,
    "src": "no source"
   });

// Add the Quick Launch extension app
let extension = {
    "name": "Extension",
    "type": "app",
    "sortorder": -11,
    "src": "quicklaunch.app.js"
   };
apps.push(extension);

apps.sort((a,b)=>{
  var n=(0|a.sortorder)-(0|b.sortorder);
  if (n) return n; // do sortorder first
  if (a.name<b.name) return -1;
  if (a.name>b.name) return 1;
  return 0;
});

// Convert settings object from before v.0.12
for (let c of ["leftapp","rightapp","upapp","downapp","tapapp"]){
  if (settings[c]) {
    let cNew = c.substring(0,1)+"app"; 
    settings[cNew] = settings[c];
    if (settings[cNew].name=="Quick Launch Extension") save(cNew,extension);
    delete settings[c];
  } 
}
for (let c of ["extleftapp","extrightapp","extupapp","extdownapp","exttapapp"]){
  if (settings[c]) delete settings[c];
}

// Add default settings if they haven't been configured before. 
for (let c of ["lapp","rapp","uapp","dapp","tapp"]){ // l=left, r=right, u=up, d=down, t=tap.
  if (!settings[c]) settings[c] = {"name":"(none)"};
}

function findPath(key) {return key.substring(0, key.length-3);}

function save(key, value) {
  let path = findPath(key);
  // If changing from extension app (to something else) remove downstream settings entries.
  if (settings[key].name == extension.name && value.name != extension.name) {
      for (let c of [path+"lapp", path+"rapp", path+"uapp", path+"dapp", path+"tapp"]) {
        delete settings[c];
      }
    }

  // If changing to extension app (from something else) add downstream settings entries.
  if (value.name == extension.name && settings[key].name != extension.name) {
      for (let c of [path+"lapp", path+"rapp", path+"uapp", path+"dapp", path+"tapp"]) {
        settings[c] = {"name":"(none)"};
        storage.write("quicklaunch.json",settings);
      }
    }
  
  // Now change the setting on the current level in the path.
  settings[key] = value;
  storage.writeJSON("quicklaunch.json",settings);
}

function showMainMenu() {
    // Quick Launch menu
  var mainmenu = {
    "" : { "title" : "Quick Launch" },
    "< Back" : ()=>{load();}
  };

  //List all selected apps
  for (let key of Object.keys(settings)) {
    if (key == "trace") continue;
    let keyCurrent = key;
    let entry = findPath(key).toUpperCase();
    if (entry=="L") entry = "Left";
    if (entry=="R") entry = "Right";
    if (entry=="U") entry = "Up";
    if (entry=="D") entry = "Down";
    if (entry=="T") entry = "Tap";
    mainmenu[entry+ ": "+settings[key].name] = function() {showSubMenu(keyCurrent);};
  }

  return E.showMenu(mainmenu);
}

function showSubMenu(key) {
  let path = findPath(key);
  var submenu = {
    "" : { "title" : "path: "+path},
    "< Back" : showMainMenu
  };
  
  submenu["(none)"] = function() {
    save(key, {"name":"(none)"});
    showMainMenu();
  };
  apps.forEach((a)=>{
    submenu[a.name] = function() {
      save(key, a);
      showMainMenu();
      };
  });

  return E.showMenu(submenu);
}

showMainMenu();
})
