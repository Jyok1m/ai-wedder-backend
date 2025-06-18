var express = require("express");
var router = express.Router();

const scraper = require("../scraper/mariages-net");
const Venue = require("../models/Venue");
const Review = require("../models/Review");

router.get("/mariages-net", async (req, res) => {
	try {
		console.log("🔄 Démarrage du scraping de mariages.net...");
		const start = Date.now();

		const allData = await scraper.scrapData();

		for (const item of allData) {
			const [city, region] = item.location?.split(",").map((s) => s.trim()) || [];

			// 1. Sauvegarder ou mettre à jour la Venue
			const venue = await Venue.findOneAndUpdate(
				{ name: item.name, url: item.url },
				{
					name: item.name,
					url: item.url,
					location: { city, region },
					averageRating: isNaN(parseFloat(item.avgRating)) ? undefined : parseFloat(item.avgRating),
					reviewCount: item.reviewCount,
				},
				{ new: true, upsert: true, setDefaultsOnInsert: true }
			);

			// 2. Sauvegarder chaque Review liée
			for (const review of item.reviews || []) {
				const alreadyExists = await Review.findOne({
					venue: venue._id,
					author: review.author,
					text: review.description,
				});

				if (alreadyExists) continue;

				await Review.create({
					venue: venue._id,
					author: review.author,
					rating: isNaN(parseFloat(review.rating)) ? undefined : parseFloat(review.rating),
					text: review.description,
					date: review.date ? new Date(review.date.split("/").reverse().join("-")) : null,
					source: "mariages.net",
					// Optionnel : sentiment et aiConfidenceScore seront ajoutés plus tard par ton microservice Flask
				});
			}
		}

		const duration = ((Date.now() - start) / 1000).toFixed(2);
		console.log(`✅ Scraping terminé en ${duration} secondes`);
		console.log(`📊 Total de ${allData.length} lieux traités`);
		return res.status(200).json({ message: "Scraping et sauvegarde réussis", data: allData });
	} catch (error) {
		console.error("Erreur lors de l'exécution du scraper :", error);
		return res.status(500).json({ error: "Erreur interne du serveur" });
	}
});

module.exports = router;
