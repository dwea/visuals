function biomarkerMiniGraph(design = 'basic') {
    let valueAccessor = d => d.value;

    function chart(selection) {
        selection.each(function(d) {
            const container = d3.select(this);
            const value = valueAccessor(d);

            container.selectAll('*').remove();

            const graphHeight = 8;
            const padding = 2;

            // Use the 'design' parameter to change the style
            if (design === 'basic') {
                const graphWidth = 60;
                const fillPercentage = value / 100;

                // 'Basic' design (the original bar with a background)
                container.append('rect')
                    .attr('x', padding)
                    .attr('y', padding)
                    .attr('width', graphWidth)
                    .attr('height', graphHeight)
                    .attr('rx', 2)
                    .attr('ry', 2)
                    .attr('fill', 'rgba(0,0,0,0.1)');

                container.append('rect')
                    .attr('x', padding)
                    .attr('y', padding)
                    .attr('width', graphWidth * fillPercentage)
                    .attr('height', graphHeight)
                    .attr('rx', 2)
                    .attr('ry', 2)
                    .attr('fill', config.colors.itemText);

                container.append('text')
                    .attr('x', graphWidth + padding + 5)
                    .attr('y', graphHeight / 2 + padding)
                    .attr('dy', '0.35em')
                    .style('font-size', '9px')
                    .style('fill', config.colors.itemText)
                    .text(`${value}%`);

            } else if (design === 'pill') {
                const graphWidth = 95; // A bit wider for this design
                const fillPercentage = value / 100;
                const pillHeight = 12;

                // 'Pill' design (a single bar with text inside)
                const pillGroup = container.append('g')
                    .attr('transform', `translate(${padding}, ${(graphHeight + (padding*2) - pillHeight) / 2})`);

                pillGroup.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', graphWidth)
                    .attr('height', pillHeight)
                    .attr('rx', pillHeight / 2)
                    .attr('ry', pillHeight / 2)
                    .attr('fill', 'rgba(0,0,0,0.1)');

                pillGroup.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', graphWidth * fillPercentage)
                    .attr('height', pillHeight)
                    .attr('rx', pillHeight / 2)
                    .attr('ry', pillHeight / 2)
                    .attr('fill', config.colors.processLink); // A different color

                pillGroup.append('text')
                    .attr('x', graphWidth / 2)
                    .attr('y', pillHeight / 2)
                    .attr('dy', '0.35em')
                    .attr('text-anchor', 'middle')
                    .style('font-size', '9px')
                    .style('fill', 'white')
                    .text(`${value}%`);
            
            } else if (design === 'gauge') {
                const graphWidth = 95;
                const gaugeHeight = 12;
                const markerHeight = 16; // Slightly taller than the gauge
                const markerWidth = 3;

                // Define colors for the ranges
                const colors = {
                    red: '#ffadad',
                    yellow: '#fdffb6',
                    blue: '#a0c4ff'
                };

                // Create a group for the gauge elements
                const gaugeGroup = container.append('g')
                    .attr('transform', `translate(${padding}, ${(graphHeight + (padding*2) - gaugeHeight) / 2})`);

                // Define the range segments
                const segments = [
                    { start: 0,   end: 25, color: colors.red },
                    { start: 25,  end: 30, color: colors.yellow },
                    { start: 30,  end: 70, color: colors.blue },
                    { start: 70,  end: 75, color: colors.yellow },
                    { start: 75,  end: 100, color: colors.red }
                ];
                
                // Draw the background segments
                segments.forEach(seg => {
                    gaugeGroup.append('rect')
                        .attr('x', (seg.start / 100) * graphWidth)
                        .attr('y', 0)
                        .attr('width', ((seg.end - seg.start) / 100) * graphWidth)
                        .attr('height', gaugeHeight)
                        .attr('fill', seg.color);
                });

                // Add a border around the whole gauge to clean it up
                 gaugeGroup.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', graphWidth)
                    .attr('height', gaugeHeight)
                    .attr('rx', 3)
                    .attr('ry', 3)
                    .attr('fill', 'none')
                    .attr('stroke', 'rgba(255, 255, 255, 0.2)')
                    .attr('stroke-width', 1);

                // Calculate marker position
                const markerX = (value / 100) * graphWidth - (markerWidth / 2);

                // Draw the vertical marker line
                gaugeGroup.append('rect')
                    .attr('x', markerX)
                    .attr('y', (gaugeHeight - markerHeight) / 2) // Center it vertically
                    .attr('width', markerWidth)
                    .attr('height', markerHeight)
                    .attr('fill', '#333')
                    .attr('rx', 1)
                    .attr('ry', 1);
            }
        });
    }

    chart.value = function(accessor) {
        if (!arguments.length) return valueAccessor;
        valueAccessor = accessor;
        return chart;
    };

    return chart;
}
