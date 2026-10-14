// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { TERMINAL_PROFILE_ICON_NAMES } from "@getpaseo/protocol/provider-icon-names";
import { ACP_PROVIDER_ICON_SVGS } from "@/assets/acp-provider-icons";
import { Bot } from "lucide-react-native";
import { SvgXml } from "react-native-svg";
import { afterEach, describe, expect, it } from "vitest";
import { replaceProviderSnapshotIcons } from "@/data/provider-icons";
import { useProviderIcon, useProviderIcons, type ProviderIconComponent } from "./provider-icons";

afterEach(cleanup);

function renderIcon(Component: ProviderIconComponent) {
  if (typeof Component !== "function") throw new Error("Expected a function component");
  return (Component as (props: { size: number; color: string }) => unknown)({
    size: 18,
    color: "#123456",
  });
}

describe("useProviderIcon", () => {
  it("renders registered snapshot SVG metadata with the requested size and color", () => {
    const svg = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" /></svg>';
    replaceProviderSnapshotIcons("server-1", [{ provider: "rendered-provider", iconSvg: svg }]);

    const rendered = renderIcon(
      renderHook(() => useProviderIcon("rendered-provider", "server-1")).result.current,
    );

    expect(rendered).toMatchObject({
      type: SvgXml,
      props: { xml: svg, width: 18, height: 18, color: "#123456" },
    });
  });

  it("uses the normal Bot fallback without snapshot SVG metadata", () => {
    replaceProviderSnapshotIcons("server-1", [{ provider: "plain-provider" }]);

    expect(renderHook(() => useProviderIcon("plain-provider", "server-1")).result.current).toBe(
      Bot,
    );
  });
});

it("updates a mounted consumer when the plugin snapshot arrives after mount", () => {
  const serverId = "cold-reload-host";
  const provider = "plugin-provider";
  const svg = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" /></svg>';
  replaceProviderSnapshotIcons(serverId, []);
  const { result, unmount } = renderHook(() => useProviderIcon(provider, serverId));
  expect(result.current).toBe(Bot);
  act(() => replaceProviderSnapshotIcons(serverId, [{ provider, iconSvg: svg }]));
  expect(renderIcon(result.current)).toMatchObject({
    type: SvgXml,
    props: { xml: svg, width: 18, height: 18, color: "#123456" },
  });
  unmount();
});

it("keeps host SVGs isolated, updates replacements, and clears removed icons", () => {
  const provider = "shared-plugin-provider";
  const firstSvg = '<svg id="first" />';
  const secondSvg = '<svg id="second" />';
  replaceProviderSnapshotIcons("first-host", [{ provider, iconSvg: firstSvg }]);
  replaceProviderSnapshotIcons("second-host", [{ provider, iconSvg: secondSvg }]);
  const first = renderHook(() => useProviderIcon(provider, "first-host"));
  const second = renderHook(() => useProviderIcon(provider, "second-host"));
  const firstIcon = first.result.current;
  expect(renderIcon(firstIcon)).toMatchObject({ props: { xml: firstSvg } });
  expect(renderIcon(second.result.current)).toMatchObject({ props: { xml: secondSvg } });
  act(() => replaceProviderSnapshotIcons("second-host", [{ provider, iconSvg: firstSvg }]));
  expect(renderIcon(second.result.current)).toMatchObject({ props: { xml: firstSvg } });
  expect(first.result.current).toBe(firstIcon);
  act(() => replaceProviderSnapshotIcons("second-host", []));
  expect(second.result.current).toBe(Bot);
  expect(first.result.current).toBe(firstIcon);
});

it("updates collection consumers when their host snapshot arrives", () => {
  const serverId = "collection-host";
  const provider = "collection-plugin-provider";
  const svg = '<svg id="collection" />';
  replaceProviderSnapshotIcons(serverId, []);
  const { result } = renderHook(() => useProviderIcons(serverId));
  expect(result.current(provider)).toBe(Bot);
  act(() => replaceProviderSnapshotIcons(serverId, [{ provider, iconSvg: svg }]));
  expect(renderIcon(result.current(provider))).toMatchObject({ props: { xml: svg } });
});

it("renders the shipped Antigravity SVG for a terminal profile icon", () => {
  const { result } = renderHook(() => useProviderIcon("agy"));
  expect(result.current).not.toBe(Bot);
  expect(renderIcon(result.current)).toMatchObject({
    type: SvgXml,
    props: { xml: ACP_PROVIDER_ICON_SVGS.agy, width: 18, height: 18, color: "#123456" },
  });
});

it.each(TERMINAL_PROFILE_ICON_NAMES)(
  "renders terminal icon %s through collection consumers",
  (name) => {
    const { result } = renderHook(() => useProviderIcons());
    expect(renderIcon(result.current(name))).toMatchObject({
      type: SvgXml,
      props: { xml: ACP_PROVIDER_ICON_SVGS[name as keyof typeof ACP_PROVIDER_ICON_SVGS] },
    });
  },
);

it("preserves catalog icons and the unknown icon fallback", () => {
  const catalog = renderHook(() => useProviderIcon("cursor"));
  expect(renderIcon(catalog.result.current)).toMatchObject({
    type: SvgXml,
    props: { xml: ACP_PROVIDER_ICON_SVGS.cursor },
  });
  expect(renderHook(() => useProviderIcon("definitely-not-a-real-icon")).result.current).toBe(Bot);
});
