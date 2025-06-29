var express = require("express");
var router = express.Router();

const User = require("../models/User");
const bcrypt = require("bcrypt");
const uid = require("uuid");

router.post("/auth/sign-up", async (req, res) => {
	try {
		const { type, email, password } = req.body;

		// Basic validation
		if (!type || !email || !password) {
			return res.status(400).json({ error: "Tous les champs sont requis" });
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(409).json({ error: "Utilisateur déjà existant" });
		}

		// Create new user
		const newUser = new User({
			type,
			email,
			password: await bcrypt.hash(password, 10),
			token: uid.v4(),
		});

		await newUser.save();
		return res.status(201).json({ message: "Utilisateur créé avec succès" });
	} catch (error) {
		console.error("Erreur lors de la création de l'utilisateur :", error);
		return res.status(500).json({ error: "Erreur interne du serveur" });
	}
});

router.post("/auth/sign-in", async (req, res) => {
	try {
		const { email, password } = req.body;

		// Basic validation
		if (!email || !password) {
			return res.status(400).json({ error: "Email et mot de passe requis" });
		}

		// Find user by email
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ error: "Utilisateur non trouvé" });
		}

		// Check password
		const isMatch = bcrypt.compareSync(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ error: "Mot de passe incorrect" });
		}

		// Return user data without password
		return res.status(200).json({ token: user.token });
	} catch (error) {
		console.error("Erreur lors de la connexion de l'utilisateur :", error);
		return res.status(500).json({ error: "Erreur interne du serveur" });
	}
});

module.exports = router;
