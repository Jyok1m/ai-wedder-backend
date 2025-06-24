var express = require("express");
var router = express.Router();

const Venue = require("../models/Venue");

// GET all catering companies
router.get("/all/page", async (req, res) => {
	const { page = 1 } = req.query;
	const skip = (page - 1) * 10;

	try {
		const cateringCompanies = await Venue.find()
			.skip(skip)
			.select("name imageUrl url averageRating location aiGlobalScore aiKeyPoints aiSummary")
			.lean();
			
		const formatted = cateringCompanies.map((c) => ({
			...c,
			city: !c?.location.region ? "N/A" : c?.location.city,
			region: c?.location.region ?? c?.location.city,
		}));

		res.status(200).json({ companies: formatted });
	} catch (error) {
		console.error("Error fetching catering companies:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

module.exports = router;
