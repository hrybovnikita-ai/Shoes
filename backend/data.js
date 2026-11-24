"use strict";
const { products } = require("./data/catalog");

const allowedSizes = [
  7, 8, 8.5, 9, 9.5, 10, 11, 12,
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
];

module.exports = { products, allowedSizes };