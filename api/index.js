import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import "dotenv/config";

import { db } from "../lib/db.js";
import { getDataFromRedis, setDataToRedis } from "../lib/redis.js";

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

const asyncHandler = (func) => (req, res, next) => {
	Promise.resolve(func(req, res, next)).catch(next);
};

app.get("/", (req, res, next) => {
	res.send({
		"/data": "Get all the submissions",
	});
});

app.post(
	"/submitCode",
	asyncHandler(async (req, res, next) => {
		console.log("req:", req.body);
		if (
			req.body.code === "" ||
			req.body.prefLang === "" ||
			req.body.stdInt === "" ||
			req.body.username === "" ||
			req.body.submissions === ""
		) {
			console.log("req.body.submissions:", req.body.submissions);
			throw new Error("Error in submit");
		}

		const storeInCache = {
			code: req.body.code,
			stdInt: req.body.stdInt,
			prefLang: req.body.prefLang,
			username: req.body.username,
			submissions: req.body.submissions,
		};
		const redisKey = btoa(`${req.body.username}${req.body.code}`);
		const dataFromRedis = await getDataFromRedis(redisKey);
		if (dataFromRedis === null) {
			setDataToRedis(redisKey, storeInCache);
		}

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
	})
);

const cacheFunction = async (req, res, next) => {
	try {
		const redisKey = btoa(`${req.body.username}${req.body.code}`);
		const data = await getDataFromRedis(redisKey);
		if (data === null) {
			next();
		} else {
			res.status(200).send(data);
		}
	} catch (error) {
		console.log("Error in cachefunction");
		next(error);
	}
};

app.get("/data", (req, res) => {
	db.query(`SELECT * FROM main.codeEditor`, (err, result, fields) => {
		if (err) res.send(err);
		else res.send(result);
	});
});

app.post(
	"/data",
	cacheFunction,
	asyncHandler(async (req, res, next) => {
		try {
			db.query(
				`SELECT * FROM main.codeEditor WHERE username = ? AND code = ?`,
				[username, code],
				(err, result, fields) => {
					if (err) {
						console.error(
							"Error fetching data from SQL server:",
							err
						);
						res.status(500).send({
							error: "Internal server error",
						});
						return;
					}

					if (result.length === 0) {
						res.status(404).send({ error: "Data not found" });
						return;
					}
					setDataToRedis(redisKey, result);
					res.status(200).send(result);
				}
			);
		} catch (err) {
			next(err);
		}
	})
);

app.delete("/data/:id", (req, res, next) => {
	const idToDelete = req.params.id;

	if (!idToDelete) {
		res.status(400).send({
			error: "ID is missing in the request parameters",
		});
		return;
	}
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
				res.status(404).send({
					error: "Record not found with the provided ID",
				});
				return;
			}
			res.send({ message: "Record deleted successfully." });
		}
	);
});

app.delete(
	"/deleteAll",
	asyncHandler(async (req, res, next) => {
		db.query(`DELETE FROM main.codeEditor`, (err, result) => {
			if (err) {
				console.error("Error deleting all records:", err);
				res.status(500).send({ error: "Internal server error" });
				return;
			}

			res.status(200).send({
				message: "All records deleted successfully.",
			});
		});
	})
);

const server = app.listen(process.env.PORT || 7878, () =>
	console.log(`Express server running on port ${process.env.PORT}`)
);

process.on("SIGINT", () => {
	console.log("Server is shutting down...");
	server.close(() => {
		console.log("Express server shut down");
		db.end((err) => {
			if (err) {
				console.error("Error closing database connection:", err);
				process.exit(1);
			}
			console.log("Database connection closed");
			process.exit(0);
		});
	});
});

process.on("SIGTERM", () => {
	console.log("Server is shutting down...");
	server.close(() => {
		console.log("Express server shut down");
		db.end((err) => {
			if (err) {
				console.error("Error closing database connection:", err);
				process.exit(1);
			}
			console.log("Database connection closed");
			process.exit(0);
		});
	});
});
export default app;
