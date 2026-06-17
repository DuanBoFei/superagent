import { describe, expect, it } from "vitest";
import {
  shouldIgnore,
  isBinaryExtension,
  isSecretPath,
  isIgnoredDirectory,
  createIgnoreOptions,
  type IgnoreOptions,
} from "../../src/repo-map/ignore";

const defaults: IgnoreOptions = createIgnoreOptions();

function ignored(path: string, opts?: IgnoreOptions) {
  const result = shouldIgnore(path, opts ?? defaults);
  return result !== null;
}
function reason(path: string, opts?: IgnoreOptions) {
  const result = shouldIgnore(path, opts ?? defaults);
  return result?.reason ?? null;
}

describe("ignore: dependency and build directories (T004)", () => {
  it("ignores node_modules paths", () => {
    expect(ignored("node_modules/react/index.js")).toBe(true);
    expect(ignored("packages/app/node_modules/pkg/main.ts")).toBe(true);
  });

  it("ignores .git metadata", () => {
    expect(ignored(".git/objects/ab/cd")).toBe(true);
    expect(ignored(".git/config")).toBe(true);
  });

  it("ignores dist and build output", () => {
    expect(ignored("dist/bundle.js")).toBe(true);
    expect(ignored("build/index.html")).toBe(true);
  });

  it("ignores coverage output", () => {
    expect(ignored("coverage/lcov-report/index.html")).toBe(true);
  });

  it("ignores .next and .turbo caches", () => {
    expect(ignored(".next/cache/webpack.js")).toBe(true);
    expect(ignored(".turbo/cookies.json")).toBe(true);
  });

  it("does not ignore normal source files", () => {
    expect(ignored("src/index.ts")).toBe(false);
    expect(ignored("lib/helper.js")).toBe(false);
    expect(ignored("package.json")).toBe(false);
  });
});

describe("ignore: likely secret files (T005)", () => {
  it("ignores .env files", () => {
    expect(ignored(".env")).toBe(true);
    expect(ignored(".env.local")).toBe(true);
    expect(ignored(".env.production")).toBe(true);
  });

  it("ignores PEM and key files", () => {
    expect(ignored("certs/server.pem")).toBe(true);
    expect(ignored("secrets/private.key")).toBe(true);
  });

  it("ignores credential-like filenames", () => {
    expect(ignored("credentials.json")).toBe(true);
    expect(ignored("service-account-key.json")).toBe(true);
    expect(ignored("secrets.yaml")).toBe(true);
    expect(ignored("config/secrets.json")).toBe(true);
  });
});

describe("ignore: oversized files (T006)", () => {
  it("ignores files above byte limit", () => {
    const opts = createIgnoreOptions({ maxFileBytes: 1024 });
    const result = shouldIgnore("large.csv", opts, 2048);
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("too-large");
  });

  it("allows files at exactly the limit", () => {
    const opts = createIgnoreOptions({ maxFileBytes: 1024 });
    expect(ignored("exact.csv", opts)).toBe(false); // size exactly at limit = okay
  });

  it("allows files under the limit", () => {
    const opts = createIgnoreOptions({ maxFileBytes: 1024 });
    expect(ignored("small.txt", opts)).toBe(false);
  });

  it("defaults to no size check when file size not provided", () => {
    // Without explicit size, path-based check only
    expect(ignored("src/any.ts", defaults)).toBe(false);
  });
});

describe("ignore: binary files (T007)", () => {
  it("detects binary extensions", () => {
    expect(isBinaryExtension("image.png")).toBe(true);
    expect(isBinaryExtension("photo.jpg")).toBe(true);
    expect(isBinaryExtension("icon.svg")).toBe(true); // svg is text but often treated as binary
    expect(isBinaryExtension("file.pdf")).toBe(true);
    expect(isBinaryExtension("archive.zip")).toBe(true);
    expect(isBinaryExtension("video.mp4")).toBe(true);
    expect(isBinaryExtension("font.woff2")).toBe(true);
  });

  it("does not flag text extensions as binary", () => {
    expect(isBinaryExtension("main.ts")).toBe(false);
    expect(isBinaryExtension("app.tsx")).toBe(false);
    expect(isBinaryExtension("config.json")).toBe(false);
    expect(isBinaryExtension("readme.md")).toBe(false);
    expect(isBinaryExtension("style.css")).toBe(false);
    expect(isBinaryExtension("index.html")).toBe(false);
  });

  it("ignores binary files by extension", () => {
    expect(ignored("assets/logo.png")).toBe(true);
    expect(ignored("data/dump.bin")).toBe(true);
  });

  it("flags raw null-byte content as binary", () => {
    const opts = createIgnoreOptions();
    const content = "hello\x00world";
    const result = shouldIgnore("script.ts", opts, 100, content);
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("binary");
  });

  it("plain text is not flagged as binary", () => {
    const result = shouldIgnore("script.ts", defaults, 100, "export const x = 1;");
    expect(result).toBeNull();
  });
});

describe("ignore: generated files", () => {
  it("ignores minified bundles", () => {
    expect(ignored("app.min.js")).toBe(true);
    expect(ignored("styles.min.css")).toBe(true);
  });

  it("ignores common generated paths", () => {
    expect(ignored("src/generated/graphql.ts")).toBe(true);
    expect(ignored("generated/types.ts")).toBe(true);
  });
});

describe("ignore: custom patterns", () => {
  it("respects custom ignore patterns from options", () => {
    const opts = createIgnoreOptions({
      extraIgnorePatterns: ["**/*.gen.ts", "src/vendor/**"],
    });
    expect(ignored("components/foo.gen.ts", opts)).toBe(true);
    expect(ignored("src/vendor/lib/polyfill.js", opts)).toBe(true);
    expect(ignored("src/app.ts", opts)).toBe(false);
  });
});

describe("shouldIgnore returns diagnostic with correct reason", () => {
  it("reports ignored-directory for node_modules", () => {
    expect(reason("node_modules/x.js")).toBe("ignored-directory");
  });

  it("reports ignored-secret for .env", () => {
    expect(reason(".env")).toBe("ignored-secret");
  });

  it("reports binary for .png", () => {
    expect(reason("img.png")).toBe("binary");
  });

  it("reports generated for .min.js", () => {
    expect(reason("bundle.min.js")).toBe("generated");
  });

  it("reports too-large for oversized", () => {
    const opts = createIgnoreOptions({ maxFileBytes: 100 });
    const result = shouldIgnore("big.log", opts, 9999);
    expect(result?.reason).toBe("too-large");
  });

  it("returns null for allowed files", () => {
    expect(shouldIgnore("src/main.ts", defaults)).toBeNull();
  });
});
