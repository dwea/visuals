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

  // Group colors for hulls
  const groupColors = {
    'Immune': '#4e79a7',
    'Metabolism': '#59a14f', 
    'Transport': '#edc949',
    'Stress': '#e15759'
  };

  // Create hull container (needs to be behind nodes)
  const hullContainer = svg.append('g').attr('class', 'hulls');

  // Function to calculate convex hull using d3.polygonHull
  function calculateHulls() {
    const groups = d3.group(nodes, d => d.group);
    const hulls = [];
    
    groups.forEach((groupNodes, groupName) => {
      if (groupNodes.length < 3) return; // Need at least 3 points for a meaningful hull
      
      // Get node positions with padding
      const points = groupNodes.map(d => {
        const rectWidth = Math.max(100, d.id.length * 8 + 30);
        const rectHeight = 45;
        const padding = 20; // Extra space around nodes
        
        return [
          [d.clampedX - rectWidth/2 - padding, d.clampedY - rectHeight/2 - padding],
          [d.clampedX + rectWidth/2 + padding, d.clampedY - rectHeight/2 - padding],
          [d.clampedX + rectWidth/2 + padding, d.clampedY + rectHeight/2 + padding],
          [d.clampedX - rectWidth/2 - padding, d.clampedY + rectHeight/2 + padding]
        ];
      }).flat();
      
      const hull = d3.polygonHull(points);
      if (hull) {
        hulls.push({
          group: groupName,
          hull: hull,
          nodes: groupNodes,
          centroid: d3.polygonCentroid(hull)
        });
      }
    });
    
    return hulls;
  }

  // Function to check if two hulls overlap
  function hullsOverlap(hull1, hull2) {
    // Simple distance-based check between centroids
    const dx = hull1.centroid[0] - hull2.centroid[0];
    const dy = hull1.centroid[1] - hull2.centroid[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Estimate hull sizes for separation threshold
    const size1 = Math.sqrt(Math.abs(d3.polygonArea(hull1.hull)));
    const size2 = Math.sqrt(Math.abs(d3.polygonArea(hull2.hull)));
    const minSeparation = (size1 + size2) * 0.3;
    
    return distance < minSeparation;
  }

  // Create simulation with enhanced clustering and hull separation forces
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(d => 150 - (d.strength * 50))
      .strength(d => d.strength * 0.5))
    .force('charge', d3.forceManyBody()
      .strength(-600) // Reduced to allow tighter clustering
      .distanceMax(300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide()
      .radius(d => Math.max(80, d.id.length * 4 + 40))
      .strength(0.7)
      .iterations(2))
    // Boundary constraint force
    .force('boundary', function(alpha) {
      nodes.forEach(node => {
        const nodeWidth = Math.max(100, node.id.length * 8 + 30);
        const nodeHeight = 45;
        const dampingFactor = 0.05 * alpha;
        
        if (node.x < margin + nodeWidth/2) {
          const pushForce = (margin + nodeWidth/2 - node.x) * dampingFactor;
          node.vx = (node.vx || 0) + pushForce;
          if (node.vx < 0) node.vx *= 0.8;
        }
        if (node.x > width - margin - nodeWidth/2) {
          const pushForce = (width - margin - nodeWidth/2 - node.x) * dampingFactor;
          node.vx = (node.vx || 0) + pushForce;
          if (node.vx > 0) node.vx *= 0.8;
        }
        
        if (node.y < margin + nodeHeight/2) {
          const pushForce = (margin + nodeHeight/2 - node.y) * dampingFactor;
          node.vy = (node.vy || 0) + pushForce;
          if (node.vy < 0) node.vy *= 0.8;
        }
        if (node.y > height - margin - nodeHeight/2) {
          const pushForce = (height - margin - nodeHeight/2 - node.y) * dampingFactor;
          node.vy = (node.vy || 0) + pushForce;
          if (node.vy > 0) node.vy *= 0.8;
        }
      });
    })
    // Enhanced group clustering force
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
      
      // Apply stronger clustering force
      nodes.forEach(node => {
        const center = groupCenters.get(node.group);
        if (center && center.x && center.y) {
          const dx = center.x - (node.x || 0);
          const dy = center.y - (node.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            const force = alpha * 0.3; // Increased clustering strength
            node.vx = (node.vx || 0) + dx * force * 0.3;
            node.vy = (node.vy || 0) + dy * force * 0.3;
          }
        }
      });
    })
    // Hull separation force
    .force('hullSeparation', function(alpha) {
      if (alpha < 0.1) return; // Only apply when simulation is still active
      
      const hulls = calculateHulls();
      const separationForce = alpha * 0.2;
      
      // Check each pair of hulls for overlap
      for (let i = 0; i < hulls.length; i++) {
        for (let j = i + 1; j < hulls.length; j++) {
          const hull1 = hulls[i];
          const hull2 = hulls[j];
          
          if (hullsOverlap(hull1, hull2)) {
            // Calculate separation vector
            const dx = hull1.centroid[0] - hull2.centroid[0];
            const dy = hull1.centroid[1] - hull2.centroid[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const normalizedDx = dx / distance;
              const normalizedDy = dy / distance;
              
              // Apply separation force to all nodes in both groups
              hull1.nodes.forEach(node => {
                node.vx = (node.vx || 0) + normalizedDx * separationForce;
                node.vy = (node.vy || 0) + normalizedDy * separationForce;
              });
              
              hull2.nodes.forEach(node => {
                node.vx = (node.vx || 0) - normalizedDx * separationForce;
                node.vy = (node.vy || 0) - normalizedDy * separationForce;
              });
            }
          }
        }
      }
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
    .attr('fill', d => groupColors[d.group] || '#cccccc')
    .attr('stroke', d => {
      const groupStrokeColors = {
        'Immune': '#2c5882',
        'Metabolism': '#3d7a3d',
        'Transport': '#b8a23a',
        'Stress': '#b23e3f'
      };
      return groupStrokeColors[d.group] || '#999999';
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
      d3.select(this).select('rect')
        .attr('stroke-width', 4)
        .transition().duration(200)
        .attr('transform', 'scale(1.05)');
      
      link
        .transition().duration(200)
        .attr('stroke-opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1)
        .attr('stroke-width', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 4 : 2);
      
      linkLabels
        .transition().duration(200)
        .style('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0);
      
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
      d3.select(this).select('rect')
        .attr('stroke-width', 2)
        .transition().duration(200)
        .attr('transform', 'scale(1)');
      
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

  // Animation loop with hull updates
  simulation.on('tick', () => {
    // Clamp node positions to bounds
    nodes.forEach(node => {
      const rectWidth = Math.max(100, node.id.length * 8 + 30);
      const rectHeight = 45;
      
      const minX = margin + rectWidth/2;
      const maxX = width - margin - rectWidth/2;
      const minY = margin + rectHeight/2;
      const maxY = height - margin - rectHeight/2;
      
      node.clampedX = Math.max(minX, Math.min(maxX, node.x));
      node.clampedY = Math.max(minY, Math.min(maxY, node.y));
    });

    // Update hull paths
    const hulls = calculateHulls();
    const hullSelection = hullContainer
      .selectAll('path')
      .data(hulls, d => d.group);
    
    hullSelection.enter()
      .append('path')
      .attr('fill', d => groupColors[d.group] || '#cccccc')
      .attr('fill-opacity', 0.1)
      .attr('stroke', d => groupColors[d.group] || '#cccccc')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '5,5')
      .merge(hullSelection)
      .attr('d', d => d.hull ? `M${d.hull.join('L')}Z` : '');
    
    hullSelection.exit().remove();

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