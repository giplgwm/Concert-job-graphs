<script>
  import { flip } from 'svelte/animate';
  import { fly, fade, scale } from 'svelte/transition';
  
  const teamLayout = {
    "CCarter": ["FFunke", "CBenson", "LDyar", "MMichik", "BThomas"],
    "CFurbush": ["SBarber", "AThomas", "KRenner", "JFlowers"],
    "JRoyer": ["CViet", "BMercer", "BBoger", "ERose", "PMcCauley", "TWilson"],
    "JWinland": ["CRouss", "DMalloy", "Sde Laet"],
    "CDuckworth": ["SConaughty", "DWells", "MBethel"],
    "CMills": ["BUlan", "JSpielman", "SMellott", "LFarnham", "MMarple", "JMosley", "IBurkett"]
  };

  const pfCount = $state([]);
  let stringEntered = $state('');
  let submitted = $state(false);
  let selectedTeam = $state(null);
  let flippedTeams = $state({});

  function getTeamForMember(name) {
    for (const [leader, members] of Object.entries(teamLayout)) {
      if (leader === name || members.includes(name)) {
        return leader;
      }
    }
    return "Unassigned";
  }

  function countOccurrences(strings, targetList) {
    const counts = {};
    for (const str of strings) {
      counts[str] = (counts[str] || 0) + 1;
    }
    Object.entries(counts).forEach(([name, count]) => {
      targetList.push({ name: name, count: count, team: getTeamForMember(name) });
    });
    targetList.sort((a, b) => b.count - a.count);
  }

  function importJobs(string_entered) {
    if (string_entered === '') {
      return;
    }
    pfCount.length = 0;
    submitted = true;
    let string_fixed = '';
    if (string_entered.includes("Job#   Account CN#     SiteID  Sched.Date&Time Due Date        Cust# Last Update       CUD#    Pf      City    State   Status  EQ      ")) {
      string_fixed = string_entered.split("Job# Account CN#     SiteID  Sched.Date&Time Due Date        Cust# Last Update       CUD#    Pf      City    State   Status  EQ      ")[1];
    } else {
      string_fixed = string_entered;
    }
    const tempPfs = [];
    const jobEntries = string_fixed.trim().split(/\n(?=\d+\t)/m);
    jobEntries.forEach(jobEntry => {
      const info = jobEntry.split('\t');
      const name = info[8];
      if (name) {
        tempPfs.push(name);
      }
    });
    countOccurrences(tempPfs, pfCount);
  }

  function reset() {
    submitted = false;
    stringEntered = '';
    pfCount.length = 0;
    selectedTeam = null;
    flippedTeams = {};
  }

  function getTotalJobs() {
    return pfCount.reduce((sum, pf) => sum + pf.count, 0);
  }

  function getTeamMembers(teamLeader) {
    return pfCount.filter(pf => pf.team === teamLeader);
  }

  function getTeamTotal(teamLeader) {
    return getTeamMembers(teamLeader).reduce((sum, pf) => sum + pf.count, 0);
  }

  function getActiveTeams() {
    const teams = new Set(pfCount.map(pf => pf.team));
    return Array.from(teams);
  }

  function toggleFlip(team) {
    flippedTeams[team] = !flippedTeams[team];
  }

  function getPieSlices(teamLeader) {
    const members = getTeamMembers(teamLeader);
    const total = getTeamTotal(teamLeader);
    let currentAngle = 0;
    const slices = [];
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B', '#795548'];
    
    members.forEach((member, index) => {
      const percentage = member.count / total;
      const angle = percentage * 360;
      slices.push({
        name: member.name,
        count: member.count,
        percentage: (percentage * 100).toFixed(1),
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: colors[index % colors.length]
      });
      currentAngle += angle;
    });
    return slices;
  }

  function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  }

  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }
</script>

<main>
  {#if submitted}
    <div class="results">
      <div class="header">
        <h2>Job Distribution</h2>
        <button class="reset-btn" onclick={reset}>Load New Data</button>
      </div>
      
      <div class="summary">
        <span class="total">Total Jobs: <strong>{getTotalJobs()}</strong></span>
        <span class="workers">Workers: <strong>{pfCount.length}</strong></span>
        <span class="teams">Teams: <strong>{getActiveTeams().length}</strong></span>
      </div>

      <div class="team-filter">
        <button 
          class="filter-btn" 
          class:active={selectedTeam === null}
          onclick={() => selectedTeam = null}
        >
          All Teams
        </button>
        {#each getActiveTeams() as team}
          <button 
            class="filter-btn"
            class:active={selectedTeam === team}
            onclick={() => selectedTeam = team}
          >
            {team} ({getTeamTotal(team)})
          </button>
        {/each}
      </div>

      <div class="teams-grid">
        {#each selectedTeam ? [selectedTeam] : getActiveTeams() as team (team)}
          <div 
            class="team-card"
            animate:flip={{ duration: 400, easing: t => t }}
            onclick={() => toggleFlip(team)}
          >
            <div class="team-header">
              <h3>{team}</h3>
              <span class="team-total">{getTeamTotal(team)} jobs</span>
            </div>
            
            <div class="card-content">
              {#if !flippedTeams[team]}
                <div class="card-face" in:fly={{ x: -100, duration: 300, delay: 150 }} out:fly={{ x: 100, duration: 300 }}>
                  <div class="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th class="rank">#</th>
                          <th class="name">Name</th>
                          <th class="count">Jobs</th>
                          <th class="percentage">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each getTeamMembers(team) as pf, index (pf.name)}
                          <tr animate:flip={{ duration: 250 }}>
                            <td class="rank">{index + 1}</td>
                            <td class="name">{pf.name}</td>
                            <td class="count">{pf.count}</td>
                            <td class="percentage">{((pf.count / getTeamTotal(team)) * 100).toFixed(1)}%</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                  <div class="flip-hint">Click to see pie chart</div>
                </div>
              {:else}
                <div class="card-face" in:fly={{ x: 100, duration: 300, delay: 150 }} out:fly={{ x: -100, duration: 300 }}>
                  <div class="pie-container">
                    <svg viewBox="0 0 200 200" class="pie-chart">
                      {#each getPieSlices(team) as slice, i}
                        <path
                          d={describeArc(100, 100, 80, slice.startAngle, slice.endAngle)}
                          fill={slice.color}
                          in:scale={{ duration: 400, delay: i * 50, start: 0 }}
                        >
                          <title>{slice.name}: {slice.count} ({slice.percentage}%)</title>
                        </path>
                      {/each}
                    </svg>
                  </div>
                  <div class="legend">
                    {#each getPieSlices(team) as slice, i}
                      <div 
                        class="legend-item"
                        in:fade={{ duration: 200, delay: 200 + i * 30 }}
                      >
                        <span class="legend-color" style="background: {slice.color}"></span>
                        <span class="legend-name">{slice.name}</span>
                        <span class="legend-value">{slice.count}</span>
                      </div>
                    {/each}
                  </div>
                  <div class="flip-hint">Click to see table</div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="input-section">
      <h2>Load Job Queue</h2>
      <textarea placeholder="Paste your queue here..." bind:value={stringEntered}></textarea>
      <button class="load-btn" onclick={() => importJobs(stringEntered)}>Process Jobs</button>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .input-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  h2 {
    margin: 0 0 1rem 0;
    color: #333;
  }
  
  textarea {
    width: 100%;
    min-height: 300px;
    padding: 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-family: monospace;
    font-size: 0.9rem;
    resize: vertical;
  }
  
  textarea:focus {
    outline: none;
    border-color: #4CAF50;
  }
  
  .load-btn, .reset-btn {
    padding: 0.75rem 1.5rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .load-btn:hover, .reset-btn:hover {
    background: #45a049;
  }
  
  .results {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .reset-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .summary {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 1.1rem;
    flex-wrap: wrap;
  }
  
  .summary strong {
    color: #4CAF50;
  }

  .team-filter {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    background: #fff;
    border: 2px solid #ddd;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
  }

  .filter-btn:hover {
    border-color: #4CAF50;
  }

  .filter-btn.active {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }

  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .team-card {
    border: 1px solid #ddd;
    border-radius: 12px;
    background: white;
    padding: 1rem;
    cursor: pointer;
    min-height: 380px;
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .team-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }

  .card-content {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .card-face {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .team-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #4CAF50;
  }

  .team-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.1rem;
  }

  .team-total {
    background: #4CAF50;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .table-container {
    flex: 1;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 8px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  thead {
    background: #4CAF50;
    color: white;
    position: sticky;
    top: 0;
  }
  
  th {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.85rem;
  }
  
  tbody tr {
    border-bottom: 1px solid #eee;
  }
  
  tbody tr:hover {
    background: #f9f9f9;
  }
  
  tbody tr:last-child {
    border-bottom: none;
  }
  
  td {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  
  .rank {
    width: 40px;
    text-align: center;
    color: #888;
    font-weight: 500;
  }
  
  .name {
    font-weight: 500;
  }
  
  .count {
    width: 60px;
    text-align: center;
    font-weight: 600;
    color: #4CAF50;
  }
  
  .percentage {
    width: 60px;
    text-align: center;
    color: #666;
  }

  .flip-hint {
    text-align: center;
    color: #999;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    font-style: italic;
  }

  .pie-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 0 0 auto;
  }

  .pie-chart {
    width: 180px;
    height: 180px;
  }

  .pie-chart path {
    stroke: white;
    stroke-width: 2;
    transition: transform 0.2s;
    transform-origin: center;
  }

  .pie-chart path:hover {
    transform: scale(1.05);
  }

  .legend {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legend-value {
    font-weight: 600;
    color: #4CAF50;
  }
</style>
