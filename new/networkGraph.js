const svg = d3.select('#network');
const width = +svg.attr('width');
const height = +svg.attr('height');

// Define margin for bounds constraint
const margin = 60;

d3.json('./pathways.json').then(data => {
  const nodes = data.pathways;
  const links = data.connections.map(d => ({
    source: d.source,
    target: d.target,
    type: d.type,
    strength: d.strength,
    description: d.description
  }));

  // Create color scales for different connection types
  const linkColorScale = d3.scaleOrdinal()
    .domain(['metabolic_flow', 'functional', 'shared_biomarkers', 'precursor'])
    .range(['#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

  // Create simulation with clustering forces and bounds constraint
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(d => 150 - (d.strength * 50)) // Stronger connections = shorter distance
      .strength(d => d.strength * 0.5))
    .force('charge', d3.forceManyBody()
      .strength(-800)
      .distanceMax(400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide()
      .radius(d => Math.max(80, d.id.length * 4 + 40))
      .strength(0.9) // Increased collision strength to prevent overlap
      .iterations(3)) // Multiple iterations for better collision resolution
    // Boundary constraint force - gentle positioning without bouncing
    .force('boundary', function(alpha) {
      nodes.forEach(node => {
        const nodeWidth = Math.max(100, node.id.length * 8 + 30);
        const nodeHeight = 45;
        const dampingFactor = 0.05 * alpha; // Gentle force that decreases with simulation cooling
        
        // Constrain x position with gentle force
        if (node.x < margin + nodeWidth/2) {
          const pushForce = (margin + nodeWidth/2 - node.x) * dampingFactor;
          node.vx = (node.vx || 0) + pushForce;
          if (node.vx < 0) node.vx *= 0.8; // Dampen opposing velocity
        }
        if (node.x > width - margin - nodeWidth/2) {
          const pushForce = (width - margin - nodeWidth/2 - node.x) * dampingFactor;
          node.vx = (node.vx || 0) + pushForce;
          if (node.vx > 0) node.vx *= 0.8; // Dampen opposing velocity
        }
        
        // Constrain y position with gentle force
        if (node.y < margin + nodeHeight/2) {
          const pushForce = (margin + nodeHeight/2 - node.y) * dampingFactor;
          node.vy = (node.vy || 0) + pushForce;
          if (node.vy < 0) node.vy *= 0.8; // Dampen opposing velocity
        }
        if (node.y > height - margin - nodeHeight/2) {
          const pushForce = (height - margin - nodeHeight/2 - node.y) * dampingFactor;
          node.vy = (node.vy || 0) + pushForce;
          if (node.vy > 0) node.vy *= 0.8; // Dampen opposing velocity
        }
      });
    })
    // Group clustering force - pulls nodes of same group together
    .force('group', function(alpha) {
      const groups = d3.group(nodes, d => d.group);
      const groupCenters = new Map();
      
      // Calculate group centers
      groups.forEach((groupNodes, groupName) => {
        let cx = 0, cy = 0;
        groupNodes.forEach(node => {
          cx += node.x || 0;
          cy += node.y || 0;
        });
        groupCenters.set(groupName, {
          x: cx / groupNodes.length,
          y: cy / groupNodes.length
        });
      });
      
      // Apply clustering force
      nodes.forEach(node => {
        const center = groupCenters.get(node.group);
        if (center && center.x && center.y) {
          const dx = center.x - (node.x || 0);
          const dy = center.y - (node.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            const force = alpha * 0.1;
            node.vx = (node.vx || 0) + dx * force * 0.1;
            node.vy = (node.vy || 0) + dy * force * 0.1;
          }
        }
      });
    });

  // Create simple connecting lines
  const link = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#999')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.6);

  // Add link labels for connection types
  const linkLabels = svg.append('g')
    .attr('class', 'link-labels')
    .selectAll('text')
    .data(links)
    .join('text')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .attr('text-anchor', 'middle')
    .attr('pointer-events', 'none')
    .style('opacity', 0)
    .text(d => d.type.replace('_', ' '));

  // Create node groups to hold both rectangle and text
  const nodeGroup = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .call(drag(simulation));

  // Add rectangles to node groups with enhanced styling
  const nodeRect = nodeGroup.append('rect')
    .attr('width', d => Math.max(100, d.id.length * 8 + 30))
    .attr('height', 45)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', d => {
      const groupColors = {
        'Immune': '#4e79a7',
        'Metabolism': '#59a14f', 
        'Transport': '#edc949',
        'Stress': '#e15759'
      };
      return groupColors[d.group] || '#cccccc';
    })
    .attr('stroke', d => {
      const groupColors = {
        'Immune': '#2c5882',
        'Metabolism': '#3d7a3d',
        'Transport': '#b8a23a',
        'Stress': '#b23e3f'
      };
      return groupColors[d.group] || '#999999';
    })
    .attr('stroke-width', 2)
    .attr('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');

  // Add text labels to node groups
  const nodeText = nodeGroup.append('text')
    .text(d => d.id)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', 'Arial, sans-serif')
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .attr('pointer-events', 'none');

  // Add group badges
  const groupBadge = nodeGroup.append('circle')
    .attr('r', 8)
    .attr('fill', d => {
      const badgeColors = {
        'Immune': '#ff6b6b',
        'Metabolism': '#4ecdc4',
        'Transport': '#45b7d1',
        'Stress': '#f9ca24'
      };
      return badgeColors[d.group] || '#cccccc';
    })
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  // Add group letters to badges
  const badgeText = nodeGroup.append('text')
    .text(d => d.group.charAt(0))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', 'Arial, sans-serif')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white')
    .attr('pointer-events', 'none');

  // Enhanced hover effects
  nodeGroup
    .on('mouseover', function(event, d) {
      // Highlight the node
      d3.select(this).select('rect')
        .attr('stroke-width', 4)
        .transition().duration(200)
        .attr('transform', 'scale(1.05)');
      
      // Highlight connected links
      link
        .transition().duration(200)
        .attr('stroke-opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1)
        .attr('stroke-width', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 4 : 2);
      
      // Show link labels for connected edges
      linkLabels
        .transition().duration(200)
        .style('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0);
      
      // Highlight connected nodes
      nodeGroup
        .transition().duration(200)
        .style('opacity', n => {
          if (n.id === d.id) return 1;
          const connected = links.some(l => 
            (l.source.id === d.id && l.target.id === n.id) ||
            (l.target.id === d.id && l.source.id === n.id));
          return connected ? 1 : 0.3;
        });
    })
    .on('mouseout', function(event, d) {
      // Reset node appearance
      d3.select(this).select('rect')
        .attr('stroke-width', 2)
        .transition().duration(200)
        .attr('transform', 'scale(1)');
      
      // Reset all elements
      link
        .transition().duration(200)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2);
      
      linkLabels
        .transition().duration(200)
        .style('opacity', 0);
      
      nodeGroup
        .transition().duration(200)
        .style('opacity', 1);
    });

  // Add click handler
  nodeGroup.on('click', (event, d) => {
    const e = new CustomEvent('pathwaySelected', { detail: d });
    window.dispatchEvent(e);
    console.log(`Clicked node: ${d.id}`);
  });

  // Enhanced tooltip with connection information
  nodeGroup.append('title').text(d => {
    const connections = links.filter(l => l.source.id === d.id || l.target.id === d.id);
    const connectedPathways = connections.map(l => 
      l.source.id === d.id ? l.target.id : l.source.id);
    return `${d.id}\nGroup: ${d.group}\nBiomarkers: ${d.biomarkers.length}\nConnections: ${connectedPathways.join(', ')}`;
  });

  // Add tooltips to links
  link.append('title').text(d => 
    `${d.source.id} ↔ ${d.target.id}\nType: ${d.type}\nStrength: ${d.strength}\n${d.description}`);

  // Animation loop with boundary enforcement
  simulation.on('tick', () => {
    // First, clamp node positions to bounds (same logic as node positioning)
    nodes.forEach(node => {
      const rectWidth = Math.max(100, node.id.length * 8 + 30);
      const rectHeight = 45;
      
      const minX = margin + rectWidth/2;
      const maxX = width - margin - rectWidth/2;
      const minY = margin + rectHeight/2;
      const maxY = height - margin - rectHeight/2;
      
      // Store the clamped positions
      node.clampedX = Math.max(minX, Math.min(maxX, node.x));
      node.clampedY = Math.max(minY, Math.min(maxY, node.y));
    });

    // Update link positions using clamped coordinates
    link
      .attr('x1', d => d.source.clampedX)
      .attr('y1', d => d.source.clampedY)
      .attr('x2', d => d.target.clampedX)
      .attr('y2', d => d.target.clampedY);

    // Position link labels at midpoint using clamped coordinates
    linkLabels
      .attr('x', d => (d.source.clampedX + d.target.clampedX) / 2)
      .attr('y', d => (d.source.clampedY + d.target.clampedY) / 2);

    // Position node groups using clamped coordinates
    nodeGroup.attr('transform', d => {
      const rectWidth = Math.max(100, d.id.length * 8 + 30);
      const rectHeight = 45;
      
      return `translate(${d.clampedX - rectWidth/2}, ${d.clampedY - rectHeight/2})`;
    });

    // Position text at center of rectangle
    nodeText
      .attr('x', d => Math.max(100, d.id.length * 8 + 30) / 2)
      .attr('y', 22.5);

    // Position group badge in top-right corner
    groupBadge
      .attr('cx', d => Math.max(100, d.id.length * 8 + 30) - 12)
      .attr('cy', 12);

    badgeText
      .attr('x', d => Math.max(100, d.id.length * 8 + 30) - 12)
      .attr('y', 12);
  });

  // Drag functionality
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