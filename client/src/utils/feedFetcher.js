export async function fetchChannelFeed(channelId) {
  const response = await fetch(`http://localhost:3001/api/feed/${channelId}`);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");

  return Array.from(xmlDoc.getElementsByTagName("entry"))
    .map((entry) => {
      // Helper function to safely get text content
      const getTextContent = (element, tagName) => {
        const elem = entry.getElementsByTagName(tagName)[0];
        return elem ? elem.textContent : "";
      };

      // Helper function to get nested yt:videoId
      const getVideoId = (entry) => {
        const elem = entry.getElementsByTagNameNS(
          "http://www.youtube.com/xml/schemas/2015",
          "videoId"
        )[0];
        return elem ? elem.textContent : "";
      };

      // Helper function to get nested yt:channelId
      const getChannelId = (entry) => {
        const elem = entry.getElementsByTagNameNS(
          "http://www.youtube.com/xml/schemas/2015",
          "channelId"
        )[0];
        return elem ? elem.textContent : "";
      };

      // Get thumbnail from media:group/media:thumbnail
      const getThumbnail = (entry) => {
        const group = entry.getElementsByTagName("media:group")[0];
        if (group) {
          const thumbnail = group.getElementsByTagName("media:thumbnail")[0];
          return thumbnail ? thumbnail.getAttribute("url") : "";
        }
        return "";
      };

      // Update helper to detect shorts by checking for empty description
      const isShort = (entry) => {
        // There is no official way to detect shorts, but they usually have no description
        const mediaGroup = entry.getElementsByTagName("media:group")[0];
        if (!mediaGroup) return false;

        const description =
          mediaGroup.getElementsByTagName("media:description")[0];

        const hasDescription = description?.textContent;

        // Let's also check for hashtags in the title
        const title = getTextContent(entry, "title");
        const hasHashtag = title.includes("#");

        return !hasDescription || hasHashtag;
      };

      return {
        id: getTextContent(entry, "id"),
        videoId: getVideoId(entry),
        channelId: getChannelId(entry),
        title: getTextContent(entry, "title"),
        link: entry.getElementsByTagName("link")[0]?.getAttribute("href") || "",
        author: {
          name:
            getTextContent(entry, "author/name") ||
            getTextContent(entry, "name"),
          uri:
            getTextContent(entry, "author/uri") || getTextContent(entry, "uri"),
        },
        published: getTextContent(entry, "published"),
        thumbnail: getThumbnail(entry),
        isShort: isShort(entry),
      };
    })
    .filter((video) => video.videoId); // Only return entries with valid video IDs
}

export async function fetchAllFeeds(subscriptions) {
  const allVideos = await Promise.all(
    subscriptions.map((sub) => fetchChannelFeed(sub.channelId))
  );

  return allVideos
    .flat()
    .sort(
      (a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime()
    );
}
