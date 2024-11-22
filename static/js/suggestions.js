window.addEventListener('DOMContentLoaded', async function() {
    const appElement = document.getElementById('app');
    appElement.replaceChildren(createContainerLoading());

    const ports = await fetchPorts();
    const suggestions = await fetchSuggestions();
    const values = getSuggestionValues(suggestions);

    const { containerElement, updateContainer, filterControls } = createContainer({ values, onchange });
    const filterState = JSON.parse(sessionStorage.getItem('filterState'));
    setFilterState(filterControls, filterState);
    updateResult(filterState);
    appElement.replaceChildren(containerElement);

    const getCard = memoize(createCard, port => port.id);

    function updateResult(filterState) {
        updateContainer({
            ports: createPorts(getFilteredPorts(ports, filterState), filterState.search),
            cards: getFilteredSuggestions(suggestions, filterState).map(getCard),
        });
    }

    function onchange() {
        const filterState = getFilterState(filterControls);
        sessionStorage.setItem('filterState', JSON.stringify(filterState));
        updateResult(filterState);
    }
});

//#region Helper functions
async function fetchJson(url) {
    const portsResponse = await fetch(url);
    if (!portsResponse.ok) {
        throw new Error("Network response was not ok.");
    }
    return portsResponse.json();
}

function createFragment(children) {
    const fragment = document.createDocumentFragment();

    if (children) {
        if (Array.isArray(children)) {
            fragment.append(...children.filter(Boolean));
        } else {
            fragment.append(children);
        }
    }

    return fragment;
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
        if (i !== 0 && i % batchSize === 0) {
            await new Promise(resolve => setTimeout(resolve));
        }
        container.appendChild(child);
    }
}

function memoize(func, resolver) {
    function memoized(...args) {
        const key = resolver ? resolver.apply(this, args) : args[0];

        if (memoized.cache.has(key)) {
            return memoized.cache.get(key);
        }
        
        const result = func.apply(this, args);
        memoized.cache.set(key, result);
        return result;
    };

    memoized.cache = new Map();

    return memoized;
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

function truncate(str = '', len = 20, clamp = '...') {
    if (str.length > len + clamp.length) {
        const sliced = str.slice(0, len);
        const index = sliced.lastIndexOf(' ');
        return (index !== -1 ? sliced.slice(0, index) : sliced) + clamp;
    }

    return str;
}

function truncateCenter(str = '', len = 20, clamp = '...') {
    if (str.length > len + clamp.length)
        return str.slice(0, Math.ceil(len / 2)) + clamp + str.slice(-Math.floor(len / 2));

    return str;
}

function truncateUrl(str = '', len = 20, clamp = '...') {
    try {
        const url = new URL(str);

        url.host = truncateCenter(url.pathname, len, clamp);
        url.pathname = truncateCenter(url.pathname.replace(/(\/index)?\.(htm|html|php)$/, ''), len, clamp);
        url.search = '';
        url.hash = '';

        return url.toString().replace(/^\w+:\/\/(www\.)?/, '').replace(/[/?#]$/, '');
    } catch (e) {
        return str;
    }
}
//#endregion

//#region Fetch and process data
async function fetchPorts() {
    try {
        const portsData = await fetchJson('https://raw.githubusercontent.com/PortsMaster/PortMaster-Info/main/ports.json'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
        return Object.values(portsData.ports);
    } catch (error) {
        console.error('Error fetching JSON data:', error);
        return [];
    }
}

function getPortSearchUrl(search) {
    return `https://portmaster.games/games.html?search=${encodeURIComponent(search)}`;
}

function getPortUrl(port) {
    return `https://portmaster.games/detail.html?name=${encodeURIComponent(port.name.replace('.zip', ''))}`;
}

async function fetchSuggestions() {
    try {
        const suggestions = await fetchJson('/api/suggestions_new'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
        return suggestions.filter(suggestion => suggestion.status !== 'Pending');
    } catch (error) {
        console.error('Error fetching JSON data:', error);
        return [];
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

function getDependencyValuesCount(ports) {
    const values = {};

    for (const port of ports) {
        if (port.dependencies) {
            for (const value of port.dependencies.split(',')) {
                values[value] = values[value] ? values[value] + 1 : 1;
            }
        }
    }

    return Object.entries(values).map(([value, count]) => ({
        value,
        count,
    })).sort((a, b) => a.value.localeCompare(b.value));
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
        dependency: getDependencyValuesCount(ports),
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

    return { sortElement, sortRadio };
}

function createPorts(ports, search) {
    if (ports.length === 0) return null;

    const items = ports.slice(0, 3).map(port => {
        return createElement('li', null, createElement('a', { href: getPortUrl(port) }, port.attr.title));
    });

    if (ports.length > 3) {
        items.push(createElement('li', null, createElement('a', { href: getPortSearchUrl(search) }, `And ${ports.length - 3} more`)));
    }

    return createFragment([
        createElement('h6', null, `Already ported ${ports.length}`),
        createElement('ul', null, items),
    ]);
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
        createElement('div', { ref: el => containerRefs.ports = el, hidden: true }),
        createElement('h2', { ref: el => containerRefs.title = el, className: 'my-4 text-center' }),
        createElement('div', { ref: el => containerRefs.list = el, className: 'row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3' }),
    ]);

    function updateContainer({ ports, cards }) {
        updateDropdowns();

        containerRefs.ports.replaceChildren(ports);
        containerRefs.ports.hidden = !ports;

        containerRefs.title.textContent = `${cards.length} Suggestions`;
        batchReplaceChildren(200, containerRefs.list, cards);
    }

    return {
        containerElement,
        updateContainer,
        filterControls,
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
        dependency: {},
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

    const dependencyItems = values.dependency.map(({ value, count }) => {
        return createDropdownItem(checkboxes.dependency[value] = createDropdownCheckbox(value, onchange), value, count);
    });

    const dropdownGroups = [
        createDropdownGroup('Filters', [
            createDropdownHeader('Status'),
            ...statusItems,
            createDropdownHeader('Feasibility'),
            ...feasibilityItems,
            createDropdownHeader('Category'),
            ...categoryItems,
            createDropdownHeader('Content'),
            ...contentItems,
            createDropdownHeader('License'),
            ...licenseItems,
        ]),
        createDropdownGroup('Engine', engineItems),
        createDropdownGroup('Lang', languageItems),
        createDropdownGroup('Dependency', dependencyItems),
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
            dependency: getCheckedValues(checkboxes.dependency),
        },
    };
}

function setFilterState({ searchInput, sortRadio, checkboxes }, filterState) {
    if (!filterState) return;

    searchInput.value = filterState.search;

    for (const [value, element] of Object.entries(sortRadio)) {
        element.checked = filterState.sort[value] ?? false;
    }

    for (const [name, items] of Object.entries(checkboxes)) {
        for (const [value, element] of Object.entries(items)) {
            element.checked = filterState.values[name]?.[value] ?? false;
        }
    }
}

function getFilterValues(filterState) {
    return Object.entries(filterState.values).filter(([_, items]) => Object.values(items).some(Boolean)).map(([name]) => name);
}

function getFilteredPorts(ports, filterState) {
    if (filterState.search) {
        const fuse = new Fuse(ports, {
            threshold: 0.2,
            ignoreLocation: true,
            keys: ['attr.title'],
        });
        const results = fuse.search(filterState.search);
        return results.map(result => result.item);
    } else {
        return [];
    }
}

function getFilteredSuggestions(ports, filterState) {
    const filterValues = getFilterValues(filterState);

    function matchFilter(port) {
        for (const name of filterValues) {
            if (name === 'dependency') {
                if (!port.dependencies.split(',').some(dependency => filterState.values.dependency[dependency])) {
                    return false;
                }
            } else {
                if (!filterState.values[name][port[name]]) {
                    return false;
                }
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
    const UNKNOWN = 'Other/Unknown';

    const canUpvotePort = loggedin;
    const canEditPort = port.userid === userid || canEdit;
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

    const badges = [
        createElement('span', { className: `badge ${statusClass[port.status] ?? 'bg-secondary'}`, title: 'Status' }, port.status),
        createElement('span', { className: `badge ${feasibilityClass[port.feasibility] ?? 'bg-secondary'}`, title: 'Feasibility' }, port.feasibility),
        createElement('span', { className: 'badge bg-secondary', title: 'Category' }, port.category),
        port.license !== UNKNOWN && createElement('span', { className: 'badge bg-secondary', title: 'License' }, port.license),
        port.content !== UNKNOWN && createElement('span', { className: 'badge bg-secondary', title: 'Content' }, port.content),
        port.engine !== UNKNOWN && createElement('span', { className: 'badge bg-secondary', title: 'Engine' }, port.engine),
        port.language !== UNKNOWN && createElement('span', { className: 'badge bg-secondary', title: 'Language' }, port.language),
        ...port.dependencies.split(',').map(dependency => dependency !== UNKNOWN && createElement('span', { className: 'badge bg-secondary', title: 'Dependency' }, dependency)),
    ];

    const votesCount = createElement('span', { className: 'me-2' }, `${port.voteCount}`);
    const upvoteIcon = createElement('i', { className: port.voted ? 'bi bi-hand-thumbs-up-fill' : 'bi bi-hand-thumbs-up' });

    const upvoteButton = createElement('button', {
        type: 'button',
        className: 'btn btn-sm btn-outline-primary text-nowrap',
        onclick: handleUpvote,
    }, [votesCount, upvoteIcon]);

    const editButton = createElement('a', { href: editUrl }, [
        createElement('button', {
            type: 'button',
            className: 'btn btn-sm btn-outline-primary',
        }, 'Edit'),
    ]);

    function handleUpvote() {
        upvote(port.id, userid).then((data) => {
            votesCount.textContent = data.count;
            upvoteIcon.classList.toggle('bi-hand-thumbs-up');
            upvoteIcon.classList.toggle('bi-hand-thumbs-up-fill');
        });
    }

    return createElement('div', { className: 'col' }, [
        createElement('div', { className: 'card h-100 shadow-sm' }, [
            createElement('a', { href: detailsUrl, className: 'ratio ratio-4x3 update-anchor' }, [
                createElement('img', {
                    src: imageUrl,
                    className: 'bd-black card-img-top object-fit-contain',
                    loading: 'lazy',
                }),
            ]),
            createElement('div', { className: 'card-body d-flex flex-column' }, [
                createElement('div', { className: 'd-flex align-items-start gap-2' }, [
                    createElement('h5', { className: 'card-title me-auto' }, [
                        createElement('a', {
                            href: detailsUrl,
                            className: 'text-decoration-none link-body-emphasis'
                        }, port.title),
                    ]),
                    canEditPort && editButton,
                    canUpvotePort && upvoteButton,
                ]),
                createElement('p', null, [
                    createElement('a', { href: port.weburl }, truncateUrl(port.weburl)),
                ]),
                createElement('div', {
                    className: 'card-text mb-auto',
                }, truncate(port.comment, 220)),
                createElement('div', { className: 'mt-3 d-flex gap-2 justify-content-between align-items-start' }, [
                    createElement('div', { className: 'd-flex flex-wrap gap-2' }, badges),
                    createElement('a', { href: detailsUrl, className: 'update-anchor' }, 'Details'),
                ]),
            ]),
            createElement('div', { className: 'card-footer d-flex flex-wrap gap-2' }, [
                createElement('div', { className: 'flex-fill w-50' }, []),
                createElement('div', { className: 'text-end' }, [
                    createElement('div', null, [
                        createElement('span', { className: 'text-muted' }, 'Added: '),
                        `${port.date}`,
                    ]),
                ]),
            ]),
        ]),
    ]);
}
//#endregion
