const stars = document.querySelectorAll(".star");
const rating = document.getElementById("rating");
//const reviewText = document.getElementById("review");
const submitBtn = document.getElementById("submit");
const reviewsContainer = document.getElementById("reviews");
stars.forEach((star) => {
    star.addEventListener("click", () => {
        const value = parseInt(star.getAttribute("data-value"));
        rating.innerText = value;

        // Remove all existing classes from stars
        stars.forEach((s) => s.classList.remove(
            "one",
            "two",
            "three",
            "four",
            "five",
        ));

        // Add the appropriate class to 
        // each star based on the selected star's value
        stars.forEach((s, index) => {
            if (index < value) {
                s.classList.add(getStarColorClass(value));
            }
        });

        // Remove "selected" class from all stars
        stars.forEach((s) => s.classList.remove("selected"));
        // Add "selected" class to the clicked star
        star.classList.add("selected");
    });
});

submitBtn.addEventListener("click", () => {
    //const review = reviewText.value;
    const userRating = parseInt(rating.innerText);

    //if (!userRating || !review) {
    if (!userRating) {
        alert(
            "Please select a rating and provide a review before submitting."
        );
        return;
    }

    if (userRating > 0) {
        console.log(userRating);
    }
});

function getStarColorClass(value) {
    switch (value) {
        case 1:
            return "one";
        case 2:
            return "two";
        case 3:
            return "three";
        case 4:
            return "four";
        case 5:
            return "five";
        default:
            return "";
    }
}

// Fetch JSON data from the URL and then display the cards
async function getPorts() {
    try {
        var response = await fetch('https://raw.githubusercontent.com/PortsMaster/PortMaster-Info/main/ports.json'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        jsonData = await response.json();
        port = jsonData.ports[portfile];
        document.getElementById("portname").textContent = port["attr"]["title"];
    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}

window.onload = function () {
    getPorts();
};