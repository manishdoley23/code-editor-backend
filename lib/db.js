import mysql from "mysql";
import "dotenv/config";

export const db = mysql.createConnection({
	host: process.env.RDS_HOSTNAME,
	user: process.env.RDS_USERNAME,
	password: process.env.RDS_PASSWORD,
	port: process.env.RDS_PORT,
});

// db.connect((err) => {
// 	if (err) {
// 		console.log("Err:", err);
// 		return;
// 	}

// 	db.query("CREATE DATABASE IF NOT EXISTS main;");
// 	db.query("USE main;");
// 	db.query(
// 		"CREATE TABLE IF NOT EXISTS codeEditor(id int NOT NULL AUTO_INCREMENT, username varchar(30), code varchar(255), prefLang varchar(30), stdInt varchar(100), PRIMARY KEY(id));",
// 		(err, result, field) => {
// 			if (err) {
// 				throw err;
// 			}
// 			console.log({ result, field });
// 		}
// 	);

// 	console.log("Connected");
// 	db.end();
// });
