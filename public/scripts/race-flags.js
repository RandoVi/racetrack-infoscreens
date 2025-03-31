import socket from './socket.js';
const canvas = document.getElementById('canvasS'); //currently 2 htmls use same canvas name, if changed here, code breaks
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let currentColor = undefined;


//----------------------------FUNCTIONS
class Effect {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.time = 0;
    }
    animate() {
        this.time += 0.05;
    }
    resize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
}

class ColoredFlag extends Effect {
    constructor(canvas, color1, color2, scale = 1) {
        super(canvas);
        this.color1 = color1;
        this.color2 = color2;
        this.squareSize = 25;
        this.scale = scale;
    }

    render(context) {
        const baseSize = 800; // Keep reference grid size constant
        const scaleFactor = baseSize / this.canvas.width; // Scale relative to the base size
        const scaledSquareSize = this.squareSize / scaleFactor; // Adjust square size
        const rows = Math.ceil(this.height / scaledSquareSize);
        const cols = Math.ceil(this.width / scaledSquareSize);
        const offsetScale = scaledSquareSize * 0.4; // Scale movement relative to square size



        for (let i = 1; i < rows-2; i++) {
            for (let j = 1; j < cols-2; j++) {
                context.fillStyle = (i + j) % 2 === 0 ? this.color1 : this.color2;
                const offsetX = Math.sin(this.time + i) * offsetScale;
                const offsetY = Math.cos(this.time + j) * offsetScale;

                context.beginPath();
                context.rect(
                    j * scaledSquareSize + offsetX,
                    i * scaledSquareSize + offsetY,
                    scaledSquareSize*1.35,
                    scaledSquareSize*1.35
                );
                context.fill();
            }
        }
    }
}

class FinishFlag extends Effect {
    constructor(canvas, scale = 1) {
        super(canvas);
        this.squareSize = 25;
        this.scale= scale;
    }

    render(context) {
        const baseSize = 800; // Keep reference grid size constant
        const scaleFactor = baseSize / this.canvas.width; // Scale relative to the base size
        const scaledSquareSize = this.squareSize / scaleFactor; // Adjust square size

        const rows = Math.ceil(this.height / scaledSquareSize);
        const cols = Math.ceil(this.width / scaledSquareSize);
        const offsetScale = scaledSquareSize * 0.4; // Keep a fixed offset scale for movement

        for (let i = 1; i < rows-2; i++) {
            for (let j = 1; j < cols-2; j++) {
                context.fillStyle = (i + j) % 2 === 0 ? 'black' : 'white';
                const offsetX = Math.sin(this.time + i) * offsetScale;
                const offsetY = Math.cos(this.time + j) * offsetScale;

                context.beginPath();
                context.rect(
                    j * scaledSquareSize + offsetX,
                    i * scaledSquareSize + offsetY,
                    scaledSquareSize*1.35,
                    scaledSquareSize*1.35
                );
                context.fill();
            }
        }
    }
}

export class FlagAnimation {
    constructor(canvas, width, height, scale, context) {
        this.scale = scale ;
        this.canvas = canvas;
        this.ctx = context;
        this.width = width; 
        this.height = height;

        this.flags = {
            red: new ColoredFlag(canvas, 'rgb(255, 0, 0)', 'rgb(196, 0, 0)',this.scale), 
            green: new ColoredFlag(canvas, 'rgb(0, 189, 25)', 'rgb(0, 167, 22)',this.scale),
            yellow: new ColoredFlag(canvas, 'rgb(255, 238, 0)', 'rgb(224, 209, 0)',this.scale),
            finish: new FinishFlag(canvas,this.scale),
        };

        this.currentEffect = this.flags.red;
        this.resizeCanvas();
        this.animate();
    }

    setFlag(color) {
        if (this.flags[color]) {
            this.currentEffect = this.flags[color];
            this.currentEffect.resize();
        }
    }

    animate() {
        const fps = 60;
        const frameTime = 1000 / fps;
        let lastTime = 0;

        const loop = (timeStamp) => {
            if (timeStamp - lastTime >= frameTime) {
                lastTime = timeStamp;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.currentEffect.animate();
                this.currentEffect.render(this.ctx);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

 resizeCanvas() {
    this.canvas.width = window.innerWidth * this.scale;
    this.canvas.height = window.innerHeight * this.scale;
    console.log('resize value :', this.scale)
    this.currentEffect.resize();
}
}

//-------------------------------FLAG HTML


if (typeof window !== "undefined") {

    const flagAnimation = new FlagAnimation(canvas, canvas.width, canvas.height, 1, ctx);

        if (socket.connected) {
            socket.emit('raceMode-flag-request');
    } else {
        socket.on('connect', () => {
            socket.emit('raceMode-flag-request');
        });
    }


    window.addEventListener('resize', () => {
        flagAnimation.resizeCanvas();
        flagAnimation.setFlag(currentColor);
    });

    socket.on('changed-mode', (color) => {
        console.log('mode changed');
        currentColor = color;
        flagAnimation.setFlag(currentColor);
        socket.emit('leaderboard-data-request');
    });

    socket.on('finish-mode', () => {
        console.log('flag mode changed to finish');
        flagAnimation.setFlag('finish');
        socket.emit('leaderboard-data-request');
    });

    socket.on('server-current-race-has-ended', () => {
        console.log('race ended - mode changed to danger');
        flagAnimation.setFlag('red');
        socket.emit('leaderboard-data-request');
    });
    socket.on('from-server-raceMode-flag-response', color => {
        currentColor = color;
        flagAnimation.setFlag(currentColor);
        socket.emit('leaderboard-data-request');
    })

    flagAnimation.setFlag('red'); // Default flag

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
}