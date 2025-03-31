import socket from './socket.js';
// Declaring variables to be used 
let roster = [];    //Transports driver data
let sessions =[];  //Transports roster data
let flagElement = document.getElementById("currentMode");
let flagLabels = {
  "green": "SAFE",
  "yellow": "HAZARD",
  "red": "DANGER", // Lookup object to use only valid data
  "finish": "FINISH"
};


let finalRoster;
let rosterIndex; 
let raceInProgress = false;
let rosterSize = 8;
////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////// WEBPAGE INITIALIZATION
////////////////////////////////////////////////////////////////////////////////////////////////////////

socket.emit("rosterIndex-initializer");
socket.emit('raceMode-flag-request');
socket.on('from-server-raceMode-flag-response', currentFlag => {
    flagElement.textContent = flagLabels[currentFlag] || "Unknown Flag";
})
socket.on("rosterIndex-initializer-answer", (serverRosterIndex) => {
    rosterIndex = serverRosterIndex;
    document.getElementById("submitButton").disabled = false;
})
socket.emit('onload-sessions-request');
socket.on('current-sessions-emit', (upcomingSessions) => {

    if (upcomingSessions) {
        sessions = upcomingSessions;
        console.log('Sessions updated:', sessions);
        updateSessionUI();
    } else {
        console.warn('Upcoming sessions is undefined or null');
        sessions = []; // Initialize roster to an empty array
    }
})


class Driver {
    constructor(name, id, fastestLap, previousLap, currentLap, timeDifference, lapCount) {
        this.name = name;
        this.id = id;
        this.fastestLap = fastestLap;
        this.previousLap = previousLap;
        this.currentLap = currentLap;
        this.timeDifference = timeDifference
        this.lapCount = lapCount;
    }
}

class Session { // Sessions itself will stay as an array, these are the entries within to retain a unique identifier
    constructor(id, roster) {
        this.id = id;
        this.roster = roster;
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////// LOADING THE CONTENT + EVENTLISTENERS
////////////////////////////////////////////////////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", function() { //This waits for the DOM elements to load in completely, then adds eventlisteners to the following elements
    const form = document.getElementById("driverForm");
    const confirmButton = document.getElementById("confirmDriverButton");
    const resetButton = document.getElementById("resetDriverButton");
    const driverInput = document.getElementById("driverInput");
    const driverSelect = document.getElementById("driverSelect");
    const resetCurrentButton = document.getElementById("resetCurrentButton");
    const submitButton = document.getElementById("submitButton");

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        const name = document.querySelector("input[id=driverInput]").value;
        const id = document.querySelector("select[id=driverSelect]").className;
        driverRosterChecker(name, id);
        updateCurrentRosterUI();
        const driverInput = document.getElementById("driverInput");
        driverInput.value = "";
    })

    confirmButton.addEventListener("click", function() {
        const name = document.querySelector("input[id=driverInput]").value;
        const id = document.querySelector("select[id=driverSelect]").className;
        if (name) {
            //Add the chosen driver's name to the corresponding roster position
            driverInput.value = ""; //Clearing the input when done
        } else {
            alert("Please enter the driver's name");
        }
        driverRosterChecker(name, id);
        updateCurrentRosterUI();
    });

    resetButton.addEventListener("click", function() {
        driverInput.value = ""; // Reset the field for writing
    });

    driverSelect.addEventListener("change", function() { //This detects when an option is chosen or "changed" inside the select
        if (driverSelect.value != 0) {                     //Check if value is one we want to mutate
        let selectedValue = driverSelect.value;     
        driverSelect.className = "";
        driverSelect.classList.add("Car_" + selectedValue);
        selectedDriver.textContent = `Selected Car: ${selectedValue}`;
        } else {
            driverSelect.className = "none";
            selectedDriver.textContent = `Selected Car: None`;
        }
        
    })

    submitButton.addEventListener("click", function() {

        roster.sort((a, b) => {
            return a.id.localeCompare(b.id); // Compare the ids to sort the array
        })
        console.log(roster)
        const filteredRoster = roster.filter(driver => checkValidDriver(driver)); // Filter all empty fields to send a complete and "real" roster
        if (filteredRoster.length === 0) {
            return alert("Please enter drivers into the roster");
        }
        finalRoster = new Session ("Session " + rosterIndex, filteredRoster);
        
        sessions.push(finalRoster);

        socket.emit('next-session-update-request', sessions[0]);
        socket.emit('upcoming-sessions-number-update-request', sessions.length); // For race-control for total amount of upcoming races
        socket.emit('all-sessions-update-request', sessions);
        socket.emit('is-race-in-progress-check-for-next-race');
        console.log('Emitted session-update event for all fields');
        // Deliver the final roster to the server for further use
        roster = [];
        initializeRoster();
        updateUI();
        rosterIndex++;
        socket.emit('rosterIndex-update-request', rosterIndex);
    })


    checkSelection();
    driverSelect.addEventListener("change", checkSelection); // Constantly checking if the value is empty or not

    resetCurrentButton.addEventListener("click", function() {
        roster = [];
        initializeRoster();
        updateCurrentRosterUI();
    }) 

    socket.on('server-all-sessions-update-response', serverSessions => {
        sessions = serverSessions;
        updateSessionUI();
    })

    initializeRoster();
    updateUI();

    socket.on('from-server-page-reload-request', () => {
        window.location.reload(); // Refresh the page
    })
    socket.on('rosterIndex-update-response', serverRosterIndex => {
        rosterIndex = serverRosterIndex;
    })
    socket.on('from-server-new-session-has-been-created', () => {
        updateSessionUI();
    });
    socket.on('new-session-acknowledged', () => {
        updateSessionUI();
    })
    socket.on('from-server-race-started', () => {
        raceInProgress = true;

        const removeButtons = document.querySelectorAll('.sessionRemoveButton');
        removeButtons.forEach(button => {
        button.disabled = true;
    });
    });
    socket.on('server-current-race-has-ended', () => {
    setTimeout(() => {
        raceInProgress = false;
        updateUI();
    }, 0); // Execute as soon as possible, but after pending tasks
    });
});

updateUI();

////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////// HELPER FUNCTIONS
////////////////////////////////////////////////////////////////////////////////////////////////////////

function initializeRoster() {
    let expectedIds = [];
    for (let i = 1; i <= rosterSize; i++) {
        expectedIds.push("Car_" + i);
    }

    // Add missing drivers
    for (let i = 0; i < expectedIds.length; i++) {
        if (!roster[i] || roster[i].id !== expectedIds[i]) {
            let newDriver = new Driver("---", expectedIds[i], '---', '---', '---', '---', 0);
            roster.splice(i, 0, newDriver); // At position i remove 0 (nothing) and add newDriver
        }
    }

    // Remove extra drivers
    while (roster.length > rosterSize) {
        roster.pop();
    }
}

function populateDropdown() {
    let selectElement = document.getElementById("driverSelect");
    selectElement.className = "none";
    selectElement.innerHTML = ""; // Clear the data

    let option = document.createElement("option");
    option.value = 0; // Useful to have
    option.className = "default";
    option.textContent = "---"; // The id based on which the user can choose
    selectElement.appendChild(option); // Append this option to the selectDriver list we have

    roster.forEach((driver, index)=> {
        let option = document.createElement("option");
        option.value = index+1; // Useful to have
        option.className = "valid";
        option.textContent = driver.id; // The id based on which the user can choose
        selectElement.appendChild(option); // Append this option to the selectDriver list we have
    })
}
//hello

function updateCurrentRosterUI() {
    let listElement = document.getElementById("nameList");
    listElement.innerHTML = "";
    
    const maxChars = 20

   roster.forEach((driver, index) => {
        let tr = document.createElement("tr"); // Create a <tr> (table row) element
        tr.classList.add("driver");
        tr.id = `${driver.id}`;

        let td = document.createElement("td"); // Create a <td> (table data) element
        let displayName = driver.name || "---";
        if (displayName.length > maxChars) {
            displayName = displayName.substring(0, maxChars) + "...";
        }

        td.textContent = `${index + 1}. ${displayName}`; // Set the text content of the <td>

        let removeDriverButton = document.createElement("button");
            removeDriverButton.classList.add("removeDriverButton");
            removeDriverButton.textContent = "❌";
            removeDriverButton.addEventListener("click", () => {
                removeDriver(driver.id); // Call a function to remove the session
            });

        if (displayName === "---") {
            removeDriverButton.disabled = true;
        } else {
            removeDriverButton.disabled = false;
        }

        tr.appendChild(td); // Append the <td> to the <tr>
        tr.appendChild(removeDriverButton);
        listElement.appendChild(tr); // Append the <tr> to the table
    });
    }

function updateSessionUI() {
   
    let raceList = document.getElementById("raceList");
    raceList.innerHTML = ""; // Clear the list
    if (sessions && sessions.length > 0) { // Check if sessions exists and has elements
        sessions.forEach((race, index) => {
            let tr = document.createElement("tr");
            tr.id = race.id;
            tr.classList.add("race");

            let tdId = document.createElement("td");
             tdId.textContent = `${index + 1}. ${race.id}`;
            tr.appendChild(tdId);
            

            let removeButton = document.createElement("button");
            removeButton.classList.add("sessionRemoveButton");
            removeButton.textContent = "❌";
            removeButton.addEventListener("click", () => {
                removeSession(race.id); // Call a function to remove the session
            });
            if (raceInProgress) {
                removeButton.disabled = true;
            } else {
                removeButton.disabled = false;
            }
            tr.appendChild(removeButton);

            raceList.appendChild(tr);
        });
    } else {
        raceList.textContent = "No Sessions have been scheduled yet"
    }
}

function removeDriver(id) {
    const index = roster.findIndex(driver => driver.id === id);

    if (index !== -1) { // findIndex returns -1 if not found, thus if there is a match, it won't have the value of -1
        roster[index] = {
            name: "---",           // Essentially rebuilding that removed Driver to retain it's position
            id: roster[index].id, // Keep the original ID
            fastestLap: '---',
            previousLap: '---',
            currentLap: '---',
            timeDifference: '---',
            lapCount: 0
        };
        initializeRoster();
        populateDropdown();
        updateCurrentRosterUI(); // Update the UI

        const driverSelect = document.getElementById("driverSelect");
        const selectedDriver = document.getElementById("selectedDriver");
        if (driverSelect && selectedDriver) {
            driverSelect.className = "none";
            driverSelect.value = 0;
            selectedDriver.textContent = `Selected Car: None`;
            requestAnimationFrame(() => { // Force UI update to make sure that upon removal, text is disabled if a car isn't chosen
                requestAnimationFrame(checkSelection.bind(this)); // Fixes timing issue when updating dropdown and text input
            });
        }

    }
}

function removeSession(sessionId) {

    const index = sessions.findIndex(session => session.id === sessionId);

    if (index !== -1) {
        sessions.splice(index, 1); // Find the matching session and remove it, then update UI and data in server
        updateUI();
        socket.emit('next-session-update-request', sessions[0]);
        socket.emit('upcoming-sessions-number-update-request', sessions.length); // For race-control for total amount of upcoming races
        socket.emit('all-sessions-update-request', sessions);
    }
}

function driverRosterChecker(name, id) {
    const duplicateName = roster.find(driver => driver.name === name);
    if (duplicateName) {
        alert("Driver already exists.");
        return;
    }

    // Check for empty names
    if (!name || name === "---" || name.trim().length === 0) {
        alert("Driver name cannot be empty or '---'.");
        return;
    }

    // Check for existing ID and update
    const existingDriver = roster.find(driver => driver.id === id);
    if (existingDriver) {
        existingDriver.name = name;
        return;
    }
}

function checkValidDriver(driver) {
    return driver && driver.name && driver.name !== "---"; // Driver && is there to prevent a null/undefined error - checks if driver variable exists
}

function checkSelection() {
const driverSelect = document.getElementById("driverSelect");
const driverInput = document.getElementById("driverInput");
const confirmButton = document.getElementById("confirmDriverButton");
const resetButton = document.getElementById("resetDriverButton");

if (driverSelect && driverInput && confirmButton && resetButton) {
    if (driverSelect.className === "none" || !driverSelect.value || driverSelect.value === 0) {
        driverInput.disabled = true;
        confirmButton.disabled = true;
        resetButton.disabled = true;
    } else {
        driverInput.disabled = false;
        confirmButton.disabled = false;
        resetButton.disabled = false;
    }
}
}

function updateUI() {
    populateDropdown();
    initializeRoster();
    updateCurrentRosterUI();
    updateSessionUI();
    sessionsCheckForButtons(sessions);
}

function sessionsCheckForButtons(sessions) {
    const removeButtons = document.querySelectorAll('.sessionRemoveButton');
    
    if (raceInProgress === true) {
        removeButtons.disabled = true;
    } else {
        removeButtons.disabled = false;
    }
}

const submitButton = document.getElementById("submitButton");
submitButton.disabled = true; // This is to ensure new data cannot be sent before connection with server has been established and successful