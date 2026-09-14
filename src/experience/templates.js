// Previews use 16:9 posters and optional muted videos. Leave previewUrl null until ready.
export const TEMPLATES = [
	{
		id: "quiet-eaves",
		title: "Quiet Eaves",
		description:
			"An atmospheric journey through seven quiet landscapes, with cinematic transitions and ambient sound.",
		image: "/templates/quite-eaves.jpg",
		imageAlt: "Quiet Eaves website preview",
		video: "/templates/quite-eaves.mp4",
		previewUrl: "https://eaves-seven.vercel.app/",
	},
	{
		id: "neko",
		title: "Neko",
		description:
			"A playful cat café and little shop, with glowing particle cats and gentle interactive moments.",
		image: "/templates/neko.png",
		imageAlt: "Neko cat café website preview",
		video: "/templates/neko.mp4",
		previewUrl: "https://neko-cats.vercel.app/",
	},
	...Array.from({ length: 4 }, (_, i) => {
		const index = i + 2;
		return {
			id: `template-${index + 1}`,
			title: `Template ${String(index + 1).padStart(2, "0")}`,
			description:
				"A little space for something new. Template details will appear here soon.",
			image: "/images/template-placeholder.svg",
			imageAlt: "Website preview placeholder",
			previewUrl: null,
		};
	}),
];

// Only actual web previews should become external links.
export function getPreviewUrl(template) {
	try {
		const url = new URL(template.previewUrl);
		return ["https:", "http:"].includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}
