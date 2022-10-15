import Lexer from "../lib/lexer-based-on-regex";
import { describe, expect, test } from "@jest/globals";

class Token {
    constructor(type, value, lineno, lexpos) {
        this.type = type;
        this.value = value;
        this.lineno = lineno;
        this.lexpos = lexpos;
    }

    toString() {
        return `type: ${this.type}\nvalue: ${this.value}\nlineno: ${this.lineno}\ncolno:${this.lexpos}\n\n`;
    }
}
describe("#lexer-based-on-regex", () => {
    test("test basic matchers", () => {
        const dict = {
            macros: {}, rules: [{
                r: "x", name: "test1", func: function (t) {
                    return t.yytext.toUpperCase();
                }
            }, {
                r: "y", name: "test2", func: function (t) {
                    return t.yytext.toUpperCase();
                }
            }, /*{
                name: "error", func: function (t) {
                    console.error(`出现错误: ${t}`)
                }
            }*/], tokens: "X Y "
        };
        const input = "xxyx";
        const lexer = new Lexer(dict, input);
        expect(lexer.lex()).toBe("X");
        expect(lexer.lex()).toBe("X");
        expect(lexer.lex()).toBe("Y");
        expect(lexer.lex()).toBe("X");
        expect(lexer.lex()).toBe("EOF");
    });

    test("宏+复杂处理函数", () => {
        const dict = {
            macros: {
                "digit": "[0-9]",
                "esc": "\\\\",
                "int": "-?(?:[0-9]|[1-9][0-9]+)",
                "exp": "(?:[eE][-+]?[0-9]+)",
                "frac": "(?:\\.[0-9]+)"
            }, rules: [{
                r: "\\n", name: "new_line", func: function (t) {
                    t.lexer.lineno++;
                    t.lexer.colno = 1;
                }
            }, {
                r: "[ \\t\\r\\a]+", name: "skip",
            }, {
                r: "{int}{frac}?{exp}?\\b", name: "number", func: function (t) {
                    return "NUMBER";
                }
            }, {
                r: "\"(?:{esc}[\"bfnrt/{esc}]|{esc}u[a-fA-F0-9]{4}|[^\"{esc}])*\"", name: "string", func: function (t) {
                    t.lexer.yytext = t.lexer.yytext.substring(1, t.lexer.yytext.length - 1);
                    return "STRING";
                }
            }, {
                r: "\\[", name: "l_bracket"
            }, {
                r: "\\]", name: "r_bracket"
            }, {
                r: /\{/, name: "l_brace"
            }, {
                r: "\\}", name: "r_brace"
            }, {
                r: ",", name: "comma"
            }, {
                r: ";", name: "semi"
            }, {
                r: "true\\b", name: "true", func: function (t) {
                    return "TRUE";
                }
            }, {
                r: "false\\b", name: "false", func: function (t) {
                    return "FALSE";
                }
            }, {
                r: "null\\b", name: "null", func: function (t) {
                    return "NULL";
                }
            }], tokens: "STRING NUMBER l_brace l_bracket r_brace r_bracket semi comma TRUE FALSE NULL"
        };
        const input = `{
            "hello world";
            123.789,
        }`;
        const lexer = new Lexer(dict, input);
        expect(lexer.lex()).toBe("l_brace");
        expect(lexer.lex()).toBe("STRING");
        expect(lexer.lex()).toBe("semi");
        expect(lexer.lex()).toBe("NUMBER");
        expect(lexer.lex()).toBe("comma");
        expect(lexer.lex()).toBe("r_brace");
    });
    test("c minus", () => {
        const dict = {
            tokens: [
                //Keywords
                "INT", "FLOAT", "FOR", "IF", "ELSE", "WHILE", "IN",
                //Comment
                "COMMENT",
                // Program
                "PROGRAM",
                // Literals (identifier, integer=<NUM> , float=<REAL> constant, string constant, char const)
                "IDENTIFIER", "NUM", "NUM_OCT", "NUM_HEX", "REAL",

                // Operators (+,-,*,/,%,|,&,~,^,<<,>>, ||, &&, !, <, <=, >, >=, ==, !=)
                "PLUS", "MINUS", "TIMES", "DIVIDE", "MODULO", "OR", "AND", "NOT", "XOR", "LSHIFT", "RSHIFT", "LOR", "LAND", "LNOT", "LT", "LE", "GT", "GE", "EQ", "NE",

                // Assignment (=, *=, /=, %=, +=, -=, <<=, >>=, &=, ^=, |= , :=)
                "EQUALS", "TIMESEQUAL", "DIVEQUAL", "MODEQUAL", "PLUSEQUAL", "MINUSEQUAL", "LSHIFTEQUAL", "RSHIFTEQUAL", "ANDEQUAL", "XOREQUAL", "OREQUAL", "COLONEQUAL",

                // Increment/decrement (++,--)
                "INCREMENT", "DECREMENT",

                // Delimeters ( ) [ ] { } , .. ; :
                "LPAREN", "RPAREN", "LBRACKET", "RBRACKET", "LBRACE", "RBRACE", "COMMA", "DPERIOD", "SEMI",

                // Ellipsis (...)
                "ELLIPSIS",

                // Ternary operator (?)
                "TERNARY",

                "IGNORE",],
            rules: [
                {
                    r: "[ \\t\\r]+", name: "skip"
                },
                {
                    r: "\\b[Pp][Rr][Oo][Gg][Rr][Aa][Mm]\\b", name: "program".toUpperCase(),
                }, {
                    r: "\\b[Ii][Nn][Tt]\\b", name: "int".toUpperCase()
                }, {
                    r: "\\b[Ff][Ll][Oo][Aa][Tt]\\b", name: "float".toUpperCase()
                }, {
                    r: "\\b[Ff][Oo][Rr]\\b", name: "for".toUpperCase()
                }, {
                    r: "\\b[iI][fF]\\b", name: "if".toUpperCase()
                }, {
                    r: "\\b[Ee][Ll][Ss][Ee]\\b", name: "else".toUpperCase()
                },
                {
                    r: "\\b[wW][hH][iI][lL][eE]\\b", name: "while".toUpperCase()
                }, {
                    r: "\\b[iI][nN]\\b", name: "in".toUpperCase()
                }, {
                    r: "\\b[A-Za-z_][A-Za-z0-9_]*\\b", name: "identifier".toUpperCase()
                }, {
                    r: "\\b(0)(\\d+)\\b", name: "num_oct", func: function (t) {
                        try {
                            t.lexer.yytext = parseInt(t.lexer.yytext, 8).toString();
                            return "NUM";
                        } catch (e) {
                            this.error_handle(t, e);
                        }
                    }
                }, {
                    r: "\\b(0x)(\\d+)\\b", name: "num_hex", func: function (t) {
                        try {
                            t.lexer.yytext = parseInt(t.lexer.yytext, 16).toString();
                            return "NUM";
                        } catch (e) {
                            this.error_handle(t, e);
                        }
                    }
                }, {
                    r: "\\b\\d+\\.\\d+\\b", name: "real", func: function () {
                        return "REAL";
                    }
                }, {
                    r: "\\b\\d+\\b", name: "num", func: function (t) {
                        return "NUM";
                    }
                }, { r: "\\(", name: "LPAREN" }, { r: "\\)", name: "RPAREN" }, { r: "\\[", name: "LBRACKET" }, {
                    r: "\\]", name: "RBRACKET"
                }, { r: "\\{", name: "LBRACE" }, { r: "\\}", name: "RBRACE" }, { r: ",", name: "COMMA" }, {
                    r: "\\.\\.", name: "DPERIOD"
                }, { r: ";", name: "SEMI" }, { r: "\\.\\.\\.", name: "ELLIPSIS" }, { r: "\\?", name: "TERNARY" }, {
                    r: "=",
                    name: "EQUALS"
                }, { r: "\\*=", name: "TIMESEQUAL" }, { r: "/=", name: "DIVEQUAL" }, { r: "%=", name: "MODEQUAL" }, {
                    r: "\\+=",
                    name: "PLUSEQUAL"
                }, { r: "-=", name: "MINUSEQUAL" }, { r: "<<=", name: "LSHIFTEQUAL" }, {
                    r: ">>=",
                    name: "RSHIFTEQUAL"
                }, { r: "&=", name: "ANDEQUAL" }, { r: "\\|=", name: "OREQUAL" }, { r: "\\^=", name: "XOREQUAL" }, {
                    r: "\\:=",
                    name: "COLONEQUAL"
                },
                { r: "\\+\\+", name: "INCREMENT" }, { r: "--", name: "DECREMENT" },
                {
                    r: "\\n",
                    name: "new_line",
                    func: function (t) {
                        t.lexer.lineno++;
                        t.lexer.colno = 1;
                    }
                },
                {
                    r: "//.*?(?=\\n)",
                    name: "comment".toUpperCase(),
                    func: function (t) {
                        return "COMMENT";
                    }
                }, { r: "\\+", name: "PLUS" }, { r: "-", name: "MINUS" }, { r: "\\*", name: "TIMES" }, {
                    r: "/",
                    name: "DIVIDE"
                }, { r: "%", name: "MODULO" }, { r: "\\|", name: "OR" }, { r: "&", name: "AND" }, {
                    r: "~",
                    name: "NOT"
                }, { r: "\\^", name: "XOR" }, { r: "<<", name: "LSHIFT" }, { r: ">>", name: "RSHIFT" }, {
                    r: "\\|\\|",
                    name: "LOR"
                }, { r: "&&", name: "LAND" }, { r: "!", name: "LNOT" }, { r: "<", name: "LT" }, {
                    r: ">",
                    name: "GT"
                }, { r: "<=", name: "LE" }, { r: ">=", name: "GE" }, { r: "==", name: "EQ" }, { r: "!=", name: "NE" }
            ]
        };
        const input = `program test{
    // 基本功能
    int a[10][20][5], i, j, k;
    float? b, ?c=1.2;
    int aa=2;
    if((aa%2==1.2+2&&aa==12)||(aa%2==0&&(aa>0||aa==-1)))
        for(i in 1..20) {
            for(i in 1..20) a[3][i-1][0]=k+c;
        }
}`;
        const lexer = new Lexer(dict, input);
        let type, value, lineno, colno, token;
        let str = "";
        do {
            type = lexer.lex();
            if (type && type !== "EOF") {
                value = lexer.yytext;
                if (lineno && lexer.lineno === lineno + 1) str += "\n";
                str += value + " ";
                lineno = lexer.lineno;
                token = new Token(type, value, lineno, lexer.lex_pos);
                // console.log(token.toString());
            }
        } while (!lexer.done);
        expect(str.split("\n").map(item=>item.replace(/\s+$/,"")).join("\n")).toBe(`program test {
// 基本功能
int a [ 10 ] [ 20 ] [ 5 ] , i , j , k ;
float ? b , ? c = 1.2 ;
int aa = 2 ;
if ( ( aa % 2 == 1.2 + 2 && aa == 12 ) || ( aa % 2 == 0 && ( aa > 0 || aa == - 1 ) ) )
for ( i in 1 .. 20 ) {
for ( i in 1 .. 20 ) a [ 3 ] [ i - 1 ] [ 0 ] = k + c ;
}
}`);
    });
});
