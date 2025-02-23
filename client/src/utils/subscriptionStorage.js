const STORAGE_KEY = "youtube_subscriptions";

export function saveSubscriptions(subscriptions) {
  try {
    const jsonData = JSON.stringify(subscriptions);
    localStorage.setItem(STORAGE_KEY, jsonData);
    console.log("Subscriptions saved:", subscriptions.length, "channels");
  } catch (error) {
    console.error("Error saving subscriptions:", error);
    throw error;
  }
}

export function loadSubscriptions() {
  try {
    const jsonData = localStorage.getItem(STORAGE_KEY);
    if (!jsonData) {
      console.log("No subscriptions found in storage");
      return null;
    }

    const subscriptions = JSON.parse(jsonData);
    console.log("Subscriptions loaded:", subscriptions.length, "channels");
    return subscriptions;
  } catch (error) {
    console.error("Error loading subscriptions:", error);
    return null;
  }
}
