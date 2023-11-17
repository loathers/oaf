declare module "convert-svg-to-png" {
  import { LaunchOptions, BrowserLaunchArgumentOptions } from "puppeteer";

  type Options = {
    allowDeprecatedAttributes: boolean;
    background: string;
    baseFile: string;
    baseUrl: string;
    height: number | string;
    puppeteer: LaunchOptions & BrowserLaunchArgumentOptions;
    rounding: "ceil" | "floor" | "round";
    scale: number;
    width: number | string;
  };

  function convert(
    input: Buffer | string,
    options?: Partial<Options>,
  ): Promise<Buffer>;

  export = {
    convert,
  };
}
