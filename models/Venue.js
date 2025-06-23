const mongoose = require("mongoose");

const VenueSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		url: { type: String },
		location: {
			city: String,
			region: String,
			latitude: Number,
			longitude: Number,
		},
		categories: [String], // e.g. 'castle', 'beach', 'urban'
		averageRating: Number,
		reviewCount: Number,
		aiSummary: String, // AI-generated summary
		aiKeyPoints: String, // AI-generated key points
		aiGlobalScore: Number, // AI-generated global score
		clusterId: Number, // for clustering purposes
		imageUrl: String, // URL to an image of the venue
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
		collection: "venues", // Specify the collection name explicitly
	}
);

module.exports = mongoose.model("Venue", VenueSchema);
