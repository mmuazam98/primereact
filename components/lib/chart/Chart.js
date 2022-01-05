import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '../utils/Utils';

export const Chart = memo(forwardRef((props, ref) => {
    const chartRef = useRef(null);
    const canvasRef = useRef(null);

    const initChart = () => {
        import('chart.js/auto').then((module) => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }

            if (module && module.default) {
                chartRef.current = new module.default(canvasRef.current, {
                    type: props.type,
                    data: props.data,
                    options: props.options,
                    plugins: props.plugins
                });
            }
        });
    }

    const reinit = () => {
        initChart();
    }

    useImperativeHandle(ref, () => ({
        getCanvas: () => canvasRef.current,
        getChart: () => chartRef.current,
        getBase64Image: () => chartRef.current.toBase64Image(),
        generateLegend: () => chartRef.current && chartRef.current.generateLegend(),
        refresh: () => chartRef.current && chartRef.current.update()
    }));

    useEffect(() => {
        initChart();

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        reinit();
    });

    const className = classNames('p-chart', props.className);
    const style = Object.assign({ width: props.width, height: props.height }, props.style);

    return (
        <div id={props.id} style={style} className={className}>
            <canvas ref={canvasRef} width={props.width} height={props.height}></canvas>
        </div>
    );
}), (prevProps, nextProps) => prevProps.data === nextProps.data && prevProps.options === nextProps.options && prevProps.type === nextProps.type);

Chart.defaultProps = {
    id: null,
    type: null,
    data: null,
    options: null,
    plugins: null,
    width: null,
    height: null,
    style: null,
    className: null
}

Chart.propTypes = {
    id: PropTypes.string,
    type: PropTypes.string,
    data: PropTypes.object,
    options: PropTypes.object,
    plugins: PropTypes.array,
    width: PropTypes.string,
    height: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string
}
