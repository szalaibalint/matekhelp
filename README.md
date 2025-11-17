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

## User Progress Dashboard

The viewer application includes a comprehensive progress tracking dashboard that displays statistics, completed presentations, and performance over time.

### Features

- **Statistics Overview**: View key metrics including:
  - Total completed presentations
  - Average score across all presentations
  - Number of perfect scores (100%)
  - Presentations currently in progress

- **Recent Activity Chart**: Visual representation of your latest results with:
  - Color-coded progress bars (green for 90+%, blue for 70+%, yellow for 50+%, red for below 50%)
  - Star indicators for perfect scores
  - Top 10 most recent completions

- **In Progress**: Quick access to presentations you've started but haven't completed yet, with:
  - Completion percentage
  - Last accessed date
  - Direct "Continue" button to resume

- **Completed Presentations**: Full list of finished presentations showing:
  - Best score achieved
  - Number of attempts
  - Last completion date
  - Emoji indicators based on performance
  - Quick "Retry" button to improve your score

### Accessing the Dashboard

1. Log in to the viewer application
2. Click on your username in the top-right corner
3. Select "Haladásom" (My Progress) from the dropdown menu
4. Or navigate directly to `/progress`

### Score Tracking

The system automatically tracks:
- Your best score for each presentation
- Total number of attempts
- Progress percentage (based on slides completed)
- User answers for each slide

Scores are calculated based on correct answers and are saved persistently, allowing you to retry presentations and improve your performance.


