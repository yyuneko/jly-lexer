import { macros, dict } from "./types";

class Lexer {
  done: boolean;
  lex_data?: string;
  lex_regex?: RegExp;
  lex_pos: number;
  lex_data_len: number;
  fname2token: { [name: string]: string };
  lineno: number;
  colno: number;
  yytext: string;
  regex_list?: { name: string; r: string }[];
  lex_regex_func: {
    [name: string]: (t: { yytext: string; lexer: Lexer }) => string | void;
  };
  error_handle?: (t: { yytext: string; lexer: Lexer }) => string | void;
  constructor(dict: dict, input?: string) {
    this.done = false;
    this.lex_regex_func = {};
    this.lex_pos = 0;
    this.lex_data_len = 0;
    this.fname2token = {};
    this.lineno = 1;
    this.colno = 1;
    this.yytext = "";
    dict.rules = this.prepareRules(dict);
    this.processGrammar(dict);
    this.input(input);
  }

  /**
   * @brief expand all macros
   * @param macros
   * @returns macros
   */
  prepareMacros(macros?: macros) {
    if (typeof macros === "undefined") {
      return macros;
    }
    let finished = false;
    while (!finished) {
      finished = true;
      Object.keys(macros).forEach((macroName) => {
        const oldMacro = macros[macroName];
        Object.keys(macros).forEach((_macroName) => {
          if (macroName !== _macroName) {
            macros[macroName] = macros[macroName].split(`{${_macroName}}`).join(`(${macros[_macroName]})`);
          }
        });
        if (macros[macroName] !== oldMacro) {
          finished = false;
        }
      });
    }
    return macros;
  }

  /**
   * @brief replace macros in rules with macros which are expanded
   * @param  dict
   * @returns rules
   */
  prepareRules(dict: dict) {
    dict.macros = this.prepareMacros(dict.macros) || {};
    for (let i = 0; i < dict.rules.length; ++i) {
      if (dict.rules[i].r instanceof RegExp) {
        dict.rules[i].r = (dict.rules[i].r as RegExp).source;
        continue;
      }
      Object.keys(dict.macros).forEach((macroName: string) => {
        dict.rules[i].r = (dict.rules[i].r as string)
          .split(`{${macroName}}`)
          .join(`(${dict.macros?.[macroName] ?? ""})`);
      });
      dict.rules.slice(0,i).forEach(rule=>{
        dict.rules[i].r=(dict.rules[i].r as string)
            .split(`{${rule.name}}`)
            .join(`(${rule.r})`);
      });
    }
    return dict.rules;
  }

  /**
   *
   * @param  dict
   * @returns dict
   */
  processGrammar(dict: dict) {
    if (!dict.tokens) dict.tokens = [];
    if (typeof dict.tokens === "string") {
      dict.tokens = dict.tokens.split(/\s+/).filter((token) => token);
    }

    if (dict.rules) {
      this.regex_list = [];
      for (const rule of dict.rules) {
        if (rule.name === "error") {
          this.error_handle = rule.func;
        } else if (rule.r && rule.name) {
          this.regex_list.push({
            name: rule.name,
            r: `(?<${rule.name}>${rule.r})`,
          });
          if (rule.name === "skip") {
            continue;
          } else if (rule.func) {
            if (this.lex_regex_func[rule.name]) {
              throw Error(`Duplicate name is not allowed: '${rule.name}'`);
            }
            this.lex_regex_func[rule.name] = rule.func;
          } else {
            if (dict.tokens.includes(rule.r as string)) {
              this.fname2token[rule.name] = rule.r as string;
            } else if (dict.tokens.includes(rule.name)) {
              this.fname2token[rule.name] = rule.name;
            } else {
              console.error(`token '${rule.r}' undefined`);
            }
          }
        } else {
          throw Error("Illegal rule!");
        }
      }
      this.lex_regex = new RegExp(this.regex_list.map((item) => item.r).join("|"), "y");
      this.lex_regex.lastIndex = 0;
    }
  }

  /**
   * @brief set new input, reset the lexer
   * @param data:String
   */
  input(data?: string) {
    if (!data) return;
    this.lex_data = data;
    this.lex_pos = 0;
    this.lex_data_len = data.length;
    this.yytext = "";
    this.lineno = 1;
    this.colno = 1;
    this.done = false;
    if (this.lex_regex) this.lex_regex.lastIndex = 0;
  }

  next(): string | false {
    if (!this.lex_regex || !this.regex_list?.length || !this.lex_data) {
      this.done = true;
      return "EOF";
    }
    this.yytext = "";
    if (this.lex_pos >= this.lex_data_len) {
      this.done = true;
    }
    if (this.done) {
      return "EOF";
    }
    let groups = this.lex_regex.exec(this.lex_data ?? "")?.groups;
    if (groups) {
      let tokenType;
      while (groups) {
        let index = -1;
        for (const key of Object.keys(groups)) {
          if (groups[key] !== undefined && groups[key].length > this.yytext.length) {
            tokenType = key;
            this.yytext = groups[key];
            index = this.regex_list.map((item) => item.name).indexOf(key);
            this.lex_regex.lastIndex = this.lex_pos + this.yytext.length;
            break;
          }
        }
        if (index === -1) break;
        groups = (() => {
          const re = new RegExp(
            this.regex_list
              .slice(index + 1)
              .map((item) => item.r)
              .join("|"),
            "y",
          );
          re.lastIndex = this.lex_pos;
          return re;
        })().exec(this.lex_data ?? "")?.groups;
      }
      this.lex_pos = this.lex_regex.lastIndex;
      if (tokenType && this.lex_regex_func[tokenType]) {
        const funcResult = this.lex_regex_func[tokenType].call(this, {
          yytext: this.yytext,
          lexer: this,
        });
        if (funcResult != undefined) {
          return funcResult;
        }
        return false;
      } else if (tokenType) {
        if (tokenType === "skip") return false;
        return this.fname2token[tokenType];
      }
    } else {
      // No match, see if error_handle if defined
      if (this.error_handle) {
        const res = this.error_handle({
          yytext: this.lex_data[this.lex_pos],
          lexer: this,
        });
        this.lex_pos++;
        this.lex_regex.lastIndex = this.lex_pos;
        return res ?? false;
      } else {
        console.error(`Illegal character '${this.lex_data[this.lex_pos]}' at index ${this.lex_pos}`);
        this.lex_pos++;
        this.lex_regex.lastIndex = this.lex_pos;
        this.done = true;
        return "EOF";
      }
    }
    // never
    return false;
  }

  lex(): string {
    const r = this.next();
    if (r !== false) {
      return r;
    } else {
      return this.lex();
    }
  }
}

export default Lexer;
