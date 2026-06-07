// Tree-shaken ECharts core. We register ONLY the chart types + components the app
// actually uses, so the echarts chunk is a fraction of the full ~1 MB build and the
// >500 kB bundle warning goes away. Any new chart type must be added to echarts.use().
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart, HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  CalendarComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  // charts (bar/line/scatter/heatmap — everything the views draw)
  BarChart,
  LineChart,
  ScatterChart,
  HeatmapChart,
  // components actually referenced by option objects
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  CalendarComponent,
  MarkLineComponent,
  // renderer
  CanvasRenderer,
]);

export { echarts };
export default echarts;
