import test from "node:test";
import assert from "node:assert/strict";
import { resolveCity } from "../src/experience/locationLabel.js";

// Mocked responses only: never submit test coordinates to the live service.
test("uses the city rather than a district, and sends current coordinates", async () => {
	const city = await resolveCity(35.68, 139.76, {
		fetchImpl: async (url, options) => {
			assert.equal(url.searchParams.get("latitude"), "35.68");
			assert.equal(url.searchParams.get("longitude"), "139.76");
			assert.equal(options.credentials, "omit");
			return {
				ok: true,
				json: async () => ({ city: "Tokyo", locality: "Chiyoda" }),
			};
		},
	});
	assert.equal(city, "Tokyo");
});

test("uses a locality when there is no city and rejects missing names", async () => {
	for (const [data, expected] of [
		[{ city: "  ", locality: " Sitges " }, "Sitges"],
		[{ countryName: "Spain" }, null],
		[{ city: 123 }, null],
	]) {
		assert.equal(
			await resolveCity(41, 2, {
				fetchImpl: async () => ({ ok: true, json: async () => data }),
			}),
			expected,
		);
	}
});

test("lookup failures leave a safe fallback", async () => {
	for (const fetchImpl of [
		async () => {
			throw new Error("offline");
		},
		async () => ({ ok: false }),
		async () => ({
			ok: true,
			json: async () => {
				throw new Error("invalid JSON");
			},
		}),
	])
		assert.equal(await resolveCity(41, 2, { fetchImpl }), null);
});

test("invalid coordinates and cancelled requests never start a lookup", async () => {
	const fetchImpl = () => assert.fail("unexpected network request");
	assert.equal(await resolveCity(NaN, 2, { fetchImpl }), null);
	assert.equal(await resolveCity(91, 2, { fetchImpl }), null);
	assert.equal(await resolveCity(41, 181, { fetchImpl }), null);
	assert.equal(
		await resolveCity(41, 2, { fetchImpl, signal: AbortSignal.abort() }),
		null,
	);
});

test("switching location discards a late result", async () => {
	const controller = new AbortController();
	let finish;
	const pending = resolveCity(41, 2, {
		signal: controller.signal,
		fetchImpl: () =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	});
	controller.abort();
	finish({ ok: true, json: async () => ({ city: "Barcelona" }) });
	assert.equal(await pending, null);
});

test("slow requests time out", async () => {
	assert.equal(
		await resolveCity(41, 2, {
			timeoutMs: 5,
			fetchImpl: (_url, { signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener("abort", () => reject(new Error("aborted")));
				}),
		}),
		null,
	);
});
