// 类型 shim：让 vue-tsc 绕开 node_modules/flint-chart 中 TS 4.5+ 语法的 .d.ts。
// Vite 2.x 不读 tsconfig paths，所以这里只影响类型检查，不影响运行时打包（运行时仍走真实包）。
// 当前项目只用到了 assembleECharts（值）和 ChartAssemblyInput（类型），
// 后续若引入 flint-chart 的更多 API，请在此处补上对应声明。

export type ChartAssemblyInput = any;

export function assembleECharts(input: ChartAssemblyInput): any;
