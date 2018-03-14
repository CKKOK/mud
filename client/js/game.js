var __ui_window_height, __ui_window_width;
var __ui_room_title, __ui_room_text, __ui_action_response, __ui_nav, __ui_nav_options, __ui_game_message, __ui_character_panel, __ui_inventory_panel, __ui_enemy_panel, __ui_command_bar, __ui_center_panel, __ui_input, __ui_modal;
var localStorage, sessionStorage;
var playerCharacter = [];
var currentCharacter = 0;
var CHAR_COUNT = 0;
var COOLDOWN_ARRAY = [];
var SYS_TIMER = null;
var acceptInput = true;
var currentRoom = 0;
var canMove = true;
var gameOver = false;
var NAV_OPTION_TRANSITION_TIME = 200;
var characterData = {
	'template': {
		name: 'Fizban',
		hp: 20,
		maxhp: 30,
		mindmg: 1,
		maxdmg: 2,
		cooldown: 1500,
		inventory: [],
	}
};
var MODAL_FADE_IN_TIME = 300;
var ENEMY_COUNT = 0;
var TOUCH_CAPABLE = false;



var DEFAULT_HELP = 'This is the default help text';
var ITEM_NOT_FOUND_IN_ROOM = 'You grab at illusionary straws.';
var ATTACK_INVALID_TARGET = 'You furiously attack the air, like a drunken buffoon.';
var MOVEMENT_INVALID_DIRECTION = 'You\'re walking into walls!';
var MOVEMENT_RESTRICTED = 'Can\'t move!';



// ES5/jQuery implementation of the Character object, and binding it to the UI
// Character prototype functions:
// adjustHP(delta)
// adjustMaxHP(delta)
// adjustMinDmg(delta)
// adjustMaxDmg(delta)
// attack(enemy)
// receiveHit(enemy, dmg)
// kill()

function Character (shortName) {
    var char = characterData[shortName];
    this.name = char.name;
    this.type = 'PC';
    this.hp = char.hp;
    this.maxhp = char.maxhp;
    this.mindmg = char.mindmg;
    this.maxdmg = char.maxdmg;
    this.defaultcooldown = char.cooldown;
    this.cooldown = char.cooldown;
    this.inventory = char.inventory;
    this.canMove = true;
    this.canAttack = true;
    this.cooldownCount = char.cooldown;

    this.UIIndex = CHAR_COUNT;
    CHAR_COUNT++;

    this.UIElement = document.createElement('div');
    this.UIElement.setAttribute('class', 'character');
    this.UIElement.setAttribute('id','c-'+this.name);

    var charName = document.createElement('p');
    charName.setAttribute('class', 'character-stat');
    charName.setAttribute('id', 'character-name-' + this.name);
    charName.innerHTML = this.name;

    var charHP = document.createElement('p');
    charHP.setAttribute('class', 'character-stat');
    charHP.setAttribute('id', 'character-hp-' + this.name);
    charHP.innerHTML = 'HP: ' + this.hp + ' / ' + this.maxhp;

    var charDMG = document.createElement('p');
    charDMG.setAttribute('class', 'character-stat');
    charDMG.setAttribute('id', 'character-dmg-' + this.name);
    charDMG.innerHTML = 'Damage: ' + this.mindmg + ' - ' + this.maxdmg;

    var charCooldown = document.createElement('progress');
    charCooldown.setAttribute('class', 'character-stat cooldown');
    charCooldown.setAttribute('id', 'character-cooldown-' + this.name);
    charCooldown.setAttribute('value', '100');
    charCooldown.setAttribute('max', '100');

    this.UIElement.appendChild(charName);
    this.UIElement.appendChild(charHP);
    this.UIElement.appendChild(charDMG);
    this.UIElement.appendChild(charCooldown);

    this.cooldownIndicator = charCooldown;

    __ui_character_panel.append(this.UIElement);
}

Character.prototype.adjustHP = function (delta) {
    this.hp += delta;
    if (this.hp < 0) {
        this.hp = 0;
    }
    if (this.hp > this.maxhp) {
        this.hp = this.maxhp;
    }
    document.getElementById('character-hp-' + this.name).innerHTML = 'HP: ' + this.hp + ' / ' + this.maxhp;
}

Character.prototype.adjustMaxHP = function (delta) {
    this.maxhp += delta;
    if (this.maxhp < 0) {
        this.maxhp = 0;
    }
    if (this.maxhp < this.hp) {
        this.hp = this.maxhp;
    }
    document.getElementById('character-hp-' + this.name).innerHTML = 'HP: ' + this.hp + ' / ' + this.maxhp;
}

Character.prototype.adjustMinDmg = function (delta) {
    this.mindmg += delta;
    if (this.mindmg < 0) {
        this.mindmg = 0;
    }
    if (this.mindmg >= this.maxdmg) {
        this.mindmg = this.maxdmg - 1;
    }
    document.getElementById('character-dmg-' + this.name).innerHTML = 'Damage: ' + this.mindmg + ' - ' + this.maxdmg;
}

Character.prototype.adjustMaxDmg = function (delta) {
    this.maxdmg += delta;
    if (this.maxdmg < 0) {
        this.maxdmg = 1;
    }
    if (this.maxdmg <= this.mindmg) {
        this.maxdmg = this.mindmg + 1;
    }
    document.getElementById('character-dmg-' + this.name).innerHTML = 'Damage: ' + this.mindmg + ' - ' + this.maxdmg;
}

Character.prototype.attack = function (enemy) {
    var dmg = this.mindmg + Math.floor(Math.random() * (this.maxdmg - this.mindmg + 1));
    enemy.receiveHit(this, dmg);
    gameMessage(this.name + ' hits ' + enemy.name + ' for ' + dmg + ' damage!');
    this.canAttack = false;
    this.cooldownCount = 0;
    this.cooldownIndicator.setAttribute('value', this.cooldownCount / this.cooldown);
    COOLDOWN_ARRAY.push(this);
    if (!SYS_TIMER) {
        SYS_TIMER = setInterval(timerduties, 167);
    }
}

Character.prototype.receiveHit = function (enemy, dmg) {
    this.adjustHP(-dmg);
    if (this.hp <= 0) {
        this.kill();
    }
}

Character.prototype.kill = function () {
    this.adjustHP(-this.hp);
    gameMessage('You died', 'red');
    // document.getElementById('input').style.display = 'none'; document.removeEventListener('keypress', go);
    gameOver = true;
    // setTimeout(toggleModal, 3000);
}

Character.prototype.hasItem = function (itemName) {
    var result = -1;
    var itemNameLCase = itemName.toLowerCase();
    for (var key in this.inventory) {
        if (this.inventory[key].name.toLowerCase() === itemNameLCase) {
            result = key;
            break;
        }
    }
    return result;
}

function Enemy (shortName) {
    var enemy = enemyData[shortName];
    this.name = enemy.name;
    this.type = 'enemy';
    this.hp = enemy.hp;
    this.maxhp = enemy.maxhp;
    this.mindmg = enemy.mindmg;
    this.maxdmg = enemy.maxdmg;
    this.cooldown = enemy.cooldown;
    this.canFlee = enemy.canFlee;
    this.loot = enemy.loot;
    this.canAttack = true;
    this.cooldownCount = enemy.cooldown;
    this.inSameRoomAsPlayer = true;

    this.UIIndex = ENEMY_COUNT;
    ENEMY_COUNT++;

    this.UIElement = document.createElement('li');
    this.UIElement.setAttribute('class', 'enemy');
    this.UIElement.setAttribute('id','e-' + this.UIIndex);

    this.UIElement.innerHTML = this.name + ': <span id="e-hp-' + this.UIIndex + '">' + this.hp + '</span> / <span id="e-maxhp-' + this.UIIndex + '">' + this.maxhp + '</span>';

    this.cooldownIndicator = document.createElement('progress');
    this.cooldownIndicator.setAttribute('class', 'cooldown');
    this.cooldownIndicator.setAttribute('id','e-cooldown-' + this.UIIndex);
    this.cooldownIndicator.setAttribute('value','100');
    this.cooldownIndicator.setAttribute('max','100');

    this.UIElement.appendChild(this.cooldownIndicator);

    __ui_enemy_panel.append(this.UIElement);
}

Enemy.prototype.hide = function () {
    this.UIElement.style.display = 'none';
}

Enemy.prototype.show = function () {
    this.UIElement.style.display = 'block';
}

Enemy.prototype.adjustHP = function (delta) {
    this.hp += delta;
    if (this.hp < 0) {
        this.hp = 0;
    }
    if (this.hp > this.maxhp) {
        this.hp = this.maxhp;
    }
    // document.getElementById('e-' + this.UIIndex).innerHTML = this.name + ': ' + this.hp + ' / ' + this.maxhp;
    document.getElementById('e-hp-' + this.UIIndex).innerHTML = this.hp;
}

Enemy.prototype.adjustMaxHP = function (delta) {
    this.maxhp += delta;
    if (this.maxhp < 0) {
        this.maxhp = 0;
    }
    if (this.maxhp < this.hp) {
        this.hp = this.maxhp;
    }
    // document.getElementById('e-' + this.UIIndex).innerHTML = this.name + ': ' + this.hp + ' / ' + this.maxhp;
    document.getElementById('e-maxhp-' + this.UIIndex).innerHTML = this.maxhp;
}

Enemy.prototype.adjustMinDmg = function (delta) {
    this.mindmg += delta;
    if (this.mindmg < 0) {
        this.mindmg = 0;
    }
    if (this.mindmg >= this.maxdmg) {
        this.mindmg = this.maxdmg - 1;
    }
}
    
Enemy.prototype.adjustMaxDmg = function (delta) {
    this.maxdmg += delta;
    if (this.maxdmg < 0) {
        this.maxdmg = 1;
    }
    if (this.maxdmg <= this.mindmg) {
        this.maxdmg = this.mindmg + 1;
    }
}

Enemy.prototype.attack = function (char) {
    var dmg = this.mindmg + Math.floor(Math.random() * (this.maxdmg - this.mindmg + 1));
    char.receiveHit(this, dmg);
    gameMessage(this.name + ' hits ' + char.name + ' for ' + dmg + ' damage!', 'red');
    this.canAttack = false;
    this.cooldownCount = 0;
    this.cooldownIndicator.setAttribute('value', this.cooldownCount / this.cooldown);
    COOLDOWN_ARRAY.push(this);
    if (!SYS_TIMER) {
        SYS_TIMER = setInterval(timerduties, 167);
    }
}

Enemy.prototype.receiveHit = function (enemy, dmg) {
    this.adjustHP(-dmg);
    if (this.hp <= 0) {
        this.kill();
    }
}

Enemy.prototype.kill = function (character) {
    this.UIElement.parentNode.removeChild(this.UIElement);
    gameMessage(character.name + ' killed ' + this.name + '!');
    roomData[currentRoom].currentEnemies.splice(roomData[currentRoom].currentEnemies.indexOf(this), 1);
    if (roomData[currentRoom].currentEnemies.length == 0) {
        canMove = true;
        roomData[currentRoom].clear = true;
    }
}

function InventoryItem (item) {
    this.name = item.name;
    this.shortName = item.shortname;
    this.owner;
    this.class = item.class;

    switch (item.class) {
    case 'weapon':
        this.mindmg = item.mindmg;
        this.maxdmg = item.maxdmg;
        this.cooldown = item.cooldown;
        break;
    case 'armour':
        this.hpbonus = item.hpbonus;
        break;
    case 'consumable':
        this.onConsume = item.onConsume;
        break;
    default:
        break;
    }

    return this;
}

InventoryItem.prototype.give = function (character) {
    this.owner = character;

    switch (this.class) {
    case 'weapon':
        // Always adjust the max first then the min, because the adjustment functions prevent the min from exceeding or equaling the max
        this.owner.adjustMaxDmg(this.maxdmg);
        this.owner.adjustMinDmg(this.mindmg);
        this.owner.cooldown = this.cooldown;
        break;
    case 'armour':
        this.owner.adjustMaxHP(this.hpbonus);
        break;
    case 'consumable':
        break;
    default:
        break;
    }

    this.UIElement = document.createElement('li');
    this.UIElement.innerHTML = this.name;

    __ui_inventory_panel.append(this.UIElement);
    this.owner.inventory.push(this);
}

InventoryItem.prototype.remove = function () {
    this.UIElement.parentNode.removeChild(this.UIElement);

    switch (this.class) {
    case 'weapon':
        this.owner.adjustmindmg(-this.mindmg);
        this.owner.adjustmaxdmg(-this.maxdmg);
        this.owner.cooldown = this.owner.defaultcooldown;
        roomData[currentRoom].loot.push(this.shortname);
        break;
    case 'armour':
        this.owner.adjustmaxhp(-this.hpbonus);
        roomData[currentRoom].loot.push(this.shortname);
        break;
    default:
        break;
    }

    this.owner.inventory.splice(this.owner.inventory.indexOf(this),1);
    roomData[currentRoom].currentLoot.push(this);
}

InventoryItem.prototype.drop = function (owner, thing) {
    var check = false;
    var tmp;
    for (let item in owner.inventory) {
        if (owner.inventory[item].name.toLowerCase() == thing.toLowerCase()) {
            check = true;
            tmp = owner.inventory[item];
            break;
        }
    }
    if (check) {
        tmp.remove();
    } else {
        gameMessage('You don\'t have that item!');
    }
}

InventoryItem.prototype.consume = function (owner, thing) {
    var check = false;
    var tmp;
    for (let item in owner.inventory) {
        if (owner.inventory[item].name.toLowerCase() == thing) {
            check = true;
            tmp = owner.inventory[item];
            break;
        }
    }
    if (check) {
        if (tmp.class == 'consumable') {
            tmp.onConsume(owner);
            tmp.remove();
        }
    } else {
        gameMessage('You don\'t seem to have that...');
    }
}

// Timer coalescing for performance (rather than spamming timers for every single character, we run a single timer that fires every 1/60 seconds for 60fps)
// To add: clearing of game messages and action responses
function timerduties () {
	// Handle Cooldowns
	for (var i = 0; i < COOLDOWN_ARRAY.length; i++) {
		// First check that the character / enemy is actually still alive.
		if (COOLDOWN_ARRAY[i].hp <= 0) {
			COOLDOWN_ARRAY.splice(i, 1);
		} else {
			COOLDOWN_ARRAY[i].cooldownCount += 167;
			COOLDOWN_ARRAY[i].cooldownIndicator.setAttribute('value', (COOLDOWN_ARRAY[i].cooldownCount / COOLDOWN_ARRAY[i].cooldown) * 100);
			if (COOLDOWN_ARRAY[i].cooldownCount >= COOLDOWN_ARRAY[i].cooldown) {
				COOLDOWN_ARRAY[i].cooldownIndicator.setAttribute('value', 100);
				COOLDOWN_ARRAY[i].cooldownCount = COOLDOWN_ARRAY[i].cooldown;
				COOLDOWN_ARRAY[i].canAttack = true;
				if (COOLDOWN_ARRAY[i].type == 'enemy') {
					COOLDOWN_ARRAY[i].attack(playerCharacter[currentCharacter]);
				}
				COOLDOWN_ARRAY.splice(i, 1);
			}
		}
	}
	if (COOLDOWN_ARRAY.length == 0 || gameOver) {
		clearInterval(SYS_TIMER);
		SYS_TIMER = null;
	}
}

function updateNavOptions(toHide) {
    try {
        if (Array.isArray(toHide) || toHide == null) {
            var options = roomData[currentRoom].navChoices;
            var tmp = true;
            if (options.hasOwnProperty('n') && $.inArray('n', toHide) === -1) {
                tmp = false;
                __ui_nav_options.n.fadeIn(NAV_OPTION_TRANSITION_TIME);
            } else {
                __ui_nav_options.n.fadeOut(NAV_OPTION_TRANSITION_TIME);
            };

            if (options.hasOwnProperty('s') && $.inArray('s', toHide) === -1) {
                tmp = false;
                __ui_nav_options.s.fadeIn(NAV_OPTION_TRANSITION_TIME);
            } else {
                __ui_nav_options.s.fadeOut(NAV_OPTION_TRANSITION_TIME);
            };

            if (options.hasOwnProperty('e') && $.inArray('e', toHide) === -1) {
                tmp = false;
                __ui_nav_options.e.fadeIn(NAV_OPTION_TRANSITION_TIME);
            } else {
                __ui_nav_options.e.fadeOut(NAV_OPTION_TRANSITION_TIME);
            };

            if (options.hasOwnProperty('w') && $.inArray('w', toHide) === -1) {
                tmp = false;
                __ui_nav_options.w.fadeIn(NAV_OPTION_TRANSITION_TIME);
            } else {
                __ui_nav_options.w.fadeOut(NAV_OPTION_TRANSITION_TIME);
            };
            if (tmp) {
                __ui_nav.fadeOut(NAV_OPTION_TRANSITION_TIME);
            } else {
                __ui_nav.show();
            }

        } else {
            throw 'Invalid navigation hide list';
        }
    }
    catch (error) {
        console.error(error);
    }
};

function displayRoomInfo(title, text) {
    if (title !== null && text !== null) {
        __ui_room_title.text(title);
        __ui_room_text.text(text);
    };
};

function gameMessage(msg, color) {
    if (msg !== null) {
        var msgColor = color || 'white';
        __ui_game_message.html(msg);
        __ui_game_message.css('color', msgColor);
    }
}

function actionResponse(response) {
    if (response !== null) {
        __ui_action_response.html(response);
    };
};

function inputFocus() {
    if (!TOUCH_CAPABLE) {
        __ui_input.focus();
    }
}
function gotoRoom(index) {
	currentRoom = index;
    displayRoomInfo(roomData[index].roomTitle, roomData[index].roomInfo);
    updateNavOptions();
	gameMessage('');
	if (roomData[index].hasOwnProperty('onEnter')) {
		roomData[index].onEnter();
	}
	if (!roomData[index].visited) {
		roomData[index].visited = true;
		if (roomData[index].loot.length > 0) {
			roomData[index].loot.forEach(e => {
				roomData[index].currentLoot.push(new InventoryItem(lootData[e]));
			});
		}
    }
    actionResponse('');
	inputFocus();
}

function roomHasItem(index, itemName) {
    var result = -1;
    for (var key in roomData[index].currentLoot) {
        if (roomData[index].currentLoot[key].shortName.toLowerCase() === itemName.toLowerCase()) {
            result = key;
            break;
        }
    }
    return result;
}

function move(direction) {
    try {
        if ($.inArray(direction, ['n','s','e','w']) === -1) {
            throw direction;
        } else {
            if (roomData[currentRoom].navChoices.hasOwnProperty(direction)) {
                if (!canMove) {
                    actionResponse(MOVEMENT_RESTRICTED);
                    return;
                } else {
                    if (roomData[currentRoom].hasOwnProperty('onExit')) {
                        roomData[currentRoom].onExit();
                    }
                    gotoRoom(roomData[currentRoom].navChoices[direction]);
                }
            } else {
                actionResponse(MOVEMENT_INVALID_DIRECTION);
            }
        }
    }
    catch (error) {
        console.error('Invalid direction - ' + error);
    }
}

function go(event) {
    if (event.keyCode === 13 && acceptInput) {
        var input = __ui_input.val().toLowerCase();
        __ui_input.val('');
        inputFocus();

        var tmp = input.split(' ');
        var command = tmp[0];
        tmp.shift();
        var parameter = tmp.join('');
        switch (command) {
            case 'n':
            case 's':
            case 'e':
            case 'w':
                move(command);
                break;
            case 'get':
                var tmp = roomHasItem(currentRoom, parameter);
                if (tmp > -1) {
                    roomData[currentRoom].currentLoot[tmp].give(playerCharacter[currentCharacter]);
                } else {
                    actionResponse(ITEM_NOT_FOUND_IN_ROOM);
                }
                break;
            case 'attack':
                if (playerCharacter[currentCharacter].canAttack) {
                    var tmp = -1;
                    for (var e in roomData[currentRoom].currentEnemies) {
                        if (roomData[currentRoom].currentEnemies[e].name.toLowerCase() == parameter) {
                            tmp = e;
                            break;
                        }
                    }
                    if (tmp > -1) {
                        playerCharacter[currentCharacter].attack(roomData[currentRoom].currentEnemies[tmp]);
                    } else {
                        actionResponse(ATTACK_INVALID_TARGET);
                    }
                } else {
                    actionResponse('Wait!');
                }
                break;
            case 'drop':
                break;
            case 'consume':
                break;
            default:
                // Special actions defined in the room
                if (roomData[currentRoom].actionResponses.hasOwnProperty(input)) {
                    actionResponse(roomData[currentRoom].actionResponses[input]['text']);
                    if (roomData[currentRoom].actionResponses[input].hasOwnProperty('func')) {
                        roomData[currentRoom].actionResponses[input]['func']();
                    }
                } else {
                    actionResponse('Huh?');
                };
                break;
        }
    }
}

function resizeRoomInfoWindow () {
    __ui_window_height = window.innerHeight;
    // __ui_window_width = window.innerWidth;
    switch (true) {
        case (__ui_window_height <= 640):
            // Action response: 1em
            // Nav: 1.3em
            // Game message: 1.2em
            // Panels: 100px
            // Command bar: 2em
            // Input: 2em
            // Total = 220px (1em = 16px)
            $('.room-row').height(__ui_window_height - 220 - 16 - 16);
            // $('.room-row').width(__ui_window_width);
            break;
        default:
            // Action response: 2em
            // Nav: 2em
            // Game message: 2em
            // Panels: 12em
            // Input: 2em
            // Total = (2 + 2 + 2 + 12 + 2) x 16 = 320px (1em = 16px)
            $('.room-row').height(__ui_window_height - 320 - 80 - 80);
            // $('.room-row').width(__ui_window_width);
            break;
    }
}

function showModal (title, msg) {
    var text = msg || DEFAULT_HELP;
    $('.container-fluid').css('filter', 'blur(2px)');
    $('#modal-title').text(title);
    $('#modal-text').text(msg);
    __ui_modal.fadeIn(MODAL_FADE_IN_TIME);
}

function hideModal (event) {
    $('.container-fluid').css('filter', 'blur(0px)');
    __ui_modal.fadeOut(MODAL_FADE_IN_TIME)
}

$(function() {
    // initialize global variables pointing to the various UI elements for calling in other parts of the script
    __ui_room_text = $('#room-text');
    __ui_room_title = $('#room-title')
    __ui_action_response = $('.action-response-text');
    __ui_nav = $('.nav');
    __ui_nav_options = {
        "n": $('.nav-north'),
        "s": $('.nav-south'),
        "e": $('.nav-east'),
        "w": $('.nav-west')
    };
    __ui_game_message = $('.game-message');
    __ui_character_panel = $('.character-info');
    __ui_inventory_panel = $('.command-panel');
    __ui_center_panel = $('.center-panel');
    __ui_enemy_panel = $('.enemy-info');
    __ui_command_bar = $('.command-bar');
    __ui_input = $('#player-input');
    __ui_modal = $('#modal');
    __ui_modal_title = $('#modal-title');
    __ui_modal_text = $('#modal-text');

    // Set the height of .room-row
    resizeRoomInfoWindow();
    $(window).resize(resizeRoomInfoWindow);

    // Check localStorage for previous room
    if (localStorage.init === undefined) {
        localStorage.init = true;
        localStorage.lastroom = 0;
    };

    playerCharacter[currentCharacter] = new Character('template');
    // gotoRoom(localStorage.lastroom);
    gotoRoom(0);

    // Enable swipe-based navigation (to turn off if touch-functionality is not detected)
    // Note: This is interfering with the scrolling of the room info element
    if ('ontouchstart' in document.documentElement) {
        TOUCH_CAPABLE = true;
        $('.info-panels').swipe('enable');
        $('.info-panels').swipe({
           swipe: function(event, direction, distance, duration, fingerCount, fingerData) {
              switch (direction) {
                  case 'up':
                    console.log('tried to move north');
                    move('n');
                    break;
                  case 'down':
                    move('s');
                    break;
                  case 'left':
                    move('w');
                    break;
                  case 'right':
                    move('e');
                    break;
                  default:
                    console.error('Unknown swipe direction!');
                    break;
              }
           },
           threshold: 75
        });
    }

    __ui_modal.click(function(event){hideModal(event)});
    $(window).keydown(function (event) {go(event)});

    setTimeout(function(){
        $('#curtain').fadeOut(600);
        inputFocus();
    }, 1500);
});