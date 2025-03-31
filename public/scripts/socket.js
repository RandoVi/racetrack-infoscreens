const socket = io('http://localhost:3000', { //Use "http://localhost:3000" if local, use ngrok url for public;
  transports: ['websocket'],
  withCredentials: true,
});
export default socket;