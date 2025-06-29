var express = require("express");
var router = express.Router();

const scraper = require("../scraper/mariages-net");
const Venue = require("../models/Venue");
const Review = require("../models/Review");

router.post("/mariages-net", async (req, res) => {
	try {
		console.log("🔄 Démarrage du scraping de mariages.net...");
		const start = Date.now();

		const allTraiteurs = await scraper.scrapData();

		for (const traiteur of allTraiteurs) {
			const [city, region] = traiteur.location?.split(",").map((s) => s.trim()) || [];

			// 1. Sauvegarder ou mettre à jour la Venue
			const venue = await Venue.findOneAndUpdate(
				{ name: traiteur.name, url: traiteur.url },
				{
					name: traiteur.name,
					url: traiteur.url,
					location: { city, region },
					averageRating: isNaN(parseFloat(traiteur.avgRating)) ? undefined : parseFloat(traiteur.avgRating),
					reviewCount: traiteur.reviewCount,
					imageUrl: traiteur.imageUrl,
				},
				{ new: true, upsert: true, setDefaultsOnInsert: true }
			);

			// 2. Sauvegarder chaque Review liée
			for (const review of traiteur.reviews || []) {
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
				});
			}
		}

		const duration = ((Date.now() - start) / 1000).toFixed(2);
		console.log(`✅ Scraping terminé en ${duration} secondes`);
		console.log(`📊 Total de ${allTraiteurs.length} lieux traités`);
		return res.status(200).json({ message: "Scraping et sauvegarde réussis", data: allTraiteurs });
	} catch (error) {
		console.error("Erreur lors de l'exécution du scraper :", error);
		return res.status(500).json({ error: "Erreur interne du serveur" });
	}
});

module.exports = router;
