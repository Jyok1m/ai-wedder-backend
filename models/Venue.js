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
		summary: String, // AI-generated summary
		clusterId: Number, // for clustering purposes
	},
	{
		timestamps: true, // Automatically adds createdAt and updatedAt fields
		collection: "venues", // Specify the collection name explicitly
	}
);

module.exports = mongoose.model("Venue", VenueSchema);
