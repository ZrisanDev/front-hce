/**
 * Shared shadcn (base-nova style, powered by @base-ui/react) UI kit.
 *
 * Installed via `bunx shadcn add ...` against packages/shared/components.json.
 * Generated files import `cn` from `../lib` (relative) so they resolve correctly
 * when consumers bundle this package via `transpilePackages` — never via the
 * consumer's own `@/*` alias.
 *
 * Re-exported here so zones can do:
 *   import { Button, Input, Dialog } from "@hce/shared/ui";
 *
 * NOTE: `form` is intentionally absent. The base-nova style registry does not
 * ship a `form` component (and @base-ui/react exposes no `Slot` subpath to build
 * one faithfully against). PR4 zone forms use `react-hook-form` + `zod` directly
 * (the deps are already declared on this package) or a thin local wrapper built
 * against the real base-ui API at that time.
 */

export * from "./alert";
export * from "./avatar";
export * from "./badge";
export * from "./breadcrumb";
export * from "./button";
export * from "./card";
export * from "./collapsible";
export * from "./data-table";
export * from "./dialog";
export * from "./dropdown-menu";
export * from "./input";
export * from "./label";
export * from "./select";
export * from "./separator";
export * from "./sheet";
export * from "./sidebar";
export * from "./skeleton";
export * from "./sonner";
export * from "./table";
export * from "./tooltip";
