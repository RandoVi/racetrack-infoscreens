import socket from './socket.js';
let flagElement = document.getElementById("currentMode");
let flagLabels = {
  "green": "SAFE",
  "yellow": "HAZARD",
  "red": "DANGER", // Lookup object to use only valid data
  "finish": "FINISH"
};

document.addEventListener("DOMContentLoaded", () => {

    socket.emit('raceMode-flag-request');
    socket.on('from-server-raceMode-flag-response', currentFlag => {
        flagElement.textContent = flagLabels[currentFlag] || "Unknown Flag";
    })

    const leftLinks = document.querySelectorAll(".nav-left a");
    const rightLinks = document.querySelectorAll(".nav-right a");

    setTimeout(() => {
        leftLinks.forEach((link, index) => {
            setTimeout(() => {
                link.classList.add("show"); // Left and right links are shown at different times and staggered for a sliding effect on load
            }, index * 150);
        });

        rightLinks.forEach((link, index) => {
        setTimeout(() => {
            link.classList.add("show");
        }, 300 + index * 150);
        });
    }, 10);

    const video1 = document.getElementById("video1");
    const video2 = document.getElementById("video2");
    let activeVideo = video1;
    let nextVideo = video2;

    function switchVideos() {
        nextVideo.currentTime = 0;
        nextVideo.play();

        activeVideo.classList.remove("active-video");
        activeVideo.classList.add("hidden-video");

        nextVideo.classList.add("active-video");
        nextVideo.classList.remove("hidden-video");

        [activeVideo, nextVideo] = [nextVideo, activeVideo]; // Swap references
    }

    // Add event listeners to BOTH videos
    video1.addEventListener("ended", switchVideos);
    video2.addEventListener("ended", switchVideos);
    
});