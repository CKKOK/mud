var roomData, lootData, enemyData;
var __ui_window_height, __ui_window_width;
var __ui_room_title, __ui_room_text, __ui_action_response, __ui_nav, __ui_nav_options, __ui_game_message, __ui_character_panel, __ui_enemy_panel, __ui_command_bar, __ui_center_panel, __ui_command_panel, __ui_inventory_panel, __ui_console_panel, __ui_input, __ui_modal;
var localStorage, sessionStorage;
var playerCharacter = [];
var currentCharacter = 0;
var COOLDOWN_ARRAY = [];
var SYS_TIMER = null;
var acceptInput = true;
var currentRoom = 0;
var canMove = true;
var gameOver = false;
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

// Timings and counts
var NAV_OPTION_TRANSITION_TIME = 200;
var MODAL_FADE_IN_TIME = 300;
var CHAR_COUNT = 0;
var ENEMY_COUNT = 0;
var TOUCH_CAPABLE = false;

// Strings
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

    this.UIElement = $('<div></div>').addClass('character').attr('id', 'c-'+this.name);

    var charName = $('<p></p>').addClass('character-stat').attr('id', 'character-name-'+this.name).text(this.name);
    var charHp = $('<p></p>').addClass('character-stat').attr('id', 'character-hp-'+this.name).text('HP: ' + this.hp + '/' + this.maxhp);
    var charDmg = $('<p></p>').addClass('character-stat').attr('id', 'character-dmg-'+this.name).text('DMG: ' + this.mindmg + ' - ' + this.maxdmg);

    var charCooldown = $('<div></div>').addClass('progress');
    var tmp = $('<div></div>').addClass('progress-bar').addClass('cooldown').attr('role','progressbar').attr('id','character-cooldown-'+this.name).width('100%');
    charCooldown.append(tmp);
    
    this.UIElement.append(charName);
    this.UIElement.append(charHp);
    this.UIElement.append(charDmg);
    this.UIElement.append(charCooldown);

    // $('.cname').append(charName);
    // $('.cstat').append(charHp);
    // $('.cstat').append(charDmg)
    // $('.cdown').append(charCooldown);
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
    $('#character-hp-' + this.name).text('HP: ' + this.hp + '/' + this.maxhp);
}

Character.prototype.adjustMaxHP = function (delta) {
    this.maxhp += delta;
    if (this.maxhp < 0) {
        this.maxhp = 0;
    }
    if (this.maxhp < this.hp) {
        this.hp = this.maxhp;
    }
    $('#character-hp-' + this.name).text('HP: ' + this.hp + '/' + this.maxhp);
}

Character.prototype.adjustMinDmg = function (delta) {
    this.mindmg += delta;
    if (this.mindmg < 0) {
        this.mindmg = 0;
    }
    if (this.mindmg >= this.maxdmg) {
        this.mindmg = this.maxdmg - 1;
    }
    $('#character-dmg-' + this.name).text('DMG: ' + this.mindmg + ' - ' + this.maxdmg);
}

Character.prototype.adjustMaxDmg = function (delta) {
    this.maxdmg += delta;
    if (this.maxdmg < 0) {
        this.maxdmg = 1;
    }
    if (this.maxdmg <= this.mindmg) {
        this.maxdmg = this.mindmg + 1;
    }
    $('#character-dmg-' + this.name).text('DMG: ' + this.mindmg + ' - ' + this.maxdmg);
}

Character.prototype.attack = function (enemy) {
    var dmg = this.mindmg + Math.floor(Math.random() * (this.maxdmg - this.mindmg + 1));
    enemy.receiveHit(this, dmg);
    gameMessage(this.name + ' hits ' + enemy.name + ' for ' + dmg + ' damage!');
    this.canAttack = false;
    this.cooldownCount = 0;
    this.cooldownIndicator.width(((this.cooldownCount / this.cooldown) * 100) + '%');
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
    localStorage.lastroom = 0;
    this.adjustHP(-this.hp);
    gameMessage('You died', 'red');
    $('#player-input').fadeOut(500);
    $(window).off('keydown');
    gameOver = true;
    setTimeout(showModal, 3000);
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

    this.UIElement = $('<div></div>').addClass('enemy').attr('id', 'e-' + this.UIIndex);
    
    var name = $('<div></div>').attr('id', 'e-name-'+this.UIIndex).text(this.name);
    var hp = $('<div></div>').attr('id', 'e-hp-'+this.UIIndex).text('HP: ' + this.hp + '/' + this.maxhp);

    this.cooldownElement = $('<div></div>').addClass('progress');
    this.cooldownIndicator = $('<div></div>').addClass('progress-bar').addClass('cooldown').attr('role','progressbar').attr('id','e-cooldown-'+this.UIIndex).width('100%');
    this.cooldownElement.append(this.cooldownIndicator);

    this.UIElement.append(name).append(hp).append(this.cooldownElement);

    __ui_enemy_panel.append(this.UIElement);
}

Enemy.prototype.hide = function () {
    this.UIElement.hide();
}

Enemy.prototype.show = function () {
    this.UIElement.show();
}

Enemy.prototype.adjustHP = function (delta) {
    this.hp += delta;
    if (this.hp < 0) {
        this.hp = 0;
    }
    if (this.hp > this.maxhp) {
        this.hp = this.maxhp;
    }
    $('#e-hp-'+this.UIIndex).text('HP: ' + this.hp + '/' + this.maxhp);
}

Enemy.prototype.adjustMaxHP = function (delta) {
    this.maxhp += delta;
    if (this.maxhp < 0) {
        this.maxhp = 0;
    }
    if (this.maxhp < this.hp) {
        this.hp = this.maxhp;
    }
    $('#e-hp-'+this.UIIndex).text('HP: ' + this.hp + '/' + this.maxhp);
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
    this.cooldownIndicator.width(((this.cooldownCount / this.cooldown) * 100) + '%');
    COOLDOWN_ARRAY.push(this);
    if (!SYS_TIMER) {
        SYS_TIMER = setInterval(timerduties, 167);
    }
}

Enemy.prototype.receiveHit = function (enemy, dmg) {
    this.adjustHP(-dmg);
    if (this.hp <= 0) {
        this.kill(enemy);
    }
}

Enemy.prototype.kill = function (character) {
    if (this.loot.length > 0) {
        this.loot.forEach(function(item){
            roomData[currentRoom].currentLoot.push(new InventoryItem(lootData[item]));
            gameMessage(this.name + ' dropped ' + lootData[item]['name'] + '!');
        })
    }
    this.UIElement.remove();
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
        this.onConsume = new Function('owner', item.onConsume);
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

    this.UIElement = $('<div></div>').text(this.name);
    // this.UIElement.innerHTML = this.name;

    __ui_inventory_panel.append(this.UIElement);
    this.owner.inventory.push(this);
}

InventoryItem.prototype.remove = function () {
    this.UIElement.remove();

    switch (this.class) {
    case 'weapon':
        this.owner.adjustMinDmg(-this.mindmg);
        this.owner.adjustMaxDmg(-this.maxdmg);
        this.owner.cooldown = this.owner.defaultcooldown;
        roomData[currentRoom].loot.push(this.shortname);
        break;
    case 'armour':
        this.owner.adjustMaxHp(-this.hpbonus);
        roomData[currentRoom].loot.push(this.shortname);
        break;
    default:
        break;
    }

    this.owner.inventory.splice(this.owner.inventory.indexOf(this),1);
    roomData[currentRoom].currentLoot.push(this);
}

function dropInventoryItem (owner, thing) {
    var check = false;
    var tmp;
    for (var item in owner.inventory) {
        if (owner.inventory[item].shortName.toLowerCase() == thing.toLowerCase()) {
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

function inventoryItemConsume (owner, thing) {
    var check = false;
    var tmp;
    for (var item in owner.inventory) {
        if (owner.inventory[item].shortName.toLowerCase() == thing) {
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
			COOLDOWN_ARRAY[i].cooldownIndicator.width(((COOLDOWN_ARRAY[i].cooldownCount / COOLDOWN_ARRAY[i].cooldown) * 100)+'%');
			if (COOLDOWN_ARRAY[i].cooldownCount >= COOLDOWN_ARRAY[i].cooldown) {
				COOLDOWN_ARRAY[i].cooldownIndicator.width('100%');
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
        __ui_console_panel.append('<br>' + msg);
        __ui_console_panel.scrollTop(__ui_console_panel.prop('scrollHeight'));
    }
}

function actionResponse(response) {
    if (response !== null) {
        __ui_action_response.html(response);
        __ui_console_panel.append('<br>' + response);
        __ui_console_panel.scrollTop(__ui_console_panel.prop('scrollHeight'));
    };
};

function inputFocus() {
    if (!TOUCH_CAPABLE) {
        __ui_input.focus();
    }
}
function gotoRoom(index) {
    currentRoom = index;
    localStorage.lastroom = currentRoom;
    displayRoomInfo(roomData[index].roomTitle, roomData[index].roomInfo);
    updateNavOptions();
	gameMessage('');
	if (roomData[index].hasOwnProperty('onEnter')) {
        var newFunc = new Function ('', roomData[index]['onEnter']);
        newFunc();
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
                        var newFunc = new Function ('', roomData[currentRoom]['onExit']);
                        newFunc();
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
            case 'loot':
                var response = 'You see a ';
                var tmp = roomData[currentRoom].currentLoot.length;
                if (tmp === 0) {
                    response = 'Move along, nothing to see here.';
                } else if (tmp === 1) {
                    response += (roomData[currentRoom].currentLoot[0].name + '.');
                } else if (tmp === 2) {
                    response += (roomData[currentRoom].currentLoot[0].name + ' and ' + roomData[currentRoom].currentLoot[1].name + '.');
                } else {
                    roomData[currentRoom].currentLoot.forEach(function(item, index){
                        response += item.name;
                        if (index < (tmp - 2)) {
                            response += ', ';
                        } else {
                            response += ' and '
                        };
                        response += '.';
                    })
                }
                actionResponse(response);
                break;
            case 'get':
                var tmp = roomHasItem(currentRoom, parameter);
                if (tmp > -1) {
                    roomData[currentRoom].currentLoot[tmp].give(playerCharacter[currentCharacter]);
                    roomData[currentRoom].currentLoot.splice(tmp, 1);
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
                dropInventoryItem(playerCharacter[currentCharacter], parameter);
                break;
            case 'eat':
            case 'drink':
                inventoryItemConsume(playerCharacter[currentCharacter], parameter);
                break;
            default:
                // Special actions defined in the room
                if (roomData[currentRoom].actionResponses.hasOwnProperty(input)) {
                    actionResponse(roomData[currentRoom].actionResponses[input]['text']);
                    if (roomData[currentRoom].actionResponses[input].hasOwnProperty('func')) {
                        var newFunc = new Function('', roomData[currentRoom].actionResponses[input]['func']);
                        newFunc();
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
    __ui_window_width = window.innerWidth;
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
            $('.container-fluid').width(__ui_window_width);
            break;
        default:
            // Action response: 2em
            // Nav: 2em
            // Game message: 2em
            // Panels: 12em
            // Input: 2em
            // Total = (2 + 2 + 2 + 12 + 2) x 16 = 320px (1em = 16px)
            $('.room-row').height(__ui_window_height - 320 - 80 - 80);
            $('.container-fluid').width(__ui_window_width);
            break;
    }
}

function showModal (title, msg) {
    var text = msg || DEFAULT_HELP;
    $('.container-fluid').css('filter', 'blur(2px)');
    $('#modal-title').text(title);
    $('#modal-text').text(msg);
    // __ui_modal.fadeIn(MODAL_FADE_IN_TIME);
    __ui_modal.modal('show'); // BECAUSE BOOTSTRAP. WHY?!
}

function hideModal (event) {
    $('.container-fluid').css('filter', 'blur(0px)');
    // __ui_modal.fadeOut(MODAL_FADE_IN_TIME);
    __ui_modal.modal('hide'); // BECAUSE BOOTSTRAP. WHY?!
}

function restart() {
	location.reload();
}

function showPanel(event) {
    switch ($(event.target).attr('class')) {
        case 'cmdpanelshow':
            __ui_inventory_panel.hide();
            __ui_console_panel.hide();
            __ui_command_panel.show();
            break;
        case 'invpanelshow':
            __ui_inventory_panel.show();
            __ui_console_panel.hide();
            __ui_command_panel.hide();
            break;
        case 'consoleshow':
            __ui_inventory_panel.hide();
            __ui_console_panel.show();
            __ui_command_panel.hide();
            break;
        default:
            break;
    }
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
    __ui_inventory_panel = $('.inventory-panel');
    __ui_command_panel = $('.command-panel');
    __ui_console_panel = $('.console-panel');
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
    // gotoRoom(0);
    $.getJSON('js/roomdata.json').done(function(roomjson){
        roomData = roomjson.roomData;
        $.getJSON('js/itemdata.json').done(function(itemjson){
            lootData = itemjson;
            $.getJSON('js/monsterdata.json').done(function(monsterjson){
                enemyData = monsterjson;
                // gotoRoom(localStorage.lastroom);
                gotoRoom(0);
            }).fail(function(){console.error('Failed to get mob data!')});
        }).fail(function(){console.error('Failed to get item data!')});
    }).fail(function(){console.error('Failed to get room data!')});

    // Enable swipe-based navigation (to turn off if touch-functionality is not detected)
    // Note: This is interfering with the scrolling of the room info element
    if ('ontouchstart' in document.documentElement) {
        TOUCH_CAPABLE = true;
        $('.info-panels').swipe('enable');
        $('.info-panels').swipe({
           swipe: function(event, direction, distance, duration, fingerCount, fingerData) {
              switch (direction) {
                  case 'up':
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

    // __ui_modal.click(function(event){hideModal(event)});
    $('#restart').click(restart);
    $(window).on('keydown', function (event) {go(event)});
    $('.cmdpanelshow', '.invpanelshow', '.consoleshow').click(showPanel);
    
    $('#cmd-look').click(function(){
        if (roomData[currentRoom].actionResponses.hasOwnProperty('look')) {
            actionResponse(roomData[currentRoom].actionResponses['look']['text']);
            if (roomData[currentRoom].actionResponses['look'].hasOwnProperty('func')) {
                var newFunc = new Function('', roomData[currentRoom].actionResponses['look']['func']);
                newFunc();
            }
        } else {
            actionResponse('Huh?');
        };
    })

    setTimeout(function(){
        $('#curtain').fadeOut(600);
        inputFocus();
    }, 1500);
});