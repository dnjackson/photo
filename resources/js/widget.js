/**
 * authors: Michael Morris-Pearce <mikemp@mit.edu>, Daniel Jackson <dnj@mit.edu>
 * date: 25 April 2012
 * Copyright Daniel Jackson 2012
 */

// callbacks is a map from button names (see buttons below) to callback functions
SP.widget = function(button_callbacks) {
  var enabled = {}; // one field per button name, set to true or false
  var buttons = [
    'photo',
    'grid',
    'text',
    'prev',
    'disprev', // disabled previous button
    'next',
    'disnext', // disabled next button
    'play',
    'pause'
  ];
  var class_prefix = '.widget';
  var button_prefix = class_prefix + '-button';

  // ---- BEGIN CONFIGURE ------------------------------------------------------

  var HIDE_DELAY = 6000;              // milliseconds
  var FLIP_SPEED = 150;               // milliseconds, 150 is good
  var FLIP_EASE_IN = 'easeInCirc';    // jQ-ui easing function
  var FLIP_EASE_OUT = 'easeOutCirc';  // jQ-ui easing function
  var ICON_WIDTH = 19;                // pixels
  var TOOLBAR_EXTRA_WIDTH = 5;        // extra width of widget beyond icons

  // --- END CONFIGURE ---------------------------------------------------------

  var widget = {};

  // number of buttons currently enabled
  // used to determine widget width
  var num_enabled = 0; 

  // refresh which buttons show based on status of callbacks, folding if do_fold
  widget.refresh = function (do_fold) {
    var new_enabled = 0;
    buttons.forEach(function (button) {
      var callback = button_callbacks[button];
      if (callback && callback.enabled && callback.enabled()) {
        enabled[button] = true;
        new_enabled++;
      } else
        enabled[button] = false;
    });
    // fold if explicitly required or if number of buttons has changed
    if (do_fold || (num_enabled != new_enabled)) {
      num_enabled = new_enabled;
      fold_in(function() {
        update_buttons();
        fold_out();
      });
      }
    else update_buttons();
  }

  var update_buttons = function () {
    buttons.forEach(function(button) {
      if (enabled[button])
        $(widgetClass(button)).show();
      else
        $(widgetClass(button)).hide();
      });  
  }

  var init = function () {
    // attach callbacks
    buttons.forEach(function(button) {
        $(widgetClass(button)).click(
          function () {
            callback = button_callbacks[button];
            if (callback) {
              // check whether to fold using state before callback
              // but update buttons using state after callback
              var do_fold = callback.do_fold && callback.do_fold();
              callback();
              widget.refresh(do_fold);
            };
            });
      });
      // hide/show buttons based on callback availability
      widget.refresh(true);
  }
  
  function widgetClass(arg) {
    return class_prefix + '-' + arg;
  };

  function fold_in(after) {
    $(class_prefix).animate({
      'width': '0',
      'opacity': 0.0
    }, FLIP_SPEED, FLIP_EASE_IN, after);
  };

  function fold_out() {
    $(class_prefix).animate({
      'width': ((num_enabled * ICON_WIDTH) + TOOLBAR_EXTRA_WIDTH) + 'px',
      'opacity': 1
    }, FLIP_SPEED, FLIP_EASE_OUT);
  };

  function debounce(func, delay) {
    var timeout;
    return function() {
      var args = arguments;
      var thisArg = this;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(thisArg, args);
      }, delay);
    }
  };

  var visible = true;
  // register callback that sets timeout for hiding on every mouse move
  var debounced_delay_hide_widget = 
      debounce(function() {
          if (visible)
            $(widgetClass('hider')).hide('slide', {direction: 'down'}, undefined, function() {visible = false;});
        }, HIDE_DELAY);
  $(document).mousemove(debounced_delay_hide_widget);
  
  // reset hide timer when user clicks on widget
  $(widgetClass('hider')).click(debounced_delay_hide_widget);
  $(document).mousemove(function() {
    if (!visible) {
      visible = true;
      $(widgetClass('hider')).show('slide', {direction: 'down'});
    }
  });

  $(class_prefix).hide();
  $(document).ready(init);
  $(class_prefix).show();

  // Firefox and jQ-ui do not get along for show/hide if .widget is centered.
  $(widgetClass('hider')).position({
    my: 'center bottom',
    at: 'center bottom',
    of: $(widgetClass('container'))
  });

  return widget;
};