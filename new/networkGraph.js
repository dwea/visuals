<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>D3 Cluster Hulls Example</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      background: #f5f5f5;
    }
    svg {
      background: white;
      border: 1px solid #ccc;
    }
    path.hull {
      pointer-events: none;
    }
  </style>
</head>
<body>
  <svg id="network" width="1000" height="600"></svg>
  <script>
    const svg = d3.select('#network');
    const width = +svg.attr('width');
    const height = +svg.attr('height');

    d3.json('./pathways.json').then(data => {
      const nodes = data;

      const links = nodes.slice(1).map((n, i) => ({
        source: nodes[0].id,
        target: n.id
      }));

      const groups = d3.groups(nodes, d => d.group);

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(200))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#aaa')
        .attr('stroke-width', 2);

      const hullGroup = svg.append('g').attr('class', 'hulls');

      const nodeGroup = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(drag(simulation));

      const nodeRect = nodeGroup.append('rect')
        .attr('width', d => Math.max(80, d.id.length * 8 + 20))
        .attr('height', 40)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', d => {
          if (d.group === 'Immune') return '#a6cee3';
          if (d.group === 'Metabolism') return '#b2df8a';
          if (d.group === 'Transport') return '#fb9a99';
          if (d.group === 'Stress') return '#fdbf6f';
          return '#cccccc';
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 1);

      const nodeText = nodeGroup.append('text')
        .text(d => d.id)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', 'Arial, sans-serif')
        .attr('font-size', '12px')
        .attr('fill', '#333')
        .attr('pointer-events', 'none');

      nodeGroup
        .on('mouseover', function(event, d) {
          d3.select(this).select('rect')
            .attr('stroke-width', 2)
            .attr('stroke', '#000');
        })
        .on('mouseout', function(event, d) {
          d3.select(this).select('rect')
            .attr('stroke-width', 1)
            .attr('stroke', '#333');
        });

      nodeGroup.on('click', (event, d) => {
        const e = new CustomEvent('pathwaySelected', { detail: d });
        window.dispatchEvent(e);
        console.log(`Clicked node: ${d.id}`);
      });

      nodeGroup.append('title').text(d => `${d.id} (${d.group || 'Unknown'})`);

      const line = d3.line()
        .curve(d3.curveCardinalClosed.tension(0.85));

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        nodeGroup.attr('transform', d => {
          const rectWidth = Math.max(80, d.id.length * 8 + 20);
          const rectHeight = 40;
          return `translate(${d.x - rectWidth / 2}, ${d.y - rectHeight / 2})`;
        });

        nodeText
          .attr('x', d => Math.max(80, d.id.length * 8 + 20) / 2)
          .attr('y', 20);

        const hulls = hullGroup.selectAll('path')
          .data(groups);

        hulls.enter()
          .append('path')
          .attr('class', 'hull')
          .attr('fill', d => {
            if (d[0] === 'Immune') return '#a6cee3';
            if (d[0] === 'Metabolism') return '#b2df8a';
            if (d[0] === 'Transport') return '#fb9a99';
            if (d[0] === 'Stress') return '#fdbf6f';
            return '#cccccc';
          })
          .attr('opacity', 0.2)
          .merge(hulls)
          .attr('d', d => {
            const points = d[1].map(n => [n.x, n.y]);
            const hull = d3.polygonHull(points);
            return (hull && hull.length >= 3) ? line(hull) : null;
          });

        hulls.exit().remove();
      });

      function drag(simulation) {
        function dragstarted(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }

        function dragged(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        }

        function dragended(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        return d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended);
      }
    });
  </script>
</body>
</html>
