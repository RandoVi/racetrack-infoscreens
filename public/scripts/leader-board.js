import { parseTime } from './timer.js';
import socket from './socket.js';

class Session {
    constructor(id, roster) {
        this.id = id;
        this.roster = roster;
    }
}
if (socket.connected) {                         // On first load after restart
  socket.emit('initialFlagStatus-request'); 
  socket.emit("leaderboard-data-request");    
} else {   
  socket.on('connect', () => {
        socket.emit('initialFlagStatus-request');
        socket.emit("leaderboard-data-request");
  });
}let currentActiveData = null;
socket.on("from-server-leaderboard-data-response", serverActiveData => {
    console.log('Server Leaderboard Data:', serverActiveData);
    currentActiveData = serverActiveData;
    updateLeaderboard(currentActiveData);
});

const boardContainer = document.getElementById('board-container');

// Leaderboard table
const leaderboardTable = document.createElement('table');
leaderboardTable.classList.add('leaderboard-table');

// Header row.
const tableHeader = document.createElement('thead');
tableHeader.innerHTML = `
    <tr>
        <th>Position</th>
        <th>Driver</th>
        <th>ID</th>
        <th>Fastest Lap</th>
        <th>Current Lap</th>
        <th>Time Difference</th>
    </tr>
`;
leaderboardTable.appendChild(tableHeader);

const tableBody = document.createElement('tbody');
leaderboardTable.appendChild(tableBody);
boardContainer.appendChild(leaderboardTable);



// Message on race end
socket.on('server-current-race-has-ended', () => {
    boardContainer.innerHTML = `<p id="race-ended-message">Current race has ended, waiting for next race.</p>`;
});

export function sortLeaderboardByFastestLap(drivers) {
    return [...drivers].sort((a, b) => { // [...drivers] creates a shallow copy, keeping the original roster unchanged
        const timeA = a.fastestLap;
        const timeB = b.fastestLap;

        if (timeA === "---" && timeB === "---") return 0; // 0 indicates order does not matter
        if (timeA === "---") return 1;  // 1 indicates a should come after b   [ a > b ]
        if (timeB === "---") return -1; // -1 indicates a should come before b [ a < b ]
        return parseTime(timeA) - parseTime(timeB);
    });
}

export function updateLeaderboard(nextSession) {
    if (!nextSession || nextSession.length === 0) {
        boardContainer.innerHTML = '<p>No drivers available</p>';
        return;
    }

    const sortedDrivers = sortLeaderboardByFastestLap(nextSession.roster);
    boardContainer.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'leaderboard-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Position</th>
            <th>Driver</th>
            <th>ID</th>
            <th>Fastest Lap</th>
            <th>Lap Count</th>
            <th>Time Difference</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    sortedDrivers.forEach((driver, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td><span style="color: white;">${index + 1}</span></td>
            <td><span style="color: white;">${driver.name}</span></td>
            <td><span style="color: white;">${driver.id}</span></td>
            <td><span style="color: white;">${driver.fastestLap || 'N/A'}</span></td>
            <td><span style="color: white;">${driver.lapCount || 'WARM-UP'}</span></td>
            <td style="color: ${driver.timeDifference > 0 ? 'red' : 'green'};">
                ${driver.timeDifference || 'N/A'}
            </td>
        `;

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    boardContainer.appendChild(table);

    const currentLeaderboard = new Session(nextSession.id, sortedDrivers);
    socket.emit("leaderboard-data-update", currentLeaderboard);
}

const flagDisplay = document.getElementById('flagDisplay');

socket.on('from-server-raceMode-flag-response', (color) => {
    console.log("Here is leaderboard current active race data on flag change: ");
    console.log(currentActiveData);
    flagDisplay.className = ''; // Clear previous classes
    switch (color) {
        case 'green':
            flagDisplay.style.backgroundColor = 'green';
            break;
        case 'yellow':
            flagDisplay.style.backgroundColor = 'yellow';
            break;
        case 'red':
            flagDisplay.style.backgroundColor = 'red';
            break;
        case 'finish':
            flagDisplay.classList.add('finish'); // Add 'finish' class, this will then be used in css to add a picture as a background for the flag
            break;
        default:
            flagDisplay.style.backgroundColor = 'lightgray';
    }
});



