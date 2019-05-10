
const Monsters = {
    SLIME : 0,
  }
  
function NPC(textureKey,x,y) {
    this.sprite = new Sprite(textureKey,64,64,12);
    this.sprite.x = x;
    this.sprite.y = y;
    this.speed = 64; //One block over walkTime ms
    this.walkTime = 350; //ms
    this.tapTime = 60; //ms

    this.targetX = this.sprite.x;
    this.targetY = this.sprite.y;
    this.walkTimer = 0;

    this.name="Monster";

    this.isCombat = false;

    this.isMoving = false;

    this.hp = 1;
    this.maxHp = 1;
    this.damage = 1;

    this.type = 0;

    this.deathTimer = 50;

    this.healthBar = new HealthBar(this,this.hp,this.maxHp,"#FF5544","FF5544");

    this.sprite.AddAnimation("walkDown",[{frameIndex: 1, time: 100},{frameIndex: 2, time: 100}]);
    this.sprite.AddAnimation("walkUp",[{frameIndex: 4, time: 100},{frameIndex: 5, time: 100}]);
    this.sprite.AddAnimation("walkLeft",[{frameIndex: 10, time: 100},{frameIndex: 11, time: 100}]);
    this.sprite.AddAnimation("walkRight",[{frameIndex: 7, time: 100},{frameIndex: 8, time: 100}]);

    this.sprite.AddAnimation("idleDown",[{frameIndex: 1, time: 100},{frameIndex: 2, time: 100}]);
    this.sprite.AddAnimation("idleUp",[{frameIndex: 4, time: 100},{frameIndex: 5, time: 100}]);
    this.sprite.AddAnimation("idleLeft",[{frameIndex: 10, time: 100},{frameIndex: 11, time: 100}]);
    this.sprite.AddAnimation("idleRight",[{frameIndex: 7, time: 100},{frameIndex: 8, time: 100}]);

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
    }

    this.Update = (delta)=>{

        this.deathTimer -= delta;
        if (this.hp <= 0 && this.deathTimer <= 0) {
            this.sprite.alpha -= 0.2;
            if (this.sprite.alpha < 0) this.sprite.alpha = 0;
            this.deathTimer = 50;
            this.healthBar.hidden = true;
        }
        else if (this.hp > 0) {
            this.deathTimer = 50;
            this.sprite.alpha = 1;
            this.healthBar.hidden = false;
        }

        this.healthBar.target = {x:this.sprite.getCenterX()-(this.healthBar.width/2),y: this.sprite.y}
        this.healthBar.value = this.hp;
        this.healthBar.maxValue = this.maxHp;
        this.healthBar.height = 6;
        this.healthBar.Update(delta);
        if (this.isMoving) {
            this.Move(delta);
            this.walkTimer += delta;
        }
        if (this.direction == Directions.LEFT) {
            this.sprite.currentFrame = this.sprite.animations["walkLeft"][0].frameIndex;
            this.sprite.PlayAnimation("walkLeft");
        } else if (this.direction == Directions.UP) {
            this.sprite.currentFrame = this.sprite.animations["walkUp"][0].frameIndex;
            this.sprite.PlayAnimation("walkUp");
        }
        else if (this.direction == Directions.RIGHT) {
            this.sprite.currentFrame = this.sprite.animations["walkRight"][0].frameIndex;
            this.sprite.PlayAnimation("walkRight");
        }
        else if (this.direction == Directions.DOWN) {
            this.sprite.currentFrame = this.sprite.animations["walkDown"][0].frameIndex;
            this.sprite.PlayAnimation("walkDown");
        }
        
        if (!this.isMoving) {
            this.sprite.StopAnimation();
            switch (this.direction) {
                case Directions.UP:
                    this.sprite.PlayAnimation("idleUp");
                    break;
                case Directions.LEFT:
                    this.sprite.PlayAnimation("idleLeft");
                    break;
                case Directions.RIGHT:
                    this.sprite.PlayAnimation("idleRight");
                    break;
                case Directions.DOWN:
                    this.sprite.PlayAnimation("idleDown");
                    break;
            } 
        }

        if (this.targetX >= (map.width-this.sprite.width)) this.targetX = (map.width - this.sprite.width);
        else if (this.targetX < 0) this.targetX = 0;
        if (this.targetY >= (map.height-this.sprite.height)) this.targetY = (map.height - this.sprite.height);
        else if (this.targetY < 0) this.targetY = 0;

        this.sprite.Update(delta);
    }
    this.Render = (context)=>{
        this.sprite.Draw(context);
        if (this.type != 1) this.healthBar.Render(context);
        else {
            context.globalAlpha = this.sprite.alpha;
            context.font = '14px sans-serif';
            context.fillStyle = "#FFFFFF";
            var tWidth = context.measureText(this.name).width;
            context.fillText(this.name,((this.sprite.x-Camera.x)+(this.sprite.width/2) - (tWidth/2)),(this.sprite.y - Camera.y) - 3 );
            context.globalAlpha = 1;
        }
        
    }
}


function MonSlime(x,y) {
    NPC.call(this,"mon_slime",x,y);
    this.sprite.AddAnimation("walkDown",[{frameIndex: 1, time: 100},{frameIndex: 2, time: 100}]);
    this.sprite.AddAnimation("walkUp",[{frameIndex: 4, time: 100},{frameIndex: 5, time: 100}]);
    this.sprite.AddAnimation("walkLeft",[{frameIndex: 10, time: 100},{frameIndex: 11, time: 100}]);
    this.sprite.AddAnimation("walkRight",[{frameIndex: 7, time: 100},{frameIndex: 8, time: 100}]);

    this.sprite.AddAnimation("idleDown",[{frameIndex: 1, time: 100},{frameIndex: 2, time: 100}]);
    this.sprite.AddAnimation("idleUp",[{frameIndex: 4, time: 100},{frameIndex: 5, time: 100}]);
    this.sprite.AddAnimation("idleLeft",[{frameIndex: 10, time: 100},{frameIndex: 11, time: 100}]);
    this.sprite.AddAnimation("idleRight",[{frameIndex: 7, time: 100},{frameIndex: 8, time: 100}]);
}