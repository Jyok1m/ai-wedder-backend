const { chromium } = require("playwright");

const scrapData = async () => {
	const browser = await chromium.launch({ headless: false });
	const page = await browser.newPage();

	const regions = [
		"https://www.mariages.net/busc.php?id_grupo=2&id_sector=5&id_region=26&id_provincia=447&id_poblacion=&id_geozona=&geoloc=0&latitude=&longitude=&isBrowseByImagesEnabled=&keyword=&faqs%5B%5D=&capacityRange%5B%5D=&txtStrSearch=Traiteur+mariage&txtLocSearch=Ille+et+Vilaine",
		"https://www.mariages.net/busc.php?id_grupo=2&id_sector=5&id_region=&id_provincia=435&id_poblacion=&id_geozona=&geoloc=&latitude=&longitude=&isBrowseByImagesEnabled=&keyword=&faqs%5B%5D=&capacityRange%5B%5D=&txtStrSearch=Traiteur+mariage&txtLocSearch=Côtes+d%27Armor",
		"https://www.mariages.net/busc.php?id_grupo=2&id_sector=5&id_region=24&id_provincia=&id_poblacion=&id_geozona=&geoloc=&latitude=&longitude=&isBrowseByImagesEnabled=&keyword=&faqs%5B%5D=&capacityRange%5B%5D=&txtStrSearch=Traiteur+mariage&txtLocSearch=Basse+-+Normandie",
	];

	// Access the first region and disable the cookie banner
	await page.goto(regions[0], { waitUntil: "domcontentloaded", timeout: 5000 });
	const cookiesBanner = await page.$("#onetrust-banner-sdk");
	if (cookiesBanner) await page.click("#onetrust-accept-btn-handler", { timeout: 2000 });

	const allTraiteurs = [];

	// Initiate region loop
	for (const regionUrl of regions) {
		// Go to the region page search page
		await page.goto(regionUrl, { waitUntil: "domcontentloaded", timeout: 5000 });

		// Once on the search page, retrieve each pagination link and insert the first one (regionUrl)
		let paginationLinks = await page.$$eval("button[data-page-number]", (buttons) => buttons.map((btn) => btn.getAttribute("data-href")));
		paginationLinks.unshift(regionUrl); // add page 1

		// For each pagination link, go to the page and retrieve the data
		for (const url of paginationLinks) {
			// We go to the page
			const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 5000 });
			if (!response || !response.ok()) {
				console.warn(`HTTP ${response?.status()} – page ignorée`);
				continue;
			}

			// Wait for the vendor tiles to load
			await page.waitForSelector("li.vendorTile", { timeout: 2500 });

			// Once loaded, retrieve the data from each vendor tile
			const data = await page.$$eval("li.vendorTile", (cards) =>
				cards.map((card) => {
					const name = card.querySelector(".vendorTile__title").textContent.trim();
					const url = card.querySelector(".vendorTile__title").getAttribute("href");
					const location = card.querySelector(".vendorTile__location")?.textContent?.replace("·", "").trim();
					return { name, url, reviewsUrl: `${url}/avis`, location };
				})
			);

			// Add the data to the allTraiteurs array
			allTraiteurs.push(...data);
		}

		// Maintenant, on va récupérer les données de chaque traiteur
		for (const traiteur of allTraiteurs) {
			const { url } = traiteur;

			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 5000 });

			// Reviews
			let rawReviewCount = await page.$eval(".storefrontReviewsSummaryCTA__ratingReviewCounter", (el) => el.textContent.trim()).catch(() => null);
			if (!rawReviewCount || !rawReviewCount.match(/\d+/)) rawReviewCount = "0";

			const reviewCount = parseInt(rawReviewCount.match(/\d+/)[0]);
			if (reviewCount === 0) continue;
			traiteur.reviewCount = reviewCount;

			// Average rating
			const avgRating = await page.$eval(".storefrontReviewsSummaryCTA__ratingValue", (el) => el.textContent.trim()).catch(() => null);
			traiteur.avgRating = avgRating;

			// Picture
			const imageUrl = await page.$eval("img[srcset]", (img) => {
				const srcset = img.getAttribute("srcset");
				const urls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
				const highestQualityUrl = urls[urls.length - 1];
				return highestQualityUrl;
			});
			traiteur.imageUrl = imageUrl;

			// Extract each traiteur's reviews
			await page.goto(traiteur.reviewsUrl, { waitUntil: "domcontentloaded", timeout: 5000 });

			// Auto Scroll to load the reviews
			await autoScroll(page);

			// Reviews
			const allReviews = await page.$$eval("li.storefrontReviewsTileSubpage", (tiles) =>
				tiles.map((tile) => {
					const author = tile.querySelector(".storefrontReviewsTileInfo")?.childNodes?.[0]?.textContent?.trim();
					const date = tile.querySelector(".storefrontReviewsTileInfo__date")?.textContent?.replace("Envoyé le", "").trim();
					const ratingText = tile.querySelector(".rating__count")?.textContent?.trim();
					const title = tile.querySelector(".storefrontReviewsTileContent__title")?.textContent?.trim();
					const description = tile.querySelector(".storefrontReviewsTileContent__description")?.textContent?.trim();

					const rating = parseFloat(ratingText?.replace(",", "."));

					const aspects = {};
					tile.querySelectorAll(".storefrontReviewsAverage__rating li").forEach((li) => {
						const label = li.childNodes?.[0]?.textContent?.trim();
						const score = li.querySelector(".storefrontReviewsSummary__ratingCount")?.textContent?.trim();
						if (label && score) aspects[label] = score;
					});

					const vendorReply = tile.querySelector(".storefrontReviewsTileReply__description")?.textContent?.trim();

					return {
						author,
						date,
						rating: isNaN(rating) ? null : rating,
						title,
						description,
						aspects,
						vendorReply,
					};
				})
			);

			traiteur.reviews = allReviews;

			console.log(
				`🧾 ${traiteur.name} – ${traiteur.location} | ⭐ ${avgRating || "–"} | 💬 ${reviewCount} avis | ✅ ${traiteur.reviews?.length || 0} extraits`
			);
		}
	}

	await browser.close();
	return allTraiteurs;
};

async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			let totalHeight = 0;
			const distance = 500;
			const timer = setInterval(() => {
				const scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;
				if (totalHeight >= scrollHeight) {
					clearInterval(timer);
					resolve();
				}
			}, 100);
		});
	});
}

scrapData();

module.exports = { scrapData };
