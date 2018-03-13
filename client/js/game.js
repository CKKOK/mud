var __ui_window_height;
var __ui_room_info, __ui_action_response, __ui_nav_options, __ui_game_message, __ui_character_panel, __ui_inventory_panel, __ui_enemy_panel, __ui_command_bar, __ui_command_panel;
var localStorage, sessionStorage;

function resizeRoomInfoWindow () {
    __ui_window_height = window.innerHeight;
    switch (true) {
        case (__ui_window_height <= 640):
            // Action response: 1em
            // Nav: 1.3em
            // Game message: 1.2em
            // Panels: 100px
            // Command bar: 2em
            // Input: 2em
            // Total = 220px (1em = 16px)
            $('.room-row').height(__ui_window_height - 220 - 10 - 10);
            break;
        default:
            // Action response: 2em
            // Nav: 2em
            // Game message: 2em
            // Panels: 12em
            // Input: 2em
            // Total = (2 + 2 + 2 + 12 + 2) x 16 = 320px (1em = 16px)
            $('.room-row').height(__ui_window_height - 320 - 10 - 10);
            break;
    }
}


$(function() {
    // initialize global variables pointing to the various UI elements for calling in other parts of the script
    __ui_room_info = $('.room-info');
    __ui_action_response = $('.action-response-text');
    __ui_nav_options = {
        "n": $('.nav-north'),
        "s": $('.nav-south'),
        "e": $('.nav-east'),
        "w": $('.nav-west')
    };
    __ui_game_message = $('.game-message');
    __ui_character_panel = $('.character-info');
    __ui_inventory_panel = $('.command-panel');
    __ui_command_panel = $('.command-panel');
    __ui_enemy_panel = $('.enemy-info');
    __ui_command_bar = $('.command-bar');

    // Set the height of .room-row
    resizeRoomInfoWindow();
    $(window).resize(resizeRoomInfoWindow);

    // Check localStorage
    if (localStorage.init === undefined) {
        localStorage.init = true;
        localStorage.lastroom = 1;
    } else {
        // Go to the room number.
        console.log(localStorage.lastroom);
    }

    // Enable swipe-based navigation (to turn off if touch-functionality is not detected)
    // Note: This is interfering with the scrolling of the room info element
    $('.info-panels').swipe('enable');
    $('.info-panels').swipe({
       swipe: function(event, direction, distance, duration, fingerCount, fingerData) {
          console.log('Swiped ' + direction);
       },
       threshold: 75
    });

    setTimeout(function(){$('.curtain').fadeOut(600)}, 1500);
});