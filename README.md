# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

## Math Formula Support

The rich text editor supports inserting mathematical formulas using LaTeX syntax powered by [KaTeX](https://katex.org/).

### How to Insert Math Formulas

1. **In the Rich Text Editor**: Click the **Σ (Sigma)** button in the toolbar.
2. A dialog will open with quick-insert buttons for common functions.
3. Type your LaTeX formula or click function shortcuts to build your expression.
4. Click **Beillesztés** to insert the formula into the document.

### Supported Functions

The quick-insert panel includes shortcuts for:

- **Trigonometric**: `sin(x)`, `cos(x)`, `tan(x)`, `cot(x)`, `sec(x)`, `csc(x)`
- **Roots & Powers**: `√x`, `ⁿ√x`, `x²`, `xⁿ`
- **Logarithms**: `log(x)`, `ln(x)`
- **Calculus**: `∫` (integral), `d/dx` (derivative), `∂/∂x` (partial derivative), `lim` (limit)
- **Summations & Products**: `∑` (sum), `∏` (product)
- **Symbols**: `π`, `∞`, `±`, `≤`, `≥`, `≠`, `≈`, `÷`, `×`
- **Fractions**: `a/b`

### LaTeX Syntax Examples

```latex
\sin(x) + \cos(x)          # Trigonometric functions
\frac{a}{b}                # Fractions
\sqrt{x}                   # Square root
\sqrt[3]{x}                # Cube root
x^{2}                      # Superscript
\int_{0}^{\infty} f(x) dx  # Integral with limits
\frac{d}{dx} f(x)          # Derivative
\lim_{x \to \infty} f(x)   # Limit
```

For full LaTeX syntax, see the [KaTeX documentation](https://katex.org/docs/supported.html).

