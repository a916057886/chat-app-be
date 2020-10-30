const axios = require("axios");

const socketEvents = require("./socketEvents.js");

const onlineUsers = [];

module.exports = {
    connectUser: (userId, io, socket) => {
        if (userId == null) {
            generateNewUser(socket);
        }
        else {
            getUser(userId, io, socket);
        }
    },

    disconnectUser: (userId, socket) => {
        let i = 0;
        for (i = 0; i < onlineUsers.length; i++) {
            if (onlineUsers[i] === userId)  break;
        }
        onlineUsers.splice(i, 1);

        socket.broadcast.emit(socketEvents.USER_DISCONNECTED, {
            user_id: userId
        });
    },

    retrieveUsers: (socket) => {
        axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
        .then(response => {
            socket.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                users: reformatUsers(response.data)
            });
        })
        .catch(error => {
            if (error.response) {
                socket.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                    error: error.response.data
                });
            }
            else {
                socket.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                    error: "Network Error"
                });
            }
        });
    },

    changeUsername: (userId, name, io, socket) => {
        if (name.length <= 10) {
            axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
            .then(response => {
                const [userKey, user] = filterUsers(response.data, userId);

                if (isUsernameDuplicated(name, response.data)) {
                    socket.emit(socketEvents.CHANGE_USERNAME, {
                        error: "Username has been taken by other user!"
                    });
                }                
                else if (userKey) {
                    const body = {};
                    body[userKey] = {
                        userId: userId,
                        username: name,
                        nameColor: user.nameColor
                    }

                    axios.patch("https://chat-app-b0bb9.firebaseio.com/users.json", body)
                    .then(() => {
                        socket.emit(socketEvents.CHANGE_USERNAME, {
                            username: name
                        });

                        axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
                        .then(response => {
                            io.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                                users: reformatUsers(response.data)
                            });
                        });
                    });
                }
            });
        }
        else {
            socket.emit(socketEvents.CHANGE_USERNAME, {
                error: "Username cannot be over 10 characters!"
            });
        }
    },

    changeNameColor: (userId, color, io, socket) => {
        axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
        .then(response => {
            const [userKey, user] = filterUsers(response.data, userId);

            if (userKey) {
                const body = {};
                body[userKey] = {
                    userId: userId,
                    username: user.username,
                    nameColor: color
                }

                socket.emit(socketEvents.CHANGE_NAME_COLOR, {
                    nameColor: color
                });

                axios.patch("https://chat-app-b0bb9.firebaseio.com/users.json", body)
                .then(() => {
                    axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
                    .then(response => {
                        io.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                            users: reformatUsers(response.data)
                        });
                    });
                });
            }
        });
    }
};

const retrieveUsers = (socket) => {
    axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
    .then(response => {
        socket.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
            users: reformatUsers(response.data)
        });
    })
    .catch(error => {
        if (error.response) {
            socket.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                error: error.response.data
            });
        }
        else {
            socket.emit(socketEvents.USERS_RETRIEVAL_RESULT, {
                error: "Network Error"
            });
        }
    });
};

const getUser = (userId, io, socket) => {
    axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
    .then(response => {
        const [userKey, userFound] = filterUsers(response.data, userId);
        if (userFound) {
            socket.userId = userFound.userId;

            let newUsername = null;
            if (isUsernameDuplicated(userFound.username, response.data)) {
                newUsername = generateName();
                axios.get("https://chat-app-b0bb9.firebaseio.com/users.json")
                .then(() => {
                    if (userKey) {
                        const body = {};
                        body[userKey] = {
                            userId: userId,
                            username: newUsername,
                            nameColor: userFound.nameColor
                        }

                        axios.patch("https://chat-app-b0bb9.firebaseio.com/users.json", body)
                        .then(() => {
                            retrieveUsers(io);
                        });
                    }
                });
            }

            socket.emit(socketEvents.USER_JOIN_RESULT, {
                user_id: userFound.userId,
                username: !newUsername ? userFound.username : newUsername,
                name_color: userFound.nameColor,
                is_new_user: false
            });
            socket.broadcast.emit(socketEvents.USER_CONNECTED, {
                user: {
                    user_id: userFound.userId,
                    username: !newUsername ? userFound.username : newUsername,
                    name_color: userFound.nameColor,
                    online: true
                }
            });
            onlineUsers.push(userFound.userId);
        }
        else {
            generateNewUser(socket);
        }
    })
    .catch(error => {
        if (error.response) {
            socket.emit(socketEvents.USER_JOIN_RESULT, {
                error: error.response.data
            });
        }
        else {
            socket.emit(socketEvents.USER_JOIN_RESULT, {
                error: "Network Error"
            });
        }
    });
};

const filterUsers = (users, userId) => {
    if (!users) return [null, null];

    let userFound = null;
    let userKey = null;
    Object.keys(users).forEach((key) => {
        const user = users[key];
        if (user.userId === userId) {
            userKey = key;
            userFound = user;
        }
    });

    return [userKey, userFound];
};

const generateNewUser = (socket) => {
    const userId = generateId(32);
    const username = generateName();
    const nameColor = "#ffffff";

    axios.post(`https://chat-app-b0bb9.firebaseio.com/users.json`, {
        userId: userId,
        username: username,
        nameColor: nameColor
    })
    .then(() => {
        socket.userId = userId;
        socket.emit(socketEvents.USER_JOIN_RESULT, {
            user_id: userId,
            username: username,
            name_color: nameColor,
            is_new_user: true
        });
        socket.broadcast.emit(socketEvents.USER_CONNECTED, {
            user: {
                user_id: userId,
                username: username,
                name_color: nameColor,
                online: true
            }
        });
        onlineUsers.push(userId);
    })
    .catch(error => {
        socket.emit(socketEvents.USER_JOIN_RESULT, {
            error: error.response ? error.response.data : "Network Error"
        });
    });
};

const generateId = (length) => {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charsLength = chars.length;

    for (let i = 0; i < length; i++ ) {
       result += chars.charAt(Math.floor(Math.random() * charsLength));
    }

    return result;
};

const generateName = () => {
    return `user_${generateId(5)}`;
};

const reformatUsers = (users) => {
    const formattedUsers = [];

    if (users) {
        Object.keys(users).forEach(key => {
            const user = {
                ...users[key],
                online: checkUserOnlineStatus(users[key].userId)
            };

            formattedUsers.push(user);
        });
    }

    return formattedUsers;
};

const checkUserOnlineStatus = (userId) => {
    return onlineUsers.filter(onlineUserId => userId === onlineUserId).length === 1;
};

const isUsernameDuplicated = (username, users) => {
    const onlineUsernames = [];
    for (const onlineUserId of onlineUsers) {
        onlineUsernames.push(filterUsers(users, onlineUserId)[1].username);
    }

    return onlineUsernames.filter(onlineUsername => onlineUsername === username).length === 1;
};