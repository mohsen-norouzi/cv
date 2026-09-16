// Called only with the current device coordinates after “Use my location”.
// No background lookup, IP fallback, or persistent location storage.
export async function resolveCity(
	latitude,
	longitude,
	{ signal, fetchImpl = fetch, timeoutMs = 5000 } = {},
) {
	if (
		!Number.isFinite(latitude) ||
		Math.abs(latitude) > 90 ||
		!Number.isFinite(longitude) ||
		Math.abs(longitude) > 180 ||
		signal?.aborted
	)
		return null;
	const controller = new AbortController();
	const cancel = () => controller.abort();
	signal?.addEventListener("abort", cancel, { once: true });
	const timer = setTimeout(cancel, timeoutMs);
	try {
		const url = new URL(
			"https://api.bigdatacloud.net/data/reverse-geocode-client",
		);
		url.search = new URLSearchParams({
			latitude,
			longitude,
			localityLanguage: "en",
		});
		const response = await fetchImpl(url, {
			signal: controller.signal,
			credentials: "omit",
		});
		if (!response.ok) return null;
		const data = await response.json();
		if (controller.signal.aborted) return null;
		return (
			[data?.city, data?.locality]
				.find((value) => typeof value === "string" && value.trim())
				?.trim() || null
		);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", cancel);
	}
}
