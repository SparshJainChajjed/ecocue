// Carbon Cue JavaScript

// Emission factors (kg CO₂e)
const EMISSION_FACTORS = {
  // Emission factors per passenger kilometre (kg CO₂e)
  // Sources: UK BEIS/Defra and Carbon Footprint Of (bus/train/flight)【363860688336500†L31-L34】【323337883740500†L14-L24】
  car: 0.18,      // average passenger car ≈0.17067 kg CO₂e/km【363860688336500†L31-L34】
  bus: 0.11,      // average local bus ≈0.11 kg CO₂e/km【323337883740500†L14-L24】
  train: 0.04,    // national rail ≈0.04 kg CO₂e/km【323337883740500†L66-L68】
  flight: 0.46    // average flight ≈0.46 kg CO₂e/km【323337883740500†L54-L56】
};
// Emission factor for electricity generated from the Indian grid (fossil fuels and nuclear)
// Source: Smart Freight Centre India data via Climatiq (2025)【22114595527097†L25-L49】
const ELECTRICITY_FACTOR = 0.82; // kg CO₂e per kWh
// Approximate emissions per meat-based meal (kg CO₂e)
// Beef has a footprint of ~15.5 kg CO₂e per 100 g serving【617685536973317†L7-L10】;
// A typical meat-heavy meal can easily exceed 200 g of meat and other ingredients,
// so we use 15 kg CO₂e per meat meal as an indicative value.
const MEAT_MEAL_FACTOR = 15;

// Tips for reducing carbon footprint
const TIPS = [
  "Choose public transportation or carpooling whenever possible instead of driving alone.",
  "Switch to energy-efficient LED bulbs and unplug devices when they're not in use.",
  "Reduce your meat consumption by incorporating more plant‑based meals into your diet.",
  "Use a clothesline or drying rack instead of a dryer to save electricity.",
  "Opt for reusable bags, bottles and containers to cut down on single-use plastics.",
  "Plan and combine errands to minimise travel distance and fuel consumption.",
  "Buy locally produced food to reduce emissions from long‑distance transportation.",
  "Set your water heater to a lower temperature and insulate your home to conserve energy.",
  "Consider cycling or walking short distances instead of driving.",
  "Offset your unavoidable emissions by supporting verified reforestation projects."
];

// Helper function to format date/time
function formatDate(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// Show a random tip in the tips section
function showRandomTip() {
  const tipContainer = document.getElementById('tip-container');
  const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];
  tipContainer.textContent = randomTip;
}

// Calculate emissions based on user input
function calculateEmissions() {
  // Parse inputs
  const distance = parseFloat(document.getElementById('transport-distance').value) || 0;
  const mode = document.getElementById('transport-mode').value;
  const kWh = parseFloat(document.getElementById('electricity').value) || 0;
  const meatMeals = parseFloat(document.getElementById('meat-meals').value) || 0;

  // Compute category emissions
  const transportEmission = distance * (EMISSION_FACTORS[mode] || 0);
  const electricityEmission = kWh * ELECTRICITY_FACTOR;
  const meatEmission = meatMeals * MEAT_MEAL_FACTOR;

  const totalEmission = transportEmission + electricityEmission + meatEmission;

  // Display results
  const resultsDiv = document.getElementById('results');
  const resultText = document.getElementById('result-text');
  const breakdownDiv = document.getElementById('breakdown');
  const equivalentsDiv = document.getElementById('equivalents');

  resultText.textContent = `Your total emissions: ${totalEmission.toFixed(2)} kg CO₂e`;
  // Create breakdown list
  breakdownDiv.innerHTML = `
    <ul>
      <li>Transportation: ${transportEmission.toFixed(2)} kg CO₂e</li>
      <li>Electricity: ${electricityEmission.toFixed(2)} kg CO₂e</li>
      <li>Diet (meat): ${meatEmission.toFixed(2)} kg CO₂e</li>
    </ul>
  `;
  // Compute equivalents
  const trees = totalEmission / 21; // approx 21 kg CO₂ absorbed per tree per year
  const carKm = totalEmission / EMISSION_FACTORS.car;
  const smartphoneCharges = totalEmission / 0.005; // assume 0.005 kg per charge
  equivalentsDiv.innerHTML = `That's roughly equivalent to planting <strong>${trees.toFixed(1)}</strong> trees, driving <strong>${carKm.toFixed(0)}</strong> km in a car, or charging your smartphone <strong>${smartphoneCharges.toFixed(0)}</strong> times.`;

  resultsDiv.classList.remove('hidden');
  // Store the latest calculation result temporarily on the save button
  resultsDiv.dataset.result = JSON.stringify({
    date: Date.now(),
    total: totalEmission,
    details: {
      transport: transportEmission,
      electricity: electricityEmission,
      meat: meatEmission
    }
  });
}

// Save the current result to localStorage
function saveResult() {
  const resultsDiv = document.getElementById('results');
  const data = resultsDiv.dataset.result;
  if (!data) {
    alert('Please calculate your emissions first.');
    return;
  }
  const entry = JSON.parse(data);
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('carbonHistory')) || [];
  } catch (err) {
    history = [];
  }
  history.push(entry);
  localStorage.setItem('carbonHistory', JSON.stringify(history));
  loadHistory();
  // Provide feedback to user
  alert('Your result has been saved to your dashboard!');
}

// Load history from localStorage and render table & chart
function loadHistory() {
  const historyContainer = document.getElementById('history');
  const chartContainer = document.getElementById('chart');
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('carbonHistory')) || [];
  } catch (err) {
    history = [];
  }
  historyContainer.innerHTML = '';
  chartContainer.innerHTML = '';
  if (history.length === 0) {
    historyContainer.innerHTML = '<p>No history yet. Save your first calculation to start tracking!</p>';
    return;
  }
  // Create table
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Date</th><th>Total (kg CO₂e)</th><th>Transportation</th><th>Electricity</th><th>Diet</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  history.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(entry.date)}</td>
      <td>${entry.total.toFixed(2)}</td>
      <td>${entry.details.transport.toFixed(2)}</td>
      <td>${entry.details.electricity.toFixed(2)}</td>
      <td>${entry.details.meat.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  historyContainer.appendChild(table);
  // Render bar chart
  renderChart(history);
}

// Render a simple bar chart using divs
function renderChart(history) {
  const chartContainer = document.getElementById('chart');
  const max = Math.max(...history.map(h => h.total));
  history.forEach(entry => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const heightPercent = (entry.total / max) * 100;
    bar.style.height = `${heightPercent}%`;
    bar.innerHTML = `<span>${entry.total.toFixed(1)}</span>`;
    chartContainer.appendChild(bar);
  });
}

// Clear history
function clearHistory() {
  if (!confirm('Are you sure you want to clear all saved results?')) return;
  localStorage.removeItem('carbonHistory');
  loadHistory();
}

// Scroll to calculator when hero button is clicked
function scrollToCalculator() {
  document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

// Attach event listeners after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('calculate-btn').addEventListener('click', calculateEmissions);
  document.getElementById('save-btn').addEventListener('click', saveResult);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('next-tip-btn').addEventListener('click', showRandomTip);
  document.getElementById('hero-btn').addEventListener('click', scrollToCalculator);
  // Load history and tip on page load
  loadHistory();
  showRandomTip();
});

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  });
}