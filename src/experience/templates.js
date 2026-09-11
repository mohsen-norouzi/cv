// Replace each placeholder with your title, description, image and preview URL.
// Images use a 16:9 ratio; 1920 × 1080 is ideal. Leave previewUrl null until ready.
export const TEMPLATES = Array.from({ length: 6 }, (_, index) => ({
	id: `template-${index + 1}`,
	title: `Template ${String(index + 1).padStart(2, "0")}`,
	description:
		"A little space for something new. Template details will appear here soon.",
	image: "/images/template-placeholder.svg",
	imageAlt: "Website preview placeholder",
	previewUrl: null,
}));

// Only actual web previews should become external links.
export function getPreviewUrl(template) {
	try {
		const url = new URL(template.previewUrl);
		return ["https:", "http:"].includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}
