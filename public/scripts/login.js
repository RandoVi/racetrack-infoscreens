import socket from './socket.js';

document.addEventListener("DOMContentLoaded", () => {
    function createLoginModal(roleElement) {
        const roleText = roleElement.textContent;
        const currentPath = window.location.pathname;
        if (["/front-desk.html", "/lap-line-tracker.html", "/race-control.html"].includes(currentPath)) {
            requestAccess(currentPath);
        }

        const roleMap = {
            "Receptionist": "receptionist",
            "Lap-Line Observer": "observer",
            "Safety Official": "safety"
        };
        const role = roleMap[roleText];

        let existingModal = document.getElementById("loginModal");
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement("div");
        modal.id = "loginModal";
        modal.className = "login-modal";    // The &times is commonly used as a symbol for a close button in HTML
        modal.innerHTML = `
            <div class="login-modal-content">
                <span class="close-btn">&times;</span>
                <h2>Login as ${roleText}</h2>
                <input type="password" id="passwordInput" placeholder="Enter password">
                <button id="loginBtn">Login</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.classList.add("active");

        // Close modal when the close button is clicked
        modal.querySelector(".close-btn").addEventListener("click", () => {
            modal.classList.remove("active");
        });


        modal.querySelector("#loginBtn").addEventListener("click", (event) => {
            event.preventDefault(); // Prevent default button behavior
            const password = document.getElementById("passwordInput").value;


            socket.emit('login-attempt', { key: password, role });


            socket.once('login-response', (response) => {
                console.log("Login response received:", response);
                if (response.success) {

                    localStorage.setItem('runtimeKey', response.key);
                    console.log('Runtime key stored:', response.key);
                    // Redirect to the appropriate page with the runtime key as a query parameter on login success
                    window.location.href = `${response.redirect}?key=${response.key}`;
                } else {
                    setTimeout(() => {
                        alert("Incorrect password! Please try again.");
                    }, 500);
                }
            });
        });

        // Close modal when clicking outside of it
        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.classList.remove("active");
            }
        });
    }


    const roleLinks = document.querySelectorAll(".nav-left a");
    roleLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault(); 
            createLoginModal(link); // Pass the clicked element to the function, receptionist button will create a receptionist modal
        });
    });

    // Check for protected routes on page load, this is to prevent users just copying urls directly to access restricted areas
    const currentPath = window.location.pathname;
    if (currentPath === '/front-desk.html' || currentPath === '/lap-line-tracker.html' || currentPath === '/race-control.html') {
        requestAccess(currentPath);
    }

    // Remove login modal when page is loaded if active
    window.addEventListener("pageshow", () => {
        const modal = document.getElementById("loginModal");
        if (modal) modal.remove();
    });
});

function requestAccess(path) {
    const runtimeKey = localStorage.getItem('runtimeKey');
    if (runtimeKey) {
        socket.emit('request-access', { key: runtimeKey, path });

        socket.once('access-granted', (response) => {
            console.log('Access granted:', response.file);
            window.location.href = response.file; // Redirect to the authorized page
        });

        socket.once('access-denied', (response) => {
            alert(response.message);
            localStorage.removeItem('runtimeKey');
            window.location.href = '/';
        });
    } else {
        alert('Please login to access this page.');
        window.location.href = '/';
    }
}