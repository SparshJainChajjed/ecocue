/*
  CarbonCue Dashboard Script

  This script handles uploading and parsing CSV data, calculating greenhouse gas emissions using
  standard factors from EPA/IPCC sources, rendering summary cards, bar charts and line charts,
  and providing reduction cues to help organisations act on their biggest emission sources.
*/

// Wait until the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Emission factors in kg CO2e per unit
  // Sources: car factor ~0.17067 kg/km【363860688336500†L31-L34】; bus 0.11 kg/km, train 0.04 kg/km, flight 0.46 kg/km【323337883740500†L14-L24】【323337883740500†L54-L68】;
  // electricity in India 0.82 kg/kWh【22114595527097†L25-L49】; waste incineration ~1 kg/kg【969637965343882†L29-L33】.
  const EMISSION_FACTORS = {
    electricity: 0.82,
    transport_car: 0.17067,
    transport_bus: 0.11,
    transport_train: 0.04,
    transport_flight: 0.46,
    waste: 1.0
  };

  // Global data array
  let activityData = [];

  // Grab DOM elements
  const getStartedBtn = document.getElementById('get-started');
  const uploadSection = document.getElementById('upload');
  const fileInput = document.getElementById('data-file');
  const loadSampleBtn = document.getElementById('load-sample');
  const dashboardSection = document.getElementById('dashboard');
  const analysisSection = document.getElementById('analysis');
  const summaryContainer = document.getElementById('summary');
  const deptBarsContainer = document.getElementById('dept-bars');
  const catBarsContainer = document.getElementById('cat-bars');
  const trendCanvas = document.getElementById('trend-chart');
  const analysisContent = document.getElementById('analysis-content');

  // Scroll to upload on get started
  getStartedBtn.addEventListener('click', () => {
    uploadSection.scrollIntoView({ behavior: 'smooth' });
  });

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        activityData = parseCSV(text);
        processData();
      };
      reader.readAsText(file);
    }
  });

  // Load sample data
  loadSampleBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('sample_data.csv');
      const text = await response.text();
      fileInput.value = '';
      activityData = parseCSV(text);
      processData();
    } catch (err) {
      console.error('Error loading sample data:', err);
    }
  });

  /**
   * Parse CSV text into an array of activity objects.
   * Expected columns: Date, Department, Category, Unit, Amount
   * Lines starting with '#' or empty lines are ignored.
   * @param {string} text
   * @returns {Array<Object>}
   */
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const data = [];
    if (lines.length < 2) return data;
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('#')) continue;
      const values = line.split(',');
      const record = {};
      header.forEach((key, idx) => {
        record[key] = values[idx] ? values[idx].trim() : '';
      });
      // Convert date string to Date
      const date = new Date(record.date);
      if (isNaN(date)) continue;
      record.date = date;
      record.amount = parseFloat(record.amount);
      // Normalize category key to match factors
      record.category = record.category.toLowerCase();
      // Append record
      data.push(record);
    }
    return data;
  }

  /**
   * Process loaded data: compute emissions, update UI sections
   */
  function processData() {
    if (!activityData || activityData.length === 0) return;
    // Compute emissions for each record
    activityData.forEach(rec => {
      const factor = EMISSION_FACTORS[rec.category] || 0;
      rec.emission = factor * rec.amount;
    });
    // Sort data by date
    activityData.sort((a, b) => a.date - b.date);
    // Show dashboard and analysis sections
    dashboardSection.classList.remove('hidden');
    analysisSection.classList.remove('hidden');
    // Render summary
    renderSummary();
    // Render charts
    renderBarCharts();
    renderTrendChart();
    // Generate reduction cues
    renderAnalysis();
  }

  /**
   * Render summary cards (total emissions, top department, top category)
   */
  function renderSummary() {
    // Clear previous
    summaryContainer.innerHTML = '';
    // Compute total emissions
    const total = activityData.reduce((sum, rec) => sum + rec.emission, 0);
    // Emissions per department
    const deptTotals = {};
    const catTotals = {};
    activityData.forEach(rec => {
      if (!deptTotals[rec.department]) deptTotals[rec.department] = 0;
      deptTotals[rec.department] += rec.emission;
      if (!catTotals[rec.category]) catTotals[rec.category] = 0;
      catTotals[rec.category] += rec.emission;
    });
    // Determine top department and category
    const topDept = Object.entries(deptTotals).sort((a, b) => b[1] - a[1])[0];
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    // Helper to format tonnes
    const formatEm = (value) => {
      if (value >= 1000) {
        return (value / 1000).toFixed(2) + ' t';
      }
      return value.toFixed(2) + ' kg';
    };
    // Build cards
    const cards = [
      {
        title: 'Total Emissions',
        value: formatEm(total)
      },
      {
        title: 'Top Department',
        value: topDept ? `${topDept[0]} (${formatEm(topDept[1])})` : 'N/A'
      },
      {
        title: 'Top Category',
        value: topCat ? `${humanReadableCategory(topCat[0])} (${formatEm(topCat[1])})` : 'N/A'
      }
    ];
    cards.forEach(card => {
      const div = document.createElement('div');
      div.className = 'summary-card';
      const h4 = document.createElement('h4');
      h4.textContent = card.title;
      const valueEl = document.createElement('div');
      valueEl.className = 'value';
      valueEl.textContent = card.value;
      div.appendChild(h4);
      div.appendChild(valueEl);
      summaryContainer.appendChild(div);
    });
  }

  /**
   * Render bar charts for departments and categories
   */
  function renderBarCharts() {
    // Compute totals
    const deptTotals = {};
    const catTotals = {};
    activityData.forEach(rec => {
      deptTotals[rec.department] = (deptTotals[rec.department] || 0) + rec.emission;
      catTotals[rec.category] = (catTotals[rec.category] || 0) + rec.emission;
    });
    // Render department bar chart
    renderBarChart(deptBarsContainer, deptTotals);
    // Render category bar chart
    renderBarChart(catBarsContainer, catTotals, true);
  }

  /**
   * Render a bar chart inside container.
   * @param {HTMLElement} container
   * @param {Object} dataMap - key: label, value: number
   * @param {boolean} humanize - convert category keys to readable labels
   */
  function renderBarChart(container, dataMap, humanize = false) {
    container.innerHTML = '';
    const entries = Object.entries(dataMap);
    if (entries.length === 0) return;
    const maxValue = Math.max(...entries.map(([_, v]) => v));
    entries.sort((a, b) => b[1] - a[1]);
    entries.forEach(([key, value]) => {
      const barWrapper = document.createElement('div');
      barWrapper.style.flex = '1';
      barWrapper.style.position = 'relative';
      barWrapper.className = 'bar-wrapper';
      const bar = document.createElement('div');
      bar.className = 'bar';
      const heightPercent = (value / maxValue) * 100;
      bar.style.height = heightPercent + '%';
      // Value label above bar
      const valLabel = document.createElement('div');
      valLabel.className = 'bar-value';
      valLabel.textContent = formatNumber(value);
      // Name label below bar
      const nameLabel = document.createElement('div');
      nameLabel.className = 'bar-label';
      nameLabel.textContent = humanize ? humanReadableCategory(key) : key;
      // Build
      barWrapper.appendChild(valLabel);
      barWrapper.appendChild(bar);
      barWrapper.appendChild(nameLabel);
      container.appendChild(barWrapper);
    });
  }

  /**
   * Render trend line chart using Canvas.
   */
  function renderTrendChart() {
    // Group by month (YYYY-MM)
    const monthlyTotals = {};
    activityData.forEach(rec => {
      const monthKey = rec.date.getFullYear() + '-' + String(rec.date.getMonth() + 1).padStart(2, '0');
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + rec.emission;
    });
    const labels = Object.keys(monthlyTotals).sort();
    const values = labels.map(k => monthlyTotals[k]);
    // Draw chart
    drawLineChart(trendCanvas, labels, values);
  }

  /**
   * Draw line chart on canvas
   * @param {HTMLCanvasElement} canvas
   * @param {Array<string>} labels
   * @param {Array<number>} values
   */
  function drawLineChart(canvas, labels, values) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    if (!labels.length) return;
    // Margins
    const margin = 40;
    const chartWidth = width - margin * 2;
    const chartHeight = height - margin * 2;
    // Determine max value
    const maxVal = Math.max(...values);
    // Draw axes
    ctx.strokeStyle = '#334f55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();
    // Draw gridlines and y axis labels (5 levels)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = margin + (chartHeight * i / steps);
      const val = maxVal * (1 - i / steps);
      ctx.strokeStyle = '#253941';
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
      ctx.fillText(formatNumber(val), 5, y + 4);
    }
    // Plot line
    ctx.strokeStyle = '#29d17c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((val, idx) => {
      const x = margin + (chartWidth * idx / (labels.length - 1 || 1));
      const y = margin + chartHeight * (1 - val / maxVal);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    // Draw points and labels
    values.forEach((val, idx) => {
      const x = margin + (chartWidth * idx / (labels.length - 1 || 1));
      const y = margin + chartHeight * (1 - val / maxVal);
      // Point
      ctx.fillStyle = '#29d17c';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Label (date)
      ctx.fillStyle = '#94a3b8';
      ctx.save();
      ctx.translate(x, height - margin + 12);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(labels[idx], 0, 0);
      ctx.restore();
    });
  }

  /**
   * Render reduction cues based on largest emissions
   */
  function renderAnalysis() {
    analysisContent.innerHTML = '';
    // Compute total by category
    const catTotals = {};
    activityData.forEach(rec => {
      catTotals[rec.category] = (catTotals[rec.category] || 0) + rec.emission;
    });
    const total = Object.values(catTotals).reduce((a, b) => a + b, 0);
    // Sort categories descending
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    // For each category create cue
    sorted.forEach(([cat, val]) => {
      const share = (val / total) * 100;
      const item = document.createElement('div');
      item.className = 'analysis-item';
      const title = document.createElement('h4');
      title.textContent = humanReadableCategory(cat) + ` – ${share.toFixed(1)}%`;
      const desc = document.createElement('p');
      desc.textContent = generateCue(cat);
      item.appendChild(title);
      item.appendChild(desc);
      analysisContent.appendChild(item);
    });
  }

  /**
   * Generate a reduction suggestion for a given category
   * @param {string} cat
   */
  function generateCue(cat) {
    switch (cat) {
      case 'electricity':
        return 'High electricity emissions indicate opportunities for energy efficiency. Consider upgrading to LED lighting, optimising HVAC systems, and sourcing renewable electricity where possible.';
      case 'transport_car':
        return 'Car travel is a significant emitter. Encourage carpooling, promote public transport or EV options, and optimise routes to reduce distance travelled.';
      case 'transport_bus':
        return 'Bus travel emits less per kilometre than cars but emissions can still be lowered by switching to electric or hybrid buses and optimising schedules.';
      case 'transport_train':
        return 'Train travel is relatively low-carbon. Promote its use over flights or cars for inter-city trips to cut emissions further.';
      case 'transport_flight':
        return 'Flights have very high emissions. Evaluate if trips can be replaced by virtual meetings or train travel, and offset necessary flights through verified programmes.';
      case 'waste':
        return 'Waste-related emissions suggest opportunities in waste reduction, recycling and composting. Audit waste streams and engage suppliers to reduce packaging.';
      default:
        return 'Explore opportunities to reduce emissions in this category by analysing operations and engaging stakeholders.';
    }
  }

  /**
   * Convert category keys to human-readable labels
   * @param {string} key
   */
  function humanReadableCategory(key) {
    return key
      .replace('transport_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format number into compact string (e.g., 1.2k kg)
   * @param {number} value
   */
  function formatNumber(value) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'k';
    } else {
      return value.toFixed(0);
    }
  }

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    });
  }
});