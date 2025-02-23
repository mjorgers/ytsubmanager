import { fetchAllFeeds } from "./utils/feedFetcher.js";
import { setCookie, getCookie } from "./utils/cookies.js";
import {
  saveSubscriptions,
  loadSubscriptions,
} from "./utils/subscriptionStorage.js";

const VIDEOS_PER_PAGE = 20;
let currentVideos = [];
let currentPage = 0;
let isLoading = false;

async function initializeApp() {
  setupSearch();
  setupSettings();

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const subscriptions = loadSubscriptions();
    if (!subscriptions) {
      timeline.innerHTML =
        "Please upload your subscriptions.csv file in settings";
      return;
    }

    currentVideos = await fetchAllFeeds(subscriptions);

    // Apply shorts filter on load
    const hideShorts = localStorage.getItem("hideShorts") === "true";
    if (hideShorts) {
      currentVideos = currentVideos.filter((video) => !video.isShort);
    }

    const savedView = getCookie("viewMode") || "grid";
    renderVideos(savedView, true);
    setupViewToggle(savedView);
    setupInfiniteScroll();
  } catch (error) {
    timeline.innerHTML = `Error: ${error.message}`;
  }
}

function setupSearch() {
  const form = document.getElementById("search-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("search").value.trim();
    if (query) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        query
      )}`;
      window.open(searchUrl, "_blank");
    }
  });
}

function setupSettings() {
  const modal = document.getElementById("settings-modal");
  const settingsBtn = document.getElementById("settings-button");
  const closeBtn = document.getElementById("close-settings");
  const uploadBtn = document.getElementById("upload-button");
  const fileInput = document.getElementById("subscription-file");

  settingsBtn.addEventListener("click", () => {
    modal.classList.add("show");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0].split(",");

      const subscriptions = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(",");
          return {
            channelId: values[0],
            channelUrl: values[1],
            channelTitle: values[2],
          };
        });

      saveSubscriptions(subscriptions);
      modal.classList.remove("show");
      window.location.reload();
    } catch (error) {
      alert("Error processing file: " + error.message);
    }
  });

  const hideShortsToggle = document.getElementById("hide-shorts");

  // Load saved preference
  hideShortsToggle.checked = localStorage.getItem("hideShorts") === "true";

  hideShortsToggle.addEventListener("change", () => {
    localStorage.setItem("hideShorts", hideShortsToggle.checked);
    window.location.reload(); // Reload page when toggled
  });
}

function setupInfiniteScroll() {
  window.addEventListener("scroll", () => {
    if (isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 800) {
      // 800px before bottom
      loadMoreVideos();
    }
  });
}

function loadMoreVideos() {
  const nextPage = currentPage + 1;
  const start = nextPage * VIDEOS_PER_PAGE;
  if (start >= currentVideos.length) return;

  isLoading = true;
  currentPage = nextPage;

  const timeline = document.getElementById("timeline");
  const end = (currentPage + 1) * VIDEOS_PER_PAGE;

  const newVideos = currentVideos
    .slice(start, end)
    .map((video) => createVideoCard(video))
    .join("");

  timeline.insertAdjacentHTML("beforeend", newVideos);

  // Update loading indicator
  const loadingIndicator = document.querySelector(".loading-more");
  if (loadingIndicator) {
    loadingIndicator.remove();
  }

  if (end < currentVideos.length) {
    timeline.insertAdjacentHTML(
      "beforeend",
      '<div class="loading-more">Loading more videos...</div>'
    );
  }

  isLoading = false;
}

function renderVideos(viewType, reset = false) {
  const timeline = document.getElementById("timeline");
  if (reset) {
    currentPage = 0;
    timeline.innerHTML = "";
    // Set the appropriate class based on view type
    timeline.className =
      viewType === "list" ? "timeline-list" : "timeline-grid";
  }

  const start = (reset ? 0 : currentPage) * VIDEOS_PER_PAGE;
  const end = start + VIDEOS_PER_PAGE;

  const newVideos = currentVideos
    .slice(start, end)
    .map((video) => createVideoCard(video))
    .join("");

  if (reset) {
    timeline.innerHTML = newVideos;
  } else {
    timeline.insertAdjacentHTML("beforeend", newVideos);
  }

  // Update loading indicator
  const loadingIndicator = document.querySelector(".loading-more");
  if (loadingIndicator) {
    loadingIndicator.remove();
  }

  if (end < currentVideos.length) {
    timeline.insertAdjacentHTML(
      "beforeend",
      '<div class="loading-more">Loading more videos...</div>'
    );
  }
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

function createVideoCard(video) {
  const date = new Date(video.published);
  return `
        <a href="${video.link}" target="_blank" class="video-card">
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="video-info">
                <h2>${video.title}</h2>
                <p>By ${video.author.name} • ${timeAgo(date)}</p>
            </div>
        </a>
    `;
}

function setupViewToggle(initialView) {
  // Don't set up view toggle on mobile
  if (window.innerWidth <= 768) {
    return;
  }

  const buttons = document.querySelectorAll(".view-toggle button");

  // Set initial active state
  buttons.forEach((button) => {
    if (button.dataset.view === initialView) {
      button.classList.add("active");
    }
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const viewType = button.dataset.view;
      buttons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      setCookie("viewMode", viewType);
      renderVideos(viewType, true);
    });
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
