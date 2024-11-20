
var jsonData = null;

// Function to create a card element for each JSON object
function createCard(data) {
    const div1 = document.createElement('div');
    div1.setAttribute("class", "col");

    const div2 = document.createElement('div');
    div2.setAttribute("class", "card h-100 shadow-sm");

    const image = document.createElement("img");

    var source = "https://raw.githubusercontent.com/PortsMaster/PortMaster-Website/main/no.image.png";
    if (data.imageurl) {
        source = data.imageurl;
    }

    image.src = source;
    image.setAttribute("class", "bd-placeholder-img card-img-top");
    image.setAttribute("loading", "lazy");

    //image.addEventListener('click', () => {
    //    handleCardClick(data.id);
    //});

    const div3 = document.createElement('div');
    div3.setAttribute("class", "card-body");

    const title = document.createElement('h5');
    title.setAttribute("class", "card-title");
    title.setAttribute("style", "padding-top: 20px")

    feasibilityTag = '<span class="badge bg-secondary">' + data.feasibility + ' Feas.</span>';

    if (data.feasibility == "Low") {
        feasibilityTag = '<span class="badge bg-danger">' + data.feasibility + ' Feas.</span>';
    }

    if (data.feasibility == "Medium") {
        feasibilityTag = '<span class="badge bg-warning">' + data.feasibility + ' Feas.</span>';
    }

    if (data.feasibility == "High") {
        feasibilityTag = '<span class="badge bg-success">' + data.feasibility + ' Feas.</span>';
    }

    statusTag = ' <span class="badge bg-info">' + data.status + '</span>';

    if (data.status == "Complete") {
        statusTag = ' <span class="badge bg-success">' + data.status + '</span>';
    }

    if (data.status == "Rejected") {
        statusTag = ' <span class="badge bg-danger">' + data.status + '</span>';
    }

    var titleHTML = '<span style="margin-right: 20px;">' + data.title + '</span>' + '<span class="badge bg-secondary">' + data.category + '</span> ' + feasibilityTag + statusTag;

    title.innerHTML = titleHTML;

    //title.addEventListener('click', () => {
    //    handleCardClick(data.id);
    //});

    //const paragraph = document.createElement('p');
    //paragraph.setAttribute("class","card-text");
    //paragraph.setAttribute("style","padding-top: 10px")
    //paragraph.innerHTML = ""

    const weburl = document.createElement('h6');
    weburl.setAttribute("class", "card-text");
    weburl.setAttribute("style", "padding-top: 5px")

    weburlHTML = '<span">Website: </span>' + '<span><a href="' + data.weburl + '">Link</a></span> ';
    weburl.innerHTML = weburlHTML;

    const language = document.createElement('h6');
    language.setAttribute("class", "card-text");
    language.setAttribute("style", "padding-top: 5px")

    languageHTML = '<span">Programming Language: </span>' + '<span class="badge bg-secondary">' + data.language + '</span> ';
    language.innerHTML = languageHTML;

    const license = document.createElement('h6');
    license.setAttribute("class", "card-text");
    license.setAttribute("style", "padding-top: 5px")

    licenseHTML = '<span">License: </span>' + '<span class="badge bg-secondary">' + data.license + '</span> ';
    license.innerHTML = licenseHTML;

    const content = document.createElement('h6');
    content.setAttribute("class", "card-text");
    content.setAttribute("style", "padding-top: 5px")

    contentHTML = '<span">Content: </span>' + '<span class="badge bg-secondary">' + data.content + '</span> ';
    content.innerHTML = contentHTML;

    const engine = document.createElement('h6');
    engine.setAttribute("class", "card-text");
    engine.setAttribute("style", "padding-top: 5px")

    engineHTML = '<span">Engine: </span>' + '<span class="badge bg-secondary">' + data.engine + '</span> ';
    engine.innerHTML = engineHTML;

    const category = document.createElement('h6');
    category.setAttribute("class", "card-text");
    category.setAttribute("style", "padding-top: 5px")

    categoryHTML = '<span">Category: </span>' + '<span class="badge bg-secondary">' + data.category + '</span> ';
    category.innerHTML = categoryHTML;

    const dependencies = document.createElement('h6');
    dependencies.setAttribute("class", "card-text");
    dependencies.setAttribute("style", "padding-top: 5px")

    var dependenciesList = data.dependencies.split(",");
    var dependenciesHtml = '<span">Dependencies: </span>';
    dependenciesList.forEach((dependency) => {
        dependenciesHtml += '<span style="margin-right: 5px;" class="badge bg-secondary">' + dependency + '</span>';
        // if (dependenciesList.length > 1) {
        //   dependenciesHtml += "<br>";
        //}
    });
    dependencies.innerHTML = dependenciesHtml;

    const author = document.createElement('p');
    author.setAttribute("class", "card-text");
    author.textContent = "Author: " + data.author;

    const added = document.createElement('p');
    added.setAttribute("class", "card-text");
    added.textContent = "Added: " + data.date;

    var taggedMisc = "";

    //if (data.source.repo == "multiverse"){
    //    taggedMisc += '<span class="misc-item badge bg-secondary">Multiverse</span> ';
    //}

    const miscValues = document.createElement('p');
    miscValues.innerHTML = taggedMisc;

    const div4 = document.createElement('div');
    div4.setAttribute("class", "d-flex justify-content-between align-items-center");

    const div5 = document.createElement('div');
    div5.setAttribute("class", "btn-toolbar");

    const upvote = document.createElement('button');
    upvote.setAttribute("type", "button");
    upvote.setAttribute("class", "btn btn-sm btn-outline-primary");
    upvote.setAttribute("onclick", 'upvote("' + data.id + '","' + userid + '").then((data) => { updateCount(this,data);});');

    upvoteIcon = document.createElement('i');
    if (data.voted) {
        upvoteIcon.setAttribute("class", "bi bi-hand-thumbs-up-fill");
    }
    else {
        upvoteIcon.setAttribute("class", "bi bi-hand-thumbs-up");
    }

    upvote.appendChild(upvoteIcon);

    const detailsButton = document.createElement('button');
    detailsButton.setAttribute("type", "button");
    detailsButton.textContent = "Details"
    detailsButton.setAttribute("class", "btn btn-sm btn-outline-primary");
    detailsButton.setAttribute("style", "margin-left: 10px");
    detailsButton.setAttribute("onclick", "window.location.href='/suggestion-details?id=" + data.id + "';");

    const button = document.createElement('button');
    button.setAttribute("type", "button");
    button.textContent = "Edit"
    button.setAttribute("class", "btn btn-sm btn-outline-primary");
    button.setAttribute("style", "margin-left: 10px");

    if (loggedin) {
        div5.appendChild(upvote);
    }

    div5.appendChild(detailsButton);

    if (canEdit) {
        button.setAttribute("onclick", "window.location.href='/suggestion-moderator?id=" + data.id + "';");
    }
    else {
        button.setAttribute("onclick", "window.location.href='/suggestion?id=" + data.id + "';");
    }

    if (data.userid == userid || canEdit) {
        div5.appendChild(button);
    }

    const small = document.createElement('small');
    small.setAttribute("class", "text-body-secondary");
    small.textContent = "Votes: " + data.voteCount;

    div4.appendChild(small);
    div4.appendChild(div5);

    div3.appendChild(image);
    div3.appendChild(title);
    div3.appendChild(weburl);
    div3.appendChild(language);
    div3.appendChild(license);
    div3.appendChild(content);
    div3.appendChild(engine);
    div3.appendChild(category);
    div3.appendChild(dependencies);
    div3.appendChild(miscValues);
    div3.appendChild(added);
    div3.appendChild(div4);

    div2.appendChild(div3)
    div1.appendChild(div2)

    return div1;
}

// Function to iterate over the JSON data and display cards
function displayCards(data) {
    const cardsContainer = document.getElementById('cards-container');
    cardsContainer.innerHTML = ''; // Clear previous cards
    for (var key of Object.keys(data)) {
        const card = createCard(data[key]);
        cardsContainer.appendChild(card);
    };
}

// Function to filter the cards based on the search query
function filterCards() {
    var filteredData = []
    for (var key of Object.keys(jsonData)) {
        if (jsonData[key].userid == userid)
            filteredData.push(jsonData[key]);
    };

    displayCards(filteredData);
}

// Function to handle the card title click and redirect to the detail page
function handleCardClick(name) {
    window.location.href = `detail.html?name=${encodeURIComponent(name)}`;
}

// Fetch JSON data from the URL and then display the cards
async function fetchDataAndDisplayCards() {
    try {
        var response = await fetch('/api/suggestions'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        jsonData = await response.json();
        //jsonData = {{suggestions|tojson}};
    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }

    filterCards();
}

// Call the initial fetchDataAndDisplayCards function when the page is loaded
window.onload = function () {
    fetchDataAndDisplayCards();
    // document.getElementById('search-bar').addEventListener('input', filterCards);
};

// Example POST method implementation:
async function upvote(suggestionid, userid) {
    // Default options are marked with *
    data = {};
    data["userid"] = userid;
    data["suggestionid"] = suggestionid;
    const response = await fetch('/vote-suggestion', {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
};

function updateCount(button, data) {
    var icon = button.childNodes[0];

    if (icon.getAttribute("class") == "bi bi-hand-thumbs-up-fill") {
        icon.setAttribute("class", "bi bi-hand-thumbs-up");
    }
    else {
        icon.setAttribute("class", "bi bi-hand-thumbs-up-fill");
    }
    button.parentNode.parentNode.childNodes[0].textContent = "Votes: " + data.count;
}

// Call the initial fetchDataAndDisplayCards function when the page is loaded
window.onload = function () {
    fetchDataAndDisplayCards();
    // document.getElementById('search-bar').addEventListener('input', filterCards);
};