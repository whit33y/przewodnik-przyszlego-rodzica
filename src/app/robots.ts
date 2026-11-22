import type { MetadataRoute } from "next";

/** A demo that simulates a government login must not be indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
