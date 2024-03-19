import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { db } from "./lib/db.js";

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

app.post("/submitCode", (req, res, next) => {
	console.log("req:", req.body);
	if (
		req.body.code === undefined ||
		req.body.prefLang === undefined ||
		req.body.stdInput === undefined ||
		req.body.username === undefined
	) {
		next("Error in submit");
	}

	db.query(
		`INSERT INTO main.codeEditor (username, code, prefLang, stdInt) VALUES ('${req.body.username}', '${req.body.code}', '${req.body.prefLang}', '${req.body.stdInput}')`,
		(error, result, fields) => {
			if (error) {
				res.status(500).send({ error: "Internal server error" });
			} else {
				res.status(200).send({
					username: req.body.username,
					code: req.body.code,
					prefLang: req.body.prefLang,
					stdInput: req.body.stdInput,
				});
			}
			// if (fields) console.log(fields);
		}
	);

	// res.send({
	// 	statusCode: 200,
	// 	message: "Received",
	// });
});

app.get("/data", (req, res, next) => {
	console.log("Here");

	db.query(`SELECT * FROM main.codeEditor`, (err, result, fields) => {
		if (err) res.send(err);
		else res.send(result);
	});
});

app.delete("/data", (req, res, next) => {
	// Select the database before executing the query
	db.query(`USE main`, (err, useResult) => {
		if (err) {
			console.log("Error selecting database:", err);
			res.status(500).send({ error: "Internal server error" });
			return;
		}

		console.log("Database selected successfully.");

		// Execute the query to create the temporary table
		db.query(
			`CREATE TEMPORARY TABLE tempIds SELECT MAX(id) AS id FROM main.codeEditor`,
			(err, createResult) => {
				if (err) {
					console.log("Error executing CREATE query:", err);
					res.status(500).send({ error: "Internal server error" });
					return;
				}

				console.log("Temporary table created successfully.");

				// Execute the query to delete records based on the temporary table
				db.query(
					`DELETE FROM main.codeEditor WHERE id NOT IN (SELECT id FROM tempIds)`,
					(err, deleteResult) => {
						if (err) {
							console.log("Error executing DELETE query:", err);
							res.status(500).send({
								error: "Internal server error",
							});
							return;
						}

						console.log("Records deleted successfully.");

						// Execute the query to drop the temporary table
						db.query(`DROP TABLE tempIds`, (err, dropResult) => {
							if (err) {
								console.log("Error executing DROP query:", err);
								res.status(500).send({
									error: "Internal server error",
								});
								return;
							}

							console.log(
								"Temporary table dropped successfully."
							);

							// Send response after all queries have been executed successfully
							res.send({
								message:
									"All records except one have been deleted successfully.",
							});
						});
					}
				);
			}
		);
	});
});

app.listen(9999, () => console.log("Express: 9999"));
