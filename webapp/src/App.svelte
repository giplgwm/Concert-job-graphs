<script>
  import { flip } from 'svelte/animate';
  import TeamCard from './lib/TeamCard.svelte';
  
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
    if (teamLeader === "Unassigned") {
      return pfCount.filter(pf => pf.team === "Unassigned").sort((a, b) => b.count - a.count);
    }
    const allMembers = [teamLeader, ...(teamLayout[teamLeader] || [])];
    return allMembers.map(memberName => {
      const found = pfCount.find(pf => pf.name === memberName);
      return found || { name: memberName, count: 0, team: teamLeader };
    }).sort((a, b) => b.count - a.count);
  }

  function getTeamTotal(teamLeader) {
    return getTeamMembers(teamLeader).reduce((sum, pf) => sum + pf.count, 0);
  }

  function getActiveTeams(includeUnassigned = true) {
    const teams = new Set(pfCount.map(pf => pf.team));
    const teamsArray = Array.from(teams);
    if (!includeUnassigned) {
      return teamsArray.filter(t => t !== "Unassigned");
    }
    return teamsArray;
  }

  function toggleFlip(team) {
    flippedTeams[team] = !flippedTeams[team];
  }

  function getPieSlices(teamLeader) {
    const members = getTeamMembers(teamLeader).filter(m => m.count > 0);
    const total = getTeamTotal(teamLeader);
    let currentAngle = 0;
    const slices = [];
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B', '#795548'];
    
    members.forEach((member, index) => {
      const percentage = member.count / total;
      const angle = percentage * 360;
      const midAngle = currentAngle + angle / 2;
      const labelRadius = 50;
      const labelPos = polarToCartesian(100, 100, labelRadius, midAngle);
      slices.push({
        name: member.name,
        count: member.count,
        percentage: (percentage * 100).toFixed(1),
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: colors[index % colors.length],
        labelX: labelPos.x,
        labelY: labelPos.y
      });
      currentAngle += angle;
    });
    return slices;
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
        {#each selectedTeam ? [selectedTeam] : getActiveTeams(false) as team (team)}
          <div animate:flip={{ duration: 400, easing: t => t }}>
            <TeamCard
              {team}
              members={getTeamMembers(team)}
              total={getTeamTotal(team)}
              flipped={flippedTeams[team]}
              slices={getPieSlices(team)}
              onFlip={() => toggleFlip(team)}
            />
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
</style>
