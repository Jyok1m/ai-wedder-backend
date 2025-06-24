var express = require("express");
var router = express.Router();

const Venue = require("../models/Venue");

// GET all catering companies
router.get("/:queryType", async (req, res) => {
	const { queryType } = req.params;

	try {
		let query = {};

		if (["Ille et Vilaine", "Côtes d'Armor"].includes(queryType)) {
			query = { "location.region": queryType };
		} else if (queryType !== "all") {
			query = { $and: [{ "location.region": { $ne: "Ille et Vilaine" } }, { "location.region": { $ne: "Côtes d'Armor" } }] };
		}

		const cateringCompanies = await Venue.find(query)
			.sort({ aiGlobalScore: -1 })
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
