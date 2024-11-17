window.onload = async function () {
    const ports = await fetchSuggestions();

    function onchange() {
        displayCards(getFilteredData(ports, getFilterState()));
    }
    onchange();

    window.fetchDataAndDisplayCards = onchange;
};

//#region Helper functions
async function fetchJson(url) {
    const portsResponse = await fetch(url);
    if (!portsResponse.ok) {
        throw new Error("Network response was not ok.");
    }
    return portsResponse.json();
}

function createElement(tagName, props, children) {
    const element = document.createElement(tagName);

    if (props) {
        for (const [name, value] of Object.entries(props)) {
            if (name in element) {
                element[name] = value;
            } else {
                element.setAttribute(name, value);
            }
        }
    }

    if (children) {
        if (Array.isArray(children)) {
            element.append(...children.filter(Boolean));
        } else {
            element.append(children);
        }
    }

    return element;
}

function ucFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
//#endregion

//#region Fetch and process data
async function fetchSuggestions() {
    try {
        return await fetchJson('/api/suggestions_new'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}

// Example POST method implementation:
async function upvote(suggestionid, userid) {
    // Default options are marked with *
    const data = {};
    data.userid = userid;
    data.suggestionid = suggestionid;
    const response = await fetch("/vote-suggestion", {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

function getDetailsUrl(port) {
    return '/suggestion-details?id=' + port.id;
}

function getEditUrl(port) {
    if (canEdit) {
        return '/suggestion-moderator?id=' + port.id;
    } else {
        return '/suggestion?id=' + port.id;
    }
}

function getImageUrl(port) {
    if (port.imageurl) {
        return port.imageurl;
    }

    return 'https://raw.githubusercontent.com/PortsMaster/PortMaster-Website/main/no.image.png';
}
//#endregion

//#region Filter cards
function getFilterState() {
    return {
        searchQuery: document.getElementById('search').value.trim(),

        openStatus: document.getElementById('open').checked,
        completedStatus: document.getElementById('completed').checked,
        rejectedStatus: document.getElementById('rejected').checked,

        highFeas: document.getElementById('highfeas').checked,
        medFeas: document.getElementById('medfeas').checked,
        lowFeas: document.getElementById('lowfeas').checked,

        Newest: document.getElementById('sortNewest').checked,
        Voted: document.getElementById('sortVoted').checked,
        AZ: document.getElementById('sortAZ').checked,
    }
}

function getFilteredData(ports, filterState) {
    const filterStatus = {
        Open: filterState.openStatus,
        Complete: filterState.completedStatus,
        Rejected: filterState.rejectedStatus,
    };

    const filterFeasibility = {
        High: filterState.highFeas,
        Medium: filterState.medFeas,
        Low: filterState.lowFeas,
    };

    const isFilterStatus = Object.values(filterStatus).some(Boolean);
    const isFilterFeasibility = Object.values(filterFeasibility).some(Boolean);

    function matchFilter(port) {
        if (port.status === 'Pending') {
            return false;
        }

        if (isFilterStatus && !filterStatus[port.status]) {
            return false;
        }

        if (isFilterFeasibility && !filterFeasibility[port.feasibility]) {
            return false;
        }

        return true;
    }

    function sortPorts(ports) {
        if (filterState.AZ) {
            return [...ports].sort((a, b) => a.title.localeCompare(b.title));
        } else if (filterState.Voted) {
            return [...ports].sort((a, b) => b.voteCount - a.voteCount);
        } else if (filterState.Newest) {
            return [...ports].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
        } else {
            return ports;
        }
    }

    const filteredPorts = ports.filter(matchFilter);

    if (filterState.searchQuery) {
        const fuse = new Fuse(filteredPorts, {
            threshold: 0.2,
            ignoreLocation: true,
            keys: ['title'],
        });
        const results = fuse.search(filterState.searchQuery);
        return results.map(result => result.item);
    } else {
        return sortPorts(filteredPorts);
    }
}
//#endregion

//#region Create and update cards
function createCard(port) {
    const detailsUrl = getDetailsUrl(port);
    const editUrl = getEditUrl(port);
    const imageUrl = getImageUrl(port);

    const statusClass = {
        Open: 'bg-info',
        Complete: 'bg-success',
        Rejected: 'bg-danger',
    };

    const feasibilityClass = {
        Low: 'bg-danger',
        Medium: 'bg-warning',
        High: 'bg-success',
    };

    const votesCount = document.createTextNode(port.voteCount);
    const upvoteIcon = createElement('i', { className: port.voted ? 'bi bi-hand-thumbs-up-fill' : 'bi bi-hand-thumbs-up' });

    function handleUpvote() {
        upvote(port.id, userid).then((data) => {
            votesCount.textContent = data.count;
            upvoteIcon.classList.toggle('bi-hand-thumbs-up');
            upvoteIcon.classList.toggle('bi-hand-thumbs-up-fill');
        });
    }

    return createElement('div', { className: 'col' }, [
        createElement('div', { className: 'card h-100 shadow-sm' }, [
            createElement('div', { className: 'card-body' }, [
                createElement('img', {
                    className: 'bd-placeholder-img card-img-top',
                    loading: 'lazy',
                    src: imageUrl,
                }),
                createElement('h5', {
                    className: 'card-title',
                    style: 'padding-top: 20px',
                }, [
                    createElement('span', { style: 'margin-right: 20px' }, port.title),
                    createElement('span', { className: 'badge bg-secondary' }, port.category),
                    ' ',
                    createElement('span', { className: `badge ${feasibilityClass[port.feasibility] ?? 'bg-secondary'}` }, `${port.feasibility} Feas.`),
                    ' ',
                    createElement('span', { className: `badge ${statusClass[port.status] ?? 'bg-secondary'}` }, port.status),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'Website: '),
                    createElement('a', { href: port.weburl }, 'Link'),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'Programming Language: '),
                    createElement('span', { className: 'badge bg-secondary' }, port.language),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'License: '),
                    createElement('span', { className: 'badge bg-secondary' }, port.license),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'Content: '),
                    createElement('span', { className: 'badge bg-secondary' }, port.content),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'Engine: '),
                    createElement('span', { className: 'badge bg-secondary' }, port.engine),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'Category: '),
                    createElement('span', { className: 'badge bg-secondary' }, port.category),
                ]),
                createElement('h6', { className: 'card-text pt-1' }, [
                    createElement('span', null, 'Dependencies: '),
                    ...port.dependencies.split(',').map(dependency => createElement('span', { className: 'badge bg-secondary me-1' }, dependency)),
                ]),
                createElement('p', { className: 'card-text' }, `Added: ${port.date}`),
                createElement('div', { className: 'd-flex justify-content-between align-items-center' }, [
                    createElement('small', { className: 'text-body-secondary' }, ['Votes: ', votesCount]),
                    createElement('div', { className: 'btn-toolbar' }, [
                        loggedin && createElement('button', {
                            type: 'button',
                            className: 'btn btn-sm btn-outline-primary',
                            onclick: handleUpvote,
                        }, upvoteIcon),
                        createElement('a', { href: detailsUrl }, [
                            createElement('button', {
                                type: 'button',
                                className: 'btn btn-sm btn-outline-primary',
                                style: 'margin-left: 10px',
                            }, 'Details'),
                        ]),
                        (port.userid === userid || canEdit) && createElement('a', { href: editUrl }, [
                            createElement('button', {
                                type: 'button',
                                className: 'btn btn-sm btn-outline-primary',
                                style: 'margin-left: 10px',
                            }, 'Edit'),
                        ]),
                    ]),
                ]),
            ]),
        ]),
    ]);
}

const portCardsMap = new Map();
function getCard(port) {
    if (portCardsMap.has(port.id)) {
        return portCardsMap.get(port.id);
    } else {
        const card = createCard(port);
        portCardsMap.set(port.id, card);
        return card;
    }
}

function displayCards(ports) {
    const cardsContainer = document.getElementById('cards-container');
    cardsContainer.replaceChildren();
    for (const port of ports) {
        const card = getCard(port);
        cardsContainer.appendChild(card);
    }
}
//#endregion
