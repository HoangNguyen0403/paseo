import { test } from "../support/fixtures";
import { gotoAppShell, openSettings } from "../support/helpers/app";
import { connectDaemonClient } from "../support/helpers/daemon-client-loader";
import { getServerId } from "../support/helpers/server-id";
import {
  expectProviderInstalledInSettings,
  findAcpCatalogProvider,
  installAcpCatalogProvider,
  openAddProviderArea,
  openSettingsHost,
  openSettingsHostSection,
} from "../support/helpers/settings";

const ACP_PROVIDER = {
  id: "minimax-code",
  name: "MiniMax Code",
};

interface ProviderCatalogDaemonClient {
  connect(): Promise<void>;
  close(): Promise<void>;
  patchDaemonConfig(config: { removeProviders?: string[] }): Promise<unknown>;
}

test.describe("ACP provider catalog", () => {
  test("adds MiniMax Code from settings", async ({ page }) => {
    const client = await connectDaemonClient<ProviderCatalogDaemonClient>({
      clientIdPrefix: "provider-catalog-e2e",
    });
    try {
      await gotoAppShell(page);
      await openSettings(page);
      await openSettingsHost(page, getServerId());
      await openSettingsHostSection(page, getServerId(), "providers");
      await openAddProviderArea(page);

      await installAcpCatalogProvider(page, ACP_PROVIDER.name);
      await expectProviderInstalledInSettings(page, ACP_PROVIDER.name);
    } finally {
      await client.patchDaemonConfig({ removeProviders: [ACP_PROVIDER.id] }).catch(() => undefined);
      await client.close().catch(() => undefined);
    }
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`adds Hoplite from the catalog in ${theme} theme`, async ({ page }, testInfo) => {
    const client = await connectDaemonClient<ProviderCatalogDaemonClient>({
      clientIdPrefix: "hoplite-catalog-e2e",
    });
    try {
      await page.addInitScript((value) => {
        localStorage.setItem("@paseo:app-settings", JSON.stringify({ theme: value }));
      }, theme);
      await gotoAppShell(page);
      await openSettings(page);
      await openSettingsHost(page, getServerId());
      await openSettingsHostSection(page, getServerId(), "providers");
      await openAddProviderArea(page);
      await findAcpCatalogProvider(page, "Hoplite");
      await page.screenshot({ path: testInfo.outputPath(`hoplite-catalog-${theme}.png`) });
      await installAcpCatalogProvider(page, "Hoplite");
      await expectProviderInstalledInSettings(page, "Hoplite");
      await page.screenshot({ path: testInfo.outputPath(`hoplite-installed-${theme}.png`) });
    } finally {
      await client.patchDaemonConfig({ removeProviders: ["hoplite"] }).catch(() => undefined);
      await client.close().catch(() => undefined);
    }
  });
}
