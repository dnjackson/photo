/**
 * Photo Gallery
 * Author: Daniel Jackson <dnj@mit.edu>
 * Copyright 2012-2016 Daniel Jackson 
 */

// create namespace
var SP = SP || {};

SP.assert = function (pred, msg) {
  if (!pred) console.log("Assertion violation: " + msg);  
};

SP.mode = {PHOTO: 0, GRID: 1, SLIDESHOW: 2, TEXT: 3};

// utility for iteration over arrays
SP.each = function (arr, f) {
    for (var i = 0; i < arr.length; i++) {
      var result = f(arr[i]);
    }
  };

// takes an array of modes A, and returns an array such that a[i] is true if A contains i and undefined otherwise
SP.modeSet = function (modeArray) {
    var ms = [];
    SP.each(modeArray, function (e) {ms[e] = true;});
    return ms;
};

SP.defaultPreferences = {
  text: "Textual description",
  logoLink: "http://straightphotography.org",
  contactLink: "mailto:info@straightphotography.org",
  // times in milliseconds
  fadeinTime: 100, // image show, for regular navigation and slide play mode
  fadeoutTime: 300, // image hide, for regular navigation and slide play mode
  transitionTime: 500, // time between images for gallery
  enabledModes: SP.modeSet ([SP.mode.PHOTO, SP.mode.GRID, SP.mode.SLIDESHOW, SP.mode.TEXT]),
  initialMode: SP.mode.GRID,
  logoShrink: true, // shrink the logo and remove the navbar in photo mode
  skipFade: true, // don't fade in and out except in slideshow mode
  showMenu: true, // show navigation bar
  thumbPath: "/content/images/thumbnails/",
  imagePath: "/content/images/large/",
  gridRows: 4,
  gridColumns: 5
};

/*
images is an array of objects, one per photo, structured like this
[{photo: {url: "photo.1234.jpg", caption: "London, 2012"}, thumb: {url: "photo.1234.jpg", caption: "London, 2012"}}, ...]
thumb is optional, and even if thumb is present, thumb caption is optional

Assumes prefs.enabledModes includes SP.mode.PHOTO?
*/
SP.Gallery = function (imageContainer, gridContainer, textContainer, logoSpacer, menu, prefs, texts, images) {
  var gallery = {}; // holds fields and methods of object
  var photos = [];
  var thumbs = [];
  var maxPhotos = -1; // index of last photo; one less than number of images
  var photoIndex = -1; // index of currently displayed photo, -1 if none
  var mode;
  var playing; // true if slideshow is playing
  var autoplayTimer;
  var widget; // UI widget, may be undefined
  var grids = []; // array of grids, each a JQ element
  var gridIndex = -1;
  var maxGrids = -1; // index of last grid
  var MAX_PER_PAGE = prefs.gridColumns * prefs.gridRows;
  
  // successor and predecessor modulo number of images
  var succ = function (i) {
    if (i == maxPhotos) return 0; else return i+1;
  };
  var pred = function (i) {
    if (i == 0) return maxPhotos; else return i-1;
  };
  
  var resetContainerVisibility = function () {
    gridContainer.hide();
    textContainer.hide();
    imageContainer.hide();
    if (mode === SP.mode.GRID) gridContainer.show();
    if (mode === SP.mode.TEXT) textContainer.show();
    if (mode === SP.mode.PHOTO || mode === SP.mode.SLIDESHOW) imageContainer.show();
  }
  resetContainerVisibility();
  
  // thumb is optional if thumbs are not enabled
  // inserts photos into image container, but does not insert thumbs: see installThumbs
  var addPhoto = function (photo, thumb) {
    photos.push(photo);
    maxPhotos++;
    var index = maxPhotos; // for closure
    var photo_box = photo.getElement();
    imageContainer.append(photo_box); 
    if (thumb && prefs.enabledModes[SP.mode.GRID]) {
      photo_box.css('cursor', 'pointer');
      // register action for clicking on photo to revert to grid
      photo_box.click(function () {
    	  gallery.change_to_grid_mode(computeGridIndex(index));
        if (widget) widget.refresh(true);
        });
      thumbs.push(thumb);
      var thumbElement = thumb.getElement();
      if (prefs.enabledModes[SP.mode.PHOTO])
      	// register action for clicking on thumb      
        thumbElement.click(function () {
      	  gallery.change_to_photo_mode(index);
      	  displayPhoto(photoIndex);
          if (widget) widget.refresh(true);
      	  });
      else
      	// if large photo mode is not enabled,
      	// then use URL associated with photo as
      	// target; assumes manifest file has been
      	// manually edited to insert appropriate links
        thumbElement.click(function () {
          window.location.href = photo.getURL();
      	  });
      }
    else SP.assert(!prefs.enabledModes[SP.mode.GRID], "addPhoto: thumb missing in grid mode");
  }
  
  var newGrid = function () {
    var grid = $('<div>');
    grid.addClass('grid');
    grids.push(grid);
    gridContainer.append(grid);
    grid.hide();
    maxGrids++;
    return grid;      
  }
  
  // given the index of a photo, return the index of the
  // grid it belongs to
  var computeGridIndex = function (photoIndex) {
    return Math.floor(photoIndex / MAX_PER_PAGE);
  }

  var make_number = function (i, index) {
    var number = $('<span>');
    number.text(i+1);
    if (i == index)
      number.addClass('number_highlight');
    else {
      number.addClass('number');
      // on click, open grid with this index
      number.click (function () {gallery.change_to_grid_mode(i);});
    }
    return number;
  }
  
  // append a label to the thumbnail grid showing the current index
  var appendGridLabel = function (grid, index, max) {
    if (max > 1) {      
      var gridLabel = $('<div>');
      gridLabel.addClass('grid_label');
      gridLabel.append(make_number(0, index));      
      for (var i = 1; i < max; i++) {
        var spacer = $('<span>');
        spacer.text(' '); // or use center dot ·
        spacer.addClass('spacer');
        gridLabel.append(spacer);
        gridLabel.append(make_number(i, index));
      }
      grid.append(gridLabel);      
    }
  }

  // no longer needed with better CSS layout
  // add a clear to current grid
  var gridClear = function () {
    var clearElt = $('<div>');
	  clearElt.addClass('clear');
    grids[maxGrids].append(clearElt);
  }

  // take thumbnails in array thumbs and create grid elements for them
  var installThumbs = function () {
    var num_grids = computeGridIndex(thumbs.length-1) + 1; // grid index of last thumb, plus 1
    var placed = 0; // number of thumbs placed on current grid
    var grid = newGrid();
    appendGridLabel(grid, maxGrids, num_grids);    
    SP.each(thumbs, function (thumb) {
      if (placed == MAX_PER_PAGE) {
        placed = 0;
        // gridClear();
        grid = newGrid();
        appendGridLabel(grid, maxGrids, num_grids);
      };
      grid.append(thumb.getElement());      
      thumb.show();
    	placed++;
      // clear no longer needed now different CSS strategy
      // if (placed % prefs.gridColumns == 0) gridClear();
    });
    // gridClear();
    gridIndex = 0;
    grids[gridIndex].show();
  }


  // install images from image description array
  var installImages = function () {
    SP.each(images, function (image) {
      // if large photo mode not enabled, just use raw URL; assumes it will be hand edited in manifest
      var url_prefix = prefs.enabledModes[SP.mode.PHOTO] ? prefs.imagePath : "";
      addPhoto(
        SP.Photo(url_prefix + image.photo.url, image.photo.caption, "image"), 
        (image.thumb) ? SP.Photo(prefs.thumbPath + image.thumb.url, image.thumb.caption, "thumb") : undefined);
      });
     if (prefs.enabledModes[SP.mode.GRID]) installThumbs();
  }
  installImages();
  
  // setup thumbnail highlighting effect
  var setupHighlighting = function () {
    var dim = function (thumb) {thumb.getElement().css('opacity', 0.4);}
    var brighten = function (thumb) {thumb.getElement().css('opacity', 1);}
    // dim all other thumbs when mouse hovers over each thumb
    SP.each(thumbs, function (thumb) {
      thumb.getElement().hover(
        function () {SP.each(thumbs, function (other) {
          if (other !== thumb) dim(other);
        })},
        function () {SP.each(thumbs, function (t) {
          brighten(t);
        })});
      });
  }

  // setup thumbnail highlighting if clicking on a thumb actually has an effect
  // removed condition here to allow for index pages with links
  // if (prefs.enabledModes[SP.mode.PHOTO]) setupHighlighting();
  setupHighlighting();
  
  gallery.register_widget = function (w) {
    widget = w;
  }
  
  // preload photos in range
  // can wrap around, eg if maxPhotos = 3, from = 2, to = 1, would preload 2,3,0,1
  // currently commands issued asynchronously, so order not significant
  // if no args, preload all
  // TODO: currently just preloads all
  gallery.preload = function (from, to) {
    if (!from) from = 0;
    if (!to) to = maxPhotos;
    SP.each(photos, function (photo) {photo.preload();});
  }

  // if showing a photo, transition from it
  var displayPhoto = function (i) {
    // set URL hash to identify image
    // only in photo mode, not in slide mode
    if (mode == SP.mode.PHOTO) SP.setHash(i);
    var in_time = prefs.fadeinTime;
    var out_time = prefs.fadeoutTime;
    if (mode == SP.mode.PHOTO && prefs.skipFade)
      in_time = out_time = 0;
    // note that show/out is asynchronous so need to use continuation to sequence it
    // why hide immediately after show too? because might get two calls to displayPhoto in rapid succession,
    // which can result in two calls to hide before two async calls to show; second hide is then lost
    // need to test whether photoIndex is i because can also get two calls for show with same photo (eg clicking on play multiple times)
    var show = function () {
      photos[i].show(in_time);
      if (photoIndex != -1 && photoIndex != i) photos[photoIndex].hide();
      photoIndex = i;
      };
    if (photoIndex != -1)
      photos[photoIndex].hide(out_time, show);
    else
      show();
  }
  
  // change from one mode to another
  // if index is defined, set photoIndex to it
  // updates mode and photoIndex
  // animates logo spacer and sets container visibilities but does not display photo
  var change = function (newMode, index) {
    // do nothing if no mode change
    if (mode == newMode) return;
	// if switching out of photo mode, clear the hash
	if (mode == SP.mode.PHOTO)
		SP.clearHash();
    // if switching out of slideshow mode, abort the show
    if (mode == SP.mode.SLIDESHOW)
      stop_slideshow();
    // if switching to grid or text, hide any displayed photo and reset to start
    if ((newMode == SP.mode.GRID || newMode == SP.mode.TEXT) && photoIndex != -1) {
      photos[photoIndex].hide();
      photoIndex = -1;
      };
    // when switching between photo and other modes, grow and shrink the logo spacer
    // JQuery toggle remembers height and returns to it next time
    var displayMode = function (m) {return m == SP.mode.PHOTO || m == SP.mode.SLIDESHOW;};
    if (prefs.logoShrink) {
      if (displayMode(mode) != displayMode(newMode)) {
        logoSpacer.animate({height: 'toggle'}, 500);
        if (prefs.showMenu) menu.animate({height: 'toggle'}, 100);        
        };
      };
    // when switching from grid to photo mode
    if (newMode == SP.mode.PHOTO) {
		if (mode == SP.mode.GRID && photoIndex == -1)
	    	photoIndex = (gridIndex * MAX_PER_PAGE);
        // displayPhoto requires correct mode
        mode = newMode;
      };
    // if switching from grid to slideshow mode, set photo index one behind first on grid
    if (newMode == SP.mode.SLIDESHOW && mode == SP.mode.GRID) {
        photoIndex = (gridIndex * MAX_PER_PAGE) - 1;
      };
    mode = newMode;
    // show appropriate container
    resetContainerVisibility();
    // override photoIndex if value given, eg when clicking on thumb
    if (index !== undefined) photoIndex = index;
  }
  
  // if index defined, set photoIndex to it
  gallery.change_to_photo_mode = function (index) {
    change(SP.mode.PHOTO, index);
  }
  gallery.change_to_photo_mode.enabled = function () {
    return mode == SP.mode.GRID && prefs.enabledModes[SP.mode.PHOTO];
  }
  gallery.change_to_photo_mode.do_fold = function () {return true;};
  
  // change to grid mode, showing grid with given index
  gallery.change_to_grid_mode = function (index) {
    if (mode == SP.mode.PHOTO) {
      index = computeGridIndex(photoIndex);
    }
    if (index != undefined) {
      grids[gridIndex].hide();
      gridIndex = index;
      grids[gridIndex].show();      
    }
    change(SP.mode.GRID);
  }
  gallery.change_to_grid_mode.enabled = function () {
    return mode != SP.mode.GRID && prefs.enabledModes[SP.mode.GRID];
  }
  // tells widget should do fold animation on this event
  gallery.change_to_grid_mode.do_fold = function () {return true;};

  gallery.change_to_text_mode = function () {
    change(SP.mode.TEXT);
  }
  gallery.change_to_text_mode.enabled = function () {
    return mode != SP.mode.TEXT && prefs.enabledModes[SP.mode.TEXT];
  }

  gallery.prev = function () {
    if (mode == SP.mode.SLIDESHOW) {
      change(SP.mode.PHOTO);
      gallery.prev_photo();
      }
    else if (mode == SP.mode.PHOTO)
      gallery.prev_photo();
    else if (mode == SP.mode.GRID)
      gallery.prev_grid();
  }
  gallery.prev.enabled = function () {
    return mode ==
      SP.mode.PHOTO
      || (mode == SP.mode.SLIDESHOW && prefs.enabledModes[SP.mode.PHOTO])
      || (mode == SP.mode.GRID && gridIndex > 0)
  }
  
  gallery.next = function () {
    if (mode == SP.mode.SLIDESHOW) {
      change(SP.mode.PHOTO);
      gallery.next_photo();
      }
    else if (mode == SP.mode.PHOTO)
      gallery.next_photo();
    else if (mode == SP.mode.GRID)
      gallery.next_grid();
  }
  gallery.next.enabled = function () {
    return mode ==
      SP.mode.PHOTO
      || (mode == SP.mode.SLIDESHOW && prefs.enabledModes[SP.mode.PHOTO])
      || (mode == SP.mode.GRID && gridIndex < maxGrids)
  }

  // callback for disable prev and next functions
  // currently do nothing, but enabled properties are used
  gallery.prev_disabled = function () {};
  gallery.prev_disabled.enabled = function () {
    return mode == SP.mode.GRID && !gallery.prev.enabled();
  }
  gallery.next_disabled = function () {};
  gallery.next_disabled.enabled = function () {
    return mode == SP.mode.GRID && !gallery.next.enabled();
  }
  
  // switch to previous grid of thumbnails
  gallery.prev_grid = function () {
    if (gridIndex > 0) {
      grids[gridIndex].hide();
      gridIndex--;
      grids[gridIndex].show();
    };
  }

  // switch to next grid of thumbnails
  gallery.next_grid = function () {
    if (gridIndex < maxGrids) {
      grids[gridIndex].hide();
      gridIndex++;
      grids[gridIndex].show();
    };
  }

  // displays previous photo, wrapping round if necessary
  gallery.prev_photo = function () {
    displayPhoto (pred(photoIndex));
  }
  
  // displays next photo, wrapping round if necessary
  gallery.next_photo = function () {
    displayPhoto (succ(photoIndex));
  }

  // start slideshow at current photo or start if none
  gallery.play = function () {
	  change(SP.mode.SLIDESHOW);
	  playing = true;
    // display first photo immediately
    gallery.next_photo();
    // then set timer for subsequent photos
    autoplayTimer = setInterval(gallery.next_photo, prefs.transitionTime);    
  }
  gallery.play.enabled = function () {
    return prefs.enabledModes[SP.mode.SLIDESHOW] && !playing;
  }
  // do fold animation only when switching to slideshow from grid mode
  gallery.play.do_fold = function () {return mode == SP.mode.GRID;};
  
  var stop_slideshow = function () {
    playing = false;
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  gallery.pause = function () {
	  stop_slideshow();
  }
  gallery.pause.enabled = function () {
    return mode == SP.mode.SLIDESHOW && playing;
  }

  gallery.start = function () {
    change(prefs.initialMode);

    // if URL ends with #n then show nth photo
    if (SP.hasHash() && prefs.enabledModes[SP.mode.PHOTO]) {
      photoIndex = parseInt(SP.getHash());
      gallery.change_to_photo_mode(photoIndex);
      displayPhoto(photoIndex);
      return;
      }
	// otherwise start in specified initial mode
    change(prefs.initialMode);
    // start up according to new mode
    if (mode == SP.mode.SLIDESHOW)
      gallery.play();
    else if (mode == SP.mode.PHOTO)
      gallery.next_photo();
  }

  // switch to photo matching hash if hash is manually changed
  // ugly hack, since this fires when hash is changed programmatically too
  window.onhashchange = function () {
    if (SP.hasHash()) {
      var hash = parseInt(SP.getHash());
      // if not displaying that photo, then
      // if photo mode enabled, switch to it
      if (photoIndex != hash)
        if (mode == SP.mode.PHOTO) {
        	displayPhoto(hash);
        } else if (prefs.enabledModes[SP.mode.PHOTO]) {
			gallery.change_to_photo_mode();
			displayPhoto(hash);
        }
    }
  }
	
  return gallery;
}

// CSS prefix is needed because thumbs and large images have different css classes
SP.Photo = function (url, caption, css_prefix) {
  var photo = {};
  var image = $('<img>'); // JQuery image object
  var frame = $('<div>'); // box to contain image for square cropping
  var box = $('<div>'); // box to contain image and caption
  var captionBox = $('<p>'); // box to contain caption
  
  // put image inside a div so it can be cropped for square thumbs
  // can't crop image directly while preserving aspect ratio
  // but can put it inside a framing box with overflow hidden
  frame.append(image); 
  frame.addClass(css_prefix + '_frame');
  
  // make invisible initially
  box.css('opacity', 0);
  box.addClass(css_prefix + '_box');
  box.append(frame);
  box.css('z-index', -1);

  if (caption && caption != "") {
    captionBox.html(caption);
    captionBox.addClass(css_prefix + '_caption');
    box.append(captionBox);
  }

  // ensure that caption does not show (in wrong place!) before image is loaded
  captionBox.hide();
  image.load(function () {captionBox.show();});
  
  var loaded = false;
  
  photo.preload = function () {
    image.attr('src', url);
    loaded = true;
  }
  photo.show = function (time, continuation) {
    time = typeof time !== 'undefined' ? time : 0;
    if (!loaded) photo.preload();
    // bring to front so image can be copied
    box.css('z-index', 1);
    box.animate({'opacity': 1}, time, continuation);
  }
  photo.hide = function (time, continuation) {
    time = typeof time !== 'undefined' ? time : 0;
    // send to back
    box.css('z-index', -1);
    box.animate({'opacity': 0}, time, continuation);
  }
  photo.getCaption = function () {
    return caption;
  }
  photo.getURL = function () {
    return url;
  }
  photo.getElement = function () {
    return box;
  }
  photo.getImage = function () {
    return image;
  }
  // return height of enclosing box in pixels
  photo.getHeight = function () {
    return box.height();
  }
  // return width of enclosing box in pixels
  photo.getWidth = function () {
    return box.width();
  }
  
  return photo;
};