import socket from './socket.js';
const driverListContainer = document.getElementById('driverList');
const messageContainer = document.getElementById('message');

if (socket.connected) {
    requestInitialData();
  } else {
    socket.on('connect', () => {
      console.log("Requesting Initial data from server")
      requestInitialData();
    });
  }

function requestInitialData() {
    socket.emit('is-race-in-progress-check-for-next-race');
    console.log("Requesting Initial data from server 2")
    socket.emit('next-session-request');
}

function displayDrivers(drivers) {
    driverListContainer.innerHTML = ''; // Clear previous list

    if (!Array.isArray(drivers) || drivers.length === 0) {
        driverListContainer.textContent = 'No race has been planned yet, please wait for further instructions.';
        return;
    }

    const list = document.createElement('ul');
    drivers.forEach((driver, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${index}. `+ driver.name + ` --- ` + driver.id; // Assuming driver objects have a 'name' property
        list.appendChild(listItem);
    });

    driverListContainer.appendChild(list);
}

let drivers;

socket.emit('next-session-request');
socket.on('next-session-server-data', nextSession => {
    if (nextSession !== null) {
    drivers = nextSession;
    displayDrivers(drivers.roster);
    } else {
        drivers = [];
        displayDrivers(drivers);
    }
});

socket.on('no-race-no-upcoming-sessions', () => {
    messageContainer.textContent = '';
    displayDrivers(drivers);
});

socket.on('no-race-got-upcoming-sessions', () => {
messageContainer.textContent = 'Drivers - proceed to the paddock.';
displayDrivers(drivers);
});

socket.on("race-session-active", () => {
console.log("Requesting Initial data from server B")
messageContainer.textContent = "";
socket.emit('next-session-request');
displayDrivers(drivers);
});

driverListContainer.innerHTML = "";

//-------------------------------------Full screen button
const fullScreenButton = document.getElementById("fullScreen");
if (fullScreenButton) {
    fullScreenButton.addEventListener("click", function () {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) { // Firefox
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
            document.documentElement.msRequestFullscreen();
        }
    });

        // Hides FULLSCREEN button on change.
        document.addEventListener("fullscreenchange", function () {
            if (document.fullscreenElement) {
                fullScreenButton.style.display = "none";
            } else {
                fullScreenButton.style.display = "block";
            }
        });
    
        document.addEventListener("webkitfullscreenchange", function () {
            if (document.webkitFullscreenElement) {
                fullScreenButton.style.display = "none";
            } else {
                fullScreenButton.style.display = "block";
            }
        });
    
        document.addEventListener("mozfullscreenchange", function () {
            if (document.mozFullScreenElement) {
                fullScreenButton.style.display = "none";
            } else {
                fullScreenButton.style.display = "block";
            }
        });
    
        document.addEventListener("MSFullscreenChange", function () {
            if (document.msFullscreenElement) {
                fullScreenButton.style.display = "none";
            } else {
                fullScreenButton.style.display = "block";
            }
        });
}
