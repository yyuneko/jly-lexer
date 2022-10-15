# Usage

```typescript
type dict = {
    macros?: {
        [macrosName: string]: string // a macro is allowed to contain any number of other macros
    };
    rules: {
        r: string; // a regular expression after escaped, use `{one_macro}` to insert a macro
        name: string;
        func?: (t: (undefined | { yytext: string; lexer: any })) => (string | undefined);
        // if return undefined, value of `name` will be the type of token for this rule
    }[];
    tokens: (string[]) | string // if tokens is string, the finally tokens will be tokens.split(/ +/)
}
// the token types from `rules` must be included in `tokens`
// if there are mutiple rules matching at the same time, the last defined rule will be adopted
```

example:

```javascript
let dict = {
    macros: {
        "int": "-?(?:[0-9]|[1-9][0-9]+)",
        "exp": "(?:[eE][-+]?[0-9]+)",
        "frac": "(?:\\.[0-9]+)"
    },
    rules: [{
        r: "{int}{frac}?{exp}?\\b",
        name: "number",
        func: function (t) {
            return 'NUMBER';
        }
    }, {
        r: "\\n", name: "new_line", func: function (t) {
            t.lexer.lineno++;
        }
    }, {
        r: "[ \\t\\r\\a]+", name: "skip", // if `name` is skip, the text that match this rule will be ignored
    },],
    tokens: "NUMBER"
};
let input = `123.6e-12
4   5
10e12
`;
let lexer = new Lexer(dict, input);
while (true) {
    let type = lexer.lex();
    if (type === "EOF") break;
    console.log(type, lexer.yytext);
}
/*
output:
NUMBER 123.6e-12
NUMBER 4
NUMBER 5
NUMBER 10e12
*/
```
