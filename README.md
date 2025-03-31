# Racetrack Infoscreens

This system is an MVP that provides a comprehensive platform for managing and tracking race events, designed for use by various roles such as receptionists, observers, and safety officials. It leverages real-time communication to ensure all participants have up-to-date information.

## Overview

The Racetrack Infoscreens allows scheduling, execution, and monitoring of race sessions. It offers user authentication to protect sensitive functions and ensures data consistency across all connected clients. Key features include:

- **Session Scheduling & Management:** Users can create, modify, and delete race sessions. The system tracks upcoming and active sessions, providing a clear overview of the race schedule.
  Driver names can be edited by choosing the same car you chose previously and overwriting the name.
- **Real-time Race Tracking:** Live updates on race status, including lap times, leaderboard positions, and flag conditions, are broadcast to all connected devices.
- **Role-Based Access Control:** Secure access to different functionalities is managed through user authentication, ensuring that only authorized personnel can perform specific actions.
- **Timer & Flag Controls:** Integrated timer and flag management tools allow safety officials to control race flow and respond to incidents promptly.
- **Data Persistence:** All race data is stored and retrieved, ensuring that information is preserved across sessions and server restarts.
- **User Interface:** The system provides dedicated interfaces for each user role, offering tailored functionalities and information display. Lap-line-tracker also has the ability to show/hide the leaderboard in case they want to check the race state, this saves space if all they want to see are the buttons.
- **Secure Lap Time Tracking:** It also has a 5 second buffer on each lap to prevent lapping the drivers more than once in quick succession. This prevents faulty data, ensuring the lap-line observer can work stress-free and focus on keeping track of cars.

## Functionality

The system allows receptionists to schedule and manage race sessions, safety officials to control the race using timers and flags, and observers to monitor race progress through live leaderboards and status updates. Real-time updates are facilitated by Socket.IO, ensuring that all connected clients receive the latest information instantly. Data persistence guarantees that race information is not lost and can be accessed across sessions. In addition, each webpage is modular and works together with the server by themself.

## Key Components

- **Server:** A Node.js server using Express and Socket.IO to manage data, authentication, and real-time communication.
- **Client:** A web-based interface providing access to the system's functionalities, tailored to each user role.
- **Data Storage:** A persistent storage mechanism to save and retrieve race data.
- **Authentication System:** A secure authentication process to manage user access based on roles and keys.

## Intended Use

This system is intended for use in racetrack environments to facilitate the management and monitoring of race events, providing real-time information to all relevant personnel.

## Setup

Before you begin, you'll need to set up your development environment.

### #1. Install an IDE (integrated development environment), such as VSCode or IntelliJ for ease of use

Here are instructions for VSCode.

1.  **Download VSCode:**
    - Visit the official VSCode website: [https://code.visualstudio.com/](https://code.visualstudio.com/)
    - Download the installer for your operating system (Windows, macOS, or Linux).
2.  **Install VSCode:**
    - Run the installer and follow the on-screen instructions.
    - Accept the default settings for most users.

### #2. Project Setup

1.  **Clone the Repository:**
    - Use Git to clone the project repository to your local machine.
2.  **Install Dependencies:**

    - Navigate to the project directory
    - Navigate to the server folder in your terminal inside your directory or command prompt.
      It looks like this in your terminal if you are inside the server folder when using linux:

    ```bash
    yourUserName@YourComputerName:~/racetrack/server$
    ```

    - Run the following commands to install the project dependencies:

    ```bash
    yourUserName@YourComputerName:~/racetrack/server$ npm install
    ```

    ```bash
    yourUserName@YourComputerName:~/racetrack/server$ npm install sqlite3
    ```

3.  **Configure Environment Variables:**
    - Check your `.env` file in the root of your project directory, if you don't have it, then create it with the following:
    ```bash
        SESSION_SECRET=ThisIsDeFineTelySEcURe
        RECEPTIONIST_KEY=1
        OBSERVER_KEY=2
        SAFETY_KEY=3
        PORT=3000
    ```
    - These are the passwords to your race managers: receptionist, lap-line tracker and race control in order.
    - Numbers are placeholders and can be replaced with any password you like.
    - PORT is the port number where the server will be hosted on your machine.
4.  **Start the Server:**

    - Run the following command to start the Node.js server:

    ```bash
    yourUserName@YourComputerName:~/racetrack/server$ npm start
    ```

    - To start the Node.js server in development mode (1 minute timer) run the following:

    ```bash
    yourUserName@YourComputerName:~/racetrack/server$ npm run dev
    ```

5.  **Access Locally:**
    - Open your web browser and navigate to the local address where your server is running (e.g., `http://localhost:3000`).

### Optional: Set Up an ngrok Account (For External Access)

ngrok allows you to expose your local development server to the internet, making it accessible from anywhere. This is useful for testing and sharing your application.

1.  **Sign Up for ngrok:**
    - Go to the ngrok website: [https://ngrok.com/](https://ngrok.com/)
    - Sign up for a free account.
2.  **Download ngrok:**
    - After signing up, you'll be redirected to your ngrok dashboard.
    - Download the ngrok executable for your operating system.
3.  **Install ngrok:**
    - **Windows:** Unzip the downloaded ZIP file. Place the `ngrok.exe` file in a directory that's included in your system's PATH environment variable, or in a location of your choice.
    - **macOS/Linux:** Unzip the downloaded ZIP file and move the `ngrok` executable to a directory in your PATH (e.g., `/usr/local/bin`). You might need to make the executable runnable using the command `chmod +x ngrok`.
4.  **Connect Your Account:**
    - On your ngrok dashboard, you'll find your authtoken. This is usually right below the installation instructions, so scroll down until you see a similar command that you see here.
    - Open your terminal or command prompt and run the following command, replacing `<YOUR_AUTH_TOKEN>` with your actual authtoken:
    ```bash
    ngrok authtoken <YOUR_AUTH_TOKEN>
    ```
    - This will save your authtoken, so you won't have to enter it again.
5.  **Expose the Server with ngrok:**

    - Open a new terminal or command prompt.
    - Run the following command, replacing `<PORT>` with the port number your server is running on (e.g., 3000):

    ```bash
    yourUserName@YourComputerName:~/racetrack/server$ ngrok http <YourPORTNumberGoesHereWithoutThe<>signs>
    ```

    - ngrok will provide you with a public URL that you can use to access your local server from anywhere.
    - even if you restart your local machine, the ngrok url will still persist, provided you do not close or restart ngrok tunneling services.

    - An example of what the URL of your hosted website might look like if you host it through port 3000 on your machine

    ```bash
    Forwarding                    https://6957-176-112-158-2.ngrok-free.app -> http://localhost:3000
    ```

    The .ngrok-free.app URL is the one you will give to all outside users to enable connections from the internet, as long as the ngrok tunnel is active and isn't restarted.
    The -> shows you what port it is forwarding (that is the location where your server connects to other networks).

6.  **Connect the server with the ngrok url to make the server work:**

    - Inside your Racetrack, navigate to public folder -> scripts folder -> socket.js and inside socket.js file using your code editor, change the socket io PORT
      (currently http://localhost:3000) to the ngrok forwarding address.
      Default socket.js

    ```
        const socket = io('http://localhost:3000', {
        transports: ['websocket'],
        withCredentials: true,
        });
        export default socket;
    ```

    Example socket.js

    ```
    const socket = io('https://798f-176-112-158-2.ngrok-free.app', { <---- This is the ngrok provided URL, and now once the websockets can use this, the server is accessible
    transports: ['websocket'],
    withCredentials: true,
    });
    export default socket;
    ```
