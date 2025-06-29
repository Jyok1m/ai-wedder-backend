const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
	{
		type: String, // e.g. 'admin', 'user', 'guest'
		email: String,
		password: String, // hashed password
		token: String, // JWT token
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
		collection: "venues", // Specify the collection name explicitly
	}
);

module.exports = mongoose.model("User", UserSchema);
