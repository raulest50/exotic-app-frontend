const basePath = import.meta.env.BASE_URL;

// Takes a router path or a public asset path, without a deployment prefix.
export const deploymentPath = (path: string): string =>
    `${basePath}${path.replace(/^\/+/, "")}`;

// Root deployments retain their existing keys. Path deployments use separate keys.
export const deploymentStorageKey = (key: string): string =>
    basePath === "/" ? key : `${basePath}${key}`;

// Converts a physical browser path to a router path; rejects other deployments.
export const toRouterPath = (path: string): string | null => {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
    if (basePath === "/") return path;
    if (path.startsWith(basePath)) return `/${path.slice(basePath.length)}`;

    const baseWithoutSlash = basePath.replace(/\/$/, "");
    if (path === baseWithoutSlash || path.startsWith(`${baseWithoutSlash}?`) || path.startsWith(`${baseWithoutSlash}#`)) {
        return `/${path.slice(baseWithoutSlash.length)}`;
    }
    return null;
};

// Reject paths whose interpretation can change after URL/proxy normalization.
export const isUnambiguousPath = (pathname: string): boolean =>
    !pathname.includes("\\")
    && !pathname.includes("//")
    && !/\s/.test(pathname)
    && !/%(?:2e|2f|5c|25)/i.test(pathname)
    && !pathname.split("/").some(segment => segment === "." || segment === "..");
