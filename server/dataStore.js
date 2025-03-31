const sqlite3 = require('sqlite3').verbose(); //SQLite3 library with verbose mode for detailed error logging
const path = require('path'); //Imported path module to handle file paths

const dbPath = path.join(__dirname, 'race_data.db');
const db = new sqlite3.Database(dbPath); //Creates connection to sqlite database(db)

const defaultData = {
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
//Default db structure, used when db itself is empty or fails to load


function saveData(data, callback) {

     //Destructured data object to extract individual properties of raceData object
    const { buttons, activeRaceData, rosterIndex, nextSession, upcomingSessions, upcomingSessionsNumber, sessionStartTime } = data;
    // Serialized database operations, to make sure that they run in sequence
    db.serialize(() => {
        db.run(`UPDATE buttons SET 
            flag = ?, 
            safeButton = ?, 
            hazardButton = ?, 
            dangerButton = ?, 
            finishButton = ?, 
            newSessionButton = ?, 
            startRaceButton = ?, 
            endSessionButton = ?, 
            sessionStarted = ?, 
            raceInProgress = ?, 
            isSessionFinished = ? 
            WHERE id = 1`,
            [//boolean values are converted to 0/1(not actually needed but good practice to be explicit)
                buttons.flag,
                buttons.safeButton ? 1 : 0,
                buttons.hazardButton ? 1 : 0,
                buttons.dangerButton ? 1 : 0,
                buttons.finishButton ? 1 : 0,
                buttons.newSessionButton ? 1 : 0,
                buttons.startRaceButton ? 1 : 0,
                buttons.endSessionButton ? 1 : 0,
                buttons.sessionStarted ? 1 : 0,
                buttons.raceInProgress ? 1 : 0,
                buttons.isSessionFinished ? 1 : 0
            ],
            (err) => {
                if (err) {
                    console.error('Error updating buttons:', err);
                    if (callback) callback(err);
                    return;
                }
                db.run(`UPDATE sessions SET 
                    activeRaceData = ?, 
                    rosterIndex = ?, 
                    nextSession = ?, 
                    upcomingSessions = ?, 
                    upcomingSessionsNumber = ?, 
                    sessionStartTime = ? 
                    WHERE id = 1`,
                    [JSON.stringify(activeRaceData), rosterIndex, JSON.stringify(nextSession), JSON.stringify(upcomingSessions), upcomingSessionsNumber, sessionStartTime],
                    (err) => {
                        if (err) {
                            console.error('Error updating sessions:', err);
                            if (callback) callback(err);
                            return;
                        }
                        if (callback) callback(null);
                    });
            });
    });
}

function loadData(callback) { //Sends back data from server or default data in case of an error.
    db.serialize(() => {
        //Retrieves the row with id 1 from buttons table
        db.get('SELECT * FROM buttons WHERE id = 1', (err, buttonsRow) => {
            if (err) {
                console.error('Error loading buttons:', err);
                if (callback) callback(defaultData);
                return;
            }
            //Retrieves the row with id 1 from sessions table
            db.get('SELECT * FROM sessions WHERE id = 1', (err, sessionsRow) => {
                if (err) {
                    console.error('Error loading sessions:', err);
                    if (callback) callback(defaultData);
                    return;
                }

                // Convert 0/1 to false/true for boolean fields in buttons, otherwise when ever server is started or restarted boolean values are 1 or 0 instead of true or false.
                const buttons = {
                    flag: buttonsRow.flag,
                    safeButton: Boolean(buttonsRow.safeButton),
                    hazardButton: Boolean(buttonsRow.hazardButton),
                    dangerButton: Boolean(buttonsRow.dangerButton),
                    finishButton: Boolean(buttonsRow.finishButton),
                    newSessionButton: Boolean(buttonsRow.newSessionButton),
                    startRaceButton: Boolean(buttonsRow.startRaceButton),
                    endSessionButton: Boolean(buttonsRow.endSessionButton),
                    sessionStarted: Boolean(buttonsRow.sessionStarted),
                    raceInProgress: Boolean(buttonsRow.raceInProgress),
                    isSessionFinished: Boolean(buttonsRow.isSessionFinished)
                };
                //Construct the raceData object from the database rows
                const raceData = {
                    buttons: buttons,
                    activeRaceData: sessionsRow.activeRaceData ? JSON.parse(sessionsRow.activeRaceData) : null,
                    rosterIndex: sessionsRow.rosterIndex,
                    nextSession: sessionsRow.nextSession ? JSON.parse(sessionsRow.nextSession) : null,
                    upcomingSessions: sessionsRow.upcomingSessions ? JSON.parse(sessionsRow.upcomingSessions) : [],
                    upcomingSessionsNumber: sessionsRow.upcomingSessionsNumber,
                    sessionStartTime: sessionsRow.sessionStartTime
                };

                if (callback) callback(raceData);
            });
        });
    });
}
//Creates new db if data doesn't exist
function initializeDatabase(callback) {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS buttons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            flag TEXT NOT NULL,
            safeButton BOOLEAN NOT NULL,
            hazardButton BOOLEAN NOT NULL,
            dangerButton BOOLEAN NOT NULL,
            finishButton BOOLEAN NOT NULL,
            newSessionButton BOOLEAN NOT NULL,
            startRaceButton BOOLEAN NOT NULL,
            endSessionButton BOOLEAN NOT NULL,
            sessionStarted BOOLEAN NOT NULL,
            raceInProgress BOOLEAN NOT NULL,
            isSessionFinished BOOLEAN NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activeRaceData TEXT,
            rosterIndex INTEGER NOT NULL,
            nextSession TEXT,
            upcomingSessions TEXT,
            upcomingSessionsNumber INTEGER NOT NULL,
            sessionStartTime INTEGER
        )`);

        db.run(`INSERT OR IGNORE INTO buttons (id, flag, safeButton, hazardButton, dangerButton, finishButton, newSessionButton, startRaceButton, endSessionButton, sessionStarted, raceInProgress, isSessionFinished) 
                VALUES (1, 'red', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`);
        db.run(`INSERT OR IGNORE INTO sessions (id, activeRaceData, rosterIndex, nextSession, upcomingSessions, upcomingSessionsNumber, sessionStartTime) 
                VALUES (1, NULL, 1, NULL, '[]', 0, NULL)`);
        if (callback) callback();//callback to signal that task is complete
    });
}

//database is initialized before loading data
initializeDatabase((err) => {
    if (err) {
        console.error('Error initializing database:', err);
    } else {
        loadData((data) => {
            console.log('Data loaded successfully:');
        });
    }
});
//export functions for server.js
module.exports = {
    loadData,
    saveData,
    initializeDatabase
};