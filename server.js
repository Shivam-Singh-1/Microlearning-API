const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from current directory (not public subdirectory)
app.use(express.static(__dirname));

// Load lessons data
let lessonsData = {};
try {
  const lessonsPath = path.join(__dirname, "lessons.json");
  console.log("Looking for lessons.json at:", lessonsPath);

  if (fs.existsSync(lessonsPath)) {
    const lessonsFile = fs.readFileSync(lessonsPath, "utf8");
    lessonsData = JSON.parse(lessonsFile);
    console.log("Successfully loaded lessons.json");
    console.log("Topics found:", lessonsData.topics?.length || 0);
  } else {
    console.error("lessons.json file not found at:", lessonsPath);
    lessonsData = { topics: [] };
  }
} catch (error) {
  console.error("Error loading lessons.json:", error);
  lessonsData = { topics: [] };
}

// Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Microlearning API is running",
    timestamp: new Date().toISOString(),
    topicsCount: lessonsData.topics?.length || 0,
  });
});

// Get all topics
app.get("/api/topics", (req, res) => {
  try {
    console.log(
      "GET /api/topics - Topics available:",
      lessonsData.topics?.length || 0
    );

    if (!lessonsData.topics || lessonsData.topics.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No topics found. Please check lessons.json file.",
      });
    }

    const topics = lessonsData.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      totalLessons: topic.lessons ? topic.lessons.length : 0,
    }));

    console.log("Returning topics:", topics.length);
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error("Error in /api/topics:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific topic with all lessons
app.get("/api/topics/:topicId", (req, res) => {
  try {
    console.log("GET /api/topics/" + req.params.topicId);

    const topic = lessonsData.topics?.find((t) => t.id === req.params.topicId);
    if (!topic) {
      return res.status(404).json({ success: false, error: "Topic not found" });
    }
    res.json({ success: true, data: topic });
  } catch (error) {
    console.error("Error in /api/topics/:topicId:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific lesson
app.get("/api/topics/:topicId/lessons/:lessonId", (req, res) => {
  try {
    const topic = lessonsData.topics?.find((t) => t.id === req.params.topicId);
    if (!topic) {
      return res.status(404).json({ success: false, error: "Topic not found" });
    }

    const lesson = topic.lessons?.find((l) => l.id === req.params.lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, error: "Lesson not found" });
    }

    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error("Error in /api/topics/:topicId/lessons/:lessonId:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get random fact from any topic
app.get("/api/random-fact", (req, res) => {
  try {
    console.log("GET /api/random-fact");

    const allFacts = [];

    if (!lessonsData.topics) {
      return res.status(404).json({
        success: false,
        error: "No topics available",
      });
    }

    lessonsData.topics.forEach((topic) => {
      if (topic.lessons) {
        topic.lessons.forEach((lesson) => {
          if (lesson.facts) {
            lesson.facts.forEach((fact) => {
              allFacts.push({
                ...fact,
                topicTitle: topic.title,
                lessonTitle: lesson.title,
              });
            });
          }
        });
      }
    });

    console.log("Total facts available:", allFacts.length);

    if (allFacts.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No facts available" });
    }

    const randomFact = allFacts[Math.floor(Math.random() * allFacts.length)];
    console.log("Returning random fact:", randomFact.title);
    res.json({ success: true, data: randomFact });
  } catch (error) {
    console.error("Error in /api/random-fact:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search lessons
app.get("/api/search", (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    if (!query) {
      return res
        .status(400)
        .json({ success: false, error: "Search query required" });
    }

    const results = [];
    lessonsData.topics?.forEach((topic) => {
      topic.lessons?.forEach((lesson) => {
        if (
          lesson.title.toLowerCase().includes(query) ||
          lesson.description.toLowerCase().includes(query)
        ) {
          results.push({
            topicId: topic.id,
            topicTitle: topic.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonDescription: lesson.description,
          });
        }
      });
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error in /api/search:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend - this should be the main index.html
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "index.html");
  console.log("Serving index.html from:", indexPath);

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("index.html not found");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ success: false, error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  console.log("404 - Route not found:", req.path);
  res.status(404).json({ success: false, error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Microlearning API server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
  console.log(`📊 API health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Topics available: ${lessonsData.topics?.length || 0}`);

  // Log the current directory and files
  console.log("📁 Current directory:", __dirname);
  console.log(
    "📋 Files in directory:",
    fs
      .readdirSync(__dirname)
      .filter(
        (f) =>
          f.endsWith(".html") ||
          f.endsWith(".js") ||
          f.endsWith(".json") ||
          f.endsWith(".css")
      )
  );
});

module.exports = app;
