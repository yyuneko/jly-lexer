import Lexer from "./lexer-based-on-regex";

export interface macros {
  [macroName: string]: string;
}
export interface dict {
  macros?: macros;
  rules: {
    name: string;
    r: RegExp | string;
    func?: (t: { yytext: string; lexer: Lexer }) => string | void;
  }[];
  tokens: string | string[];
}
