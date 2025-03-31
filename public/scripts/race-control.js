import socket from './socket.js';
import { FlagAnimation } from './race-flags.js';

const canvas = document.getElementById('canvasS');
const ctx = canvas.getContext('2d');
 canvas.width = window.innerWidth/4;
 canvas.height = window.innerHeight/4;

const flagAnimation = new FlagAnimation(canvas, canvas.width, canvas.height, 0.25, ctx);
let flagElement = document.getElementById("currentMode");
let flagLabels = {
  "green": "SAFE",
  "yellow": "HAZARD",
  "red": "DANGER", // Lookup object to use only valid data
  "finish": "FINISH"
};


window.addEventListener('resize', () => {
  console.log("Window resized");
  flagAnimation.resizeCanvas();
});
let sessionsNumber = 0;
let dataLoaded = false;
let raceDataReady = false;


let currentRaceData = {
    buttons: {
        flag: 'red',
        safeButton: false,
        hazardButton: false,
        dangerButton: false,
        finishButton: false,
        newSessionButton: false,
        startRaceButton: false,
        endSessionButton: false,
        sessionStarted: false,
        raceInProgress: false,
        isSessionFinished: false
    },
    activeRaceData: null,
    rosterIndex: 1,
    nextSession: null,
    upcomingSessions: [],
    upcomingSessionsNumber: 0,
    sessionStartTime: null,
};
let currentRaceButtons = currentRaceData.buttons;

// This is the heart of the callback, it only starts working once connection is established, ensuring data can be received asynchronously.
if (socket.connected) {
  requestInitialData();
} else {
  socket.on('connect', () => {
    console.log("Requesting Initial data from server")
    requestInitialData();
  });
}



function requestInitialData() {
  socket.emit('initialRaceStatus-request');
  socket.emit("upcoming-sessions-number-request");
  socket.emit('new-session-available-request'); 
  socket.emit('raceMode-flag-request');
  console.log("New session availability has been requested");

  socket.once('initialRaceStatus-response', serverData => {
    dataLoaded = true; // Set the flag to enable further operations
    console.log("Data after receiving it from the server: ")
    console.dir(serverData)
    updateRaceStatus(serverData);
    raceDataReady = true;
    updateUI();
  });
}

socket.on('upcoming-sessions-number-server-data', upcomingSessionsNumber => {
    if (upcomingSessionsNumber !== null) {
        sessionsNumber = upcomingSessionsNumber;
        updateUI();
    } else {
      console.log("Failed to receive upcomingSessionsnumber")
    }
    
  });
socket.on('next-session-update', nextSessionData => {
    currentRaceData.nextSession = nextSessionData;
});
socket.on('new-session-available', (isAvailable) => {
  if (currentRaceButtons.raceInProgress) {
    console.log("Race in progress, new session not available.");
    currentRaceButtons.newSessionButton = false;
  } else if (currentRaceButtons.flag === "Finish") {
    console.log("Race is in finished state, new session not available.");
    currentRaceButtons.newSessionButton = false;
  } else {
    currentRaceButtons.newSessionButton = isAvailable;
  }
    updateUI();
});

socket.on('new-session-acknowledged', serverData => {
    updateRaceStatus(serverData)
});

socket.on('from-server-page-reload-request', () => {
  window.location.reload();
});

socket.on('server-timer-ended-finish-flag',() => {
    if (currentRaceButtons.sessionStarted) {
    currentRaceButtons.flag = 'finish';
    flagAnimation.setFlag(currentRaceButtons.flag);
    currentRaceButtons.endSessionButton = true;
    currentRaceButtons.isSessionFinished = true;
    updateUI();
  }
});

socket.on('from-server-raceMode-flag-response', currentFlag => {
    flagElement.textContent = flagLabels[currentFlag] || "Unknown Flag";
    flagAnimation.resizeCanvas();
})

const safe = document.getElementById('safe');
const danger = document.getElementById('danger');
const hazard = document.getElementById('hazard');
const finish = document.getElementById('finish');

const newSessionBtn = document.getElementById('btnNewSession');
const startRaceBtn = document.getElementById('btnStartRace');
const endSessionBtn = document.getElementById('btnEndSession');

function updateUI() {
  if (!dataLoaded) {
      console.log("UI update skipped: Data not loaded yet.");
      return; // Exit if data is not loaded
  }
  if (currentRaceButtons.sessionStarted) {
    currentRaceButtons.newSessionButton = false;
  }
  flagAnimation.setFlag(currentRaceButtons.flag);
  updateButtonStates();
  updateCurrentModeDisplay();
  updateRaceDisplay(currentRaceData.activeRaceData);
  updateUpcomingSessionboard(sessionsNumber);

  if (!currentRaceButtons.sessionStarted) {
      document.getElementById("containerHeader").textContent = "No race in progress";
      document.getElementById('session-container').innerHTML = "";
  }
  socket.emit('currentRaceData-update', currentRaceButtons);
}

function updateButtonStates() {
  // Flag buttons logic
  const isSessionActive = currentRaceData.activeRaceData; // true or false
  const isSessionStarted = currentRaceButtons.sessionStarted;
  const isSessionFinished = currentRaceButtons.isSessionFinished;

  const flagButtonsEnabled = isSessionActive && !isSessionFinished; // Is there an active race data and session is not finished

  setButtonState('safe', flagButtonsEnabled, 'safeButton');
  setButtonState('hazard', flagButtonsEnabled, 'hazardButton');
  setButtonState('danger', flagButtonsEnabled, 'dangerButton');
  setButtonState('finish', flagButtonsEnabled && isSessionStarted, 'finishButton');


  setButtonState('btnNewSession', currentRaceButtons.newSessionButton, 'newSessionButton');
  setButtonState('btnStartRace', currentRaceButtons.startRaceButton, 'startRaceButton');
  setButtonState('btnEndSession', currentRaceButtons.endSessionButton, 'endSessionButton');
}

function setButtonState(buttonId, isEnabled, statusKey) {
  const button = document.getElementById(buttonId);
  if (isEnabled) {
    button.classList.remove('disabled');
    currentRaceButtons[statusKey] = true;
  } else {
    button.classList.add('disabled');
    currentRaceButtons[statusKey] = false;
  }
}

function updateCurrentModeDisplay() {
    const modeText = currentRaceButtons.flag === 'finish' ? 'FINISH' : currentRaceButtons.flag || 'RED';
    document.getElementById('currentMode').innerText = modeText;
}

function updateRaceStatus(newData) {
    currentRaceData = newData;
    console.log("New currentRaceData active race data is : " + currentRaceData.activeRaceData)
    currentRaceButtons = newData.buttons;
    updateUI();
}

function startNewSession() {
    currentRaceButtons.flag = 'red';
    currentRaceButtons.safeButton = true;
    currentRaceButtons.hazardButton = true;
    currentRaceButtons.dangerButton = true;
    currentRaceButtons.finishButton = false;
    currentRaceButtons.newSessionButton = false;
    currentRaceButtons.startRaceButton = false;
    currentRaceButtons.endSessionButton = false;
    currentRaceButtons.sessionStarted = true;
    updateUI();
    console.log(currentRaceData.activeRaceData);
    console.log("New session button has been clicked - sending request")
    socket.emit('new-session-request');
}

function handleSafeFlag() {

  if (!raceDataReady) {
      console.log("handleSafeFlag delayed: Data not ready.");
      return;
  }

  if (currentRaceData.activeRaceData && currentRaceButtons.raceInProgress === false) {
    currentRaceButtons.startRaceButton = true;
  }
  currentRaceButtons.sessionStarted = true;
  currentRaceButtons.flag = 'green';
  updateUI();
  socket.emit('mode-change', 'green');
  socket.emit('is-race-in-progress-check-for-next-race');
  socket.emit('race-is-safe-to-start');
}

function handleStartRace() {
  currentRaceButtons.sessionStarted = true;
  currentRaceButtons.startRaceButton = false;
  currentRaceButtons.finishButton = true;
  currentRaceButtons.newSessionButton = false;
  currentRaceButtons.startRaceButton = false;
  currentRaceButtons.raceInProgress = true;
  const sessionStartTime = Date.now();  // This should happen inside the server, but for now, it is fine
  socket.emit("race-started");
  console.log('starttime = '+ sessionStartTime);
  updateUI();
  socket.emit('startTimer', sessionStartTime);
}

function handleFinish() {
  if (currentRaceButtons.sessionStarted) {
    console.log("Finish button clicked!");
    currentRaceButtons.flag = 'finish';
    currentRaceButtons.endSessionButton = true;
    currentRaceButtons.isSessionFinished = true;
    currentRaceButtons.startRaceButton = false;
    updateUI();
    socket.emit('stopTimer');
    socket.emit('mode-change-to-finish');
  }
}

function handleEndSession() {
  currentRaceButtons.flag = 'red';
  currentRaceButtons.newSessionButton = sessionsNumber > 0;
  currentRaceButtons.endSessionButton = false;
  currentRaceButtons.sessionStarted = false;
  currentRaceData.activeRaceData = null;
  currentRaceButtons.raceInProgress = false;
  currentRaceButtons.isSessionFinished = false;
  updateUI();
  socket.emit('resetTimer');
  socket.emit('raceEnded');
  socket.emit('next-session-request');
}

hazard.addEventListener('click', function() {

  currentRaceButtons.startRaceButton = false;

  currentRaceButtons.flag = 'yellow';
  updateUI();
  socket.emit('mode-change', 'yellow');
});

danger.addEventListener('click', function() {
  currentRaceButtons.startRaceButton = false;
  currentRaceButtons.flag = 'red';
  updateUI();
  socket.emit('mode-change', 'red');
});

newSessionBtn.addEventListener('click', () => {
  startNewSession();
});
safe.addEventListener('click', handleSafeFlag);
startRaceBtn.addEventListener('click', handleStartRace);
finish.addEventListener('click', handleFinish);
endSessionBtn.addEventListener('click', handleEndSession);

function updateRaceDisplay(currentSession) {
  const sessionContainer = document.getElementById('session-container');
  if (!currentSession || Object.keys(currentSession).length === 0) {
    sessionContainer.innerHTML = "";
    sessionContainer.textContent = 'No drivers available';
    return;
  }
  sessionContainer.innerHTML = '';

  const label = document.getElementById("containerHeader");
  label.textContent = "Race in progress: " + currentSession.id;
  createDriverList(currentSession.roster);
}

function updateUpcomingSessionboard(upcomingSessionNumber) {
  const upcomingSessionContainer = document.getElementById('upcoming-session-container');
  upcomingSessionContainer.textContent = upcomingSessionNumber;
}

function createDriverList(drivers) {
  const sessionContainer = document.getElementById('session-container');
  if (!sessionContainer) {
    console.error("Session container element not found.");
    return;
  }

  if (!drivers || !Array.isArray(drivers)) {
    console.error("Drivers is undefined or not an array.");
    sessionContainer.innerHTML = "<p>No drivers available.</p>";
    return;
  }

  const sortedDrivers = drivers.sort((a, b) => a.id - b.id);

  const driverList = document.createElement('ul');

  sortedDrivers.forEach(driver => {
    const driverItem = document.createElement('li');
    driverItem.textContent = `${driver.name} (ID: ${driver.id})`;
    driverList.appendChild(driverItem);
  });

  sessionContainer.appendChild(driverList);
}