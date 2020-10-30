const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const socketEvents = require("./socketEvents.js");
const index = require("./index.js");
const userFunctions = require("./user.js");
const messageFunctions = require("./message.js");

const port = process.env.PORT || 4000;

const app = express();
app.use(index);

const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("+ User connected");
  
  socket.on(socketEvents.USER_JOIN_ATTEMPT, (data) => {
    userFunctions.connectUser(data.user_id, io, socket);
  });

  socket.on(socketEvents.USERS_RETRIEVAL_ATTEMPT, () => {
    userFunctions.retrieveUsers(socket);
  });

  socket.on(socketEvents.MESSAGES_RETRIEVAL_ATTEMPT, () => {
    messageFunctions.retrieveMessages(socket);
  });

  socket.on(socketEvents.MESSAGE_SENT_ATTEMPT, (data) => {
    messageFunctions.sendMessage(data.message, data.user_id, io, socket);
  });

  socket.on("disconnect", () => {
    console.log(`- User disconnected (${socket.userId})`);
    userFunctions.disconnectUser(socket.userId, socket);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));