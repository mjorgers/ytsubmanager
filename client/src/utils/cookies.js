export function setCookie(name, value, days = 365) {
  try {
    document.cookie = `${name}=${value};path=/`;
    console.log(`Cookie '${name}' set successfully`);
  } catch (error) {
    console.error("Error setting cookie:", error);
    throw error;
  }
}

export function getCookie(name) {
  try {
    const cookies = document.cookie.split(";");
    const cookie = cookies.find((c) => c.trim().startsWith(name + "="));
    if (!cookie) {
      console.log(`Cookie '${name}' not found`);
      return null;
    }
    return cookie.split("=")[1];
  } catch (error) {
    console.error("Error getting cookie:", error);
    return null;
  }
}
