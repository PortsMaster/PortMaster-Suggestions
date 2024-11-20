document.getElementById('form').onsubmit = function () {
    var engine = checkEngine();
    var website = checkWebsiteURL();
    var image = checkImageURL();
    var title = checkTitle();
    return (engine && website && website && title);
}

function checkEngine() {
    var engine = document.getElementById('engine').value;
    if (unsupported_engines.includes(engine)) {
        document.getElementById('engine-invalid').textContent = "PortMaster does not support " + engine + " at this time."
        document.getElementById('engine-invalid').style.display = "block";
        return false;
    }
    return true;
}

function checkWebsiteURL() {
    var weburl = document.getElementById('weburl').value;
    if (!weburl.includes("http")) {
        document.getElementById('website-invalid').style.display = "block";
        return false;
    }
    return true;
}

function checkImageURL() {
    var weburl = document.getElementById('imageurl').value;
    if (!weburl.includes("http")) {
        document.getElementById('image-invalid').style.display = "block";
        return false;
    }
    return true;
}

function checkTitle() {
    var title = document.getElementById('title').value;
    console.log(title);
    if (title == "") {
        document.getElementById('title-invalid').textContent = "Title is required."
        document.getElementById('title-invalid').style.display = "block";
        return false;
    }
    return true
}