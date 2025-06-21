const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
	{
		venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
		author: String,
		rating: { type: Number, required: false, min: 0, max: 5 },
		text: { type: String, required: true },
		date: Date,
		sentiment: {
			type: String,
			enum: ["positive", "negative", "neutral"],
			default: "neutral",
		},
		aiSentiment: String,
		aiConfidenceScore: Number,
		aiClusters: [{ label: String, score: Number }], // e.g. ['wedding', 'event', 'party']
		source: String, // e.g. 'mariages.net'
		createdAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
		collection: "reviews", // Specify the collection name explicitly
	}
);

module.exports = mongoose.model("Review", ReviewSchema);
