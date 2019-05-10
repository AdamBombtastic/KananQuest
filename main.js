const GAME_WIDTH = 640, GAME_HEIGHT = 480;

const GAME_TICK = 10; //ms;
const RENDER_TICK = 20; //ms

const Directions = {
    LEFT : 0,
    UP : 1,
    RIGHT : 2,
    DOWN : 3
}


var canvas = document.getElementById("myCanvas");
canvas.oncontextmenu = function(e) {
    e.preventDefault();
}
var context = canvas.getContext("2d");
var startTime = (new Date()).getTime();
var lastFrameTime = null;
var player = null;
var map = null;
const TextureMap = {};
var hasStarted = false;
var renderTimer = 0;



var frameIndex = 0;

UI.mode = UIModes.NORMAL;

async function Load() {
    await loadTexture("eff_punch","graphics\\eff_punch.png");
    await loadTexture("eff_slash","graphics\\eff_slash.png");
    await loadTexture("map_temp","graphics\\temp_map.jpg");
    await loadTexture("crap_tiles","graphics\\crap_tiles.png");
    await loadTexture("mon_slime","graphics\\mon_slime.png");
    await loadTexture("spr_kanan","graphics\\spr_Kanan.png");
    await loadTexture("spr_token","graphics\\spr_token.png");
    await loadTexture("spr_sword_wood","graphics\\spr_sword_wood.png");
    await loadTexture("spr_shopkeeper","graphics\\spr_shopkeeper.png");
    await loadTexture("spr_potion_health_small", "graphics\\spr_potion_health_small.png");
    await loadTexture("spr_potion_health_med", "graphics\\spr_potion_health_med.png");
    await loadTexture("spr_potion_health_large", "graphics\\spr_potion_health_large.png");
}
function Init() 
{
   UI.setCanvasOffset(canvas);
   
   //SHOW MOTD 
   var motdPanel = UI.getUIPanel("MOTD",GAME_WIDTH/2,GAME_HEIGHT/2,400,225,true);
   motdPanel.render();
   motdPanel.getContentDiv().innerHTML = Model.motd;

   NetworkEvents.addListener(Client);
   hasStarted = true;
   map = new TestGrid();//new Sprite("map_temp",800,555,1);
   //player = new Player("spr_kanan",0,0);
   var chatInput = document.getElementById("chatInput");
   chatInput.onfocus = function() {
       UI.mode = UIModes.CHAT;
   }
   chatInput.onblur = function() {
    UI.mode = UIModes.NORMAL;
   }
   document.getElementById("chatBtn").onclick = ()=>{doChatMessage(true)};
   window.setInterval(Update,GAME_TICK);
}
function Update() {
    if (lastFrameTime == null) lastFrameTime = (new Date()).getTime();
    var delta = (new Date()).getTime() - lastFrameTime;

    InputManager.state = (Object.keys(UI.elements).length > 0) ? InputManager.States.UI  : InputManager.States.GAME;
    Client.UpdatePlayers(delta);
    Client.UpdateNpcs(delta);
    if (Client.playerSpriteMap[Model.playerId] != null) {
        Camera.setTarget(Client.playerSpriteMap[Model.playerId].sprite);
    }
    Client.UpdateItems(delta);
    Client.UpdateEffects(delta);
    Camera.Update(delta);
    if (renderTimer >= RENDER_TICK) {
        Render(delta);
        renderTimer = 0;
    }
    else renderTimer += delta;
    
    lastFrameTime = (new Date()).getTime();
    
    
}

function Render(delta) {

    if (DEBUG_DELTA) console.log("Delta Time:" + delta);
  
    clearScreen(/*"#55bb66"*/);
   map.Render(context);
   Client.RenderItems(context);
   Client.RenderNpcs(context);
   Client.RenderPlayers(context);
  
   Client.RenderEffects(context);
   //player.Render(context);

}

function clearScreen(color="#000000") {
    context.fillStyle = color;
    context.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
}

async function StartGame() {
    document.getElementById("loginContainer").hidden = true;
    document.getElementById("chatContainer").hidden = false;
    canvas.hidden = false;
    await Load();
    Init();
}
//StartGame();


//Input Functions
const InputManager = {
    States : {GAME : 0, UI : 1},
    events : {},
    mousePos : {x:0, y: 0},
    state : 0,
    doMousePos : function(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        mousePos =  {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
    },
    registerKey : (key_code, event, func, context=this) => {
        if (InputManager.events[key_code] == null) {
            InputManager.events[key_code] = {keyup: [], keydown: [], keypress: [], mousedown: [], mouseup : []};
        }
        InputManager.events[key_code][event].push({func:func,context:context});
    },
    executeEvent : (event,key_code) => {
        if (DEBUG_INPUT) console.log("Event: " + event + " Key: " + key_code);
        //TODO: Have the input manager send the input to the UI code.
            if (InputManager.events[key_code] == null /*|| InputManager.state != InputManager.States.GAME*/) return;
            var keyEvent = InputManager.events[key_code][event];
            if (keyEvent != null) {
                for (var i = 0; i < keyEvent.length; i++) {
                    keyEvent[i].func.call(keyEvent[i].context);
                }
            }
    }
}

window.addEventListener("keypress",(ev)=> {
   InputManager.executeEvent("keypress",ev.code); 
   if (DEBUG_INPUT)console.log(ev.code);
});
window.addEventListener("keydown",(ev)=>{
    InputManager.executeEvent("keydown",ev.code); 
    if (DEBUG_INPUT)console.log(ev.code);
});
window.addEventListener("keyup",(ev)=>{
    InputManager.executeEvent("keyup",ev.code); 
    if (DEBUG_INPUT)console.log(ev.code);
});
window.addEventListener("mousedown", (ev) => {
    InputManager.doMousePos(canvas,ev);
    InputManager.executeEvent("mousedown","mouseButton"+ev.button);
});
window.addEventListener("mouseup", (ev)=> {
    InputManager.doMousePos(canvas,ev);
    InputManager.executeEvent("mouseup","mouseButton"+ev.button);
});
window.addEventListener("mousemove",(ev)=> {
    InputManager.doMousePos(canvas,ev);
    InputManager.executeEvent("mousemove","pointer");
});

//Network Functions
const Client = {
    playerSpriteMap : {},
    npcSpriteMap : {},
    effectMap : {},
    itemMap : {},
    NetworkEvent : (event,data) => {
        if (event == "update") {
            
        }
        else if (event == "warp") {
            var tempEnt = data.type == NetworkEffectType.PLAYER ? Client.playerSpriteMap[data.id] : Client.npcSpriteMap[data.id];
            if (tempEnt != null) {
                tempEnt.targetX = data.x;
                tempEnt.targetY = data.y;
                tempEnt.sprite.x = data.x;
                tempEnt.sprite.y = data.y;
            }
        }
    },
    UpdatePlayers : (delta) => {
        for (var k in Model.playerMap) {
            var temp = Model.playerMap[k];
            var isMe = (Model.playerId == k);
            if (temp == null && Client.playerSpriteMap[k] != null) {
                Client.playerSpriteMap[k] = null;
                continue;
            }
            if (Client.playerSpriteMap[k] == null && temp != null) {
               
                Client.playerSpriteMap[k] = new Player("spr_kanan",temp.x,temp.y,isMe);
            }
            if (temp != null) {
                Client.playerSpriteMap[k].isMoving = temp.isMoving;
                Client.playerSpriteMap[k].direction = temp.direction;
                Client.playerSpriteMap[k].targetX = temp.x;
                Client.playerSpriteMap[k].targetY = temp.y;
                Client.playerSpriteMap[k].name = temp.username;
                Client.playerSpriteMap[k].attackTimer = temp.attackTimer;
                Client.playerSpriteMap[k].deathTimer = temp.deathTimer;
                Client.playerSpriteMap[k].hp = temp.hp;
                Client.playerSpriteMap[k].maxHp = temp.maxHp;
                Client.playerSpriteMap[k].exp = temp.exp;
                Client.playerSpriteMap[k].tnl = temp.tnl;
                Client.playerSpriteMap[k].prevLvlExp = temp.prevLvlExp;
                Client.playerSpriteMap[k].level = temp.level;
                if (Client.playerSpriteMap[k].weaponObj == null && temp.weapon != null) Client.playerSpriteMap[k].weaponObj = new WeaponObject(Client.playerSpriteMap[k],temp.weapon);
                else if (Client.playerSpriteMap[k].weaponObj != null && temp.weapon != null) {
                    if (Client.playerSpriteMap[k].weaponObj.data.id != temp.weapon.id) Client.playerSpriteMap[k].weaponObj = new WeaponObject(Client.playerSpriteMap[k],temp.weapon);
                }
                else if ( temp.weapon == null) Client.playerSpriteMap[k].weaponObj = null;
                //if (!isMe) {
                    
                    Client.playerSpriteMap[k].isAttacking = temp.isAttacking;
                //}
                Client.playerSpriteMap[k].Update(delta);
            }
        }
        
    },
    RenderPlayers : (context) => {
        for (var k in Client.playerSpriteMap) {
            var temp = Client.playerSpriteMap[k];
            if (temp != null && Model.playerMap[k] != null) {
                temp.Render(context);
            }
        }
    },
    UpdateNpcs : (delta) => {
        for (var k in Model.monMap) {
            var temp = Model.monMap[k];
            if (temp == null && Client.npcSpriteMap[k] != null) {
                Client.npcSpriteMap[k] = null;
                continue;
            }
            if (Client.npcSpriteMap[k] == null && temp != null) {
                if (temp.type == Monsters.SLIME) {
                    Client.npcSpriteMap[k] = new MonSlime(temp.x,temp.y);
                }
                else Client.npcSpriteMap[k] = new NPC(temp.graphics,temp.x,temp.y);
            }
            if (temp != null) {
                Client.npcSpriteMap[k].isMoving = temp.isMoving;
                Client.npcSpriteMap[k].direction = temp.direction;
                Client.npcSpriteMap[k].targetX = temp.x;
                Client.npcSpriteMap[k].targetY = temp.y;
                Client.npcSpriteMap[k].name = temp.name;
                Client.npcSpriteMap[k].hp = temp.hp;
                Client.npcSpriteMap[k].maxHp = temp.maxHp;
                Client.npcSpriteMap[k].type= temp.type;
                Client.npcSpriteMap[k].name = temp.name;
                Client.npcSpriteMap[k].Update(delta);
                
            }
        }  
    },
    RenderNpcs : (context) => {
        for (var k in Client.npcSpriteMap) {
            var temp = Client.npcSpriteMap[k];
            if (temp != null && Model.monMap[k] != null) {
                temp.Render(context);
            }
        }
    },
    UpdateEffects : (delta) => {
        for (var k in Model.effects) {
            var modelEffect = Model.effects[k];
            if (Client.effectMap[k] == null) {
                console.log(modelEffect);
                switch (modelEffect.type) {
                    case NetworkEffectType.PLAYER:
                    var victim = Client.playerSpriteMap[modelEffect.id];
                    if (victim != null) {
                        console.log("Attack animation added.");
                        if (modelEffect.effectId == 0) {
                            Client.effectMap[k] = new PunchEffect(victim.sprite.getCenterX(),victim.sprite.getCenterY(),true);
                        }
                        else if(modelEffect.effectId == 1) {
                            Client.effectMap[k] = new SlashEffect(victim.sprite.getCenterX(),victim.sprite.getCenterY(),true);
                        }
                        Client.effectMap[k].target = victim;
                    }
                    break;
                    case NetworkEffectType.MONSTER:
                        console.log("Attack animation added.")
                        var victim = Client.npcSpriteMap[modelEffect.id];
                        if (victim != null) {
                            if (modelEffect.effectId == 0) {
                                Client.effectMap[k] = new PunchEffect(victim.sprite.getCenterX(),victim.sprite.getCenterY(),true);
                            }
                            else if(modelEffect.effectId == 1) {
                                Client.effectMap[k] = new SlashEffect(victim.sprite.getCenterX(),victim.sprite.getCenterY(),true);
                            }
                            Client.effectMap[k].target = victim;
                        }
                    break;
                    case NetworkEffectType.POSITION:
                        //Client.effectMap[k] = new PunchEffect()
                    break;
                }
            }
        }
        for (var k in Client.effectMap) {
            var clientEffect = Client.effectMap[k];
            //var modelEffect = Model.effects[k];
            if (clientEffect != null && clientEffect.isActive) {
                var victim = clientEffect.target;
                if (victim != null) {
                    clientEffect.sprite.setCenterX(victim.sprite.getCenterX());
                    clientEffect.sprite.setCenterY(victim.sprite.getCenterY());
                }
                
                clientEffect.Update(delta);
            }
        }  
    },
    RenderEffects : (context) => {
        var removal = [];
        for (var k in Client.effectMap) {
            var effect = Client.effectMap[k];
            if (effect.isActive)effect.Render(context);
            else removal.push(k);
        }
        for (var i = 0; i < removal.length; i++) {
            delete Client.effectMap[removal[i]];
        }
    },
    UpdateItems : (delta)=> {
        for (var k in Model.itemMap) {
            var modelItem = Model.itemMap[k];
            if (Client.itemMap[k] == null) {
                Client.itemMap[k] = new ItemObject(modelItem,modelItem.x,modelItem.y,false);
            }
        }
        for (var k in Model.itemMap) {
            var modelItem = Model.itemMap[k];
            var clientItem = Client.itemMap[k];
            if (clientItem != null) {
                clientItem.Update(delta);
            }
        }  
    },
    RenderItems : (context) => {
        var removal = [];
        for (var k in Client.itemMap) {
            var item = Client.itemMap[k];
            if (Model.itemMap[k] != null )item.Render(context);
            else removal.push(k);
        }
        for (var i = 0; i < removal.length; i++) {
            delete Client.itemMap[removal[i]];
        }
    }


    
}


//MAP FUNCTIONS
const Camera = {
    x : 0,
    y : 0,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    target : null,
    worldToScreenPos : (pos)=> {
        return {x : pos.x-Camera.x, y: pos.y - Camera.y}
    },
    setTarget : (obj)=> {
        Camera.target = obj;
        Camera.centerOnTarget(obj);
    },
    centerOnTarget : ()=> {
        Camera.x = (Camera.target.x - (GAME_WIDTH/2)) + (Camera.target.width/2);
        Camera.y = (Camera.target.y - (GAME_HEIGHT/2)) + (Camera.target.height/2);

        if (Camera.x < 0) Camera.x= 0;
        if (Camera.y < 0) Camera.y = 0;
        if (Camera.x > (map.width - GAME_WIDTH)) Camera.x = map.width - GAME_WIDTH;
        if (Camera.y > (map.height - GAME_HEIGHT)) Camera.y = map.height - GAME_HEIGHT;
    },
    Update : (delta)=> {
        if (Camera.target != null) {
            Camera.centerOnTarget();
        }
        
    },
}

function TestGrid() {
    this.width = 64*20;
    this.height = 64*20;
    this.tileSheet = new Sprite("crap_tiles",64,64,5);

    this.data = [
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,3,3,3,3,3,3],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,3,4,4,4,4,4],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,3,4,4,4,4,4],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,3,4,4,4,4,4],
        [0,0,0,0,0,0,0,0,2,1,1,2,0,0,3,4,4,4,4,4],
    ];

    this.Render = (context)=> {
        var startX = Math.floor(Camera.x/64);
        var startY = Math.floor(Camera.y/64);

        var endX = Math.ceil((Camera.x+Camera.width)/64);
        var endY = Math.ceil((Camera.y+Camera.height)/64);

        endX = (endX >= this.data.length) ? this.data.length : endX;
        endY = (endY >= this.data[0].length) ? this.data[0].length : endY;

        for (var i = startY; i < endY; i++) {
            for (var j = startX; j < endX; j++) {
                this.tileSheet.currentFrame = this.data[i][j];
                this.tileSheet.x = j*64;
                this.tileSheet.y = i*64;
                this.tileSheet.Draw(context);
            }
        }
    }
}

//PLAYER FUNCTIONS
function Player(spriteKey, x,y, isMyPlayer=true) {
    this.sprite = new Sprite(spriteKey,64,64,16);
    this.sprite.x = x;
    this.sprite.y = y;
    this.speed = 64; //One block over walkTime ms
    this.walkTime = 350; //ms
    this.tapTime = 60; //ms
    this.attackTime = 100; //ms

    this.isMain = isMyPlayer;
    this.name = "Player";

    this.targetX = this.sprite.x;
    this.targetY = this.sprite.y;
    this.correctionThreshold = 2;
    this.walkTimer = 0;
    this.attackTimer = 0;
    this.deathTimer = null;
    this.isAttacking = false;

    this.isMoving = false;

    this.stats = {
        fucks: 4,
        maxFucks: 4,

    }
    this.hp = 10;
    this.maxHp = 10;
    this.damage = 2;

    this.level = 1;
    this.exp = 0;
    this.tnl = 0;
    this.prevLvlExp = 0;

    this.key_up = 0;
    this.key_down = 0;
    this.key_left = 0;
    this.key_right = 0;

    this.leftButton = 0;
    this.isAnimating = false;

    this.inventoryView = null;


    this.sprite.AddAnimation("attackDown",[{frameIndex : 12, time: 300},{frameIndex : 0, time: 50},]);
    this.sprite.AddAnimation("attackUp",[{frameIndex : 13, time: 200},{frameIndex : 3, time: 100}]);
    this.sprite.AddAnimation("attackLeft",[{frameIndex : 15, time: 200},{frameIndex : 9, time: 100}]);
    this.sprite.AddAnimation("attackRight",[{frameIndex : 14, time: 200},{frameIndex : 6, time: 100}]);

    this.sprite.AddAnimation("walkDown",[{frameIndex: 1, time: 100},{frameIndex: 2, time: 100}]);
    this.sprite.AddAnimation("walkUp",[{frameIndex: 4, time: 100},{frameIndex: 5, time: 100}]);
    this.sprite.AddAnimation("walkLeft",[{frameIndex: 10, time: 100},{frameIndex: 11, time: 100}]);
    this.sprite.AddAnimation("walkRight",[{frameIndex: 7, time: 100},{frameIndex: 8, time: 100}]);

    this.weaponObj = null;//new WeaponObject(this,{graphic:"spr_sword_wood"});
    
    this.healthBar = new HealthBar({x:48,y:10},this.hp,this.maxHp);
    this.expBar = new HealthBar({x:48,y:28}, this.exp, this.exp+this.tnl, "#FFFF00");

    if (isMyPlayer) {
        this.NetworkEvent = function(event,data) {
            if ((event == "UseItem" || event == "DropItem") && this.inventoryView != null) {
                UI.removeAllElements();
                this.inventoryView = UI.showInventoryView(GAME_WIDTH/2,GAME_HEIGHT/2,Model.getMyPlayer());
            }
        }
        NetworkEvents.addListener(this);

        InputManager.registerKey("KeyW","keydown",()=>{this.key_up = this.key_up <= 0 ? 1 : this.key_up;},this);
        InputManager.registerKey("KeyA","keydown",()=>{this.key_left = this.key_left <= 0 ? 1 : this.key_left;},this);
        InputManager.registerKey("KeyS","keydown",()=>{this.key_down = this.key_down<= 0 ? 1 : this.key_down;},this);
        InputManager.registerKey("KeyD","keydown",()=>{this.key_right = this.key_right<= 0 ? 1 : this.key_right;},this);

        InputManager.registerKey("Space","keydown",()=>{

            if (UI.mode == UIModes.NORMAL) {
                var item =Model.getItemForPosition(this.sprite.x,this.sprite.y);
                console.log(item);
                if ( item != null) {
                    NetworkEvents.sendPickupRequest(item.id);
                }
                else {
                    NetworkEvents.sendActionRequest();
                }
            }
            else if (UI.mode == UIModes.PANEL) {
                if (this.inventoryView != null) {
                    this.inventoryView.remove();
                    this.inventoryView = null;
                }
                UI.removeAllElements();
                //UI.mode = UIModes.NORMAL;
            }
        },this);
    
        InputManager.registerKey("KeyW","keyup",()=>{this.key_up = 0;},this);
        InputManager.registerKey("KeyA","keyup",()=>{this.key_left = 0;},this);
        InputManager.registerKey("KeyS","keyup",()=>{this.key_down = 0;},this);
        InputManager.registerKey("KeyD","keyup",()=>{this.key_right = 0},this);

        InputManager.registerKey("KeyI","keyup", ()=>{
           
            if (this.inventoryView == null) {
                //UI.mode = UIModes.PANEL;
                this.inventoryView = UI.showInventoryView(GAME_WIDTH/2,GAME_HEIGHT/2,Model.getMyPlayer());
            }
            else {
                UI.removeAllElements();
                this.inventoryView = null;
                //UI.mode = UIModes.NORMAL;
            } 
        },this);

        InputManager.registerKey("mouseButton0","mousedown",()=>{this.leftButton = 1;},this);
        InputManager.registerKey("mouseButton0","mouseup",()=>{this.leftButton = 0;},this);

        InputManager.registerKey("Enter","keyup",()=>{
            doChatMessage();
        });

        //InputManager.registerKey("Enter","keydown",()=>{this.leftButton = 1;},this);
        //InputManager.registerKey("Enter","keyup",()=>{this.leftButton = 0;},this);
        
    }

    this.Move = (delta)=> {
        var inc = (this.speed / this.walkTime) * delta;
        if (this.targetX != this.sprite.x) {
            if (this.sprite.x > this.targetX) {
                this.sprite.x -= inc; 
                //this.direction = Directions.LEFT;
                if (this.sprite.x < this.targetX) {
                    this.sprite.x = this.targetX
                }
            }
            else if (this.sprite.x < this.targetX) {
                this.sprite.x += inc;
                //this.direction = Directions.RIGHT;
                if (this.sprite.x > this.targetX) {
                    this.sprite.x = this.targetX
                }
            }
        }
        else if (this.targetY != this.sprite.y) {
            if (this.sprite.y > this.targetY) {
                this.sprite.y -= inc;
                //this.direction = Directions.UP;
                if (this.sprite.y < this.targetY) {
                    this.sprite.y = this.targetY
                }
            }
            else if (this.sprite.y < this.targetY) {
                this.sprite.y += inc;
                //this.direction = Directions.DOWN;
                if (this.sprite.y > this.targetY) {
                    this.sprite.y = this.targetY
                }
            }
        }
        else this.isMoving = false;
        if (this.isMain) {
            NetworkEvents.sendMoveRequest(this.targetX, this.targetY,this.direction,this.isMoving);
        }

    }
    this.StopAnimation = ()=> {
        if (this.isMain) this.isAttacking = false;
        //console.log("End the attack.");
    }
    this.Attack = ()=> {
        if (this.isMain) this.isAttacking = true;
            switch (this.direction) {
                case Directions.LEFT:
                    this.sprite.PlayAnimation("attackLeft",1,true,this.StopAnimation());
                    break;
                case Directions.UP:
                    this.sprite.PlayAnimation("attackUp",1,true,this.StopAnimation());
                    break;
                case Directions.RIGHT:
                    this.sprite.PlayAnimation("attackRight",1,true,this.StopAnimation());
                    break;
                case Directions.DOWN:
                    this.sprite.PlayAnimation("attackDown",1,true,this.StopAnimation());
                    break;
                default:
                this.sprite.PlayAnimation("attackDown",1,true,this.StopAnimation());
            }
    }
    this.Update = (delta)=>{
        //this.healthBar.target = {x:this.sprite.getCenterX()-(this.healthBar.width/2),y:this.sprite.y-10}
        this.healthBar.value = this.hp;
        this.healthBar.maxValue = this.maxHp;
        this.healthBar.width = 200;
        this.healthBar.height = 18;
        this.healthBar.isOverlay = true;
        this.healthBar.Update(delta);

        if (this.level == 1) {
            this.expBar.value = this.exp;
            this.expBar.maxValue = (this.tnl + this.exp);
        }
        else {
            this.expBar.value = this.exp - this.prevLvlExp;
            this.expBar.maxValue = (this.tnl + this.exp) - this.prevLvlExp;
        }
        this.expBar.width = 150;
        this.expBar.height = 9;
        this.expBar.isOverlay = true;
        this.expBar.Update(delta);

        if (this.hp <= 0) {
            if (this.deathTimer == null) this.deathTimer = 1000;
            else if (this.deathTimer > 0) this.deathTimer -= delta;
            this.sprite.alpha = ((200)*Math.max(this.deathTimer/1000,0))/100;
            if (this.deathTimer <= 0) {
                this.deathTimer = 0;
                this.deathTimer = null;
            }
        }
        else {
            this.sprite.alpha = 1;
            this.deathTimer = null;
        }
        
        if (!this.isMoving || this.walkTimer >= (this.walkTime-10)) {
            if (DEBUG_MOVEMENT) console.log("KEY_UP: " + this.key_up + " KEY_DOWN: " + this.key_down + " KEY_LEFT: " + this.key_left + " KEY_RIGHT: " + this.key_right);
            if (this.key_up > 0 && UI.mode == UIModes.NORMAL) {
                if (this.key_up >= this.tapTime) {
                    this.targetY -= this.speed;
                }
                this.direction = Directions.UP;
                this.key_up += delta;

                this.sprite.PlayAnimation("walkUp");
            }
            else if (this.key_down > 0 && UI.mode == UIModes.NORMAL) {
                if (this.key_down >= this.tapTime) {
                    this.targetY += this.speed;
                }
                this.direction = Directions.DOWN;
                this.key_down += delta;
                this.sprite.PlayAnimation("walkDown");
            }

            else if (this.key_left > 0 && UI.mode == UIModes.NORMAL) {
                if (this.key_left >= this.tapTime) {
                    this.targetX -= this.speed;
                }
                this.direction = Directions.LEFT;
                this.key_left += delta;
                this.sprite.PlayAnimation("walkLeft");
            }
            else if (this.key_right > 0 && UI.mode == UIModes.NORMAL) {
                if (this.key_right >= this.tapTime) {
                    this.targetX += this.speed;
                }
                this.direction = Directions.RIGHT;
                this.key_right += delta;
                this.sprite.PlayAnimation("walkRight");
            }
            this.isMoving = (this.sprite.x != this.targetX || this.spriteY != this.targetY);
            if ((this.key_up + this.key_down + this.key_left + this.key_right) > 0 && UI.mode == UIModes.NORMAL) {
                NetworkEvents.sendMoveRequest(this.targetX,this.targetY,this.direction,this.isMoving);
            }
            this.walkTimer = 0;
        }

        if (this.isMoving) {
            this.Move(delta);
            this.walkTimer += delta;
        }
       
        if (!this.isAttacking) {
            if (this.direction == Directions.LEFT) {
                this.sprite.currentFrame = 9;
                this.sprite.PlayAnimation("walkLeft");
            } else if (this.direction == Directions.UP) {
                this.sprite.currentFrame = 3
                this.sprite.PlayAnimation("walkUp");
            }
            else if (this.direction == Directions.RIGHT) {
                this.sprite.currentFrame = 6
                this.sprite.PlayAnimation("walkRight");
            }
            else if (this.direction == Directions.DOWN) {
                this.sprite.currentFrame = 0;
                this.sprite.PlayAnimation("walkDown");
            }
        }


       
        //TODO: CLean this up
        if (((this.key_up + this.key_down + this.key_left + this.key_right) == 0 && this.isMain && !this.isMoving) || (!this.isMoving && !this.isMain)) {
             if (!this.isAttacking) this.sprite.StopAnimation();          
        }
        if (this.leftButton > 0 && this.isMain && !this.isAttacking && this.attackTimer <= 0 && UI.mode == UIModes.NORMAL) {
            NetworkEvents.sendAttackRequest(true);
            if (this.isMain) {
                //this.Attack();
            }
        }        

        if (this.isAttacking /*&& !this.isMain*/) {
           this.Attack();
        }
        if (this.weaponObj != null) {
            if (this.sprite.currentAnimationName == "attackRight") {
                if (this.sprite.animationFrameIndex == 0) {
                    this.weaponObj.animOffsetX = 16;
                }
                if (this.sprite.animationFrameIndex == 1) {
                    this.weaponObj.animOffsetX = 0;
                }
            }
            else if (this.sprite.currentAnimationName == "attackLeft") {
                if (this.sprite.animationFrameIndex == 0) {
                    this.weaponObj.animOffsetX = -16;
                }
                if (this.sprite.animationFrameIndex == 1) {
                    this.weaponObj.animOffsetX = 0;
                }
            }
            else if (this.sprite.currentAnimationName == "attackUp") {
                if (this.sprite.animationFrameIndex == 0) {
                    this.weaponObj.animOffsetY = -16;
                }
                if (this.sprite.animationFrameIndex == 1) {
                    this.weaponObj.animOffsetY = 0;
                }
            }
            else if (this.sprite.currentAnimationName == "attackDown") {
                if (this.sprite.animationFrameIndex == 0) {
                    this.weaponObj.animOffsetY = 16;
                }
                if (this.sprite.animationFrameIndex == 1) {
                    this.weaponObj.animOffsetY = 0;
                }
            }
            else {
                this.weaponObj.animOffsetX = 0;
                this.weaponObj.animOffsetY = 0;
            }
        }

        if (this.targetX >= (map.width-this.sprite.width)) this.targetX = (map.width - this.sprite.width);
        else if (this.targetX < 0) this.targetX = 0;
        if (this.targetY >= (map.height-this.sprite.height)) this.targetY = (map.height - this.sprite.height);
        else if (this.targetY < 0) this.targetY = 0;


        
        this.sprite.Update(delta);
        if (this.weaponObj != null) this.weaponObj.Update(delta);
    }
    this.Render = (context)=>{
        if (this.weaponObj != null && (this.direction == Directions.UP || this.direction == Directions.LEFT)) this.weaponObj.Render(context);
        this.sprite.Draw(context);
        if (this.weaponObj != null && (this.direction != Directions.UP && this.direction != Directions.LEFT)) this.weaponObj.Render(context);

        if (this.isMain) {
            this.healthBar.Render(context);
            this.expBar.Render(context);
            context.font = '38px sans-serif';
            context.fillStyle = "#FFFFFF";
            var textWidth = context.measureText(this.name).width;
            var textHeight = context.measureText(this.name).height;
            context.fillText(this.level,10,36);
        }
        context.font = '14px sans-serif';
        context.fillStyle = "#FFFFFF";
        var tWidth = context.measureText(this.name).width;
        context.fillText(this.name,((this.sprite.x-Camera.x)+(this.sprite.width/2) - (tWidth/2)),(this.sprite.y - Camera.y) - 3 );
    }
}
//CHAT CONTROLS

function doChatMessage(fromBtn=false) {
    var chatInput = document.getElementById("chatInput");
    if (chatInput != document.activeElement && !fromBtn) {
        chatInput.focus();
    } 
    else {
        var message = chatInput.value.trim();
        chatInput.value = "";
        if (message.length < 120 && message.length > 0) {
            NetworkEvents.sendChatRequest(message);
        }
        chatInput.blur();
        canvas.focus();
    }
}

//HEALTH BAR
function HealthBar(target,value,maxValue,barColor="#FF5544", backgroundColor="#111111") {
    this.target = target;
    this.value = value;
    this.maxValue = value;
    this.backgroundColor = backgroundColor;
    this.barColor = barColor;
    this.alpha = 0.8;

    this.isOverlay = false;

    this.width = 72;
    this.height = 14;

    this.hidden = false;

    this.Update = function(delta) {

        //TODO: Animating bar
        
    }
    this.Render = function(context) {
        if (this.value < 0) this.value = 0;
        if (!this.hidden) {
            context.strokeStyle = this.backgroundColor;
            context.fillStyle = this.barColor;
            context.globalAlpha = this.alpha;
            context.beginPath();
            context.fillRect(this.isOverlay ? this.target.x : this.target.x-Camera.x,this.isOverlay ? this.target.y : this.target.y - Camera.y,this.width*(this.value/this.maxValue),this.height);
            context.rect(this.isOverlay ? this.target.x : this.target.x-Camera.x,this.isOverlay ? this.target.y : this.target.y - Camera.y,this.width,this.height);
            context.stroke();
            context.globalAlpha = 1;
        }
    }

}
//SPRITE FUNCTIONS
function Sprite(textureKey,frameWidth, frameHeight, frameCount) {
    this.srcImage = TextureMap[textureKey];
    this.frames = [];
    this.alpha = 1;
   
    this.x = 0;
    this.y = 0;
    this.width = frameWidth;
    this.height = frameHeight;
    this.currentFrame = 0;

    if (this.width == null) width = this.srcImage.width;
    if (this.height == null) height = this.srcImage.height;
    frameWidth = this.width;
    frameHeight = this.height;

    //Animations
    this.animations = {};
    this.currentAnimation = null;
    this.currentAnimationName = null;
    this.animationTimer = 0;
    this.animationFrameIndex = 0;
    this.animationLoop = 1; //-1 == infinity, 1 = None, 2+ = count
    this.animationEvent= {}

    this.animationEvent = {};

    this.isOverlay = false; //ignore camera offset when drawing
    
    for (var j = 0; j < this.srcImage.height/frameHeight; j++) {
        for (var i = 0; i < this.srcImage.width/frameWidth; i++) {
            this.frames.push({x:i*frameWidth,y:j*frameHeight, width: frameWidth, height: frameHeight});
        }
    }
    this.getCenterX = function() {
        return this.x+(this.width/2);
    }
    this.getCenterY = function() {
        return this.y+(this.height/2);
    }
    this.setCenterX = function(val) {
        this.x = val - (this.width/2);
    }
    this.setCenterY = function(val) {
        this.y = val - (this.height/2);
    }
    this.Draw = (context)=> {
        var currentFrame = this.frames[this.currentFrame];
        context.globalAlpha = this.alpha;
        context.drawImage(this.srcImage,currentFrame.x,currentFrame.y,currentFrame.width,currentFrame.height,this.isOverlay ? this.x : this.x-Camera.x,this.isOverlay ? this.y : this.y - Camera.y,this.width,this.height);
        context.globalAlpha = 1;
    }
    this.AddAnimation = (name,frameList)=> {
        this.animations[name] = frameList;
       
    }
    this.PlayAnimation= (name,loopCount=0,ignoreDuplicateRequest=true,onstop=null,localContext=this)=> {
        if (this.currentAnimation == this.animations[name] && ignoreDuplicateRequest) return;

        this.StopAnimation();

        this.currentAnimation = this.animations[name];
        this.currentAnimationName = name;
        this.animationTimer = 0;
        this.animationFrameIndex = 0;
        this.animationLoop = loopCount;

        if (onstop != null) this.animationEvent[name] = {onstop:{func:onstop,localContext:localContext}};
    }
    this.StopAnimation = ()=> {

        if (this.animationEvent[this.currentAnimationName] != null) {
            var tempEvent = this.animationEvent[this.currentAnimationName];
            if (tempEvent["onstop"] != null) tempEvent["onstop"].func.call(tempEvent["onstop"].localContext);
        }
        this.currentAnimationName = null;
        this.currentAnimation = null;
        this.animationTimer = 0;
        this.animationFrameIndex = 0;
        this.animationLoop = 0;

    }
    this.Update = (delta) => {
        if (this.currentAnimation != null) {
            this.animationTimer += delta;
            if (this.animationTimer >= this.currentAnimation[this.animationFrameIndex].time) {
                this.animationTimer = 0;
                this.animationFrameIndex +=1;
                if (this.animationFrameIndex >= this.currentAnimation.length) {
                    this.animationLoop -= 1;
                    if (this.animationLoop == 0) {
                        this.StopAnimation();
                    }
                    else this.animationFrameIndex = 0;
                } 
                this.animationTimer = 0;
            }
            if (this.currentAnimation != null) {
                this.currentFrame = this.currentAnimation[this.animationFrameIndex].frameIndex;
            }
            else this.currentFrame = 0;
        }
            
    }
}

function loadTexture(key,location) {
    return new Promise( (resolve,reject) => {
        let img = new Image();
        img.onload = ()=> {
            TextureMap[key] = img;
            resolve(true);
        } 
        img.onerror = reject;
        img.src = location;
    });
}

function PunchEffect (x,y,isCentered=true) {
    this.sprite = new Sprite("eff_punch",32,32,4);
    this.sprite.x = x;
    this.sprite.y = y;
    if (isCentered) {
        this.sprite.setCenterX(x);
        this.sprite.setCenterY(y);
    }
    this.sprite.AddAnimation("go",[{frameIndex: 0, time: 50},{frameIndex: 1, time: 50},{frameIndex: 2, time: 50},{frameIndex: 3, time: 50}]);
    this.isActive = true;
    this.sprite.PlayAnimation("go",2,true,()=>{
        console.log("animation ended!");
        this.isActive = false;
    },this);
    this.Update = function(delta) {
        this.sprite.Update(delta);
    }
    this.Render = function(context) {
        this.sprite.Draw(context);
    }
}
function SlashEffect(x,y,isCentered = true) {
    this.sprite = new Sprite("eff_slash",64,64,5);
    this.sprite.x = x;
    this.sprite.y = y;
    if (isCentered) {
        this.sprite.setCenterX(x);
        this.sprite.setCenterY(y);
    }
    this.sprite.AddAnimation("go",[{frameIndex: 0, time: 50},{frameIndex: 1, time: 50},{frameIndex: 2, time: 50},{frameIndex: 3, time: 50},{frameIndex: 4, time: 50}]);
    this.isActive = true;
    this.sprite.PlayAnimation("go",1,true,()=>{
        console.log("animation ended!");
        this.isActive = false;
    },this);
    this.Update = function(delta) {
        this.sprite.Update(delta);
    }
    this.Render = function(context) {
        this.sprite.Draw(context);
    }
}
function ItemObject (itemData,x,y,isCentered=true) {
    if (itemData.type == 1 /*Weapon*/) {
        this.sprite = new Sprite(itemData.graphic,64,64,1);
    }
    else this.sprite = new Sprite(itemData.graphic,TextureMap[itemData.graphic].width,TextureMap[itemData.graphic].height,1);
    this.sprite.x = x;
    this.sprite.y = y;
    this.data = itemData;

    if (isCentered) {
        this.sprite.setCenterX(x);
        this.sprite.setCenterY(y);
    }
    this.Update = function(delta) {
        this.sprite.Update(delta);
    }
    this.Render = function(context) {
        this.sprite.Draw(context)
    }
}

function WeaponObject (player,itemData) {
    this.sprite = new Sprite(itemData.graphic,64,64,4);
    this.sprite.x = player.sprite.x;
    this.sprite.y = player.sprite.y;
    this.parent = player;
    this.data = itemData;

    this.animOffsetX = 0;
    this.animOffsetY = 0;
    
    this.Update = function(delta) {
        //TODO: Change render order.
       

        this.sprite.setCenterX(this.parent.sprite.getCenterX());
        this.sprite.setCenterY(this.parent.sprite.getCenterY());

        if (this.parent.direction == Directions.UP || this.parent.direction == null) {
            this.sprite.currentFrame = 0;
            this.sprite.setCenterX(this.parent.sprite.x+48);
        }
        if (this.parent.direction == Directions.LEFT) {
            this.sprite.currentFrame = 2;
            this.sprite.setCenterY(this.parent.sprite.y+48);
            this.sprite.setCenterX(this.parent.sprite.getCenterX()-16);
        }
        if (this.parent.direction == Directions.RIGHT) {
            this.sprite.currentFrame = 3;
            this.sprite.setCenterY(this.parent.sprite.y+48);
            this.sprite.setCenterX(this.parent.sprite.getCenterX()+16);
        }
        if (this.parent.direction == Directions.DOWN) {
            this.sprite.currentFrame = 1;
            this.sprite.setCenterX(this.parent.sprite.x+10);
            this.sprite.setCenterY(this.parent.sprite.getCenterY()+32);
        }
        this.sprite.Update(delta);
    }
    this.Render = function(context) {
        var renderX = this.sprite.x;
        var renderY = this.sprite.y;

        this.sprite.x += this.animOffsetX;
        this.sprite.y += this.animOffsetY;
        this.sprite.Draw(context);
        this.sprite.x = renderX;
        this.sprite.y = renderY;
    }
}