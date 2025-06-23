var express = require("express");
var router = express.Router();

const Venue = require("../models/Venue");

// GET all catering companies
router.get("/", async (req, res) => {
	try {
		const cateringCompanies = await Venue.find().select("name url");
		res.status(200).json({ cateringCompanies });
	} catch (error) {
		console.error("Error fetching catering companies:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

module.exports = router;
