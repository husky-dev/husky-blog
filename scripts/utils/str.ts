import crypto from "crypto";

export const textToSlug = (title: string): string => {
  let mod = cyrToLat(title).toLowerCase();
  mod = mod.replace(/['’]/g, "");
  mod = mod.replace(/[^a-z0-9]/gi, "-");
  mod = mod.replace(/-+/g, "-");
  mod = mod.replace(/^-|-$/g, "");
  return mod;
};

const cyrToLat = (str: string): string => {
  const a: Record<string, string> = {};
  a["а"] = "a";
  a["А"] = "A";
  a["Б"] = "B";
  a["б"] = "b";
  a["В"] = "V";
  a["в"] = "v";
  a["Г"] = "G";
  a["г"] = "g";
  a["Ґ"] = "G";
  a["ґ"] = "g";
  a["Д"] = "D";
  a["д"] = "d";
  a["Е"] = "E";
  a["е"] = "e";
  a["Ё"] = "YO";
  a["ё"] = "yo";
  a["є"] = "ie";
  a["Є"] = "Ye";
  a["Ж"] = "ZH";
  a["ж"] = "zh";
  a["З"] = "Z";
  a["з"] = "z";
  a["И"] = "I";
  a["и"] = "i";
  a["І"] = "I";
  a["і"] = "i";
  a["ї"] = "i";
  a["Ї"] = "Yi";
  a["Й"] = "I";
  a["й"] = "i";
  a["К"] = "K";
  a["к"] = "k";
  a["Л"] = "L";
  a["л"] = "l";
  a["М"] = "M";
  a["м"] = "m";
  a["Н"] = "N";
  a["н"] = "n";
  a["О"] = "O";
  a["о"] = "o";
  a["П"] = "P";
  a["п"] = "p";
  a["Р"] = "R";
  a["р"] = "r";
  a["С"] = "S";
  a["с"] = "s";
  a["Т"] = "T";
  a["т"] = "t";
  a["У"] = "U";
  a["у"] = "u";
  a["Ф"] = "F";
  a["ф"] = "f";
  a["Х"] = "H";
  a["х"] = "h";
  a["Ц"] = "TS";
  a["ц"] = "ts";
  a["Ч"] = "CH";
  a["ч"] = "ch";
  a["Ш"] = "SH";
  a["ш"] = "sh";
  a["Щ"] = "SCH";
  a["щ"] = "sch";
  a["Ъ"] = `'`;
  a["ъ"] = `'`;
  a["Ы"] = "I";
  a["ы"] = "i";
  a["Ь"] = `'`;
  a["ь"] = `'`;
  a["Э"] = "E";
  a["э"] = "e";
  a["Ю"] = "YU";
  a["ю"] = "yu";
  a["Я"] = "Ya";
  a["я"] = "ya";
  return str
    .split("")
    .map((char) => a[char] || char)
    .join("");
};

export const md5 = (str: string): string =>
  crypto.createHash("md5").update(str).digest("hex");

export const addLnIndent = (content: string, indent: number): string => {
  return content
    .split("\n")
    .map((line) => `${" ".repeat(indent)}${line}`)
    .join("\n");
};
