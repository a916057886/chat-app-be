const axios = require("axios");
const e = require("express");

const socketEvents = require("./socketEvents.js");
const userFunctions = require("./user.js");

module.exports = {
    retrieveMessages: (socket) => {
        axios.get("https://chat-app-b0bb9.firebaseio.com/messages.json")
        .then(response => {
            socket.emit(socketEvents.MESSAGES_RETRIEVAL_RESULT, {
                messages: reformatMessages(response.data)
            });
        })
        .catch(error => {
            if (error.response) {
                socket.emit(socketEvents.MESSAGES_RETRIEVAL_RESULT, {
                    error: error.response.data
                });
            }
            else {
                socket.emit(socketEvents.MESSAGES_RETRIEVAL_RESULT, {
                    error: "Network Error"
                });
            }
        });
    },

    sendMessage: (message, userId, io, socket) => {
        if (!message.match(/\/name [^\s]+/g) && !message.match(/\/color [^\s]+/g)) {
            const time = new Date();

            axios.post(`https://chat-app-b0bb9.firebaseio.com/messages.json`, {
                text: message,
                time: time,
                userId: userId
            })
            .then(response => {
                io.emit(socketEvents.MESSAGE_SENT_RESULT, {
                    message: {
                        id: response.data.name,
                        text: message,
                        time: reformatTime(time),
                        userId: userId
                    }
                });
            })
            .catch(error => {
                io.emit(socketEvents.MESSAGE_SENT_RESULT, {
                    error: error.response ? error.response.data : "Network Error"
                });
            });
        }
        else if (message.match(/\/name [^\s]+/g)) {
            userFunctions.changeUsername(userId, message.split(" ")[1], io, socket);
        }
        else if (message.match(/\/color [^\s]+/g)) {
            userFunctions.changeNameColor(userId, message.split(" ")[1], io, socket);
        }
    }
};

const reformatMessages = (messages) => {
    const formattedMessages = [];

    if (messages) {
        Object.keys(messages).forEach(key => {
            const message = {
                id: key,
                ...messages[key],
                time: reformatTime(messages[key].time)
            };

            formattedMessages.push(message);
        });
    }

    return formattedMessages;
};

const reformatTime = (time) => {
    const date = new Date(time);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};