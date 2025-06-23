const { chromium } = require("playwright");
const Venue = require("../models/Venue");

const scrapData = async () => {
	const browser = await chromium.launch({ headless: false });
	const page = await browser.newPage();

	let allData = [];

	const regions = [
		// "https://www.mariages.net/busc.php?id_grupo=2&id_sector=5&id_region=26&id_provincia=447&id_poblacion=&id_geozona=&geoloc=0&latitude=&longitude=&isBrowseByImagesEnabled=&keyword=&faqs%5B%5D=&capacityRange%5B%5D=&txtStrSearch=Traiteur+mariage&txtLocSearch=Ille+et+Vilaine",
		"https://www.mariages.net/busc.php?id_grupo=2&id_sector=5&id_region=&id_provincia=435&id_poblacion=&id_geozona=&geoloc=&latitude=&longitude=&isBrowseByImagesEnabled=&keyword=&faqs%5B%5D=&capacityRange%5B%5D=&txtStrSearch=Traiteur+mariage&txtLocSearch=Côtes+d%27Armor",
		"https://www.mariages.net/busc.php?id_grupo=2&id_sector=5&id_region=24&id_provincia=&id_poblacion=&id_geozona=&geoloc=&latitude=&longitude=&isBrowseByImagesEnabled=&keyword=&faqs%5B%5D=&capacityRange%5B%5D=&txtStrSearch=Traiteur+mariage&txtLocSearch=Basse+-+Normandie",
	];

	await page.goto(regions[0], { waitUntil: "domcontentloaded", timeout: 10000 });

	try {
		await page.click("#onetrust-accept-btn-handler", { timeout: 2000 });
	} catch (e) {
		console.log("⚠️ Pas de bannière cookies ou timeout");
	}

	for (const regionUrl of regions) {
		const baseUrl = regionUrl;

		await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 10000 });

		let paginationLinks = await page.$$eval("button[data-page-number]", (buttons) => buttons.map((btn) => btn.getAttribute("data-href")));
		paginationLinks.unshift(baseUrl);

		for (const url of paginationLinks) {
			try {
				const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
				if (!response || !response.ok()) {
					console.warn(`❌ HTTP ${response?.status()} – page ignorée`);
					continue;
				}
				await page.waitForSelector("li.vendorTile", { timeout: 2000 });

				const data = await page.$$eval("li.vendorTile", (cards) =>
					cards.map((card) => {
						const name = card.querySelector(".vendorTile__title")?.textContent?.trim();
						const url = card.querySelector(".vendorTile__title")?.getAttribute("href");
						const location = card.querySelector(".vendorTile__location")?.textContent?.replace("·", "").trim();
						const image = card.querySelector(".vendorTileGallery__slide img")?.getAttribute("src");
						return {
							name,
							url: url ?? null,
							reviewsUrl: url ? `${url}/avis` : null,
							location,
							image,
						};
					})
				);

				// console.log(`✅ ${data.length} fiches extraites`);
				allData = allData.concat(data);
			} catch (err) {
				console.warn(`⚠️ Échec pour ${url} : ${err.message}`);
				continue;
			}
		}

		for (const item of allData) {
			const { url } = item;
			if (!url) continue;

			// console.log(`🔍 Lecture détails pour ${item.name}`);
			try {
				await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

				const rawReviewCount = await page.$eval("span.storefrontHeadingReviews__count", (el) => el.textContent?.trim()).catch(() => null);
				if (!rawReviewCount || !rawReviewCount.match(/\d+/)) {
					continue;
				}

				const reviewCount = parseInt(rawReviewCount.match(/\d+/)[0]);
				if (reviewCount === 0) {
					continue;
				}

				item.reviewCount = reviewCount;

				const avgRating = await page.$eval(".storefrontReviewsSummaryCTA__ratingValue", (el) => el.textContent.trim()).catch(() => null);
				item.avgRating = avgRating;

				await page.goto(item.reviewsUrl, { waitUntil: "domcontentloaded", timeout: 10000 });

				// Scroll automatique
				await autoScroll(page);

				// Récupérer les avis détaillés
				item.reviews = await page.$$eval("li.storefrontReviewsTileSubpage", (tiles) =>
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

				console.log(
					`🧾 ${item.name} – ${item.location} | ⭐ ${avgRating || "–"} | 💬 ${reviewCount} avis | ✅ ${item.reviews?.length || 0} extraits`
				);
			} catch (err) {
				console.warn(`⚠️ Échec ${item.name} : ${err.message}`);
				continue;
			}
		}
	}

	await browser.close();

	// Scroller jusqu'en bas
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

	return allData;
};

const scrapDataV2 = async () => {
	const venues = await Venue.find().select("url").lean();
	const venueUrls = venues.map((venue) => venue.url);

	const browser = await chromium.launch({ headless: false });
	const page = await browser.newPage();

	await page.goto(venueUrls[0], { waitUntil: "domcontentloaded", timeout: 10000 });

	try {
		await page.click("#onetrust-accept-btn-handler", { timeout: 2000 });
	} catch (e) {
		console.log("⚠️ Pas de bannière cookies ou timeout");
	}

	for (const url of venueUrls) {
		try {
			const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
			if (!response || !response.ok()) {
				console.warn(`❌ HTTP ${response?.status()} – page ignorée`);
				continue;
			}

			const { imageUrl, traiteurName } = await page.$eval("img[srcset]", (img) => {
				const srcset = img.getAttribute("srcset");
				const urls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
				const highestQualityUrl = urls[urls.length - 1];
				const alt = img.getAttribute("alt") || "traiteur";

				return {
					imageUrl: highestQualityUrl,
					traiteurName: alt.replace(/[^a-z0-9]/gi, "_").toLowerCase(), // nettoyage pour le nom de fichier
				};
			});

			await Venue.updateOne({ url }, { imageUrl });
		} catch (err) {
			console.warn(`⚠️ Échec pour ${url} : ${err.message}`);
			continue;
		}
	}

	await browser.close();
	return console.log("✅ Scraping terminé");
};

// scrapDataV2();

module.exports = { scrapData };
