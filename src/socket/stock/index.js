// src/socket/stock/index.js
const registerReaders = require('./reader');
const registerWriters = require('./writer');

module.exports = (io, socket) => {
    registerReaders(io, socket);
    registerWriters(io, socket);
};