window.addEventListener('DOMContentLoaded', async function() {
    const appElement = document.getElementById('app');
    appElement.replaceChildren(createContainerLoading());

    const ports = await fetchSuggestions();
    const values = getSuggestionValues(ports);

    const { containerElement, filterControls, updateDropdowns, updateCards } = createContainer({ values, onchange });
    appElement.replaceChildren(containerElement);

    function onchange() {
        const filterState = getFilterState(filterControls);
        updateDropdowns();
        updateCards(getFilteredData(ports, filterState).map(getCard));
    }
    onchange();
});

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
            if (name === 'ref') {
                value(element);
                continue;
            }

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

async function batchReplaceChildren(batchSize, container, children) {
    container.replaceChildren();
    for (const [i, child] of children.entries()) {
        if ((i + 1) % batchSize === 0) {
            await new Promise(resolve => setTimeout(resolve));
        }
        container.appendChild(child);
    }
}

function getCheckedValues(elements) {
    return Object.fromEntries(Object.entries(elements).map(([name, element]) => [name, element.checked]));
}

function devided(divider, array) {
    return array.reduce((acc, cur) => acc ? [...acc, divider, cur] : [cur], null);
}

function ucFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function uniqValues(key, array) {
    const valueSet = new Set(array.map(item => item[key]));
    return [...valueSet].sort();
}

function uniqValuesCount(key, array) {
    const items = {};

    for (const item of array) {
        const value = item[key];
        items[value] = items[value] ? items[value] + 1 : 1;
    }

    return Object.entries(items).map(([value, count]) => ({
        value,
        count,
    })).sort((a, b) => a.value.localeCompare(b.value));
}
//#endregion

//#region Fetch and process data
async function fetchSuggestions() {
    try {
        const suggestions = await fetchJson('/api/suggestions_new'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
        return suggestions.filter(suggestion => suggestion.status !== 'Pending');
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

function getSuggestionValues(ports) {
    return {
        status: uniqValuesCount('status', ports),
        feasibility: uniqValuesCount('feasibility', ports),
        category: uniqValuesCount('category', ports),
        content: uniqValuesCount('content', ports),
        engine: uniqValuesCount('engine', ports),
        language: uniqValuesCount('language', ports),
        license: uniqValuesCount('license', ports),
    };
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

//#region Create container
function createSearchInput({ oninput }) {
    return createElement('input', {
        type: 'search',
        id: 'search',
        className: 'form-control w-25 flex-grow-1',
        placeholder: 'Search',
        oninput,
    });
}

function createSort({ onchange }) {
    const sortRadio = {};

    const sortElement = createElement('div', {
        className: 'btn-group',
    }, [
        createElement('input', { ref: el => sortRadio.title = el, id: 'sortAZ', className: 'btn-check', type: 'radio', name: 'sortRadio', autocomplete: 'off', checked: true, onchange }),
        createElement('label', { htmlFor: 'sortAZ', className: 'btn btn-outline-primary' }, 'A - Z'),
        createElement('input', { ref: el => sortRadio.voteCount = el, id: 'sortVoted', className: 'btn-check', type: 'radio', name: 'sortRadio', autocomplete: 'off', checked: false, onchange }),
        createElement('label', { htmlFor: 'sortVoted', className: 'btn btn-outline-primary' }, 'Most Voted'),
        createElement('input', { ref: el => sortRadio.date = el, id: 'sortNewest', className: 'btn-check', type: 'radio', name: 'sortRadio', autocomplete: 'off', checked: false, onchange }),
        createElement('label', { htmlFor: 'sortNewest', className: 'btn btn-outline-primary' }, 'Most Recent'),
    ]);

    return { sortElement, sortRadio }
}

function createContainerLoading() {
    return createElement('div', { className: 'container' }, [
        createElement('h2', { className: 'my-2 text-center text-muted' }, [
            createElement('div', { className: 'me-3 spinner-border' }),
            'Loading...',
        ]),
    ]);
}

function createContainer({ values, onchange }) {
    const { dropdownButtons, checkboxes, updateDropdowns } = createDropdowns({ values, onchange });
    const searchInput = createSearchInput({ oninput: onchange });
    const { sortElement, sortRadio } = createSort({ onchange });

    const filterControls = { checkboxes, searchInput, sortRadio };

    const containerRefs = {};
    const containerElement = createElement('div', { className: 'container' }, [
        createElement('div', { className: 'my-2 gap-2 d-flex flex-wrap justify-content-center' }, [dropdownButtons, searchInput, sortElement]),
        createElement('h2', { ref: el => containerRefs.title = el, className: 'my-4 text-center' }),
        createElement('div', { ref: el => containerRefs.list = el, className: 'row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3' }),
    ]);

    function updateCards(cards) {
        containerRefs.title.textContent = `${cards.length} Suggestions`;
        batchReplaceChildren(200, containerRefs.list, cards);
    }

    return {
        containerElement,
        filterControls,
        updateDropdowns,
        updateCards,
    };
}
//#endregion

//#region Create filter dropdowns
function createDropdownGroup(title, items) {
    return createElement('div', {
        className: 'btn-group flex-wrap',
        role: 'group',
    }, [
        createElement('button', {
            className: 'btn btn-outline-primary dropdown-toggle',
            ariaExpanded: 'false',
            'data-bs-toggle': 'dropdown',
        }, title),
        createElement('div', {
            className: 'dropdown-menu overflow-x-hidden overflow-y-auto',
            style: 'max-height: calc(100vh - 140px)'
        }, items),
    ]);
}

function createDropdownHeader(title) {
    return createElement('h6', { className: 'dropdown-header' }, title);
}

function createDropdownItem(checkbox, label, count) {
    return createElement('label', { className: 'dropdown-item d-flex gap-2' }, [
        checkbox,
        label,
        count && createElement('span', { className: 'ms-auto text-muted' }, count),
    ]);
}

function createDropdownCheckbox(name, onchange) {
    return createElement('input', {
        name,
        className: 'form-check-input',
        type: 'checkbox',
        onchange,
    });
}

function createDropdowns({ values, onchange }) {
    const checkboxes = {
        status: {},
        feasibility: {},
        engine: {},
        category: {},
        content: {},
        license: {},
        language: {},
    };

    const statusCounts = Object.fromEntries(values.status.map(({ value, count }) => [value, count]));
    const statusItems = [
        createDropdownItem(checkboxes.status['Open'] = createDropdownCheckbox('Open', onchange), 'Open', statusCounts['Open']),
        createDropdownItem(checkboxes.status['Complete'] = createDropdownCheckbox('Complete', onchange), 'Completed', statusCounts['Complete']),
        createDropdownItem(checkboxes.status['Rejected'] = createDropdownCheckbox('Rejected', onchange), 'Rejected', statusCounts['Rejected']),
    ];

    const feasibilityCounts = Object.fromEntries(values.feasibility.map(({ value, count }) => [value, count]));
    const feasibilityItems = [
        createDropdownItem(checkboxes.feasibility['High'] = createDropdownCheckbox('High', onchange), 'High Feasibility', feasibilityCounts['High']),
        createDropdownItem(checkboxes.feasibility['Medium'] = createDropdownCheckbox('Medium', onchange), 'Medium Feasibility', feasibilityCounts['Medium']),
        createDropdownItem(checkboxes.feasibility['Low'] = createDropdownCheckbox('Low', onchange), 'Low Feasibility', feasibilityCounts['Low']),
    ];

    const engineItems = values.engine.map(({ value, count }) => {
       return createDropdownItem(checkboxes.engine[value] = createDropdownCheckbox(value, onchange), value, count);
    });

    const categoryItems = values.category.map(({ value, count }) => {
        return createDropdownItem(checkboxes.category[value] = createDropdownCheckbox(value, onchange), value, count);
    });

    const contentItems = values.content.map(({ value, count }) => {
        return createDropdownItem(checkboxes.content[value] = createDropdownCheckbox(value, onchange), value, count);
    });

    const licenseItems = values.license.map(({ value, count }) => {
        return createDropdownItem(checkboxes.license[value] = createDropdownCheckbox(value, onchange), value, count);
    });

    const languageItems = values.language.map(({ value, count }) => {
        return createDropdownItem(checkboxes.language[value] = createDropdownCheckbox(value, onchange), value, count);
    });

    const dropdownGroups = [
        createDropdownGroup('Status', statusItems),
        createDropdownGroup('Feasibility', feasibilityItems),
        createDropdownGroup('Engine', engineItems),
        createDropdownGroup('Filters', [
            createDropdownHeader('Category'),
            ...categoryItems,
            createDropdownHeader('Content'),
            ...contentItems,
            createDropdownHeader('License'),
            ...licenseItems,
            createDropdownHeader('Language'),
            ...languageItems,
        ]),
    ];

    const dropdownButtons = createElement('div', { className: 'btn-group flex-wrap' }, dropdownGroups);

    function updateDropdowns() {
        for (const group of dropdownGroups) {
            const button = group.querySelector('.btn.dropdown-toggle');
            const hasChecked = Boolean(group.querySelector(':checked'));
            button.classList.toggle('btn-outline-primary', !hasChecked);
            button.classList.toggle('btn-primary', hasChecked);
        }
    }

    return { dropdownButtons, checkboxes, updateDropdowns };
}
//#endregion

//#region Filter cards
function getFilterState({ searchInput, sortRadio, checkboxes }) {
    return {
        search: searchInput.value.trim(),
        sort: getCheckedValues(sortRadio),
        values: {
            status: getCheckedValues(checkboxes.status),
            feasibility: getCheckedValues(checkboxes.feasibility),
            engine: getCheckedValues(checkboxes.engine),
            category: getCheckedValues(checkboxes.category),
            content: getCheckedValues(checkboxes.content),
            license: getCheckedValues(checkboxes.license),
            language: getCheckedValues(checkboxes.language),
        },
    }
}

function getFilterValues(filterState) {
    return Object.entries(filterState.values).filter(([_, items]) => Object.values(items).some(Boolean)).map(([name]) => name);
}

function getFilteredData(ports, filterState) {
    const filterValues = getFilterValues(filterState);

    function matchFilter(port) {
        for (const name of filterValues) {
            if (!filterState.values[name][port[name]]) {
                return false;
            }
        }

        return true;
    }

    function sortPorts(ports) {
        if (filterState.sort.title) {
            return [...ports].sort((a, b) => a.title.trim().localeCompare(b.title.trim()));
        } else if (filterState.sort.voteCount) {
            return [...ports].sort((a, b) => b.voteCount - a.voteCount);
        } else if (filterState.sort.date) {
            return [...ports].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
        } else {
            return ports;
        }
    }

    const filteredPorts = ports.filter(matchFilter);

    if (filterState.search) {
        const fuse = new Fuse(filteredPorts, {
            threshold: 0.2,
            ignoreLocation: true,
            keys: ['title'],
        });
        const results = fuse.search(filterState.search);
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
//#endregion
