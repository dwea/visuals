// Configuration for colors (subset relevant to the biomarker gauge)
const config = {
    colors: {
        biomarkerGaugeLightRed: '#ffcccc',
        biomarkerGaugeLightYellow: '#ffeecc',
        biomarkerGaugeLightBlue: '#cceeff',
        itemText: 'black' // For the value text
    }
};

// Reusable Biomarker Graph Component (Gauge style)
function biomarkerMiniGraph() {
    let valueAccessor = d => d.value;

    function chart(selection) {
        selection.each(function(d) {
            const container = d3.select(this);
            const value = valueAccessor(d);

            container.selectAll('*').remove(); // Clear previous elements

            const graphWidth = 60;
            const graphHeight = 8;
            const padding = 2; // Padding around the bar itself

            const barY = padding; // Y position for the bar segments
            const barX = padding; // X position for the bar segments

            // Define segments and their colors
            const segments = [
                { range: [0, 20], color: config.colors.biomarkerGaugeLightRed },
                { range: [20, 25], color: config.colors.biomarkerGaugeLightYellow },
                { range: [25, 75], color: config.colors.biomarkerGaugeLightBlue },
                { range: [75, 80], color: config.colors.biomarkerGaugeLightYellow },
                { range: [80, 100], color: config.colors.biomarkerGaugeLightRed }
            ];

            let currentX = barX;
            segments.forEach(segment => {
                const segmentWidth = (segment.range[1] - segment.range[0]) / 100 * graphWidth;
                container.append('rect')
                    .attr('x', currentX)
                    .attr('y', barY)
                    .attr('width', segmentWidth)
                    .attr('height', graphHeight)
                    .attr('fill', segment.color);
                currentX += segmentWidth;
            });

            // Add the vertical black line (gauge indicator)
            const indicatorX = barX + (value / 100) * graphWidth;
            const indicatorHeight = graphHeight * 2; // Twice the height of the bar
            const indicatorY1 = barY - (indicatorHeight - graphHeight) / 2;
            const indicatorY2 = indicatorY1 + indicatorHeight;

            container.append('line')
                .attr('x1', indicatorX)
                .attr('y1', indicatorY1)
                .attr('x2', indicatorX)
                .attr('y2', indicatorY2)
                .attr('stroke', 'black')
                .attr('stroke-width', 2); // Make it clearly visible

            // Add the percentage text label
            // Position to the right of the bar, centered vertically
            container.append('text')
                .attr('x', graphWidth + padding + 5)
                .attr('y', graphHeight / 2 + padding)
                .attr('dy', '0.35em')
                .style('font-size', '9px')
                .style('fill', config.colors.itemText)
                .text(`${value}`);
        });
    }

    chart.value = function(accessor) {
        if (!arguments.length) return valueAccessor;
        valueAccessor = accessor;
        return chart;
    };

    return chart;
}
