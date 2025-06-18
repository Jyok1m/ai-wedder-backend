const mongoose = require("mongoose");

mongoose
	.connect(process.env.MONGODB_URI, {
		connectTimeoutMS: 10000, // 10 seconds
	})
	.then(() => {
		console.log("Database connected !");
	})
	.catch((err) => {
		console.error("MongoDB connection error:", err);
		process.exit(1); // Exit the process with failure
	});
