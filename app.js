require("dotenv").config(); // Load environment variables from .env file
require("./models/connection"); // Ensure the database connection is established

var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var scraperRouter = require("./routes/scraper");

var app = express();
var cors = require("cors");

app.use(cors()); // Enable CORS for all routes
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/scraper", scraperRouter);

module.exports = app;
