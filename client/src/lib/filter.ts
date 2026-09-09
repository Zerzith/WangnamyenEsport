const badWords = [
  "หำ", "ควย", "เย็ด", "เหี้ย", "สัส", "ระยำ", "จู๋", "แตด", "มึง", "กู",
  "fuck", "shit", "dick", "pussy", "asshole", "bitch"
];

export function censorText(text: string): string {
  if (!text) return "";
  let censored = text;

  badWords.forEach(word => {
    const regex = new RegExp(word, "gi");
    censored = censored.replace(regex, (match) => {
      if (match.length <= 1) return "*";
      return match[0] + "*".repeat(match.length - 1);
    });
  });

  return censored;
}

export function isInappropriateImage(url: string): boolean {


  return false;
}
