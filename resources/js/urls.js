// URL-related utilities
// for manipulating hashes
// and for handling local vs remote loading

var SP = SP || { };

// patch because not all JS implementations have it yet
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

SP.local = function () {
  return location.protocol == "file:";
  }

// append #s to end of URL
SP.setHash = function (s) {
  window.location.hash = "#" + s;    
  }
  
// return string following hash mark
SP.getHash = function (s) {
  if (window.location.hash)
    return window.location.hash.substring(1);
  else
    return "";
  }
  
// return true if URL ends with a hash
SP.hasHash = function () {
  // avoid implicit falsiness of empty string
  if (window.location.hash)
    return window.location.hash != "";
  else return false;
  }

// remove hash from end of URL
SP.clearHash = function () {
  if (SP.local())
    window.location.hash = "";
  else
    // if running remotely, remove hash mark too
    // security prevents this when running locally
    history.replaceState(null, document.title, new URL("", window.location));
  }

// allow gallery to load locally by appending index.html to directory URLs
SP.enableLocal = function () { 
 if (SP.local()) {
  var links = document.links;
  for(var i = 0; i < links.length; i++) {
    var href = links[i].href;
    if (href.endsWith("/"))
       links[i].href = links[i].href + "index.html"
    }
  }
}
