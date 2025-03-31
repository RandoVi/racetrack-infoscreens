import socket from './socket.js';
import { updateLeaderboard } from './leader-board.js';
const lapButtons = document.querySelector(".lapButtons");
const raceTimer = document.getElementById("raceTimer");
const sessionContainer = document.getElementById('board-container');
let sessionStarted = false;
let flagElement = document.getElementById("currentMode");
let flagLabels = {
  "green": "SAFE",
  "yellow": "HAZARD",
  "red": "DANGER", // Lookup object to use only valid data
  "finish": "FINISH"
};

if (socket.connected) {
    socket.emit('initialButtonStatus-request');
    socket.emit("current-session-request"); // Check if server has data
    socket.emit('raceMode-flag-request');
} else {
    socket.on('connect', () => {
        socket.emit('initialButtonStatus-request');
        socket.emit("current-session-request"); // Check if server has data
        socket.emit('raceMode-flag-request');
});
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed, generating buttons");

    lapButtons.textContent = "";
    sessionContainer.textContent = "";

    // Handle the server data with a callback
    handleServerSessionData(serverCurrentSession => {
        if (serverCurrentSession) {
            updateLeaderboard(serverCurrentSession);
            generateButtons(serverCurrentSession.roster, serverCurrentSession);
        } else {
            lapButtons.textContent = "No driver data available - buttons will appear once data is received.";
            sessionContainer.textContent = "---";
        }
        });
});

function handleServerSessionData(callback) {
    const handler = (serverCurrentSession) => {
        callback(serverCurrentSession);
    };

    socket.once('current-session-server-data', handler);
}

socket.on("from-server-new-laptimes", serverCurrentSession => {
    console.log("Received new times from server - updating leaderboard and buttons");

    if (!serverCurrentSession || !serverCurrentSession.roster || !Array.isArray(serverCurrentSession.roster)) {
        console.warn("Invalid session data received. Skipping update.");
        if (!serverCurrentSession) {
            console.warn("serverCurrentSession is null or undefined");
        } else if (!serverCurrentSession.roster) {
            console.warn("serverCurrentSession.roster is null or undefined");
        } else if (!Array.isArray(serverCurrentSession.roster)) {
            console.warn("serverCurrentSession.roster is not an array");
        }
        updateLeaderboard({ roster: [] }); // Update with an empty roster
        generateButtons([], {}); // Update with empty roster and session data
        return;
    }
    updateLeaderboard(serverCurrentSession);
    generateButtons(serverCurrentSession.roster, serverCurrentSession);
});

socket.on('server-current-race-has-ended', () => {
    lapButtons.innerHTML = ''; // Clear existing buttons
    sessionContainer.innerHTML = "";
    sessionContainer.textContent = "Current race has ended, waiting for next race"
})

socket.on('from-server-raceMode-flag-response', currentFlag => {
    flagElement.textContent = flagLabels[currentFlag] || "Unknown Flag";
})

socket.on('from-server-page-reload-request', () => {
    window.location.reload(); // Refresh the page
})

function updateDriverLapTime(driverId, roster, sessionData) {
    const driver = roster.find(d => d.id === driverId);
    if(driver) {
        if(driver.lapCount >= 1) {
            if (!raceTimer.textContent || !driver.previousLap) {
            console.error("Invalid race timer or lap time.");
            return;
        }
        const previousFastestLap = driver.fastestLap;
        const thisLapMs = parseTime(raceTimer.textContent) - parseTime(driver.previousLap);
        if (thisLapMs < 5000) {
            console.error("Lap time too fast (under 5 seconds)")
            return;
        }
        driver.previousLap = formatTime(parseTime(raceTimer.textContent));
        const thisLap = formatTime(thisLapMs);
        const fastestLapMs = parseTime(driver.fastestLap)

        if(thisLapMs < fastestLapMs || driver.fastestLap === "---") {
            driver.fastestLap = thisLap;
        }
        driver.currentLap = thisLap;

        const timeDiff = timeDifference(driver.currentLap, previousFastestLap);
        driver.timeDifference = timeDiff;

        }
        driver.lapCount ++;
        console.log(driver);

        updateLeaderboard(sessionData);
        socket.emit("activeRaceData-Update", sessionData )
    }
}

function generateButtons(roster, sessionData) {
    roster.sort((a, b) => {
        return a.id.localeCompare(b.id); // Compare the ids to sort the array
    })

    lapButtons.innerHTML = ''; // Clear existing buttons
    if (roster !== undefined) {
        for (let i = 0; i < roster.length; i++) {
        const driver = roster[i];
        const button = document.createElement('button');
        button.id = driver.id; // Use driver.id as button ID
        button.textContent = `${driver.id}`;

        button.addEventListener('click', () => {
            updateDriverLapTime(driver.id, roster, sessionData);
        });
        button.classList.add('big'); // Big size by default
        lapButtons.appendChild(button);
        }
    } else {
        lapButtons.textContent = "No driver data available - buttons will appear once data is received.";
        sessionContainer.textContent = "---";
        console.log("No roster to generate buttons from in lap-line-tracker, skipping.")
    }

}

function updateButtonStates() {
    lapButtons.querySelectorAll("button").forEach(button => {
    button.disabled = !sessionStarted;
});
}

const toggleLeaderboardButton = document.getElementById('toggleLeaderboard');
const leaderboardContainer = document.getElementById('board-container');
const lapButtonsContainer = document.querySelector('.lapButtons');

let isLeaderboardVisible = false; // Track leaderboard visibility
leaderboardContainer.style.display = 'none'; 
toggleLeaderboardButton.textContent = 'Show Leaderboard'; // Default state, show big buttons and have the option to view leaderboard


toggleLeaderboardButton.addEventListener('click', () => {
    if (isLeaderboardVisible) {
        leaderboardContainer.style.display = 'none';
        toggleLeaderboardButton.textContent = 'Show Leaderboard';
        makeLapButtonsBig();
    } else {
        leaderboardContainer.style.display = 'block';
        toggleLeaderboardButton.textContent = 'Hide Leaderboard';
        makeLapButtonsSmall();
    }
    isLeaderboardVisible = !isLeaderboardVisible;
});

function makeLapButtonsBig() {
    lapButtonsContainer.querySelectorAll('button').forEach(button => {
        button.classList.remove('small');
        button.classList.add('big');
    });
}

function makeLapButtonsSmall() {
    lapButtonsContainer.querySelectorAll('button').forEach(button => {
        button.classList.remove('big');
        button.classList.add('small');
    });
}

socket.on('initialButtonStatus-response', (sessionStatus) => {
    console.log(sessionStatus)
    sessionStarted = sessionStatus;
    updateButtonStates();
});


//functions from timer.js, should be imported instead?
function timeDifference(time1, time2) {
    const timeMs1 = parseTime(time1);
    const timeMs2 = parseTime(time2);

    const diffInMs = timeMs1 - timeMs2;

    return formatTime(diffInMs);
}

function parseTime(timeString) {
    if (!timeString || typeof timeString !== 'string' || timeString === "---") {
        return null;
    }

    const [minutes, seconds, centiseconds] = timeString.split(':').map(Number);
    if (isNaN(minutes) || isNaN(seconds) || isNaN(centiseconds)) {
        console.error("Invalid time format:", timeString);
        return null;
    }

    return (minutes * 60 * 1000) + (seconds * 1000) + (centiseconds * 10);
}

function formatTime(milliseconds) {
    console.log('here ',milliseconds)
    if (milliseconds === null) {
        return "---";
    }

    const isNegative = milliseconds < 0;
    let absMilliseconds = Math.abs(milliseconds); // Use absolute value for calculations

    const minutes = Math.floor(absMilliseconds / (60 * 1000));
    absMilliseconds %= (60 * 1000);
    const seconds = Math.floor(absMilliseconds / 1000);
    absMilliseconds %= 1000;
    const centiseconds = Math.floor((absMilliseconds / 10) % 100);

    // Format to MM:ss:SS
    let formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;

    if (isNegative) {
        formattedTime = "-" + formattedTime;
    }

    return formattedTime;
}

