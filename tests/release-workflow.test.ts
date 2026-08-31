import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkflow = (name: string): string =>
  readFileSync(resolve(process.cwd(), `.github/workflows/${name}.yml`), "utf8");
const cdWorkflow = readWorkflow("cd");
const ciWorkflow = readWorkflow("ci");

describe("package release trust boundary", () => {
  it("uses exact-main hosted OIDC publication without write tokens", () => {
    expect(cdWorkflow).toContain("runs-on: ubuntu-latest");
    expect(cdWorkflow).toContain("environment: production");
    expect(cdWorkflow).toContain("id-token: write");
    expect(cdWorkflow).toContain("Wait for successful exact-SHA main CI");
    expect(cdWorkflow).toContain("refs/remotes/origin/main");
    expect(cdWorkflow).toContain("-f branch=main");
    expect(cdWorkflow).toContain("-f event=push");
    expect(cdWorkflow).toContain('-f head_sha="${EXPECTED_SHA}"');
    expect(cdWorkflow).toContain('conclusion == "success"');
    expect(cdWorkflow).toContain("Verify release runtime");
    expect(
      cdWorkflow.match(
        /npm install --global npm@11\.6\.2 --ignore-scripts --registry https:\/\/registry\.npmjs\.org/gu,
      ),
    ).toHaveLength(2);
    expect(cdWorkflow).toContain('"11.5.1"');
    expect(cdWorkflow).toContain(
      "Revalidate exact main immediately before npm publication",
    );
    expect(cdWorkflow).toContain(
      "main moved to ${REMOTE_MAIN}; refusing npm publication for ${EXPECTED_SHA}.",
    );
    expect(cdWorkflow).toContain("--provenance");
    expect(cdWorkflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/u);
  });

  it("rejects fork pull requests before running hosted package CI", () => {
    expect(ciWorkflow).toContain("pull_request:");
    expect(ciWorkflow).toContain("Trusted head admission");
    expect(ciWorkflow).toContain("needs: trusted_head");
    expect(ciWorkflow).toContain("runs-on: ubuntu-latest");
    expect(ciWorkflow).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(ciWorkflow).toContain(
      "External fork pull requests cannot be merged until a maintainer moves the reviewed commit to a repository-owned branch.",
    );
    expect(ciWorkflow).not.toContain("self-hosted");
    expect(ciWorkflow).not.toContain("pull_request_target");
  });
});
