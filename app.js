let topics = [];
let currentFact = null;

// Theme management
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  if (body.getAttribute("data-theme") === "dark") {
    body.removeAttribute("data-theme");
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark";
    // Don't use localStorage in artifacts
  } else {
    body.setAttribute("data-theme", "dark");
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light";
    // Don't use localStorage in artifacts
  }
}

function initTheme() {
  // Initialize with light theme by default
  document.body.removeAttribute("data-theme");
  document.getElementById("theme-icon").textContent = "🌙";
  document.getElementById("theme-text").textContent = "Dark";
}

// API functions
async function fetchTopics() {
  try {
    console.log("Fetching topics from /api/topics");
    const response = await fetch("/api/topics");
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Topics data:", data);

    return data.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching topics:", error);
    showError("Failed to load topics. Please make sure the server is running.");
    return [];
  }
}

async function fetchRandomFact() {
  try {
    console.log("Fetching random fact from /api/random-fact");
    const response = await fetch("/api/random-fact");
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Random fact data:", data);

    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching random fact:", error);
    return null;
  }
}

async function fetchTopicFacts(topicId) {
  try {
    console.log(`Fetching facts for topic: ${topicId}`);
    const response = await fetch(`/api/topics/${topicId}`);
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Topic facts data:", data);

    if (data.success) {
      // Collect all facts from all lessons in the topic
      const allFacts = [];
      data.data.lessons.forEach((lesson) => {
        lesson.facts.forEach((fact) => {
          allFacts.push({
            ...fact,
            topicTitle: data.data.title,
            lessonTitle: lesson.title,
          });
        });
      });
      return allFacts;
    }
    return [];
  } catch (error) {
    console.error("Error fetching topic facts:", error);
    return [];
  }
}

// Display functions
function showLoading() {
  const container = document.getElementById("factContainer");
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Finding an amazing fact...</p>
    </div>
  `;
}

function showError(message) {
  const container = document.getElementById("factContainer");
  container.innerHTML = `
    <div class="error">
      <p>⚠️ ${message}</p>
    </div>
  `;
}

function displayFact(fact) {
  const container = document.getElementById("factContainer");
  const factHTML = `
    <div class="fact-card fade-in">
      <h2 class="fact-title">${fact.title}</h2>
      <p class="fact-content">${fact.content}</p>
      <div class="fact-meta">
        <span><strong>Topic:</strong> ${fact.topicTitle}</span>
        <span><strong>Lesson:</strong> ${fact.lessonTitle}</span>
      </div>
      ${
        fact.tags && fact.tags.length > 0
          ? `
        <div class="fact-tags">
          ${fact.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      `
          : ""
      }
    </div>
  `;
  container.innerHTML = factHTML;
  currentFact = fact;
}

// Main functions
async function getRandomFact() {
  showLoading();
  const fact = await fetchRandomFact();

  if (fact) {
    displayFact(fact);
  } else {
    showError(
      "No facts available. Please check if your lessons.json file has data and the server is running."
    );
  }
}

async function getFactFromTopic() {
  const topicSelect = document.getElementById("topicSelect");
  const selectedTopicId = topicSelect.value;

  if (!selectedTopicId) {
    showError("Please select a topic first!");
    return;
  }

  showLoading();
  const facts = await fetchTopicFacts(selectedTopicId);

  if (facts.length > 0) {
    // Get random fact from selected topic
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    displayFact(randomFact);
  } else {
    showError("No facts available for this topic.");
  }
}

async function populateTopicsDropdown() {
  const topicSelect = document.getElementById("topicSelect");

  console.log("Populating topics dropdown...");

  // Show loading state
  topicSelect.innerHTML = '<option value="">Loading topics...</option>';
  topicSelect.disabled = true;

  try {
    topics = await fetchTopics();
    console.log("Topics loaded:", topics);

    // Clear existing options
    topicSelect.innerHTML = '<option value="">Select a topic...</option>';
    topicSelect.disabled = false;

    if (topics.length === 0) {
      topicSelect.innerHTML = '<option value="">No topics available</option>';
      topicSelect.disabled = true;
      console.warn("No topics found");
      return;
    }

    topics.forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic.id;
      option.textContent = `${topic.title} (${topic.totalLessons} lessons)`;
      topicSelect.appendChild(option);
    });

    console.log("Topics dropdown populated successfully");
  } catch (error) {
    console.error("Error populating topics:", error);
    topicSelect.innerHTML = '<option value="">Error loading topics</option>';
    topicSelect.disabled = true;
    showError("Failed to load topics. Please check if the server is running.");
  }
}

// Test server connection
async function testServerConnection() {
  try {
    console.log("Testing server connection...");
    const response = await fetch("/api/health");
    if (response.ok) {
      const data = await response.json();
      console.log("Server connection successful:", data);
      return true;
    } else {
      console.error("Server responded with error:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Server connection failed:", error);
    showError(
      "Cannot connect to server. Please make sure the server is running on port 3000."
    );
    return false;
  }
}

// Initialize the app
async function init() {
  console.log("Initializing microlearning app...");

  initTheme();

  // Test server connection first
  const serverConnected = await testServerConnection();
  if (!serverConnected) {
    return;
  }

  // Load topics
  await populateTopicsDropdown();

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      getRandomFact();
    } else if (e.key === "t" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      getFactFromTopic();
    }
  });

  console.log("App initialization complete");
}

// Start the app
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
