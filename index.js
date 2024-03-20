import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { db } from "./lib/db.js";

import { Redis } from "@upstash/redis";

const app = express();

app.use(cors());
app.use(bodyParser.json());

db.connect((err) => {
	if (err) {
		console.error("Error connecting to database:", err);
		return;
	}
	console.log("Connected to database");
});

// Redis implementation
const client = new Redis({
	url: process.env.UPSTASH_REDIS_URL,
	token: process.env.UPSTASH_REDIS_TOKEN,
});

app.post("/submitCode", (req, res, next) => {
	console.log("req:", req.body);
	if (
		req.body.code === "" ||
		req.body.prefLang === "" ||
		req.body.stdInt === "" ||
		req.body.username === "" ||
		req.body.submissions === ""
	) {
		console.log("req.body.submissions:", req.body.submissions);
		next("Error in submit");
	}
	// const storeInCache = {
	// 	code: req.body.code,
	// 	stdInt: req.body.stdInt,
	// 	prefLang: req.body.prefLang,
	// 	username: req.body.username,
	// 	submissions: req.body.submissions,
	// };
	// const redisKey = btoa(`${req.body.username}${req.body.code}`);
	// async function setToRedis() {
	// 	await client.set(redisKey, storeInCache);
	// }
	// setToRedis();

	db.query(
		`INSERT INTO main.codeEditor (username, code, prefLang, stdInt, submissions, timestamp) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		[
			req.body.username,
			req.body.code,
			req.body.prefLang,
			req.body.stdInt,
			req.body.submissions,
		],
		(error) => {
			if (error) {
				console.log("error:", error);
				res.status(500).send({ error: "Internal server error" });
			} else {
				res.status(200).send({
					message: "Data successfully stored",
				});
			}
		}
	);
});

const cacheFunction = async (req, res, next) => {
	const { code, username } = req.body;
	const redisKey = btoa(`${username}${code}`);
	console.log("redisKey:", redisKey);

	async function getFromRedis() {
		const result = await client.get(redisKey);
		// const finalRes = await result;
		return result;
	}
	const data = await getFromRedis();
	console.log("data:", data);
	res.status(200).send(data);
};

app.get("/data", (req, res, next) => {
	db.query(`SELECT * FROM main.codeEditor`, (err, result, fields) => {
		if (err) res.send(err);
		else res.send(result);
	});
});

app.delete("/data/:id", (req, res, next) => {
	const idToDelete = req.params.id;

	// Check if ID is provided
	if (!idToDelete) {
		res.status(400).send({
			error: "ID is missing in the request parameters",
		});
		return;
	}

	// Execute the delete query
	db.query(
		`DELETE FROM main.codeEditor WHERE id = ?`,
		[idToDelete],
		(err, result) => {
			if (err) {
				console.log(
					`Error deleting record with ID ${idToDelete}:`,
					err
				);
				res.status(500).send({ error: "Internal server error" });
				return;
			}

			if (result.affectedRows === 0) {
				// No rows affected, indicating no record found with the provided ID
				res.status(404).send({
					error: "Record not found with the provided ID",
				});
				return;
			}

			// Record deleted successfully
			console.log(`Record with ID ${idToDelete} deleted successfully.`);
			res.send({ message: "Record deleted successfully." });
		}
	);
});

app.listen(9999, () => console.log("Express: 9999"));
