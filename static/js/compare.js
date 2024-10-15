/*
    Compare lists and highlight differences

    The structure of the items is:
        1. A parent containter, with a list of divs (divs are dynamically created in object.js and policies.js)
        2. Each div contains a button and a list div
        3. The button is the name of an object, and expands the list div when clicked
        4. The list div contains a list (ul) of properties for the object

    Compares the lists (arrays) and adding missing entries
        The arrays are global variables created in object.js
        Missing entries are added to the respective list and div, then highlighted in red
        The lists and parent divs are sorted alphabetically based on the name of the object
    
    Now the lists will align, so they are compared for differences
        The lists are compared for differences, and the buttons are highlighted in yellow
        The properties of the objects are compared, not just the name
        Arrows are drawn between buttons that are in different positions, but are the same object
*/


// Update SVG dimensions on window resize
window.addEventListener('resize', function () {
    setSvgDimensions();
    clearLines();
});

// Clear lines on navigation
window.addEventListener('beforeunload', clearLines);


/**
 * Setup the comparison of two lists, as needed by the event listeners
 * 
 * @param {*} listAId       The ID of the first list container
 * @param {*} listBId       The ID of the second list container
 * @param {*} listA         The first list of objects
 * @param {*} listB         The second list of objects
 * @param {*} sort          Whether to sort the lists alphabetically (good for objects, bad for policies)
 */
function setupComparison(listAId, listBId, listA, listB, sort = true) {
    // Get the two parent containers
    let listAContainer = document.getElementById(listAId);
    let listBContainer = document.getElementById(listBId);

    if (listAContainer.dataset.vendor != listBContainer.dataset.vendor) {
        showNotification('Cannot compare objects from different vendors', 'Failure');
        return;
    }

    // Find missing items, update the lists, and sort them
    compareAndAppend(listA, listB, listAContainer, listBContainer);
    if (sort) {
        sortDivsByIdSuffix(`#${listAId}`);
        sortDivsByIdSuffix(`#${listBId}`);
    }

    // Find differences and highlight them (need to sort first to ensure the lists are in the same order)
    if (sort) {
        listA.sort((a, b) => a.name.localeCompare(b.name));
        listB.sort((a, b) => a.name.localeCompare(b.name));
    }
    highlightDifferences(listA, listB, listAContainer, listBContainer);

    // Show a notification that the comparison is complete
    showNotification('Comparison complete', 'Success');
}


/**
 * Add items to the tables
 * These are shown in the lists of objects like tags, addresses, etc.
 * Called for each item (row) in the table
 * 
 * @param {*} tableName     An existing table that needs an item added
 * @param {*} heading       The heading, which is in the left cell
 * @param {*} value         The value, which is in the right cell
 */
function addChildTableItem(tableName, heading, value) {
    // Skip the name, as it is already displayed in the button
    if (heading == 'name') {
        return;
    }

    // Create the row
    const row = tableName.insertRow();

    // Create the heading cell (left cell)
    cell = row.insertCell();
    cell.textContent = heading;
    cell.className = 'left-cell';

    // Create the value cell
    cell = row.insertCell();
    // cell.textContent = value;
    if (value && typeof value === 'object' && value.member && Array.isArray(value.member)) {
        // Handle cases where 'value' is an array containing 'member' as a property
        cell.textContent = value.member ? value.member.join(', ') : "None";

    } else if (value && typeof value === 'object' && value["static-ip"] && typeof value["static-ip"] === 'object') {
        // Correctly handle 'static-ip' as an object, not an array
        let bidirNat = value?.["static-ip"]?.["bi-directional"] ?? "None";
        let sourceTransIp = value?.["static-ip"]?.["translated-address"] ?? "None";

        cell.innerHTML = sourceTransIp + "<br>Bidirectional: " + bidirNat;

    } else {
        // Default case, just display the value
        cell.textContent = value;
    }
}


/**
 * Compares lists, and adds missing items
 *  - While loop to loop through items until we reach the end of both lists
 *  - Check if the item in ListA[index] is in ListB[index]
 *      - If not, add it to ListB at the same index
 *      - Create a div for the missing item, with a button and a list div
 *  - Repeat the process for ListB[index] in ListA
 * 
 * @param {*} listA             The first list of objects
 * @param {*} listB             The second list of objects
 * @param {*} listAContainer    The parent container for the first list
 * @param {*} listBContainer    The parent container for the second list
 */
function compareAndAppend(listA, listB, listAContainer, listBContainer) {
    let index = 0;

    // Function to create and append elements
    function createAndAppendElements(list, container, index) {
        const sanitizedId = sanitizeId(list[index].name);
        const parentDiv = createElement('div', { id: container.id + '_' + sanitizedId });
        parentDiv.style.display = 'flex';
        parentDiv.style.alignItems = 'center';

        const button = createFixedButton(list[index], container, sanitizedId);
        const listDiv = createDiv(container, sanitizedId);
        listDiv.style = 'overflow-x: auto;';
        const table = createElement('table', { className: 'w3-table indented-table' });

        // Add the missing elements to the list div
        Object.entries(list[index]).forEach(([key, value]) => {
            addChildTableItem(table, key, value);
        });

        // Create a plus icon button element
        const addButton = document.createElement('button');
        addButton.className = 'add-button';
        addButton.title = 'Add missing object';

        const plusIcon = document.createElement('i');
        plusIcon.className = 'fa fa-plus';

        addButton.appendChild(plusIcon);

        // Append the list and button to the parent div
        listDiv.appendChild(table);
        parentDiv.append(button, addButton, listDiv);

        // Insert the parent div into the container at the correct index
        let referenceNode = container.children[index] || null;
        container.insertBefore(parentDiv, referenceNode);

        // Add event listener to the add button
        addButton.addEventListener('click', (function (currentIndex, currentItem) {
            return function () {
                // Call the function to add the object to the device
                const targetDevice = container.dataset.deviceId;
                const deviceVendor = container.dataset.vendor;

                switch (true) {
                    case parentDiv.id.includes('tag'):
                        addTagToDevice(targetDevice, deviceVendor, currentItem);
                        break;

                    case parentDiv.id.includes('addressGroup'):
                        addAddressGroupToDevice(targetDevice, deviceVendor, currentItem);
                        break;

                    case parentDiv.id.includes('address'):
                        addAddressToDevice(targetDevice, deviceVendor, currentItem);
                        break;

                    case parentDiv.id.includes('applicationGroup'):
                        addApplicationGroupToDevice(targetDevice, deviceVendor, currentItem);
                        break;

                    case parentDiv.id.includes('serviceGroup'):
                        addServiceGroupToDevice(targetDevice, deviceVendor, currentItem);
                        break;

                    case parentDiv.id.includes('service'):
                        addServiceToDevice(targetDevice, deviceVendor, currentItem);
                        break;

                    default:
                        showNotification('Adding objects is not yet supported here', 'Failure');
                }
            };
        })(index, list[index]));
    }
    // Loop as long as there are items in either list
    while (listA.length > index || listB.length > index) {
        // Handle getting to the end of listA while listB still has items
        if (listA[index] === undefined) {
            listA.push(listB[index]);
            createAndAppendElements(listA, listAContainer, index);
        }

        // Handle getting to the end of listB while listA still has items
        if (listB[index] === undefined) {
            listB.push(listA[index]);
            createAndAppendElements(listB, listBContainer, index);
        }

        // Check if the ListA item is anywhere in ListB
        if (!listB.some(item => item.name.toLowerCase() === listA[index].name.toLowerCase())) {
            listB.splice(index, 0, listA[index]);
            createAndAppendElements(listA, listBContainer, index);
        }

        // Check if the ListB item is anywhere in ListA
        if (!listA.some(item => item.name.toLowerCase() === listB[index].name.toLowerCase())) {
            listA.splice(index, 0, listB[index]);
            createAndAppendElements(listB, listAContainer, index);
        }

        index++;
    }
}


/**
 * Adds a tag to a Palo Alto device
 * Note, tags are only supported on PA, not SRX
 * 
 * @param {*} targetDevice 
 * @param {*} item 
 */
async function addTagToDevice(targetDevice, deviceVendor, item) {
    // Quick validation
    if (deviceVendor !== 'paloalto') {
        showNotification('Tags are not supported on SRX devices', 'Failure');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // If Palo Alto, API call to check that the target is not passive (HA)
    if (deviceVendor == 'paloalto') {
        const response = await fetch(API_BASE_URL + '/api/device?action=list&id=' + targetDevice);
        const data = await response.json();

        if (data['ha_state'] === 'passive') {
            showNotification('Cannot add tags to a passive device', 'Failure');
            document.getElementById('loadingSpinner').style.display = 'none';
            return;
        }
    }

    try {
        // API call to add the tag to the device
        const tag_data = {
            "name": item['name'],
            "comment": item['description'],
        };

        // If the tag has a colour, add it to the tag data
        if (item['colour'] !== 'no colour') {
            tag_data['colour'] = item['colour'];
        };

        // API call to add the tag to the device
        const tagResponse = await fetch(API_BASE_URL + '/api/objects?object=tags&action=create&id=' + targetDevice, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tag_data)
        });

        if (!tagResponse.ok) {
            throw new Error(`HTTP error! status: ${tagResponse.status}`);
        }

        const tagResult = await tagResponse.json();
        showNotification('Tag added, remember to commit', 'Success');
        document.getElementById('loadingSpinner').style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add tag', 'Failure');

    } finally {
        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}


/**
 * Add address objects to a device
 * 
 * @param {*} targetDevice 
 * @param {*} item 
 */
async function addAddressToDevice(targetDevice, deviceVendor, item) {
    // Quick validation
    if (deviceVendor != 'paloalto' && deviceVendor != 'juniper') {
        showNotification(`This vendor (${deviceVendor}) is not supported`, 'Failure');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // If Palo Alto, API call to check that the target is not passive (HA)
    if (deviceVendor == 'paloalto') {
        const response = await fetch(API_BASE_URL + '/api/device?action=list&id=' + targetDevice);
        const data = await response.json();

        if (data['ha_state'] === 'passive') {
            showNotification('Cannot add tags to a passive device', 'Failure');
            document.getElementById('loadingSpinner').style.display = 'none';
            return;
        }
    }

    // API call to add the address object to the device
    try {
        // Collect information
        const address_data = {
            "name": item['name'],
            "address": item['addr'],
            "description": item['description'],
            "tag": item['tag'] ? item['tag'] : 'None',
        };

        // API call
        const addressResponse = await fetch(API_BASE_URL + '/api/objects?object=addresses&action=create&id=' + targetDevice, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(address_data)
        });

        if (!addressResponse.ok) {
            throw new Error(`HTTP error! status: ${addressResponse.status}`);
        }

        const addrResult = await addressResponse.json();
        showNotification('Address added, remember to commit', 'Success');

    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add address object', 'Failure');

    } finally {
        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}


/**
 * Add address group objects to a device
 * 
 * @param {*} targetDevice 
 * @param {*} item 
 */
async function addAddressGroupToDevice(targetDevice, deviceVendor, item) {
    // Quick validation
    if (deviceVendor != 'paloalto' && deviceVendor != 'juniper') {
        showNotification(`This vendor (${deviceVendor}) is not supported`, 'Failure');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // If Palo Alto, API call to check that the target is not passive (HA)
    if (deviceVendor == 'paloalto') {
        const response = await fetch(API_BASE_URL + '/api/device?action=list&id=' + targetDevice);
        const data = await response.json();

        if (data['ha_state'] === 'passive') {
            showNotification('Cannot add addresses to a passive device', 'Failure');
            document.getElementById('loadingSpinner').style.display = 'none';
            return;
        }
    }

    // API call to add the address group object to the device
    try {
        // Collect information
        const address_group_data = {
            "name": item['name'],
            "members": item['static'],
            "description": item['description'] ? item['description'] : 'None',
            "tag": item['tag'] ? item['tag'] : 'None',
        };

        // API call
        const addressGroupResponse = await fetch(API_BASE_URL + '/api/objects?object=address_groups&action=create&id=' + targetDevice, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(address_group_data)
        });

        if (!addressGroupResponse.ok) {
            throw new Error(`HTTP error! status: ${addressGroupResponse.status}`);
        }

        const addrGroupResult = await addressGroupResponse.json();
        showNotification('Address group added, remember to commit', 'Success');

        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add address group object', 'Failure');

    } finally {
        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}


/**
 * Add application group objects to a device
 * 
 * @param {*} targetDevice 
 * @param {*} item 
 */
async function addApplicationGroupToDevice(targetDevice, deviceVendor, item) {
    // Quick validation
    if (deviceVendor != 'paloalto' && deviceVendor != 'juniper') {
        showNotification(`This vendor (${deviceVendor}) is not supported`, 'Failure');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // If Palo Alto, API call to check that the target is not passive (HA)
    if (deviceVendor == 'paloalto') {
        const response = await fetch(API_BASE_URL + '/api/device?action=list&id=' + targetDevice);
        const data = await response.json();

        if (data['ha_state'] === 'passive') {
            showNotification('Cannot add address groups to a passive device', 'Failure');
            document.getElementById('loadingSpinner').style.display = 'none';
            return;
        }
    }

    // API call to add the application group object to the device
    try {
        // Collect information
        const application_group_data = {
            "name": item['name'],
            "members": item['members'],
        };

        // API call
        const appGroupResponse = await fetch(API_BASE_URL + '/api/objects?object=app_groups&action=create&id=' + targetDevice, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(application_group_data)
        });

        if (!appGroupResponse.ok) {
            throw new Error(`HTTP error! status: ${appGroupResponse.status}`);
        }

        const appGroupResult = await appGroupResponse.json();
        showNotification('Application group added, remember to commit', 'Success');

        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add application group object', 'Failure');

    } finally {
        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}


/**
 * Add service objects to a device
 * 
 * @param {*} targetDevice 
 * @param {*} item 
 */
async function addServiceToDevice(targetDevice, deviceVendor, item) {
    // Quick validation
    if (deviceVendor != 'paloalto' && deviceVendor != 'juniper') {
        showNotification(`This vendor(${deviceVendor}) is not supported`, 'Failure');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // If Palo Alto, API call to check that the target is not passive (HA)
    if (deviceVendor == 'paloalto') {
        const response = await fetch(API_BASE_URL + '/api/device ? action = list & id=' + targetDevice);
        const data = await response.json();

        if (data['ha_state'] === 'passive') {
            showNotification('Cannot add services to a passive device', 'Failure');
            document.getElementById('loadingSpinner').style.display = 'none';
            return;
        }
    }

    // API call to add the service object to the device
    try {
        // Collect information
        const service_data = {
            "name": item['name'],
            "protocol": item['protocol'],
            "port": item['port'],
            "description": item['description'],
            "tag": item['tag'] ? item['tag'] : 'None',
        };

        // API call
        const serviceResponse = await fetch(API_BASE_URL + '/api/objects ? object = services & action=create & id=' + targetDevice, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(service_data)
        });

        if (!serviceResponse.ok) {
            throw new Error(`HTTP error! status: ${serviceResponse.status}`);
        }

        const serviceResult = await serviceResponse.json();
        showNotification('Service object added, remember to commit', 'Success');

        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add service object', 'Failure');

    } finally {
        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}


/**
 * Add service group objects to a device
 * 
 * @param {*} targetDevice 
 * @param {*} item 
 */
async function addServiceGroupToDevice(targetDevice, deviceVendor, item) {
    // Quick validation
    if (deviceVendor != 'paloalto' && deviceVendor != 'juniper') {
        showNotification(`This vendor(${deviceVendor}) is not supported`, 'Failure');
        return;
    }

    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';

    // If Palo Alto, API call to check that the target is not passive (HA)
    if (deviceVendor == 'paloalto') {
        const response = await fetch(API_BASE_URL + '/api/device ? action = list & id=' + targetDevice);
        const data = await response.json();

        if (data['ha_state'] === 'passive') {
            showNotification('Cannot add service groups to a passive device', 'Failure');
            document.getElementById('loadingSpinner').style.display = 'none';
            return;
        }
    }

    // API call to add the service group object to the device
    try {
        // Collect information
        const service_group_data = {
            "name": item['name'],
            "members": item['members'],
            "tag": item['tag'] ? item['tag'] : 'None',
        };

        // API call
        const serviceGroupResponse = await fetch(API_BASE_URL + '/api/objects ? object = service_groups & action=create & id=' + targetDevice, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(service_group_data)
        });

        if (!serviceGroupResponse.ok) {
            throw new Error(`HTTP error! status: ${serviceGroupResponse.status}`);
        }

        const serviceGroupResult = await serviceGroupResponse.json();
        showNotification('Service group added, remember to commit', 'Success');

        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add service group object', 'Failure');

    } finally {
        // Hide the loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}


/**
 * Sanatize a name so it can be used in dynamically created IDs
 * 
 * @param {*} name 
 * @returns 
 */
function sanitizeId(name) {
    return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9-_]/g, '');
}


/**
 * Creates HTML tags (elements) with properties
 * 
 * @param {*} tag 
 * @param {*} properties 
 * @returns 
 */
function createElement(tag, properties = {}) {
    const element = document.createElement(tag);

    // Create the element with the given properties
    Object.entries(properties).forEach(([key, value]) => element[key] = value);
    return element;
}


/**
 * Create a button element for a list item
 * 
 * @param {*} element 
 * @param {*} listContainer 
 * @param {*} sanitizedId 
 * @returns 
 */
function createButton(element, listContainer, sanitizedId) {
    const button = document.createElement('button');
    button.className = 'w3-button w3-block w3-left-align';
    button.textContent = element.name;
    button.classList.add('highlight-missing');
    button.onclick = () => expandList(listContainer.id + '_list_' + sanitizedId);
    return button;
}


function createFixedButton(element) {
    const button = document.createElement('button');
    button.className = 'w3-button w3-block w3-left-align';
    button.textContent = element.name;
    button.classList.add('highlight-missing');
    return button;
}


/**
 * Create a div element for a list
 * This will be in parallel with the button in a parent div
 * 
 * @param {*} container 
 * @param {*} sanitizedId 
 * @returns 
 */
function createDiv(container, sanitizedId) {
    const listDiv = document.createElement('div');
    listDiv.id = container.id + '_list_' + sanitizedId;
    listDiv.className = 'w3-hide w3-border';

    return listDiv;
}


/**
 * Sorts parent divs based on the suffix of the 'id' attribute
 * These divs contain a button and a list div
 * 
 * @param {*} parentSelector 
 * @returns 
 */
function sortDivsByIdSuffix(parentSelector) {
    // Select the parent container
    const parent = document.querySelector(parentSelector);

    // Ensure the parent exists to avoid errors
    if (!parent) {
        console.error('Parent selector not found:', parentSelector);
        return;
    }

    // Get all divs as an array
    const divsArray = Array.from(parent.querySelectorAll(':scope > div'));

    // Sort the array based on the suffix of the 'id' attribute, safely handling missing attributes
    divsArray.sort((a, b) => {
        // Extract the part of the id after the underscore
        const idA = a.id.split('_')[1] || "";
        const idB = b.id.split('_')[1] || "";
        return idA.localeCompare(idB);
    });

    // Re-append the divs in sorted order
    divsArray.forEach(div => {
        parent.appendChild(div);
    });
}


/**
 * Finds objects that are different between two lists
 * Looks at properties, not just the name
 * 
 * @param {*} listA 
 * @param {*} listB 
 * @param {*} containerA 
 * @param {*} containerB 
 */
function highlightDifferences(listA, listB, containerA, containerB) {
    // Ensure the SVG is the correct size for the window (in case we need to draw lines)
    setSvgDimensions();

    // Loop through the first list
    listA.forEach((itemA, index) => {
        // The corresponding item in the second list (to compare to)
        const itemB = listB[index];

        // Compare the two items
        if (areObjectsDifferent(itemA, itemB)) {
            // Select the two buttons, and apply CSS to highlight
            const buttonA = containerA.querySelector(`#${containerA.id}_${sanitizeId(itemA.name)
                } button`);
            const buttonB = containerB.querySelector(`#${containerB.id}_${sanitizeId(itemB.name)} button`);

            buttonA.classList.add('highlight-different');
            buttonB.classList.add('highlight-different');

            // Check if there is an item elsewhere in listB that matches itemA and is not at the same index
            const matchingIndexB = listB.findIndex((item, index) => {
                const itemAIndex = listA.indexOf(itemA);
                const namesAreDifferent = item.name !== itemA.name;
                return index !== itemAIndex && !namesAreDifferent;
            });
            if (matchingIndexB !== -1) {
                const iconB = document.createElement('i');
                iconB.className = 'fa-solid fa-arrows-up-down';
                iconB.style.color = 'blue';
                iconB.style.marginRight = '10px';
                buttonB.insertBefore(iconB, buttonB.firstChild);

                // When the two items are in different positions, draw an arrow to connect them
                const matchingButtonB = containerB.querySelector(`#${containerB.id}_${sanitizeId(listB[matchingIndexB].name)} button`);
                const offsetA = getOffset(buttonA);
                const offsetB = getOffset(matchingButtonB);
                const x1 = offsetA.left + buttonA.offsetWidth - buttonA.offsetHeight / 4;
                const y1 = offsetA.top + buttonA.offsetHeight / 2;
                const x2 = offsetB.left + buttonB.offsetHeight / 4;
                const y2 = offsetB.top + buttonB.offsetHeight / 2;
                drawLine(x1, y1, x2, y2, 'green');
            }

            // Similarly, check if there is an item elsewhere in listA that matches itemB and is not at the same index
            // Don't need to draw an arrow a second time
            const matchingIndexA = listA.findIndex((item, index) => {
                const itemBIndex = listB.indexOf(itemB);
                const namesAreDifferent = item.name !== itemB.name;
                return index !== itemBIndex && !namesAreDifferent;
            });
            if (matchingIndexA !== -1) {
                const iconA = document.createElement('i');
                iconA.className = 'fa-solid fa-arrows-up-down';
                iconA.style.color = 'blue';
                iconA.style.marginRight = '10px';
                buttonA.insertBefore(iconA, buttonA.firstChild);
            }
        }
    });
}


/**
 * Set the dimensions of an SVG element to match the window size
 * The SVG has a limited area in which it can draw, and we want it to be the full screen
 * So, as a screen is updated with more or less items, the SVG should be updated to match
 */
function setSvgDimensions() {
    // Get the SVG element
    const svg = document.getElementById('lines-svg');

    // Handle errors if it can't be found
    if (!svg) {
        console.error(`SVG element not found.`);
        return;
    }

    // Get the width and height of the window
    const width = Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth);
    const height = Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight);

    // Set the width and height of the SVG element
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
}


/**
 * Update the comparison arrows under certain conditions
 *      - Window resize
 *      - Expanding an item in the list
 * 
 * @param {HTMLElement} listA
 * @param {HTMLElement} listB
 * @param {String} containerA
 * @param {String} containerB
 */
function adjustLines(listA, listB, containerA, containerB) {
    // Clear existing lines
    clearLines();
    setSvgDimensions();

    // Recalculate and redraw lines
    listA.forEach((itemA, indexA) => {
        const buttonA = document.querySelector(`#${containerA}_${sanitizeId(itemA.name)} `);
        const matchingIndexB = listB.findIndex((itemB, indexB) => {
            return indexB !== indexA && itemB.name === itemA.name;
        });
        if (matchingIndexB !== -1) {
            const buttonB = document.querySelector(`#${containerB}_${sanitizeId(listB[matchingIndexB].name)} `);
            const offsetA = getOffset(buttonA);
            const offsetB = getOffset(buttonB);
            const x1 = offsetA.left + buttonA.offsetWidth - buttonA.offsetHeight / 4;
            const y1 = offsetA.top + buttonA.offsetHeight / 2;
            const x2 = offsetB.left + buttonB.offsetHeight / 4;
            const y2 = offsetB.top + buttonB.offsetHeight / 2;
            drawLine(x1, y1, x2, y2, 'green');
        }
    });
}


/**
 * Clear all lines from the SVG element
 * Eg, when navigating to a new page
 */
function clearLines() {
    const lines = document.querySelectorAll('line'); // Assuming lines are drawn using <line> elements
    lines.forEach(line => line.remove());
}


/**
 * Draws an arrow on the screen using the SVG element (in base.html)
 * This is used to connect two buttons that are in different positions on the screen
 * 
 * This contains three parts:
 *     - A line connecting the two buttons
 *     - A circle at the start of the line
 *     - An arrow at the end of the line
 * 
 * https://www.w3schools.com/graphics/svg_line.asp
 * https://www.w3schools.com/graphics/svg_marker.asp
 * 
 * @param {Number} x1           - The x-coordinate of the start of the line
 * @param {Number} y1           - The y-coordinate of the start of the line
 * @param {Number} x2           - The x-coordinate of the end of the line
 * @param {Number} y2           - The y-coordinate of the end of the line
 * @param {String} colour       - The colour of the line, circle, and arrow
 */
function drawLine(x1, y1, x2, y2, colour) {
    // The SVG element in the HTML
    const svg = document.getElementById('lines-svg');

    // The DEFS element for adding markers (start and ending arrows)
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);

    // Create the marker for the circle
    const markerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    markerCircle.setAttribute('id', 'circle');
    markerCircle.setAttribute('markerWidth', '10');
    markerCircle.setAttribute('markerHeight', '10');
    markerCircle.setAttribute('refX', '5');
    markerCircle.setAttribute('refY', '5');

    // Create the circle path
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '5');
    circle.setAttribute('cy', '5');
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', colour);

    // Create the marker for the arrow
    const markerArrow = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    markerArrow.setAttribute('id', 'arrow');
    markerArrow.setAttribute('markerWidth', '10');
    markerArrow.setAttribute('markerHeight', '10');
    markerArrow.setAttribute('refX', '9');
    markerArrow.setAttribute('refY', '3');
    markerArrow.setAttribute('orient', 'auto');
    markerArrow.setAttribute('markerUnits', 'strokeWidth');

    // Create the arrow path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,0 L0,6 L9,3 z');
    path.setAttribute('fill', colour);

    // Append the markers to the defs element
    markerCircle.appendChild(circle);
    defs.appendChild(markerCircle);
    markerArrow.appendChild(path);
    defs.appendChild(markerArrow);

    // The LINE element for the line itself
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', colour);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-start', 'url(#circle)');
    line.setAttribute('marker-end', 'url(#arrow)');
    svg.appendChild(line);
}


/**
 * Gets coordinates of an element on the screen
 * Used for drawing lines between buttons
 * 
 * @param {HTMLElement} element - The element to get the coordinates of
 * @returns {Array}             - The x and y coordinates of the element
 */
function getOffset(element) {
    // Treat it as a rectangle, and get the top-left corner
    const rect = element.getBoundingClientRect();

    // Return top-left corner as X and Y coordinates
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}


/**
 * Deep equality check for two objects
 * This is used to compare the properties of two objects when they contains arrays or other objects
 * 
 * @param {*} obj1      The first object
 * @param {*} obj2      The second object
 * @returns             True if the objects are deeply equal, false otherwise
 */
function areObjectsDeeplyEqual(obj1, obj2) {
    // Quick check, if they are exactly the same
    if (obj1 === obj2) {
        return true;
    }

    // Check types and null values
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
        return false;
    }

    // Quick check, do they have the same number of keys
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }

    // Check each key in obj1, and compare the values
    for (let key of keys1) {
        if (!keys2.includes(key) || !areObjectsDeeplyEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    // If we get this far, the objects are deeply equal
    return true;
}


/**
 * Compares two objects and returns true if they are different
 * 
 * @param {*} obj1      The first object
 * @param {*} obj2      The second object
 * @returns             True if the objects are different, false otherwise
 */
function areObjectsDifferent(obj1, obj2) {
    // Get the unique keys from both
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    // Loop through all keys, and compare the values
    for (let key of allKeys) {
        // Skip the name key
        if (key == "name") {
            continue;
        }

        // When members are included, these are list of FW objects like services or addresses
        if (key == "members" || key == "source") {
            // Convert strings and objects to arrays
            let array1, array2;

            if (typeof obj1[key] == 'string') {
                array1 = obj1[key].split(',');
            } else {
                array1 = [obj1[key]];
            }

            if (typeof obj2[key] == 'string') {
                array2 = obj2[key].split(',');
            } else {
                array2 = [obj2[key]];
            }

            // If this is a list with a member property, use that
            if (array1.some(item => item.hasOwnProperty('member'))) {
                array1 = array1[0].member;
                array2 = array2[0].member;
            }

            // Ignore leading/trailing whitespace and case
            const array1Processed = array1.map(item => item.trim().toLowerCase());
            const array2Processed = array2.map(item => item.trim().toLowerCase());

            // Use a set, to compare the arrays ignoring order
            const set1 = new Set(array1Processed);
            const set2 = new Set(array2Processed);

            // Check if the set sizes are different
            if (set1.size !== set2.size) {
                console.log('Failed match; different sizes', array1Processed, array2Processed);
                return true;
            }

            // Check if the set items are different
            for (let item of set1) {
                if (!set2.has(item)) {
                    console.log('Failed match; members', array1Processed, array2Processed);
                    return true;
                }
            }

            // Otherwise, the arrays match
            return false;
        }

        // Use the deep equality check for both array and non-array values
        const value1 = obj1[key];
        const value2 = obj2[key];
        if (!areObjectsDeeplyEqual(value1, value2)) {
            return true;
        }
    }

    return false;
}
