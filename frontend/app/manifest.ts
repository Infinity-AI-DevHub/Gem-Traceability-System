import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Origin Gemstone Operations",
    short_name: "Origin",
    description: "Gemstone inventory, custody and operations management.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f3ee",
    theme_color: "#14372f",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
