import socket from './socket.js';
const raceTimer = document.getElementById('raceTimer');
const countdownTimer = document.getElementById('countdownTimer');

//--------------------------------- Initializing variables to hold values
let timeInMilliseconds = 0;
let isDevMode = false;
let targetTimeMilliseconds = 0;
let raceInProgress = false;
let finishFlagEmitted = false;
//---------------------------------TIMER

socket.on('connect', () => {
console.log('Timer connected to Socket.IO server');
socket.emit('is-race-in-progress-check');
})

export function parseTime(timeString) {
    const [minutes, seconds, milliseconds] = timeString.split(':').map(Number);
    return (minutes*60*1000) + (seconds * 1000) + milliseconds;
}

function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / (60 * 1000));
    milliseconds %= (60 * 1000);
    const seconds = Math.floor(milliseconds / 1000);
    milliseconds %= 1000;
    const centiseconds = Math.round((milliseconds / 10) % 100);
    
    // Format to MM:ss:SS
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;
  }

function update() {
    updateRaceTimer();
    updateCountdown();
}

function updateRaceTimer() {

    const formattedTime = formatTime(timeInMilliseconds);
    if (raceTimer) { // Check if timer element exists
        if (raceInProgress) {
            raceTimer.textContent = formattedTime;
            if (isDevMode === true) {
                targetTimeMilliseconds = 1 * 60 * 1000;
                if (timeInMilliseconds >= targetTimeMilliseconds) {
                    countdownTimer.style.color = 'red';
                    if (!finishFlagEmitted) {
                        socket.emit('timer-ended-finish');
                        finishFlagEmitted = true;
                    }
                } else {
                    countdownTimer.style.color = 'white';
                }
            } else {
                targetTimeMilliseconds = 10 * 60 * 1000;
                if (timeInMilliseconds >= targetTimeMilliseconds) {
                    countdownTimer.style.color = 'red';
                    if (!finishFlagEmitted) {
                        socket.emit('timer-ended-finish');
                        finishFlagEmitted = true;
                    }
                } else {
                    countdownTimer.style.color = 'white';
                }
            }
        } else {

            raceTimer.textContent = "00:00:00"; // Set raceTimer to default when race is not in progress
        }
    }
}

function updateCountdown() {
    if (countdownTimer) {
        if (raceInProgress) {
            const remainingTime = targetTimeMilliseconds - timeInMilliseconds;
            countdownTimer.style.color = 'white';
            if (remainingTime <= 0) {
                countdownTimer.textContent = "00:00:00";
            } else {
                countdownTimer.textContent = formatTime(remainingTime);
            }
        } else {
            countdownTimer.style.color = 'white';
            countdownTimer.textContent = "00:00:00"; 
        }

    }
}
socket.on('from-server-race-started', () => {
    raceInProgress = true;
    finishFlagEmitted = false;
})

socket.on('server-current-race-has-ended', () => {
    raceInProgress = false;
    targetTimeMilliseconds = 0;
    timeInMilliseconds = 0;
    update();
});

socket.on('timerUpdate', (time) => {
    //console.log('Received timer update: ', time)
    timeInMilliseconds = time;
    update();
});

socket.on('stopTimer', () => {
    console.log('timer stopped')
    update();
});

socket.on('resetTimer', () => {
    console.log('Timer reset')
    timeInMilliseconds = 0;
    raceInProgress = false;
    update();
});

socket.on('restore-race-timer', (startTime) => {
    const currentTime = Date.now();
    const calculatedTime = currentTime - startTime;
    console.log('Restored race time: ' + calculatedTime + 'ms');
    timeInMilliseconds = calculatedTime;
    raceInProgress = true; // Ensure the race is marked as in progress
    update();
});

socket.on('dev-mode-has-been-enabled', () => {
    isDevMode = true;
})
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