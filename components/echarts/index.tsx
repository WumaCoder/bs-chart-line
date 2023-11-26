import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function ECharts(props: any) {
  const { option } = props;
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chart = echarts.init(chartRef.current!);
    console.log(chart);
    chart.setOption(option);
    if (props.refInstance) props.refInstance.current = chart;
    return () => {
      chart.dispose();
    };
  }, [option, props.refInstance]);
  return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
}
