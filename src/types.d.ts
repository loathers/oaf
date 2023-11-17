declare module "convert-svg-to-png" {
  type Options = {
    allowDeprecatedAttributes: boolean;
    background: string;
    baseFile: string;
    baseUrl: string;
    height: number | string;
    puppeteer: object;
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
