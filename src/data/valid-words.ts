/**
 * Valid 5-letter English words for Wordle guess validation.
 * Users must guess a real word — this list validates their input.
 * The daily answer (eco-themed) is stored in the database separately.
 */
export const VALID_WORDS: Set<string> = new Set([
  // Common 5-letter words (curated list)
  "about", "above", "abuse", "actor", "adapt", "added", "admit", "adopt",
  "adult", "after", "again", "agent", "agree", "ahead", "aimed", "alarm",
  "album", "alert", "alien", "align", "alike", "alive", "alley", "allow",
  "alone", "along", "alter", "amaze", "among", "ample", "angel", "anger",
  "angle", "angry", "ankle", "annoy", "apart", "apple", "apply", "arena",
  "argue", "arise", "armor", "array", "arrow", "aside", "asset", "atlas",
  "avoid", "awake", "award", "aware", "awful",
  // B
  "badge", "badly", "baker", "basic", "basin", "basis", "batch", "beach",
  "beard", "beast", "begin", "being", "below", "bench", "berry", "bible",
  "bikes", "birth", "black", "blade", "blame", "bland", "blank", "blast",
  "blaze", "bleak", "bleed", "blend", "bless", "blind", "block", "blood",
  "bloom", "blown", "blues", "blunt", "board", "boast", "bonus", "books",
  "boost", "boots", "bored", "bound", "brain", "brand", "brave", "bread",
  "break", "breed", "brick", "brief", "bring", "broad", "broke", "brook",
  "brown", "brush", "buddy", "build", "built", "bunch", "burst", "buyer",
  // C
  "cabin", "cable", "camel", "candy", "carry", "catch", "cause", "chain",
  "chair", "chalk", "chaos", "charm", "chart", "chase", "cheap", "check",
  "cheek", "cheer", "chess", "chest", "chief", "child", "chill", "china",
  "chips", "choir", "chose", "chunk", "civic", "civil", "claim", "clash",
  "class", "clean", "clear", "clerk", "click", "cliff", "climb", "cling",
  "clock", "clone", "close", "cloth", "cloud", "coach", "coast", "color",
  "comet", "comic", "coral", "count", "court", "cover", "crack", "craft",
  "crane", "crash", "crazy", "cream", "creek", "crest", "crime", "crisp",
  "cross", "crowd", "crown", "crude", "crush", "cubic", "curve", "cycle",
  // D
  "daily", "dance", "dated", "death", "debug", "decay", "decor", "decoy",
  "defer", "delay", "delta", "dense", "depot", "depth", "derby", "desert",
  "diary", "dirty", "dizzy", "dodge", "donor", "doubt", "dough", "draft",
  "drain", "drake", "drama", "drank", "drape", "drawn", "dream", "dress",
  "dried", "drift", "drill", "drink", "drive", "drops", "drown", "drums",
  "drunk", "dryer", "dusty", "dutch", "dwarf", "dwell",
  // E
  "eager", "eagle", "early", "earth", "ease", "eased", "eaten", "eight",
  "elder", "elect", "elite", "ember", "empty", "ended", "enemy", "enjoy",
  "enter", "entry", "equal", "equip", "erase", "error", "essay", "ethic",
  "event", "every", "exact", "exams", "excel", "exert", "exile", "exist",
  "extra",
  // F
  "fable", "facet", "faint", "fairy", "faith", "false", "fancy", "fatal",
  "fault", "favor", "feast", "fence", "ferry", "fewer", "fiber", "fibre",
  "field", "fiery", "fifth", "fifty", "fight", "final", "first", "fixed",
  "flame", "flash", "flask", "fleet", "flesh", "flies", "flock", "flood",
  "floor", "flora", "flour", "flown", "fluid", "flush", "flute", "focus",
  "foggy", "force", "forge", "forth", "forum", "found", "frame", "frank",
  "fraud", "fresh", "front", "frost", "froze", "fruit", "fully", "funds",
  "funny", "furry",
  // G
  "gains", "gamma", "gases", "gauge", "genes", "genre", "ghost", "giant",
  "given", "given", "glade", "glare", "glass", "gleam", "glide", "globe",
  "gloom", "glory", "gloss", "glove", "glyph", "going", "grace", "grade",
  "grain", "grand", "grant", "grape", "grasp", "grass", "grave", "gravel",
  "great", "greed", "green", "greet", "grief", "grill", "grind", "groan",
  "gross", "group", "grove", "grown", "guard", "guess", "guest", "guide",
  "guild", "guilt", "guise",
  // H
  "habit", "hands", "handy", "happy", "hardy", "harsh", "hasn't", "haste",
  "hatch", "haven", "heart", "heavy", "hedge", "hello", "herbs", "hilly",
  "hinge", "hobby", "homer", "honey", "honor", "hoped", "horse", "hotel",
  "hours", "house", "hover", "human", "humor", "hurry", "husky",
  // I
  "ideal", "image", "imply", "inbox", "index", "indie", "infer", "inner",
  "input", "intro", "ionic", "irony", "issue", "ivory",
  // J
  "jewel", "jimmy", "joker", "jolly", "joust", "judge", "juice", "juicy",
  "jumbo", "jumps", "junco", "juror", "jelly",
  // K
  "kayak", "kebab", "kitty", "knack", "knead", "kneel", "knelt", "knife",
  "knock", "known",
  // L
  "label", "labor", "laden", "lance", "laser", "later", "laugh", "layer",
  "leads", "learn", "lease", "least", "leave", "legal", "lemon", "level",
  "lever", "light", "liked", "limit", "linen", "links", "liter", "lived",
  "liver", "llama", "lobby", "local", "lodge", "logic", "login", "lonely",
  "loose", "lotus", "lover", "lower", "loyal", "lucky", "lunar", "lunch",
  "lyric",
  // M
  "macro", "magic", "major", "maker", "mange", "manor", "maple", "march",
  "marsh", "match", "maybe", "mayor", "meant", "media", "medal", "mercy",
  "merge", "merit", "merry", "metal", "meter", "might", "mimic", "minds",
  "miner", "minor", "minus", "mixer", "model", "money", "month", "moral",
  "motor", "motto", "mound", "mount", "mouse", "mouth", "moved", "mover",
  "movie", "multi", "mural", "music", "musty", "myths",
  // N
  "naive", "naked", "named", "nasty", "naval", "nerve", "never", "newer",
  "newly", "nexus", "night", "noble", "noise", "north", "noted", "novel",
  "nudge", "nurse",
  // O
  "oasis", "occur", "ocean", "olive", "onset", "opera", "opted", "orbit",
  "order", "organ", "other", "ought", "outer", "owned", "owner", "oxide",
  "ozone",
  // P
  "paced", "paint", "panel", "panic", "paper", "party", "paste", "patch",
  "pause", "peace", "peach", "pearl", "penny", "phase", "phone", "photo",
  "piano", "picks", "piece", "pilot", "pitch", "pixel", "pizza", "place",
  "plain", "plane", "plant", "plate", "plaza", "plead", "pluck", "plumb",
  "plume", "plump", "plush", "poems", "point", "polar", "ponds", "pools",
  "power", "press", "price", "pride", "prime", "print", "prior", "prize",
  "probe", "prone", "proof", "proud", "prove", "psalm", "pulse", "punch",
  "pupil", "purse", "pushy",
  // Q
  "quake", "queen", "query", "quest", "queue", "quick", "quiet", "quilt",
  "quirk", "quota", "quote",
  // R
  "radar", "radio", "raise", "rally", "ranch", "range", "rapid", "rainy",
  "ratio", "reach", "react", "reads", "ready", "realm", "rebel", "refer",
  "reign", "relax", "relay", "renew", "repay", "reply", "resin", "reuse",
  "rider", "ridge", "rifle", "right", "rigid", "risky", "rival", "river",
  "roast", "robin", "robot", "rocky", "roots", "rouge", "rough", "round",
  "route", "royal", "rugby", "ruins", "ruled", "ruler", "rural", "rusty",
  // S
  "sadly", "saint", "salad", "salty", "sandy", "sauce", "saved", "scale",
  "scare", "scene", "scent", "scope", "score", "scout", "scrap", "siren",
  "serve", "seven", "shade", "shake", "shall", "shame", "shape", "share",
  "shark", "sharp", "sheep", "sheer", "sheet", "shelf", "shell", "shift",
  "shire", "shirt", "shock", "shore", "short", "shout", "shown", "sight",
  "silly", "since", "sixth", "sixty", "sized", "skill", "skull", "slash",
  "slate", "slave", "sleep", "slice", "slide", "slope", "small", "smart",
  "smell", "smile", "smoke", "snack", "snake", "snare", "solar", "solid",
  "solve", "sorry", "sound", "south", "space", "spare", "spark", "spawn",
  "speak", "speed", "spend", "spent", "spice", "spine", "spoke", "spoon",
  "sport", "spray", "squad", "stack", "staff", "stage", "stain", "stair",
  "stake", "stale", "stall", "stamp", "stand", "stare", "stark", "start",
  "state", "stays", "steak", "steal", "steam", "steel", "steep", "steer",
  "stern", "stick", "stiff", "still", "sting", "stock", "stole", "stone",
  "stood", "stool", "store", "storm", "story", "stout", "stove", "strap",
  "straw", "stray", "strip", "stuck", "study", "stuff", "stump", "style",
  "sugar", "suite", "sunny", "super", "surge", "swamp", "swear", "sweat",
  "sweep", "sweet", "swept", "swift", "swing", "swirl", "sword", "sworn",
  // T
  "table", "taken", "tales", "taste", "taxes", "teach", "teeth", "tempo",
  "terms", "tests", "thank", "theft", "theme", "there", "thick", "thief",
  "thing", "think", "third", "thorn", "those", "three", "threw", "throw",
  "thumb", "tidal", "tiger", "tight", "timer", "tired", "title", "toast",
  "today", "token", "topic", "torch", "total", "touch", "tough", "tower",
  "toxic", "trace", "track", "trade", "trail", "train", "trait", "trash",
  "treat", "trees", "trend", "trial", "tribe", "trick", "tried", "troop",
  "truck", "truly", "trump", "trunk", "trust", "truth", "tulip", "tumor",
  "tuned", "turns", "tutor", "twist", "typed",
  // U
  "ultra", "uncle", "under", "unfit", "union", "unite", "unity", "until",
  "upper", "upset", "urban", "usage", "users", "usual", "utter",
  // V
  "vague", "valid", "value", "vapor", "vault", "verse", "video", "vigil",
  "vigor", "vinyl", "viral", "virus", "visit", "vista", "vital", "vivid",
  "vocal", "vodka", "voice", "voter",
  // W
  "wages", "waste", "watch", "water", "watts", "waves", "weary", "weave",
  "weird", "wheat", "wheel", "where", "which", "while", "white", "whole",
  "whose", "wider", "widow", "width", "winds", "witch", "women", "woods",
  "words", "world", "worry", "worse", "worst", "worth", "would", "wound",
  "wrath", "write", "wrong", "wrote",
  // X
  "xenon", "xerox",
  // Y
  "yacht", "yards", "yearn", "years", "yield", "young", "yours", "youth",
  // Z
  "zones", "zeros",

  // === ECO / ENVIRONMENTAL THEMED WORDS ===
  // These ensure eco-themed answer words are always valid guesses
  "algae", "biome", "cedar", "crops", "delta", "dunes", "fauna", "ferns",
  "fjord", "frost", "fungi", "geyser", "grove", "haven", "hedge", "humus",
  "ivory", "kelps", "lakes", "levee", "marsh", "mulch", "oasis", "ocean",
  "petal", "plume", "polar", "prawn", "reefs", "ridge", "river", "roots",
  "seeds", "shrub", "sleet", "slope", "smelt", "solar", "spore", "steam",
  "stone", "stork", "swamp", "tidal", "trout", "tulip", "vapor", "vegan",
  "vines", "waste", "water", "whale", "winds", "woods",
]);

/**
 * Check if a word is a valid guess.
 * Also accepts the current day's answer word (which may not be in the static list).
 */
export function isValidGuess(word: string, todayAnswer?: string): boolean {
  const lower = word.toLowerCase();
  if (lower.length !== 5) return false;
  if (!/^[a-z]{5}$/.test(lower)) return false;
  if (todayAnswer && lower === todayAnswer.toLowerCase()) return true;
  return VALID_WORDS.has(lower);
}
