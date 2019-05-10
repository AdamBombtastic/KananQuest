const DEBUG_INPUT = false, DEBUG_DELTA = false, DEBUG_MOVEMENT = false, DEBUG_NETWORK = false;
var socket = io();
const Model = {
    playerId : null,
    playerMap : {},
    monMap : {},
    itemMap : {},
    effects : {},
    motd : "",
    getMyPlayer : () => {
        return Model.playerMap[Model.playerId];
    },
    getItemForPosition : (x,y) => {
        for (var k in Model.itemMap) {
            var tempItem = Model.itemMap[k];
            if (tempItem != null) {
                if (tempItem.x == x && tempItem.y == y) {
                    return tempItem;
                }
            }
        }
        return null;
    },
    getMyTokenCount : ()=> {
        var count = 0;
        var myPlayer = Model.getMyPlayer();
        if (myPlayer.inventory["TOKEN"] != null) {
            for (var i = 0; i < myPlayer.inventory["TOKEN"].length; i++) {
                count += myPlayer.inventory["TOKEN"][i].amount;
            }
        }
        return count;
    },
    chatLog : [],
}
const NetworkEffectType = {
    PLAYER : 0,MONSTER : 1,POSITION : 2,   
}

const NetworkEvents = {
    listeners : [],
    addListener : (obj)=> {
        NetworkEvents.listeners.push(obj);
    },
    BroadcastEvent : (event, data) => {
        for (var i = 0; i < NetworkEvents.listeners.length; i++) {
            var listener = NetworkEvents.listeners[i];
            if (listener.NetworkEvent != null) {
                listener.NetworkEvent(event,data);
            }
        }
    },
    sendMoveRequest : (x=Model.getMyPlayer().x, y=Model.getMyPlayer().y, direction=Model.getMyPlayer().direction, isMoving = Model.getMyPlayer().isMoving) => {
        socket.emit("move",{x:x,y:y,direction:direction,isMoving:isMoving});
    },
    sendAttackRequest : (data) => {
        socket.emit("attack",data);
    },
    sendLoginRequest : (username,password) => {
        socket.emit("login",{username:username,password:password});
    },
    sendRegisterRequest : (username,password) => {
        socket.emit("register",{username:username,password:password});
    },
    sendChatRequest : (message) => {
        socket.emit("chat",{message:message});
    },
    sendPickupRequest : (itemId) => {
        socket.emit("pickup",{id:itemId});
    },
    sendActionRequest : () => {
        socket.emit("action",{});
    },
    sendBuyItemRequest : (shopId, itemDefs)=> {
        socket.emit("BuyItem",{shopId: shopId, itemDefs: itemDefs});
    },
    sendUseItemRequest : (itemId, itemDefId) => {
        socket.emit("UseItem",{itemId: itemId, itemDefId: itemDefId});
    },
    sendDropItemRequest : (itemId, itemDefId) => {
        socket.emit("DropItem",{itemId: itemId, itemDefId: itemDefId});
    }

}

socket.connect();

socket.on("join", function(data){
    if (DEBUG_NETWORK)console.log("joined server");
    Model.playerMap = data.players;
    Model.playerId = data.id;
    Model.motd = data.motd;
    StartGame();
    NetworkEvents.BroadcastEvent("join",data);
});

socket.on("update", function(data) {
    if (DEBUG_NETWORK) console.log("recieved position update");
    Model.playerMap = data.playerMap;
    Model.monMap = data.monMap;
    Model.effects = data.effects;
    Model.itemMap = data.itemMap;
    if (Model.chatLog == null || Model.chatLog.length == 0) {
        Model.chatLog = data.chatLog;
        var chatArea = document.getElementById("chatArea");
        for (var message of data.chatLog) {
            chatArea.append(message);
        }
        chatArea.scrollTo(0,chatArea.scrollHeight);
    }
    Model.chatLog = data.chatLog;
   
    NetworkEvents.BroadcastEvent("update",data);
});

socket.on("warp",function(data) {
    if (DEBUG_NETWORK) console.log("recieved warp from server");
    var tempEnt = data.type == NetworkEffectType.PLAYER ? Model.playerMap[data.id] : Model.monMap[data.id];
    tempEnt.x = data.x;
    tempEnt.y = data.y;
    NetworkEvents.BroadcastEvent("warp",data);
});

socket.on("login",function(data) {
    if (DEBUG_NETWORK) console.log("recieved login info from server");
    if (data.success) {
        //currently the server sends the "join" packet as a response.
    }
    else {
        showError(data.message);
    }
    NetworkEvents.BroadcastEvent("login",data);
});
socket.on("register",function(data) {
    if (DEBUG_NETWORK) console.log("recieved registration info from server");
    if (data.success) {
        alert(data.message);
    }
    else {
        showError(data.message);
    }
    NetworkEvents.BroadcastEvent("register",data);
});

socket.on("chat",function(data) {
    if (DEBUG_NETWORK) console.log("Recieved chat: " + data.message);
    Model.chatLog = data.log;
    var chatArea = document.getElementById("chatArea");
    chatArea.append(data.message);
    chatArea.scrollTo(0,chatArea.scrollHeight);
    NetworkEvents.BroadcastEvent("chat",data);
});
socket.on("pickup",function(data) {
    if (DEBUG_NETWORK) console.log("Recieved pickup: " + data.success);
    console.log(data);
    NetworkEvents.BroadcastEvent("pickup",data);
});

socket.on("UIShowPanel",function(data) {
    if (DEBUG_NETWORK) console.log("Recieved UI request: " + data.message);
    var panel = UI.getUIPanel(data.title,GAME_WIDTH/2, GAME_HEIGHT/2, 400,250,true);
    panel.render();
    panel.getContentDiv().innerHTML = data.message;
    NetworkEvents.BroadcastEvent("UIShowPanel",data);
});

socket.on("OpenShop", function(data) {
    if (DEBUG_NETWORK) console.log("Recieved Shop Open: " + data.title);
    console.log(data);
    UI.removeAllElements();
    var shopView = UI.showShopView(GAME_WIDTH/2, GAME_HEIGHT/2,data.shop.items,data.shop.id,data.shop.title);
   // panel.render();
    NetworkEvents.BroadcastEvent("OpenShop",data);
});
socket.on("BuyItem",function(data) {
    if (DEBUG_NETWORK) console.log("Recieved Buy Item: " + data);
    console.log(data);
    NetworkEvents.BroadcastEvent("BuyItem",data);
});
socket.on("UseItem",function(data) {
    if (DEBUG_NETWORK) console.log("Recieved UseItem: " + data);
    console.log(data);
    NetworkEvents.BroadcastEvent("UseItem",data);
});
socket.on("DropItem",function(data) {
    if (DEBUG_NETWORK) console.log("Recieved DropItem: " + data);
    console.log(data);
    NetworkEvents.BroadcastEvent("DropItem",data);
});
//SET-UP login 
function showError(error) {
    document.getElementById("errorMessage").innerText = error;
}
function tryLogin() {
    NetworkEvents.sendLoginRequest(document.getElementById("username").value, document.getElementById("password").value);
}
function tryRegister() {
    NetworkEvents.sendRegisterRequest(document.getElementById("username").value, document.getElementById("password").value);
}
