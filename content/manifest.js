<%
local getFilenames = function()
	local filenames = ""
	for i=1,numImages do
    	local imageProxy = getImage(i)
		local filename = '"'..imageProxy.exportFilename..".jpg"..'"'
		if filenames == "" then filenames = filenames .. filename 
		else filenames = filenames .. "," .. filename end
		end
	return "["..filenames.."]"
	end

local escape = function(s)
  s = string.gsub(s, "\"", "\\\"")
  s = string.gsub(s, "\'", "\\\'")
  return s
  end

local getImageDescriptors = function()
	local infos = ""
	for i=1,numImages do
  	local image = getImage(i)
		local filename = '"'..image.exportFilename..".jpg"..'"'
		local photo_info = "{url: "..filename..", caption: "..'"'.. escape(image.metadata.photoCaption) ..'"}'
		local thumb_info = "{url: "..filename..", caption: "..'"'.. image.metadata.thumbCaption ..'"}'
    local info = "{photo: " .. photo_info .. ", thumb: " .. thumb_info .."}"
		if infos == "" then infos = info
		else infos = infos .. "," .. info
		  end
	  end
	return "["..infos.."]"
	end

local append = function(m, e)
  if m == "" then return e else return m..", "..e end
  end

local getEnabledModes = function ()
  local modes = "";
  if model.nonCSS.enabledPhotoMode then modes = append (modes, "SP.mode.PHOTO") end;
  if model.nonCSS.enabledSlideshowMode then modes = append (modes, "SP.mode.SLIDESHOW") end;
  if model.nonCSS.enabledGridMode then modes = append (modes, "SP.mode.GRID") end;
  if model.nonCSS.enabledTextMode then modes = append (modes, "SP.mode.TEXT") end;
  return "["..modes.."]";
  end
  
local escape_text_block = function (text)
  return escape(string.gsub(text, "\n", "<p>"))
  end
%>

SP.preferences = SP.defaultPreferences;

/* note that strings but NOT booleans are quoted */
/* must remove newlines since they mess up the JavaScript; should really do for all fields, but only likely to happen for textual description */
SP.preferences.text = "<%=escape_text_block(model.nonCSS.text) %>";
SP.preferences.logoLink = "$model.metadata.homePage.value";
SP.preferences.logoShrink = $model.nonCSS.logoShrink;
SP.preferences.skipFade = $model.nonCSS.skipFade;
SP.preferences.showMenu = $model.nonCSS.showMenu;
SP.preferences.contactLink = "$model.metadata.contactInfo.link";
SP.preferences.imagePath = "<%= model.nonCSS.imageBase .. '/' .. model.photoSizes.large.directory .. '/' %>";
SP.preferences.thumbPath = "<%= model.nonCSS.imageBase .. '/' .. model.photoSizes.thumb.directory .. '/' %>";
SP.preferences.fadeinTime = $model.nonCSS.timings.fadeIn;
SP.preferences.fadeoutTime = $model.nonCSS.timings.fadeOut;
SP.preferences.transitionTime = $model.nonCSS.timings.transition;
SP.preferences.initialMode = $model.nonCSS.initialMode;
SP.preferences.enabledModes = SP.modeSet (<%= getEnabledModes() %>);
SP.preferences.gridRows = $model.nonCSS.numRows;
SP.preferences.gridColumns = $model.nonCSS.numCols;
SP.preferences.title = "$model.metadata.siteTitle.value";
SP.images = <%= getImageDescriptors() %>;
