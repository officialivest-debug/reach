import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reachinvestment.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/waitlist", "/auth/login", "/onboarding"],
        disallow: ["/dashboard/", "/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
