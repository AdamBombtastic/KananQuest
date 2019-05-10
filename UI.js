const UIModes = {
    NORMAL : 0,
    CHAT : 1,
    PANEL : 2,
}
const UI = {
    elementCount : 0,
    elements : {},
    canvasOffsetX : 0,
    canvasOffsetY : 0,
    canvasWidth : 0,
    canvasHeight : 0,
    mode : 0,
    setCanvasOffset : function(canvas) {
        UI.canvasOffsetX = canvas.offsetLeft;
        UI.canvasOffsetY = canvas.offsetTop;
        UI.canvasHeight = canvas.height;
        UI.canvasWidth = canvas.width;
    },
    getStyledElement : function(ele,x,y,width,height,offsetForCanvas=true,center=false) {
        var left = (center) ? (x+((offsetForCanvas) ? UI.canvasOffsetX : 0)) - width/2 : (x+((offsetForCanvas) ? UI.canvasOffsetX : 0));
        var top = (center) ? (y+((offsetForCanvas) ? UI.canvasOffsetY : 0)) - height/2 : (y+((offsetForCanvas) ? UI.canvasOffsetY : 0));
        var style = "position:absolute; margin: 0; padding: 0; z-index: 100; left:"+left+"px; top:"+top+"px; width:"+width+"px; height:"+height+"px;";
        var element = document.createElement(ele);
        element.setAttribute("style",style);
        element.id=ele+"_"+UI.elementCount;
        UI.elementCount+=1;
        return element;
    },
    getUIPanel : function(title,x,y,width,height,center=false) {
        var panel = UI.getStyledElement("div",x,y,width,height,true,center);
        panel.classList.add("ui-panel");
        var headerBar = UI.getStyledElement("div",0,0,width,25,false);
        headerBar.classList.add("ui-panel-header");
        headerBar.innerText = title;
       
        var closeBtn = UI.getStyledElement("div",width-20,5,15,15,false);
        closeBtn.classList.add("ui-panel-header-close");
        closeBtn.setAttribute("onclick","UI.removeElement('"+panel.id+"');");

        var contentSection = document.createElement("div");
        contentSection.setAttribute("id",panel.id+"_content");
        contentSection.setAttribute("style","position:absolute; top: 30px; left:4px; width:"+(width-4)+"px; height:"+ (height-40)+"px;"+" ; margin:0; padding: 0; overflow: scroll; overflow-x: hidden; max-height:" + (height-40)+"px;");
        
        headerBar.appendChild(closeBtn);
        panel.appendChild(headerBar);

        panel.appendChild(contentSection);
        panel.getContentDiv = function() { return document.getElementById(panel.id+"_content");};

        panel.render = function() {
            UI.renderElement(panel);
        }
        return panel;
    },
    showShopView : function(x,y,itemList,shopId,title="Shop",width=500,height=400) {
        var basePanel = UI.getUIPanel(title,x,y,width,height,true);
        basePanel.render();
        var contentDiv = basePanel.getContentDiv();
        var shopContent = document.createElement("div");
        shopContent.setAttribute("style","width:260px; height: 360px; position: absolute; top: 0px; left:0px; margin:0; padding: 0; overflow: scroll; overflow-x: hidden; max-height: 360px;");
        contentDiv.appendChild(shopContent);
        const selectedItems = [];
        var column = 0;
        var row = 0;


        for (var i = 0; i < itemList.length; i++) {
            const item = itemList[i].item;
            const cost = itemList[i].cost;
            var gridItem = UI.getShopGridItem(column*120,row*120,item,cost,shopId);
            shopContent.appendChild(gridItem);
            gridItem.onclick = function() {
                selectedItems.push({item:item,cost:cost});
                renderSelectedItems();
            }
            column += 1;
            if (column >= 2) {
                row += 1;
                column = 0;
            }   
        }

        

        const infoContent = document.createElement("div");
        infoContent.setAttribute("style","width:200px; height: 320px; position:absolute; top: 0px; left: 270px; overflow: scroll; overflow-x: hidden; max-height: 320px;")
        contentDiv.appendChild(infoContent);

        var tokenCount = Model.getMyTokenCount();
        var tokenCountText = document.createElement("div");
        tokenCountText.setAttribute("style","position: absolute; padding: 0px; margin: 0px; color: #111; top: 330px; left: 270px; font-weight: bolder;");
        tokenCountText.innerText="Tokens: " +tokenCount;

        var buyButton = document.createElement("div");
        buyButton.innerText = "BUY";
        buyButton.classList.add("ui-submit-btn");
        buyButton.setAttribute("style","position:absolute;top: 320px; left: 390px;")
        buyButton.onclick = function() {
            tryBuySelectedItems();
        }
        contentDiv.appendChild(buyButton);
        
        function renderSelectedItems() {
            infoContent.innerHTML = "";
            var total = 0;
            for (var i = 0; i < selectedItems.length; i++) {
                var selectedItem = selectedItems[i];
                var name = selectedItem.item.name;
                var cost = selectedItem.cost;
                total+=cost;
                const index = i;
                var listItem = document.createElement("p");
                listItem.setAttribute("style","font-size: 12px; font-weight: bold;")
                listItem.innerText = name + " : " + cost + " tokens";
                listItem.onclick = function() {
                    selectedItems.splice(index,1);
                    renderSelectedItems();
                }
                infoContent.appendChild(listItem);
            }
            var listItem = document.createElement("p");
            listItem.setAttribute("style","font-size: 14px; font-weight: bolder;")
            listItem.innerText = "Total Costs: " + total;

            
            infoContent.appendChild(listItem);
            infoContent.scrollTo(0,infoContent.scrollHeight);
            
        }
        function tryBuySelectedItems() {
            var justIds = [];
            var total = 0;
            for (var i = 0; i < selectedItems.length; i++) {
                var itemDef = selectedItems[i].item.definitionId;
                justIds.push(itemDef);
                total += selectedItems[i].cost;
            }
            if (total <= Model.getMyTokenCount() && total != 0 && justIds.length > 0) {
                NetworkEvents.sendBuyItemRequest(shopId,justIds);
            }
            
        }
        contentDiv.appendChild(tokenCountText);

        return basePanel;
    },
    getShopGridItem : function(x,y,item,cost,shopId,width=100,height=100) {
        var baseView = document.createElement("div");
        baseView.classList.add("ui-inv-item");
        baseView.setAttribute("style","top:" + y + "; left: " + x + "; width: " + width + "; height:"+height+";");

        var imgContainer = document.createElement("div");
        imgContainer.setAttribute("class","ui-inv-item-container");
        imgContainer.setAttribute("style","background: url('"+TextureMap[item.graphic].src+"');");
        
        //var img = document.createElement("img");
        //img.src = 

        var nameLabel = document.createElement("p");
        nameLabel.innerText = item.name;

        var amountLabel = document.createElement("p");
        amountLabel.style = "position:absolute; top: 5px; left:5px; margin: 0px; padding: 0px; width:auto;";
        amountLabel.innerText = "Cost: " + cost;
        baseView.appendChild(imgContainer);
        baseView.appendChild(nameLabel);
        baseView.appendChild(amountLabel);

        baseView.onclick = function() {
            NetworkEvents.sendBuyItemRequest(shopId,item.definitionId);
        }
        return baseView;

    },
    showInventoryView : function(x,y,playerObj,title="Inventory",width=400,height=300) {
        var basePanel = UI.getUIPanel(title,x,y,width,height,true);
        basePanel.render();
        var contentDiv = basePanel.getContentDiv();
        //var showContent = document.createElement("div");
       // showContent.setAttribute("style","width:400px; height: 360px; position: absolute; top: 0px; left:0px;");
        //contentDiv.appendChild(showContent);

        // overflow: scroll; overflow-x: hidden;
        var column = 0;
        var row = 0;
        for (var k in playerObj.inventory) {
            var itemList = playerObj.inventory[k];
                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];
                    contentDiv.appendChild(UI.getInventoryGridItem(column*120,row*120,item,item.id==playerObj.weaponId));
                    column += 1;
                    if (column >= 3) {
                        row += 1;
                        column = 0;
                    }
                }
        }
        return basePanel;
    },
    getInventoryGridItem : function(x,y,item,isEquipped=false,width=100,height=116) {
        var baseView = document.createElement("div");
        baseView.classList.add("ui-inv-item");
        baseView.setAttribute("style","top:" + y + "; left: " + x + "; width: " + width + "; height:"+height+";");

        var imgContainer = document.createElement("div");
        imgContainer.setAttribute("class","ui-inv-item-container");
        imgContainer.setAttribute("style","background: url('"+TextureMap[item.graphic].src+"');");
        
        var nameLabel = document.createElement("p");
        nameLabel.innerText = item.name;

        var amountLabel = document.createElement("p");
        amountLabel.style = "position:absolute; top: 5px; left:5px; margin: 0px; padding: 0px; width:auto;";
        amountLabel.innerHTML = (isEquipped)? "<b><i>E</i></b>" :item.amount;

        
        var styleString = "width: 44px; height: 24px; position:absolute; line-height: 24px; text-align:center; border-radius:5px; ";
        var useButton = document.createElement("div");
        useButton.setAttribute("style","background: #111; color: #FFF; top: 88px; left: 2px; " + styleString);
        useButton.innerText= (item.type == 1) ? (isEquipped) ? "UNEQUIP" : "EQUIP" : "USE";

        useButton.onclick = function() {
            NetworkEvents.sendUseItemRequest(item.id,item.definitionId);
        }


        var dropButton = document.createElement("div");
        dropButton.setAttribute("style","background: #882222; color: #FFF; top: 88px; left: 50px; " + styleString);
        dropButton.innerText = "DROP";

        dropButton.onclick = function() {
            NetworkEvents.sendDropItemRequest(item.id,item.definitionId);
        }
        

        baseView.appendChild(imgContainer);
        baseView.appendChild(nameLabel);
        baseView.appendChild(amountLabel);
        baseView.appendChild(useButton);
        baseView.appendChild(dropButton);

        //baseView.ondblclick = function() {
        //   
        //}
        
        return baseView;

    },
    renderElement : function(ele) {
        UI.elements[ele.id] = ele;
        document.body.appendChild(ele);
        UI.mode = UIModes.PANEL;
    },
    removeElement : function(id) {
        var ele = UI.elements[id];
        if (ele != null) {
            ele.remove();
        }
        delete UI.elements[id];
        UI.mode = UIModes.NORMAL;
    },
    removeAllElements : function(id) {
        for (var k in this.elements) {
            UI.removeElement(k);
        }
        UI.mode = UIModes.NORMAL;
    }
}