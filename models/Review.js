const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
	{
		venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
		author: String,
		rating: { type: Number, required: true },
		text: { type: String, required: true },
		date: Date,
		sentiment: {
			type: String,
			enum: ["positive", "negative", "mixed"],
			default: "mixed",
		},
		aiConfidenceScore: Number,
		source: String, // e.g. 'mariages.net'
		createdAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
		collection: "reviews", // Specify the collection name explicitly
	}
);

module.exports = mongoose.model("Review", ReviewSchema);
