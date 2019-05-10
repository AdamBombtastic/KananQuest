const SERVER_TICK = 15; //ms
const serverVersion = 0;

const MOTD = "Welcome to <i>Kanan Quest!</i> <br>" +
             "Updates: <br>" +
             "- Added Items, open your (I) inventory to view them! Double click an item to use it." +
             "- Slimes drop monster tokens (50% chance) You can pick them up by standing on them and pressing space. <br>" +
             "- You can buy items from the shopkeeper (Space to interact), click item to buy. <br>" + 
             "- Be careful -- You drop all your items on death.<br>" + 
             "- Have fun!<br>" +
             "";

var express = require('express');
var app = express();
const sqlite=require('sqlite3').verbose();
const bcrypt = require('bcrypt');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var chatLog = [];

var DEBUG_NETWORK = true;
/* Database Section */
var db = new sqlite.Database("./db/database.db",sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, (err) => {
  if (err) {console.log("Error:" + err.message);}
  else console.log("Database. . . Connected!");
});


var playerTableSQL = "CREATE TABLE IF NOT EXISTS Player " +
"(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT,x INTEGER NOT NULL DEFAULT 0, y INTEGER NOT NULL DEFAULT 0, direction INTEGER NOT NULL DEFAULT 0, hp INTEGER NOT NULL DEFAULT 1, maxHp INTEGER NOT NULL DEFAULT 1, damage INTEGER NOT NULL DEFAULT 1, exp INTEGER not null default 0,level INTEGER NOT NULL DEFAULT 1,bIsOnline INTEGER DEFAULT 0, weaponId INTEGER)";

var playerTableSchema = {
    id : "integer",
    username : "text",
    password : "text",
    x : "integer",
    y : "integer",
    direction : "integer",
    hp : "integer",
    maxHp : "integer",
    damage : "integer",
    bIsOnline : "integer",
    exp : "integer",
    level : "integer",
    weaponId : "integer",
}

var inventoryTableSQL = "CREATE TABLE IF NOT EXISTS Inventory " +
"(id INTEGER PRIMARY KEY AUTOINCREMENT, playerId INTEGER, itemId INTEGER)";
var inventoryTableSchema = { id : "integer", playerId : "integer", itemId : "integer"}

var itemTableSQL = "CREATE TABLE IF NOT EXISTS Item " +
"(id INTEGER PRIMARY KEY AUTOINCREMENT, definitionId TEXT, name TEXT, desc TEXT, durability INTEGER, damage INTEGER, type INTEGER, rarity INTEGER, graphic TEXT, damage INTEGER, amount INTEGER, maxAmount INTEGER)"
var itemTableSchema = {id : "integer", name : "text", definitionId : "text", desc : "text", durability : "integer", type : "integer", rarity : "integer", graphic : "text", damage: "integer", amount : "integer", maxAmount : "integer"}
/*var visibilityTableSQL = "CREATE TABLE IF NOT EXISTS Visibility" + 
"(id INTEGER PRIMARY KEY AUTOINCREMENT, viewerId INTEGER NOT NULL, playerId INTEGER NOT NULL, bIsVisible INTEGER NOT NULL DEFAULT 0)"*/

//TODO: REFACTOR THIS
function createTable(tableSQL,tableName) {
  db.run(tableSQL,(err) => {
  if (!err) {
  console.log(tableName + " table created");
  }
  else console.log(err);
  });
  }

  createTable(playerTableSQL,"Player");
  createTable(itemTableSQL,"Item");
  createTable(inventoryTableSQL,"Inventory");

  try {
    //db.run("ALTER TABLE Player ADD COLUMN exp integer not null default 0;", (err)=>{console.log(err);});
    //db.run("ALTER TABLE Player ADD COLUMN level integer not null default 1;",(err)=>{console.log(err);});
    //db.run ("ALTER TABLE Item ADD COLUMN damage integer",(err)=>{console.log(err);});
    //db.run ("ALTER TABLE Item ADD COLUMN amount integer",(err)=>{console.log(err);});
    //db.run ("ALTER TABLE Item ADD COLUMN maxAmount integer",(err)=>{console.log(err);});
    //db.run("ALTER TABLE Item ADD COLUMN definitionId TEXT", (err)=>{console.log(err);});
    //db.run("ALTER TABLE Player ADD COLUMN weaponId INTEGER", (err)=>{console.log(err);});
    //db.run("DELETE FROM Inventory where playerId=3");
    //db.run("UPDATE Player SET weaponId=-1 WHERE id=3");

  }
  catch (e) {
    console.log(e);
  }


  function query(sql) {
    return new Promise(resolve => {
     db.all(sql,[],(err,rows)=>{
         if (err) {
             console.log(err.message);
             resolve(null);
         }
         else {
             resolve(rows);
         }
     });
  });
  }
  function insert(sql) {
   return new Promise(resolve => {
       db.run(sql, (err) => {
         if(!err) {
           resolve(true);
         }
         else {
           resolve(false);
           console.log(err);
         }
     });
   }); 
  }
  function insertSqlFromObject(tablename,obj, schema=null) {
    var returnSQL = "INSERT INTO "+ tablename + " (";
    var valueSQL = " VALUES (";
    for (var key in obj) {
        var value = obj[key];
        if (value == null || value == undefined) continue;
        if (schema != null && schema[key] == null) continue;
        returnSQL += key + ",";
        
        if (typeof value == "string") {
          if (value.indexOf("'") != -1) {
            value = value.replace(new RegExp("'","g"),"''");
          }
          valueSQL += " '" + value + "'";
        }
        else {
          valueSQL += value;
        }
        valueSQL += ","
    }
    return returnSQL.substring(0,returnSQL.length-1) + ") " + valueSQL.substring(0,valueSQL.length-1) + ")";
  }
  function updateSqlFromObject(tablename,obj,schema=null,where=null) {
    var returnSQL = "UPDATE "+ tablename + " SET ";
    for (var key in obj) {
        var value = obj[key];
        if (value == null || value == undefined) continue;
        if (schema != null && schema[key] == null) continue;
        if (key == "id") continue;
        if (typeof value == "string") {
          if (value.indexOf("'") != -1) {
            value = value.replace(new RegExp("'","g"),"''");
          }
          returnSQL += key + "=" + " '" + value + "',";
        }
        else {
          returnSQL += key + "=" + value + ","
        }
    }
    var ans = returnSQL.substring(0,returnSQL.length-1);
    if (where != null) {
      ans += " WHERE 1=1 AND "
      for (var k in where) {
        ans += (k + " = " + where[k] + " ");
      }
    }
    else ans +=  " WHERE id="+obj.id;
    return ans;
  }
  function sqlFromObject(obj,schema=null) {
    var returnSQL = "";
    for (var key in obj) {
        if (schema != null && schema[key] == null) continue;
        var value = obj[key];
        if (typeof value == "string") {
          returnSQL += " '" + value + "'";
        }
        else {
          returnSQL += value;
        }
        returnSQL += ","
    }
    return returnSQL;
  }

  async function getLastItemId() {
    var ans = await query("select id from Item order by id desc");
    if (ans == null) return 1;
    if (ans.length == 0) return 1;
    return (1*ans[0].id) + 1;
  }
  async function ReadItem(itemId) {
    var sql = ("select * from Item where id="+itemId);
    console.log(sql);
    var ans = await query(sql);
    return (ans == null || ans.length == 0) ? null : ans[0];
  }
  async function PostItem(item) {
    var isInsert = await query("select id from Item where id="+item.id);
    isInsert = (isInsert == null || isInsert.length == 0);
    var sql = isInsert ? insertSqlFromObject("Item",item,itemTableSchema) : updateSqlFromObject("Item",item,itemTableSchema);
    console.log(sql);
    return await insert(sql);
  }
  async function PostInventory(playerId,inventory) {
    var success = true;
    for (var key in inventory) {
      var itemList = inventory[key];
      for (var i = 0; i < itemList.length;i++) {
        var item = itemList[i];
        success = success && await PostItem(item);
        if (success) {
          var isInsert = await query("select itemId from Inventory where playerId="+playerId+" AND itemId="+item.id+";");
          isInsert = (isInsert == null || isInsert.length == 0);
          var sql = isInsert ? insertSqlFromObject("Inventory",{playerId:playerId,itemId:item.id},inventoryTableSchema) : null;
          if (sql != null) {
            console.log(sql);
            success = success && await insert(sql);
          }
        }
      }
    }
    return success;
  }
  async function RemoveItemFromInventory(playerId,itemId) {
    const sql = "DELETE FROM Inventory where playerId="+playerId+" AND itemId="+itemId+";";
    console.log(sql);
    var success = await (async ()=> {
      return new Promise((resolve)=> {
        db.run(sql, (err)=>{resolve(err == null || err.length == 0);});
      });
    })(); 
    return success;
  }
  async function PostPlayer(playerObj) {
    var sql = (playerObj.id < 0 || playerObj.id == null) ? insertSqlFromObject("Player",playerObj,playerTableSchema) : updateSqlFromObject("Player",playerObj,playerTableSchema);
    console.log(sql);
    var success = await insert(sql); 
    console.log({type:"Post Inventory",playerId:playerObj.id});
    return await PostInventory(playerObj.id,playerObj.inventory) && success;
  }
  async function GetPlayerFromLogin(username,password) {
    var sql = "SELECT * from Player where username='"+username+"'";
    console.log(sql);
    var rows = await query(sql);
    if (rows != null && rows[0] != null) {
      var row = rows[0];
      if (bcrypt.compareSync(password,row.password)) {
       delete row.password;
       row["attackTimer"] = 0;
       row["deathTimer"] = null;
       //TODO: Item table
       row["inventory"] = await GetPlayerInventory(row.id);
       row["weapon"] = (row.weaponId != null || row.weaponId <= 0) ? await ReadItem(row.weaponId) : null;
       return row;
      }
    }
    return null;
  }
  async function GetPlayerInventory(playerId) {
    var inv = {};
    var sql = "SELECT i.* from Item i LEFT JOIN Inventory v on i.id = v.itemId WHERE v.playerId="+playerId;
    console.log(sql);
    var rows = await query(sql);
    if (rows != null && rows.length > 0) {
      for (var i = 0; i < rows.length ; i++) {
        var item = rows[i];
        if (inv[item.definitionId] == null) inv[item.definitionId] = [];
        inv[item.definitionId].push(item);
      }
    }
    return inv;
  }
  async function GetPlayerFromId(id) {
    var sql = "SELECT * from Player where id="+id+";";
    console.log(sql);
    var rows = await query(sql);
    if (rows != null && rows[0] != null) {
      return rows[0];
    }
    return null;
  }
  async function DoesPlayerExistForUsername(username) {
    var sql = "SELECT * from Player where username='"+username+"'";
    console.log(sql);
    var rows = await query(sql);
    return (rows != null && rows[0] != null); 
  }
//end region 
//data functions
async function GetOnlinePlayers() {
  var sql= "SELECT * from Player where bIsOnline != 0";
  console.log(sql);
  var rows = await query(sql);
  return rows;
}
//end region
const Directions = {
  LEFT : 0,
  UP : 1,
  RIGHT : 2,
  DOWN : 3
}
const Monsters = {
  SLIME : 0,
}
const EffectId = {
  PUNCH : 0,
  SLASH : 1,
}
const EffectDuration = {
  PUNCH : 200, //ms
  DEATH : 200, 
}

var animations = 0;
var entityIds = 0;
var playerIds = 0;
const monMap = {};
const playerMap = {};
const itemMap = {};
const effects = [];
//const sqlite=require('sqlite3').verbose();
app.use(express.static(__dirname+'/'));
/* Just a test of this functionality, will remove bIsOnline later */
app.get("/online/players",function(req,res) {
  (async()=>{
    var output = "["
    var rows = await GetOnlinePlayers();
    if (rows != null & rows.length > 0) {
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        output+=""+row.username+", ";
      }
    }
    output += "]";
    res.send(output);
  })();
});


http.listen(8080, function(){
    console.log('listening on *:8080');
  });

io.on("connection", function(socket){
  playerIds += 1;
    console.log('a user connected');
    socket.on("register",function(data) {
      (async ()=> {
        var username = data.username;
        var password = bcrypt.hashSync(data.password,10);
        if (username != null && password != null && username.length > 0 && password.length > 0 && username.length <= 14) {
          var usernameTaken = await DoesPlayerExistForUsername(username);
          if (usernameTaken) {
            socket.emit("register",{success:false,message:"Username already exists."});
          }
          else {
            var tempPlayer = {username: username, password:password, x: 0, y:0, direction: 0, hp: 10, maxHp: 10, damage: 2, bIsOnline: 0, exp: 0, level: 1};
            var success = await PostPlayer(tempPlayer);
            if (success) {
              socket.emit("register",{success:true,message:"Account succesfully created!"});
            }
            else socket.emit("register",{success:false, message:"Something went wrong! We're sorry."})
          }
        }
        else  socket.emit("register",{success:false, message:"Username or Password left blank!"});
      })();
      //TODO:
    });
    socket.on("login",function(data) { 
      (async ()=> {
        var username = data.username;
        var password = data.password;
        if (username != null && password != null && username.length > 0 && password.length > 0 && username.length <= 14) {
          var playerObj = await GetPlayerFromLogin(username,password);
          if (playerObj != null) {
            var success = true;
            for (var key in playerMap) {
              var tempPlayer = playerMap[key];
              if (tempPlayer.id == playerObj.id) {
                success = false;
                break;
              }
            }
            if (success) {
              playerMap[socket.id] = playerObj;
              playerObj.bIsOnline = 1;
              await PostPlayer(playerObj);
              socket.emit("join",{id:socket.id,players:playerMap, monMap: monMap, motd: MOTD});
            }
            else {
              socket.emit("login",{success:false,message:"Account already logged in!"});
            }
          }
          else {
            socket.emit("login",{success:false,message:"Invalid username or password."});
          }
        }
        else socket.emit("login",{success:false,message:"Invalid username or password."});
      })();
    });
    //playerMap[socket.id] = {x:0,y:0, direction: 0, isMoving: false, id : playerIds, name: "Player " + playerIds, attackTimer: 0, hp: 10, maxHp: 10, damage: 2}
   
    socket.on("move",function(data) {
        //console.log("Recieved a move request");
        if (playerMap[socket.id] == null) return;
        var tempPlayer = playerMap[socket.id];
        /* Moving off the map*/
        if (data.x <= 0) data.x = 0;
        if (data.x >= (64*20)-64) data.x = 64*19;
        if (data.y <= 0) data.y = 0;
        if (data.y >= 64*19) data.y = 64*19;

      /* other entities */
      if (!canMove(data.x,data.y,socket.id) && tempPlayer.hp > 0) {
        data.x = playerMap[socket.id].x;
        data.y = playerMap[socket.id].y;
      }
        playerMap[socket.id].x = data.x;
        playerMap[socket.id].y = data.y;
        playerMap[socket.id].direction = data.direction;
        playerMap[socket.id].isMoving = data.isMoving;
        //sendUpdate();
    });
    socket.on("pickup",function(data) {
      var tempPlayer = playerMap[socket.id];
      if (tempPlayer != null && itemMap[data.id] != null) {
       
        var item = itemMap[data.id];
        var canPickup = Math.abs(tempPlayer.x - item.x <= 64) && Math.abs(tempPlayer.y - item.y <= 64);
        if (canPickup) {
          if (tempPlayer.inventory == null) tempPlayer.inventory = {};
          givePlayerItem(tempPlayer,item.definitionId,item.amount*1);
          socket.emit("pickup",{success:true,data:item});
          delete itemMap[data.id];
          }
      }
    });
    socket.on("action",function(data) {
      var tempPlayer = playerMap[socket.id];
      if (tempPlayer != null) {
        var x = tempPlayer.x + ((tempPlayer.direction == Directions.LEFT) ? -64 : (tempPlayer.direction == Directions.RIGHT) ? 64 : 0);
        var y = tempPlayer.y + ((tempPlayer.direction == Directions.UP) ? -64 : (tempPlayer.direction == Directions.DOWN) ? 64 : 0);

        for (var k in monMap) {
          var tempMon = monMap[k];
          if (tempMon != null && tempMon.x == x && tempMon.y == y) {
            if (tempMon.type == 1 && tempMon.shopId != null) {
              var tempShop = Shop.getShop(tempMon.shopId);
              socket.emit("OpenShop",{shop:tempShop});
            }
            break;
          }
        }
      }
    });
    socket.on("UseItem",function(data) {
      (async ()=>{
      var tempPlayer = playerMap[socket.id];
      var itemId = data.itemId;
      var itemDefId = data.itemDefId;
      if (tempPlayer != null && itemId != null && itemDefId != null) {
        var itemList = tempPlayer.inventory[itemDefId];
        var success = itemList != null && itemList.length > 0;
        if (success) {
          var myItem = null;
          var itemIndex = 0;
          for (var i = 0; i < itemList.length; i++) {
            if (itemList[i].id==itemId) {
              myItem = itemList[i];
              itemIndex = i;
              break;
            }
          }
          if (myItem != null) {
            switch (myItem.type) {
              case ItemType.CONSUMABLE:
              //Health potion
              tempPlayer.hp -= myItem.damage;
              if (tempPlayer.hp > tempPlayer.maxHp) tempPlayer.hp = tempPlayer.maxHp;
              myItem.amount-=1;
              if (myItem.amount == 0) {
                await RemoveItemFromInventory(tempPlayer.id,myItem.id);
                itemList.splice(itemIndex,1);
              }
              await sendUpdate();
              socket.emit("UseItem",{success:true});
              break;
              case ItemType.WEAPON:
                //EQUIP Weapon
                if (tempPlayer.weaponId == myItem.id) {
                  tempPlayer.weaponId = null
                  tempPlayer.weapon = null;
                }
                else  {
                  tempPlayer.weaponId = myItem.id;
                  tempPlayer.weapon = myItem;
                 }
                await sendUpdate();
                socket.emit("UseItem",{success:true});
                break;
              default:
                socket.emit("UseItem",{success:false});
            }
          }
        }
        else {
          socket.emit("UseItem",{success:false});
        }
      }
      else {
        socket.emit("UseItem",{success:false});
      }
    })();
    });
    socket.on("DropItem", function(data) {
      ( async ()=> {
      var tempPlayer = playerMap[socket.id];
      if (tempPlayer != null) {
        var item = playerHasItem(tempPlayer,data.itemId);
        if (item != null) {
          await playerDropItem(tempPlayer,item.id);
          await sendUpdate();
          socket.emit("DropItem",{success:true});
        }
        else socket.emit("DropItem",{success:false});
      }
      else socket.emit("DropItem",{success:false});
    })();
    });
    socket.on("BuyItem", function(data) {
      var tempPlayer = playerMap[socket.id];
      if (tempPlayer != null) {
        var shop = Shop.getShop(data.shopId);
        var itemList = data.itemDefs;
        for (var i = 0; i < itemList.length; i++) {
          var item = Item.createItemFromDefinition(ItemDefinitions[itemList[i]]);
          var tokenCount = tempPlayer.inventory["TOKEN"];
          if (tokenCount != null && tokenCount.length > 0) {
            tokenCount = tokenCount[0].amount;
          }
          else tokenCount = 0;
          var cost = Shop.getCostForItem(shop,item.definitionId);
          console.log(cost);
          if (shop != null && item != null && cost <= tokenCount) { //TODO: check cost;
            if (tempPlayer.inventory == null) tempPlayer.inventory = {};
            if (cost > 0) {
              var tokenItem = tempPlayer.inventory["TOKEN"][0];
              tokenItem.amount -= cost;
              givePlayerItem(tempPlayer,item.definitionId,item.amount);
            }
          }
        }
        sendUpdate();
        socket.emit("BuyItem",{success:true});
        socket.emit("OpenShop",{shop:shop});
      }
      else socket.emit("BuyItem",{success:false});
    });
    socket.on("attack",function(data) {
     
      if (playerMap[socket.id].attackTimer == 0) {
        playerMap[socket.id].isAttacking = true;
        playerMap[socket.id].attackTimer = 200;
        var tempPlayer = playerMap[socket.id];
        var x = tempPlayer.x + ((tempPlayer.direction == Directions.LEFT) ? -64 : (tempPlayer.direction == Directions.RIGHT) ? 64 : 0);
        var y = tempPlayer.y + ((tempPlayer.direction == Directions.UP) ? -64 : (tempPlayer.direction == Directions.DOWN) ? 64 : 0);
        var currentTime = (new Date()).toString();
        var victim = isHit(x,y,socket.id);
        var totalDamage = tempPlayer.damage + ((tempPlayer.weapon == null) ? 0 : tempPlayer.weapon.damage);
        //console.log({baseDamage: tempPlayer.damage, weapon: tempPlayer.weapon, totalDamage:totalDamage});
        if (victim != null) {
          if (victim.type == NetworkEffect.MONSTER) {
            var tempMon = monMap[victim.id];
            tempMon.hp -= totalDamage;
            //TODO: Check player for weapon equipped!
            if (tempPlayer.weapon == null) {
              NetworkEffect.addEffectOnMonster(victim.id,EffectId.PUNCH,EffectDuration.PUNCH);
            }
            else  NetworkEffect.addEffectOnMonster(victim.id,EffectId.SLASH,EffectDuration.PUNCH);
              
            if (tempMon.hp <= 0 && tempMon.type != 1) {
              var tempChance = Math.random()*100;
              tempPlayer.exp += tempMon.exp;
              checkLevelUp(socket);
              if (tempChance >= 50) Item.spawnItemFromDefinition(null,tempMon.x,tempMon.y,ItemDefinitions.TOKEN);
            }
          }
          else if (victim.type == NetworkEffect.PLAYER) {
            var tempTarget = playerMap[victim.id];
            tempTarget.hp -= totalDamage;

            if (tempPlayer.weapon == null) NetworkEffect.addEffectOnPlayer(victim.id,EffectId.PUNCH,EffectDuration.PUNCH);
            else NetworkEffect.addEffectOnPlayer(victim.id,EffectId.SLASH,EffectDuration.PUNCH);

            if (tempTarget.hp <= 0) {
              tempPlayer.exp += tempTarget.level;
              checkLevelUp(socket);
              if (tempTarget.inventory != null) {
                for (var k in tempTarget.inventory) {
                  var itemList = tempTarget.inventory[k];
                  for (var i = 0; i < itemList.length; i++) {
                    Item.spawnItem(null,tempTarget.x,tempTarget.y,itemList[i]);
                    RemoveItemFromInventory(tempPlayer.id,itemList[i].id);
                  }
                }
                tempTarget.inventory = {};
                tempTarget.weapon = null;
                tempTarget.weaponId = null;
              }
            }
            //if (tempMon.hp <= 0) Item.spawnItemFromDefinition(null,mon.x,mon.y,ItemDefinitions.GOLD);
          }
        }
       
      }
      
      /*
        TODO: DAMAGE LOGIC HERE

      */
      
    });
    socket.on('chat', function(data) {
      console.log("Reiceved chat request!");
      if (playerMap[socket.id] != null) {
        var player = playerMap[socket.id];
        var message = data.message;
        //check for commands
        if (message[0] == "/" && (player.username == "Adam" || player.username=="Test")) {
          var commandString = message.substring(1,message.length);
          var parts = commandString.split(" ");
          if (parts[0] == "giveItem") {
            var itemDefId = parts[1];
            if (itemDefId == null) return;
            itemDefId = itemDefId.toUpperCase();
            var amount = parts[2];
            if (amount == null) amount = 1;
            if (ItemDefinitions[itemDefId] != null) {
                givePlayerItem(player,itemDefId,amount*1);
            }
          }
        }
        else {
          chatLog.push(player.username + ": " + message + "\n");
          if (message != null && message.trim().length > 0) {
            io.emit("chat",{log: chatLog, message: player.username + ": " + message + "\n"});
          }
        }
      }

    });
    socket.on('disconnect', function(){
        console.log('user disconnected');
        (async ()=> {
          if (playerMap[socket.id] != null) playerMap[socket.id].bIsOnline = 0;
          await PostPlayers();
          playerMap[socket.id] = null;
          delete playerMap[socket.id];
        })();
       
        //sendUpdate();
      });
});

async function PostPlayers() {
    for (var k in playerMap) {
      await PostPlayer(playerMap[k]);
    }
}
function addMonster(monType,x,y, respawnTime=1000/*ms*/) {
  entityIds += 1;
  if (monType == 0) {
    monMap[entityIds] = {type : monType, x : x, y : y, id: entityIds, isMoving : false, direction : Directions.DOWN, name: "Slime", hp: 4, maxHp: 5, damage: 1, spawnX: x, spawnY: y, respawnTime:respawnTime, respawnTimer: 0, isDead:false, exp:1, graphics:"mon_slime"};
  }
  else if (monType == 1) {
    monMap[entityIds] = {type : monType, x : x, y : y, id: entityIds, isMoving : false, direction : Directions.DOWN, name: "Shopkeeper", hp: 20, maxHp: 20, damage: 1, spawnX: x, spawnY: y, respawnTime:respawnTime, respawnTimer: 0, isDead:false, exp:0, graphics:"spr_shopkeeper"};
  }
  return monMap[entityIds];
  io.emit("mapUpdate",{monsters:monMap});
}

//LEVEL UP STUFF
function checkLevelUp(socket) {
  var playerId = socket.id;
  var player = playerMap[playerId];
  if (player != null) {
    if (player.exp >= getExpForLevel(player.level+1)) {
      var infoText = "<br>Congrats! You leveled up! <br><b>Details</b><br><br><i>"
      infoText += "Level: " + player.level + " to " + (player.level+1) + " <br>";
      player.level +=1;
      if (player.level % 3 == 0) {
        infoText += "Damage: " + player.damage + " to " + (player.damage+1) + " <br>";
        player.damage += 1;
       
      }
      infoText += "Max HP: " + player.maxHp + " to " + (player.maxHp+1) + " <br></i>";
      player.maxHp += 1;
      player.hp = player.maxHp;
      PostPlayer(player);
      console.log(player.username + " leveled up! " + (player.level-1) + " --> " + (player.level));
      socket.emit("UIShowPanel",{title:"Level Up",message:infoText});
    }
  }
}
function getExpForLevel(level, startExp=10) {
  if (level == 1) return startExp;
  var balance = (getExpForLevel(level-1) + getExpForLevel(level-1));
  return  balance + (balance *.1);
}
//END LEVEL UP STUFF
//MONEY STUFF
//END MONEY STUFF
function Init() {


  var shopkeeper = addMonster(1,512,64,60000);
  shopkeeper.shopId = Shop.addShop("Item Shop",[{item:Item.createItemFromDefinition(ItemDefinitions.HEALTH_POTION_SMALL),cost: 10},{item:Item.createItemFromDefinition(ItemDefinitions.HEALTH_POTION_MED),cost: 30},{item:Item.createItemFromDefinition(ItemDefinitions.WOODEN_SWORD), cost: 30}]).id;

  addMonster(0,2*64,5*64,2000);
  addMonster(0,2*64,6*64,2000);
  addMonster(0,5*64,5*64,2000);
  addMonster(0,5*64,6*64,2000);

  addMonster(0,10*64,10*64,2000);
  addMonster(0,10*64,12*64,2000);
  addMonster(0,13*64,13*64,2000);
  addMonster(0,13*64,14*64,2000);
}
function isHit(targetX,targetY,id) {
  for (var pk in playerMap) {
    var temp = playerMap[pk];
    if (temp.x == targetX && temp.y == targetY && pk != id && temp.hp > 0) return {id: pk,target:temp,type:NetworkEffect.PLAYER};
  }
  for (var mk in monMap) {
    var temp = monMap[mk];
    if (temp.x == targetX && temp.y == targetY && mk != id && temp.hp > 0) return {id: mk,target:temp,type:NetworkEffect.MONSTER};
  }
  return null;
}
function canMove(targetX,targetY,id) {
  for (var pk in playerMap) {
    var temp = playerMap[pk];
    if (temp.x == targetX && temp.y == targetY && pk != id) return false;
  }
  for (var mk in monMap) {
    var temp = monMap[mk];
    if (temp.x == targetX && temp.y == targetY && mk != id && temp.hp > 0) return false;
  }
  return true;
}
var lastTime = (new Date()).getTime();
var moveTimer = 0;
var monsterWanderDistance = 64*4;
function Update() {
  var currentTime = (new Date()).getTime();
  var delta = currentTime-lastTime;
  moveTimer += delta;
 
 
    for (var k in monMap) {
      var mon = monMap[k];
      if (mon.hp <= 0) {
        mon.respawnTimer += delta;
        if (mon.respawnTimer >= mon.respawnTime) {
          warpEntity(k,mon.spawnX,mon.spawnY,NetworkEffect.MONSTER);
          mon.hp = mon.maxHp;
          mon.respawnTimer = 0;
        }
      }
       /* Testing monster movement on the network! */
      if (moveTimer >= 1000 && mon.type != 1) {
        if (k % 2== 0) {
          if (mon.x >= mon.spawnX+500 || mon.x >= 19*64) mon.direction = Directions.LEFT;
          else if (mon.x <= 0 || mon.x <= mon.spawnX-500) mon.direction = Directions.RIGHT

          if (mon.direction != Directions.LEFT) mon.direction = Directions.RIGHT;
          var testX = mon.x;

          testX += (mon.direction == Directions.LEFT) ? -64 : 64;
          if (canMove(testX,mon.y,k)) {
            mon.x = testX;
          }
          else mon.direction = (mon.direction == Directions.LEFT) ? Directions.RIGHT : Directions.LEFT;
        }
        else {
          if (mon.y >= mon.spawnY+500 || mon.y >= 19*64) mon.direction = Directions.UP;
          else if (mon.y <= 0 || mon.y <= mon.spawnY-500) mon.direction = Directions.DOWN;
        

          var testY = mon.y;
          testY += (mon.direction == Directions.UP) ? -64 : 64;
          if (canMove(mon.x,testY,k)) {
            mon.y = testY;
          }
          else mon.direction = (mon.direction == Directions.UP) ? Directions.DOWN : Directions.UP;
        }
        mon.isMoving = true;
    }
    
  }
  if (moveTimer >= 1000) { moveTimer = 0;} //console.log("Sent a monster move update!");
  for (var k in playerMap) {
    var tempPlayer = playerMap[k];
    playerMap[k].attackTimer -= delta;
    if (tempPlayer.attackTimer <= 0) {
      tempPlayer.isAttacking= false;
      tempPlayer.attackTimer = 0;
    }
    if (tempPlayer.hp <= 0) {
      if (tempPlayer.deathTimer == null) {
        tempPlayer.deathTimer = 1000;
      }
      else if (tempPlayer.deathTimer > 0) {
        tempPlayer.deathTimer -= delta;
      }
      else if (tempPlayer.deathTimer <= 0) {
        warpEntity(k,0,0,NetworkEffect.PLAYER);
        tempPlayer.hp = tempPlayer.maxHp;
        tempPlayer.deathTimer = null;
      }
    }
  }
  NetworkEffect.Update(delta);
 sendUpdate();
  lastTime = (new Date()).getTime();
}




const NetworkEffect = {
  PLAYER : 0,MONSTER : 1,POSITION : 2,    
  effects: {},
  addPlayerFunctionEffect : (playerId,func, duration) => {
    NetworkEffect.effects[++animations] = ({type: NetworkEffect.PLAYER, id: playerId, func: func, duration:duration});
  },
  addEffectOnPlayer : (playerId,effectId, duration ) => {
    NetworkEffect.effects[++animations] = ({type: NetworkEffect.PLAYER, id: playerId, effectId: effectId, duration: duration});
  },
  addEffectOnMonster : (monsterId, effectId, duration) => {
    NetworkEffect.effects[++animations] = ({type: NetworkEffect.MONSTER, id: monsterId, effectId : effectId, duration : duration});
  },
  clearEffects : () => {
    NetworkEffect.effects = {};
  },
  Update : (delta) => {
    var removal = [];
    for (var k in NetworkEffect.effects) {
      var effect = NetworkEffect.effects[k];
      effect.duration -= delta;
      if (effect.duration <= 0) removal.push(k);
    }
    for (var i = 0; i < removal.length; i++) {
      delete NetworkEffect.effects[removal[i]];
    }
  },
}

const ItemType = {
  CONSUMABLE : 0,
  WEAPON : 1,
  ARMOR : 2,
  ACCESSORY : 3,
  MATERIAL : 4,
  MISC : 5,
}
//var itemTableSchema = {id : "integer", name : "text", desc : "text", durability : "integer", type : "integer", rarity : "integer", graphic : "text" }
const ItemDefinitions = {
  TOKEN : {definitionId : "TOKEN", name: "Token", desc: "A mysterious coin dropped by monsters. Some NPC's are known to use it as currency.", durability: 1, type: ItemType.MISC, maxAmount: 1000000, amount: 1, rarity: 1, graphic: "spr_token"},
  HEALTH_POTION_SMALL : {definitionId : "HEALTH_POTION_SMALL", name : "Weak Health Potion", desc : "A red, fizzy drink that restores a small amount of health. WARNING: A LITTLE BITTER.", 
                  durability: 1, type: ItemType.CONSUMABLE, rarity: 0, graphic : "spr_potion_health_small", amount:1, maxAmount: 10, damage: -5},
  HEALTH_POTION_MED : {definitionId: "HEALTH_POTION_MED", name : "Health Potion", desc : "A red, fizzy drink that restores a moderate amount of health. WARNING: KINDA BITTER.", 
  durability: 2, type: ItemType.CONSUMABLE, rarity: 0, graphic : "spr_potion_health_med",amount:1, maxAmount: 10, damage: -10},
  HEALTH_POTION_LARGE : {definitionId: "HEALTH_POTION_LARGE",name : "Fine Health Potion", desc : "A red, fizzy drink that restores a large amount of health. WARNING:  BITTER.", 
  durability: 2, type: ItemType.CONSUMABLE, rarity: 0, graphic : "spr_potion_health_large",amount:1, maxAmount: 10, damage: -20},
  WOODEN_SWORD : {definitionId: "WOODEN_SWORD",name : "Wooden Sword", desc : "A wooden sword. Well, more like a stick. But it's your stick, and that's what matters.", 
  durability: 100, damage : 2,type: ItemType.WEAPON, rarity: 0, graphic : "spr_sword_wood", amount: 1, maxAmount: 1},
  WOODEN_AXE : {definitionId: "WOODEN_AXE",name : "Wooden Axe", desc : "Sharpened wood that helps you cut down more wood. Go figure. ", 
  durability: 100, damage : 1,type: ItemType.WEAPON, rarity: 0, graphic : "spr_axe_wood",amount: 1, maxAmount: 1},
  WOOD : {definitionId: "WOOD",name : "Chunk of Wood", desc : "A nice chunk  of wood. Taken from some sad tree somewhere.", 
  durability: 1, damage : 0,type: ItemType.MATERIAL, rarity: 0, graphic : "spr_wood",amount: 1, maxAmount: 1},
}
const Item = {
  count : 0,
  createItemFromDefinition : function(def) {
    var newItem = {id: Item.count++};
    for (var k in def) {
      newItem[k] = def[k];
    }
    return newItem;
  },
  spawnItem : function(map,x,y,item) {
    item.x = x;
    item.y = y;
    itemMap[item.id] = item;
    return item;
  },
  spawnItemFromDefinition : function(map,x,y,def) {
    return Item.spawnItem(map,x,y,Item.createItemFromDefinition(def));
  }
}
const Shop = {
  shopCounter : 0,
  shops : {},
  addShop : function(title,items) {
    Shop.shopCounter += 1;
    Shop.shops[Shop.shopCounter] = {};
    var myShop = Shop.shops[Shop.shopCounter];
    myShop.items = items;
    myShop.id = Shop.shopCounter;
    myShop.title;
    return myShop;
  },
  getShop : function(id) {
    return Shop.shops[id];
  },
  getCostForItem : function(shop,definitionId) {
    //console.log(shop);
    for (var i = 0; i < shop.items.length; i++) {
      var item = shop.items[i];
      //console.log(item);
      if (item.item.definitionId == definitionId) return item.cost;
    }
    return null;
  }
}

async function sendUpdate() {
  for (var k in playerMap) {
    var player = playerMap[k];
    player.tnl = getExpForLevel(player.level+1)-player.exp;
    player.prevLvlExp = getExpForLevel(player.level);
    
  }
  await io.emit("update",{playerMap:playerMap,monMap:monMap,effects: NetworkEffect.effects,chatLog: chatLog, itemMap: itemMap});
}

async function warpEntity(id,x,y,type) {
  var temp = {};
  if (type == NetworkEffect.PLAYER) {
    temp = playerMap[id];
  }
  else if (type == NetworkEffect.MONSTER) {
    temp = monMap[id];
  }
  temp.x = x;
  temp.y = y;
  await io.emit("warp",{id:id,x:x,y:y,type:type});
}
function playerHasItem(player,itemId) {
  for (var def in player.inventory) {
    var itemList = player.inventory[def];
    for (var i = 0; i < itemList.length; i++) {
      var item = itemList[i];
      if (item.id == itemId) {
        return item;
      }
    }
  }
  return null;
}
function givePlayerItem(player,itemDefId, amount=1) {
  var giveAmount = amount;
  var newItem = Item.createItemFromDefinition(ItemDefinitions[itemDefId]); 
  if (newItem == null) return;
  /* Create new item section if it needs to happen*/
  if (player.inventory[itemDefId] == null) {
    player.inventory[itemDefId] = [];
  }
  if (player.inventory[itemDefId].length == 0) {
    if (giveAmount > newItem.maxAmount) {
      newItem.amount = newItem.maxAmount;
      giveAmount -= newItem.maxAmount;
    }
    else {
      newItem.amount = giveAmount;
      giveAmount = 0;
    }
    player.inventory[itemDefId].push(newItem);
  }
  /* Try to use the items that are already there.*/
  if (giveAmount > 0) {
    for (var i = 0; i < player.inventory[itemDefId].length; i++) {
      var item = player.inventory[itemDefId][i];
      var freeSpace = item.maxAmount - item.amount;
      if (freeSpace > 0) {
        if (freeSpace >= giveAmount) {
          item.amount += giveAmount;
          giveAmount = 0;
        }
        else {
          item.amount += freeSpace;
          giveAmount -= freeSpace;
        }
      }
    }
  }
  /* Create stacks until done.*/
  if (giveAmount > 0) {
    while (giveAmount > 0) {
      newItem = Item.createItemFromDefinition(ItemDefinitions[itemDefId]); 
      if (giveAmount >= newItem.maxAmount) {
        newItem.amount = newItem.maxAmount;
        giveAmount -= newItem.maxAmount;
      }
      else {
        newItem.amount = giveAmount;
        giveAmount = 0;
      }
      player.inventory[itemDefId].push(newItem);
    }
  }
}
async function playerDropItem(player,itemId) {
  for (var def in player.inventory) {
    var itemList = player.inventory[def];
    var removeIndex = -1;
    for (var i = 0; i < itemList.length; i++) {
      var item = itemList[i];
      if (item.id == itemId) {
        Item.spawnItemFromDefinition(player.map,player.x,player.y,ItemDefinitions[item.definitionId]);
        item.amount -=1;
        if (item.amount <= 0) {
          removeIndex = i;
         await RemoveItemFromInventory(player.id,itemId);
        }
      }
    }
    if (removeIndex != -1) itemList.splice(removeIndex,1);
  }
}

/* Save on quit */

process.on('exit', function() {
  try {
    (async ()=> {
      await PostPlayers();
    })
  }
  catch (ex) {
    console.log("Failed to save player data.")
  }
});

//MAIN
(async ()=> {
  Item.count = await getLastItemId();
  Init();
  setInterval(Update,SERVER_TICK);
})();
