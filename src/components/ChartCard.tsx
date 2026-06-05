import { useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@/theme/ThemeProvider';
import { APEX_THEME, ensureApexTheme, refreshApexTheme } from '@/theme/echartsApexTheme';
import { Card } from './Card';

interface Props {
  title?: string;
  option: EChartsOption;
  height?: number;
  events?: Record<string, (params: unknown) => void>;
}

export function ChartCard({ title, option, height = 300, events }: Props) {
  const { mode, accent } = useTheme();
  ensureApexTheme();

  // re-register theme whenever mode/accent changes so charts re-color
  useEffect(() => {
    refreshApexTheme();
  }, [mode, accent]);

  // remount the chart on theme change by keying it
  const key = useMemo(() => `${mode}:${accent}`, [mode, accent]);

  return (
    <Card>
      {title && (
        <div
          style={{
            fontWeight: 800,
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 12,
            paddingBottom: 10,
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          {title}
        </div>
      )}
      <ReactECharts key={key} theme={APEX_THEME} option={option} style={{ height }} notMerge lazyUpdate onEvents={events} />
    </Card>
  );
}
