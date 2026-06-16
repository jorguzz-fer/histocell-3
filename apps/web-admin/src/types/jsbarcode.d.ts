declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
    margin?: number
    background?: string
    lineColor?: string
    textMargin?: number
  }
  function JsBarcode(
    element: Element | string | null,
    data: string,
    options?: JsBarcodeOptions,
  ): void
  export default JsBarcode
}
