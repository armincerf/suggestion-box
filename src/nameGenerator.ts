// Human-readable anonymous name generator
// Generates names like "sad-panda-man" or "fluffy-duck-murderer"

// Lists of adjectives, animals, and roles that can be combined
const adjectives = [
  "happy", "sad", "angry", "calm", "wild", "sleepy", "grumpy", "fluffy", 
  "tiny", "massive", "clever", "silly", "brave", "shy", "gentle", "fierce", 
  "ancient", "young", "serious", "playful", "sneaky", "loud", "quiet"
];

const animals = [
  "panda", "duck", "cat", "dog", "elephant", "tiger", "wolf", "fox", 
  "rabbit", "bear", "turtle", "eagle", "dolphin", "shark", "koala", 
  "penguin", "owl", "frog", "deer", "hamster", "squirrel", "sloth"
];

const roles = [
  "ninja", "wizard", "warrior", "chef", "pilot", "dancer", "artist", 
  "hero", "villain", "detective", "pirate", "astronaut", "robot", 
  "vampire", "ghost", "scientist", "coach", "guardian", "master", 
  "explorer", "adventurer", "hunter", "hacker", "man", "woman"
];

/**
 * Generates a random human-readable anonymous name
 * @returns A string in the format "adjective-animal-role"
 */
export function generateAnonName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const role = roles[Math.floor(Math.random() * roles.length)];

  return `${adjective}-${animal}-${role}`;
}

/**
 * Generates a deterministic name from a user identifier
 * This ensures the same user always gets the same name
 * @param userId A unique user identifier
 * @returns A consistent human-readable name for the user
 */
export function getNameFromUserId(userId: string): string {
  // Create a simple hash from the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use the hash to select consistent values from each array
  const adjectiveIndex = Math.abs(hash) % adjectives.length;
  const animalIndex = Math.abs(hash >> 8) % animals.length;
  const roleIndex = Math.abs(hash >> 16) % roles.length;
  
  return `${adjectives[adjectiveIndex]}-${animals[animalIndex]}-${roles[roleIndex]}`;
} 