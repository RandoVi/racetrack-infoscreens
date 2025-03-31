require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { loadData, saveData, initializeDatabase } = require('./dataStore');
const app = express();

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000"], // Replace with your client's origin
        methods: ["GET", "POST"], // Allowed HTTP methods
        credentials: true, // Allow credentials (if needed)
    },
});

const args = process.argv.slice(2); // Get arguments after "node server.js"
const isDevMode = args.includes('--serverMode') && args.includes('developer'); // If these are present, isDevMode === true, else it is false

const KEYS = {
    receptionist: process.env.RECEPTIONIST_KEY,
    observer: process.env.OBSERVER_KEY,
    safety: process.env.SAFETY_KEY,
};

const runtimeKeys = {}; // Store runtime keys in memory

function validateEnvKeys(KEYS) {
    for (const key in KEYS) {
        if (!KEYS[key]) {
            console.error(`Error: Missing or empty environment variable: ${key}`);
            return false;
        }
    }
    return true;
}

console.log(KEYS);


function ensureAuthenticated(req, res, next) {
    const key = req.query.key; // Extract the runtime key
    console.log('Received key:', key);
    console.log('Runtime keys:', runtimeKeys);

    if (!key || !runtimeKeys[key]) {
        return res.status(403).send('Access denied. Please login.');
    }

    // Role-based access control, so that one key can't be used to access other routes.
    const userRole = runtimeKeys[key].role;
    const routeRoles = {
        "/front-desk.html": "receptionist",
        "/lap-line-tracker.html": "observer",
        "/race-control.html": "safety"
    };

    if (routeRoles[req.path] !== userRole) {
        return res.status(403).send('Access denied. You do not have permission for this page.');
    }

    next();
}

const protectedRoutes = ["/front-desk.html", "/race-control.html", "/lap-line-tracker.html"];

protectedRoutes.forEach(route => {
    app.get(route, ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, `../public${route}`));
    });
});

// Serve static files (after the protection middleware)
app.use(express.static(path.join(__dirname, "../public")));

//-------------------------------------------------------------------------------
let raceData;
let timeInMilliseconds = 0;
let timerInterval = null;
let isNewSessionAvailable = false; // Track session availability

initializeApp();

// ------------------------------------------------------------------------------- Handle Socket.IO connections
function startServer() {
    io.on('connection', (socket) => {
        if (isDevMode) {
            console.log('Running in development mode');
            io.emit("dev-mode-has-been-enabled");
        } else {
            console.log('Running in production mode');
        }
        console.log('A user connected:', socket.id);

        //----login
        socket.on('login-attempt', (data) => {
            const { key, role } = data;
            console.log('Login attempt received:', { key, role });

            if (role === 'receptionist' && key === KEYS.receptionist) {
                runtimeKeys[key] = { role };
                socket.emit('login-response', { success: true, redirect: '/front-desk.html', key });
            } else if (role === 'observer' && key === KEYS.observer) {
                runtimeKeys[key] = { role };
                socket.emit('login-response', { success: true, redirect: '/lap-line-tracker.html', key });
            } else if (role === 'safety' && key === KEYS.safety) {
                runtimeKeys[key] = { role };
                socket.emit('login-response', { success: true, redirect: '/race-control.html', key });
            } else {
                socket.emit('login-response', { success: false, message: 'Invalid key or role' });
            }
        });

        socket.on('request-access', (data) => {
            const { key, path } = data;
            console.log(`Access request for ${path} with key:`, key);
            
            if (!key || !runtimeKeys[key]) {
                socket.emit('access-denied', { message: 'Access denied. Please login.' });
                return;
            }
    
            const userRole = runtimeKeys[key].role;
            const routeRoles = {
                "/front-desk.html": "receptionist",
                "/lap-line-tracker.html": "observer",
                "/race-control.html": "safety"
            };
    
            if (routeRoles[path] !== userRole) {
                socket.emit('access-denied', { message: 'Access denied. You do not have permission for this page.' });
                return;
            }
    
            // Send the file path to the client if authorized
            socket.emit('access-granted', { file: path });
        });

    // -------------------------------------------------------------------------------  On page load
        socket.on('onload-sessions-request', () => {
            socket.emit('current-sessions-emit', raceData.upcomingSessions);
        });
        socket.on('current-session-request', () => {
            io.emit('current-session-server-data', raceData.activeRaceData);
        });
        socket.on('next-session-request', () => {
            io.emit('next-session-server-data', raceData.nextSession);
        });
        socket.on('upcoming-sessions-number-request', () => {
            io.emit('upcoming-sessions-number-server-data', raceData.upcomingSessionsNumber);
        });
        socket.on('leaderboard-data-request', () => {
            io.emit('from-server-leaderboard-data-response', raceData.activeRaceData);
        });
        socket.on('is-race-in-progress-check', () => {
            if (raceData.buttons.raceInProgress === true) {
                io.emit('from-server-race-started');
            }
        });
        socket.on('is-race-in-progress-check-for-next-race', () => {
            if (raceData.buttons.sessionStarted) {
                io.emit('race-session-active');
            }else if (!raceData.buttons.sessionStarted && raceData.upcomingSessionsNumber === 0) {
                io.emit('no-race-no-upcoming-sessions');
            }else if (!raceData.buttons.sessionStarted && raceData.upcomingSessionsNumber > 0) {
                io.emit('no-race-got-upcoming-sessions');
            }
        });
        socket.on('raceMode-flag-request', () => {
            io.emit('from-server-raceMode-flag-response', raceData.buttons.flag);
        });

    //--------------------------------------------------------------------------------SESSIONS
        // Listen for custom events from the client

        // New session starts
    socket.on('new-session-request', () => {
        if (raceData.upcomingSessionsNumber > 0) {
        raceData.upcomingSessionsNumber -= 1;
        saveRaceData(raceData); // Save the updated number
        }
        io.emit('upcoming-sessions-number-server-data', raceData.upcomingSessionsNumber);
        processNewSession();
        io.emit("server-all-sessions-update-response", raceData.upcomingSessions);
        io.emit('new-session-acknowledged', raceData);
    })

        // Data to lap-line-observer to build for leader-board information for observer, safety official and guest leader-board
        
    socket.on('next-session-update-request', session => {
        if (session) {
            raceData.nextSession = session;
            saveRaceData(raceData);
            io.emit('next-session-server-data', raceData.nextSession)

        } else {
            raceData.nextSession = null;
            saveRaceData(raceData);
            io.emit('next-session-server-data', null )
            console.error('Failed to retrieve next session @server 162:');
        }
    });

    socket.on('initialButtonStatus-request', () => {
            io.emit('initialButtonStatus-response', raceData.buttons.raceInProgress)
    });

    socket.on('upcoming-sessions-number-update-request', sessionCount => {
        raceData.upcomingSessionsNumber = sessionCount;
        saveRaceData(raceData);
        io.emit('upcoming-sessions-number-server-data', raceData.upcomingSessionsNumber);
    });

    socket.on("all-sessions-update-request", sessions => {
        raceData.upcomingSessions = sessions;
        io.emit("server-all-session-update-response", raceData.upcomingSessions)
        determineNewSessionAvailability();
        io.emit('new-session-available', isNewSessionAvailable);
    })

    socket.on("activeRaceData-Update", updatedRace => {
        raceData.activeRaceData = updatedRace;
        saveRaceData(raceData);
        io.emit("from-server-leaderboard-data-response", raceData.activeRaceData);
    })

    socket.on("leaderboard-data-request", () => {
        io.emit("from-server-leaderboard-data-response", raceData.activeRaceData);
    })

    //-------------------------------------------------------------------------------- DATA TRANSFER
    socket.on('rosterIndex-initializer', () => {
        io.emit('rosterIndex-initializer-answer', raceData.rosterIndex);
    });
    socket.on('rosterIndex-update-request', (socketrosterIndex) => {
        raceData.rosterIndex = socketrosterIndex;
        saveRaceData(raceData);
        io.emit("rosterIndex-update-response", raceData.rosterIndex);
    });

    socket.on('currentRaceData-update', clientUpdate => {
        if (clientUpdate) {
            if (Object.keys(raceData).length === 0) { // Check if raceData is empty
                raceData.buttons = clientUpdate;
                saveRaceData(raceData);
            } else {
                Object.keys(clientUpdate).forEach(key => {
                if (raceData.buttons && raceData.buttons.hasOwnProperty(key) && clientUpdate[key] !== null && clientUpdate[key] !== undefined) {
                    raceData.buttons[key] = clientUpdate[key]; // Only matching keys that are not null or undefined
                }
                });
                saveRaceData(raceData);
                io.emit('from-server-raceMode-flag-response', raceData.buttons.flag); // Sending flag updates to each page when new data is saved
                io.emit("from-server-new-laptimes", raceData.activeRaceData);
                io.emit("from-server-leaderboard-data-response", raceData.activeRaceData);
            }
        } else {
            console.log("Race Status update failed");
        }
        io.emit("from-server-new-laptimes", raceData.activeRaceData);
    });

    socket.on('initialRaceStatus-request', () => {
        socket.emit('initialRaceStatus-response', raceData );
        })

    socket.on('new-session-available-request', () => {
        determineNewSessionAvailability()
        socket.emit('new-session-available', isNewSessionAvailable); // Respond to the specific client
        });
    //-------------------------------------------------------------------------------- DISPLAY ELEMENTS
    socket.on('race-is-safe-to-start', () => {
        io.emit('next-session-server-data', raceData.nextSession); // For next-race, the very next race in the list
    })
    socket.on("race-started", () => {
        io.emit("from-server-race-started");
    })
    
    socket.on('raceEnded', () => {
        raceData.activeRaceData = null;
        determineNewSessionAvailability();
        io.emit('server-current-race-has-ended');
         io.emit('from-server-leaderboard-data-response', raceData.activeRaceData);
        socket.emit('new-session-available', isNewSessionAvailable);
    })
    socket.on('timer-ended-finish', () => {
        io.emit('server-timer-ended-finish-flag');
        io.emit('finish-mode');
        raceData.buttons.flag = "finish";
        saveRaceData(raceData);
        io.emit('from-server-raceMode-flag-response', raceData.buttons.flag);
    });
    //--------------------------TIMER
    //Runs after restart if conditions are true, meaning that race is ongoing.
    if (raceData.sessionStartTime && typeof raceData.sessionStartTime === 'number' && raceData.buttons.raceInProgress === true) {
        console.log('Emitting race start time:', raceData.sessionStartTime);
        socket.emit('restore-race-timer', raceData.sessionStartTime);
        timeInMilliseconds = Date.now() - raceData.sessionStartTime;
        if (!timerInterval) {
            timerInterval = setInterval(() => {
                timeInMilliseconds += 10;
                io.emit('timerUpdate', timeInMilliseconds);
            }, 10);
        }
    }
    socket.emit('timerUpdate', timeInMilliseconds);

        //Start timer event from the safety official
    socket.on('startTimer', (sessionStartTime) => {
        raceData.sessionStartTime = sessionStartTime;
        saveRaceData(raceData);
        if (!timerInterval) {
            console.log('Timer started');
            timerInterval = setInterval(() => {
                timeInMilliseconds += 10;
                io.emit('timerUpdate', timeInMilliseconds);
            }, 10);
        }
    });

    socket.on('stopTimer', () => {
        raceData.sessionStartTime = null;
        saveRaceData(raceData);
        if (timerInterval) {
            console.log('Timer stopped');
            clearInterval(timerInterval);
            timerInterval = null;
        }
    });

    socket.on('resetTimer', () => {
        console.log('Timer reset');
        clearInterval(timerInterval);
        timerInterval = null;
        timeInMilliseconds = 0;
        io.emit('timerUpdate', timeInMilliseconds);
    });
    //--------------------------------FLAGS
    socket.on('mode-change-to-finish', () => {
        console.log('Race mode changed to "FINISH"');
        io.emit('finish-mode');
        io.emit('stopTimer');
    });

    socket.on('mode-change', (color) => {
        console.log('Race mode changed to: '+ color );
        io.emit('changed-mode', color);
    });

    socket.on('initialFlagStatus-request', () => {
        io.emit('from-server-raceMode-flag-response', raceData.buttons.flag);
    });
    //--------------------------------
        // Handle disconnection
    socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
    });
    })
    // Start the server
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
///////////////////////////////////////////////////////////////////////////// HELPER FUNCTIONS

function processNewSession() {
    if (raceData.upcomingSessions.length > 0) {
        raceData.activeRaceData = raceData.upcomingSessions[0];
        raceData.nextSession = raceData.upcomingSessions[1] || null;
        raceData.upcomingSessions.shift();
        raceData.upcomingSessionsNumber = raceData.upcomingSessions.length;
        saveRaceData(raceData);
    } else {
        raceData.upcomingSessionsNumber = 0;
        saveRaceData(raceData);
    }
}

function determineNewSessionAvailability() {
    if (raceData.nextSession && raceData.upcomingSessionsNumber > 0) {
        isNewSessionAvailable = true;
    } else {
        isNewSessionAvailable = false;
    }
    io.emit('new-session-available', isNewSessionAvailable); // Emit to all connected clients
}

function initializeApp() { 
    if (validateEnvKeys(KEYS)) {
        initializeDatabase(() => {
            console.log('Database initialized');
            loadData((loadedData) => {
                raceData = loadedData;
                startServer();
            });
        });
    } else {
        console.error("Server launch aborted due to missing environment variables.");
        process.exit(1);
    }
}

//the callbacks are wrapped inside saveRaceData function
//Asynchronous opetarions
function saveRaceData(data) {
    saveData(data, (err) => {
        if (err) {
            console.error("Failed to save race data:", err);
        } else {
            console.log("Race data saved successfully!");
        }
    });
}

