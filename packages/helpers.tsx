export function extractVideoId(url: string) {
    // Regular expression to match YouTube video URLs
    const youtubePattern = /^(https?:\/\/(?:www\.)?youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S*?[?&]v=|(?:v|e(?:mbed)?)\/)([a-zA-Z0-9_-]{11}))$/;

    const match = youtubePattern.exec(url);

    if (match) {
        // Return the video ID if the URL is valid
        return match[2];
    } else {
        // Return null if the URL is invalid
        return null;
    }
}
