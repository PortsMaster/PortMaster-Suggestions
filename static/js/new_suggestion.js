$(window).on('load', function() {
    $('#popup').modal('show');
});

document.getElementById('form').onsubmit = function () {
  var engine = checkEngine();
  var title = checkTitle(); 
  var website = checkWebsiteURL(); 
  var image = checkImageURL(); 
  return (engine && title && website && website);
}

function engineChange(){
  var engine = document.getElementById('engine').value;      
  document.getElementById("engine-invalid").style.display = "none";
  if (engine == "Game Maker" || engine == "GameMaker Studio" || engine == "GameMaker Studio 2" ) {
    $('#gmpopup').modal('show');
  }
}

function checkEngine(){
  var engine = document.getElementById('engine').value;
  if (unsupported_engines.includes(engine)) {
    document.getElementById('engine-invalid').textContent = "PortMaster does not support " + engine + " at this time."
    document.getElementById('engine-invalid').style.display = "block";
    return false;
  }
  return true;
}

function checkWebsiteURL(){
  var weburl = document.getElementById('weburl').value;
  if (!weburl.includes("http")) {
    document.getElementById('website-invalid').style.display = "block";
    return false;
  }
  return true;
}

function checkImageURL(){
  var weburl = document.getElementById('imageurl').value;
  if (!weburl.includes("http")) {
    document.getElementById('image-invalid').style.display = "block";
    return false;
  }
  return true;
}

function checkTitle() {
  var title = document.getElementById('title').value;
  for (var key of Object.keys(suggestions)) {
    if (suggestions[key]["title"].trim().toLowerCase() == title.trim().toLowerCase()) {
      document.getElementById('title-invalid').textContent = "This suggestion title already exists."
      document.getElementById('title-invalid').style.display = "block";
      return false;
    }
    if (title.trim() == "") {
      document.getElementById('title-invalid').textContent = "Title is required."
      document.getElementById('title-invalid').style.display = "block";
      return false;
    }
  }
  return true
}