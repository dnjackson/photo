// from http://msdn.microsoft.com/en-us/library/ms537509(v=vs.85).aspx
function getInternetExplorerVersion() {
// Returns the version of Internet Explorer or a -1
// (indicating the use of another browser).
  var rv = -1; // Return value assumes failure.
  if (navigator.appName == 'Microsoft Internet Explorer') {
    var ua = navigator.userAgent;
    var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
    if (re.exec(ua) != null)
      rv = parseFloat( RegExp.$1 );
  		}
  return rv;
  }
function checkVersion() {
  var ver = getInternetExplorerVersion();
  if (ver == -1 ) return; // not using IE
  if (ver < 9.0 ) 
      alert ("You are using an old version of Internet Explorer, which does not fully support JavaScript. Please upgrade to a more recent version of Internet Explorer, or use a different browser (such as Chrome, Firefox, or Safari).");
  }

checkVersion();
