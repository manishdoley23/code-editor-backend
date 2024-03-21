import { createClient } from "redis";
import "dotenv/config";

const client = createClient({
	url: `redis://default:${process.env.REDIS_TOKEN}@${process.env.REDIS_URL}:46730`,
});

client.on("error", function (err) {
	throw err;
});
await client.connect();

export const getDataFromRedis = async (redisKey) => {
	try {
		const serializedData = await client.get(redisKey);
		const data = JSON.parse(serializedData);
		return data;
	} catch (error) {
		console.log("Error in getting data from redis");
		throw error;
	}
};

export const setDataToRedis = async (redisKey, data) => {
	try {
		const serializedData = JSON.stringify(data);
		await client.set(redisKey, serializedData);
	} catch (error) {
		console.log("Error in setting data to redis");
		throw error;
	}
};
